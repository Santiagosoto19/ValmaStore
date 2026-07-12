const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { generateOrderMessage, apiResponse } = require('../utils/helpers');
const { buildWhatsAppUrl } = require('../utils/whatsappMessage');

const DEFAULT_SHIPPING = {
    shippingAddress: 'A confirmar por WhatsApp',
    shippingCity: 'A confirmar',
    shippingPhone: 'A confirmar'
};

async function resolveCart(req) {
    if (req.user) {
        return Cart.findActiveByUser(req.user.id);
    }
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
        return Cart.findBySession(sessionId);
    }
    return null;
}

function resolveCustomerName(req) {
    if (!req.user) return 'Cliente invitado';
    const name = `${req.user.first_name || req.user.firstName || ''} ${req.user.last_name || req.user.lastName || ''}`.trim();
    return name || req.user.email || 'Cliente registrado';
}

async function createOrderFromCart(req, res, shippingData) {
    const cart = await resolveCart(req);

    if (!cart) {
        return res.status(400).json(apiResponse(false, null, 'No hay carrito activo'));
    }

    const fullCart = await Cart.findByIdWithItems(cart.id);
    if (!fullCart.items || fullCart.items.length === 0) {
        return res.status(400).json(apiResponse(false, null, 'El carrito está vacío'));
    }

    const totalAmount = fullCart.items.reduce((sum, item) => {
        return sum + (item.quantity * item.price_at_time);
    }, 0);

    const shippingAddress = shippingData.shippingAddress || DEFAULT_SHIPPING.shippingAddress;
    const shippingCity = shippingData.shippingCity || DEFAULT_SHIPPING.shippingCity;
    const shippingPhone = shippingData.shippingPhone || req.user?.phone || DEFAULT_SHIPPING.shippingPhone;
    const notes = shippingData.notes || null;

    const whatsappNumber = process.env.WHATSAPP_NUMBER || '573224969398';
    const customerName = resolveCustomerName(req);

    const order = await Order.create({
        userId: req.user?.id || null,
        cartId: cart.id,
        totalAmount,
        shippingAddress,
        shippingCity,
        shippingPhone,
        notes,
        whatsappLink: null,
        whatsappMessage: null
    });

    const orderItems = await Order.getItems(order.id);

    const finalWhatsappMessage = generateOrderMessage(
        {
            order_number: order.order_number,
            total_amount: order.total_amount,
            shipping_address: shippingAddress,
            shipping_city: shippingCity,
            shipping_phone: shippingPhone,
            notes,
            customer_name: customerName
        },
        orderItems
    );
    const finalWhatsappLink = buildWhatsAppUrl(whatsappNumber, finalWhatsappMessage);

    await require('../config/database').query(
        'UPDATE orders SET whatsapp_link = $1, whatsapp_message = $2 WHERE id = $3',
        [finalWhatsappLink, finalWhatsappMessage, order.id]
    );

    return res.status(201).json(apiResponse(true, {
        order: {
            ...order,
            customer_name: customerName,
            whatsapp_link: finalWhatsappLink,
            whatsapp_message: finalWhatsappMessage
        },
        items: orderItems,
        whatsappLink: finalWhatsappLink,
        whatsappMessage: finalWhatsappMessage
    }, 'Pedido creado exitosamente'));
}

const createOrder = async (req, res) => {
    try {
        await createOrderFromCart(req, res, req.body);
    } catch (error) {
        console.error('Error creando pedido:', error);
        res.status(500).json(apiResponse(false, null, 'Error al crear pedido'));
    }
};

const createWhatsAppCheckout = async (req, res) => {
    try {
        const shippingData = {
            shippingAddress: req.body.shippingAddress,
            shippingCity: req.body.shippingCity,
            shippingPhone: req.body.shippingPhone || req.user?.phone,
            notes: req.body.notes || 'Pedido iniciado desde carrito via WhatsApp'
        };
        await createOrderFromCart(req, res, shippingData);
    } catch (error) {
        console.error('Error en checkout WhatsApp:', error);
        res.status(500).json(apiResponse(false, null, 'Error al procesar el pedido'));
    }
};

// Obtener pedidos del usuario
const getUserOrders = async (req, res) => {
    try {
        const orders = await Order.findByUser(req.user.id);
        res.json(apiResponse(true, orders));
    } catch (error) {
        console.error('Error obteniendo pedidos:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener pedidos'));
    }
};

// Obtener detalle de un pedido
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json(apiResponse(false, null, 'Pedido no encontrado'));
        }

        const isAdmin = req.user.role === 'admin';
        if (!isAdmin && order.user_id !== req.user.id) {
            return res.status(403).json(apiResponse(false, null, 'No tiene acceso a este pedido'));
        }

        const items = await Order.getItems(id);
        const statusHistory = await Order.getStatusHistory(id);

        res.json(apiResponse(true, {
            order,
            items,
            statusHistory
        }));
    } catch (error) {
        console.error('Error obteniendo pedido:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener pedido'));
    }
};

// ============ ADMIN ============

const getAllOrders = async (req, res) => {
    try {
        const { status, search, dateFrom, dateTo, page = 1, limit = 20, includeStats } = req.query;
        const pagination = require('../utils/helpers').paginate(page, limit);

        const filters = {
            status: status || null,
            search: search ? search.trim() : null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            limit: pagination.limit,
            offset: pagination.offset
        };

        const tasks = [Order.findAdminPaginated(filters)];

        if (includeStats === 'true') {
            const cache = require('../utils/cache');
            const cached = cache.get('orders:stats:v3');
            tasks.push(cached ? Promise.resolve(cached) : Order.getStats().then(s => {
                cache.set('orders:stats:v3', s, 30000);
                return s;
            }));
        }

        const [listResult, stats] = await Promise.all(tasks);
        const { orders, total } = listResult;

        res.json(apiResponse(true, {
            orders,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit)
            },
            stats: stats || undefined
        }));
    } catch (error) {
        console.error('Error obteniendo pedidos:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener pedidos'));
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const order = await Order.updateStatus(id, status, notes, req.user.id);

        if (!order) {
            return res.status(404).json(apiResponse(false, null, 'Pedido no encontrado'));
        }

        require('../utils/cache').del('orders:stats:v3');
        res.json(apiResponse(true, order, 'Estado actualizado exitosamente'));
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json(apiResponse(false, null, 'Error al actualizar estado'));
    }
};

const getOrderStats = async (req, res) => {
    try {
        const stats = await Order.getStats();
        res.json(apiResponse(true, stats));
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener estadísticas'));
    }
};

const regenerateWhatsAppLink = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json(apiResponse(false, null, 'Pedido no encontrado'));
        }

        const items = await Order.getItems(id);
        const whatsappNumber = process.env.WHATSAPP_NUMBER || '573224969398';
        const message = generateOrderMessage(order, items);
        const whatsappLink = buildWhatsAppUrl(whatsappNumber, message);

        await require('../config/database').query(
            'UPDATE orders SET whatsapp_link = $1, whatsapp_message = $2 WHERE id = $3',
            [whatsappLink, message, id]
        );

        res.json(apiResponse(true, { whatsappLink, whatsappMessage: message }, 'Link regenerado'));
    } catch (error) {
        console.error('Error regenerando link:', error);
        res.status(500).json(apiResponse(false, null, 'Error al regenerar link'));
    }
};

module.exports = {
    createOrder,
    createWhatsAppCheckout,
    getUserOrders,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    getOrderStats,
    regenerateWhatsAppLink
};
