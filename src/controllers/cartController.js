const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { generateSessionId, apiResponse } = require('../utils/helpers');

// Obtener o crear carrito
const getOrCreateCart = async (req, res) => {
    try {
        let cart;

        if (req.user) {
            // Usuario autenticado - buscar carrito activo
            cart = await Cart.findActiveByUser(req.user.id);

            if (!cart) {
                // Verificar si hay carrito de sesión para fusionar
                const sessionId = req.cookies?.sessionId;
                if (sessionId) {
                    const sessionCart = await Cart.findBySession(sessionId);
                    if (sessionCart) {
                        // Crear carrito de usuario y fusionar
                        cart = await Cart.create({ userId: req.user.id });
                        await Cart.mergeCarts(sessionCart.id, cart.id);
                        res.clearCookie('sessionId');
                    }
                }

                if (!cart) {
                    cart = await Cart.create({ userId: req.user.id });
                }
            }
        } else {
            // Usuario no autenticado - usar sesión
            let sessionId = req.cookies?.sessionId;

            if (!sessionId) {
                sessionId = generateSessionId();
                res.cookie('sessionId', sessionId, {
                    httpOnly: true,
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
                });
            }

            cart = await Cart.findBySession(sessionId);

            if (!cart) {
                cart = await Cart.create({ sessionId });
            }
        }

        // Obtener carrito completo con items
        const fullCart = await Cart.findByIdWithItems(cart.id);
        const summary = await Cart.getSummary(cart.id);

        res.json(apiResponse(true, {
            ...fullCart,
            summary
        }));
    } catch (error) {
        console.error('Error obteniendo carrito:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener carrito'));
    }
};

// Agregar item al carrito
const addItem = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        // Verificar que el producto existe y tiene stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json(apiResponse(false, null, 'Producto no encontrado'));
        }

        if (product.stock < quantity) {
            return res.status(400).json(
                apiResponse(false, null, `Stock insuficiente. Disponible: ${product.stock}`)
            );
        }

        // Obtener o crear carrito
        let cart;
        if (req.user) {
            cart = await Cart.findActiveByUser(req.user.id);
            if (!cart) {
                cart = await Cart.create({ userId: req.user.id });
            }
        } else {
            let sessionId = req.cookies?.sessionId;
            if (!sessionId) {
                sessionId = generateSessionId();
                res.cookie('sessionId', sessionId, {
                    httpOnly: true,
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
            }
            cart = await Cart.findBySession(sessionId);
            if (!cart) {
                cart = await Cart.create({ sessionId });
            }
        }

        // Agregar item
        await Cart.addItem(cart.id, productId, quantity, product.price);

        // Obtener carrito actualizado
        const fullCart = await Cart.findByIdWithItems(cart.id);
        const summary = await Cart.getSummary(cart.id);

        res.json(apiResponse(true, {
            ...fullCart,
            summary
        }, 'Producto agregado al carrito'));
    } catch (error) {
        console.error('Error agregando item:', error);
        res.status(500).json(apiResponse(false, null, 'Error al agregar producto al carrito'));
    }
};

// Actualizar cantidad de item
const updateItemQuantity = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        // Verificar stock si está aumentando cantidad
        if (quantity > 0) {
            const itemResult = await require('../config/database').query(
                'SELECT product_id FROM cart_items WHERE id = $1',
                [itemId]
            );

            if (itemResult.rows.length > 0) {
                const product = await Product.findById(itemResult.rows[0].product_id);
                if (product && product.stock < quantity) {
                    return res.status(400).json(
                        apiResponse(false, null, `Stock insuficiente. Disponible: ${product.stock}`)
                    );
                }
            }
        }

        await Cart.updateItemQuantity(itemId, quantity);

        // Obtener carrito actualizado
        const cart = await getCurrentCart(req);
        if (cart) {
            const fullCart = await Cart.findByIdWithItems(cart.id);
            const summary = await Cart.getSummary(cart.id);
            res.json(apiResponse(true, { ...fullCart, summary }, 'Cantidad actualizada'));
        } else {
            res.json(apiResponse(true, null, 'Item eliminado'));
        }
    } catch (error) {
        console.error('Error actualizando cantidad:', error);
        res.status(500).json(apiResponse(false, null, 'Error al actualizar cantidad'));
    }
};

// Eliminar item del carrito
const removeItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        await Cart.removeItem(itemId);

        // Obtener carrito actualizado
        const cart = await getCurrentCart(req);
        if (cart) {
            const fullCart = await Cart.findByIdWithItems(cart.id);
            const summary = await Cart.getSummary(cart.id);
            res.json(apiResponse(true, { ...fullCart, summary }, 'Producto eliminado del carrito'));
        } else {
            res.json(apiResponse(true, { items: [], summary: { item_count: 0, total_quantity: 0, subtotal: 0 } }));
        }
    } catch (error) {
        console.error('Error eliminando item:', error);
        res.status(500).json(apiResponse(false, null, 'Error al eliminar producto'));
    }
};

// Vaciar carrito
const clearCart = async (req, res) => {
    try {
        const cart = await getCurrentCart(req);
        if (cart) {
            await Cart.clearCart(cart.id);
        }

        res.json(apiResponse(true, { items: [], summary: { item_count: 0, total_quantity: 0, subtotal: 0 } }, 'Carrito vaciado'));
    } catch (error) {
        console.error('Error vaciando carrito:', error);
        res.status(500).json(apiResponse(false, null, 'Error al vaciar carrito'));
    }
};

// Generar enlace de WhatsApp desde el carrito actual
const getWhatsAppLink = async (req, res) => {
    try {
        const cart = await getCurrentCart(req);
        if (!cart) {
            return res.status(400).json(apiResponse(false, null, 'No hay carrito activo'));
        }

        const fullCart = await Cart.findByIdWithItems(cart.id);
        if (!fullCart.items || fullCart.items.length === 0) {
            return res.status(400).json(apiResponse(false, null, 'El carrito está vacío'));
        }

        const summary = await Cart.getSummary(cart.id);
        const { buildCartWhatsAppMessage, buildWhatsAppUrl } = require('../utils/whatsappMessage');
        const message = buildCartWhatsAppMessage(fullCart.items, summary.subtotal);
        const whatsappNumber = (process.env.WHATSAPP_NUMBER || '573001234567').replace(/\D/g, '');
        const whatsappLink = buildWhatsAppUrl(whatsappNumber, message);

        res.json(apiResponse(true, {
            whatsappLink,
            message,
            summary: {
                subtotal: summary.subtotal,
                total: summary.subtotal
            }
        }));
    } catch (error) {
        console.error('Error generando enlace WhatsApp:', error);
        res.status(500).json(apiResponse(false, null, 'Error al generar enlace de WhatsApp'));
    }
};

// Función auxiliar para obtener carrito actual
const getCurrentCart = async (req) => {
    if (req.user) {
        return await Cart.findActiveByUser(req.user.id);
    } else {
        const sessionId = req.cookies?.sessionId;
        if (sessionId) {
            return await Cart.findBySession(sessionId);
        }
    }
    return null;
};

module.exports = {
    getOrCreateCart,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    getWhatsAppLink
};
