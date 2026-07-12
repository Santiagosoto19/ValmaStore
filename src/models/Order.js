const { query, getClient } = require('../config/database');

class Order {
    // Crear nuevo pedido
    static async create({
        userId,
        cartId,
        totalAmount,
        shippingAddress,
        shippingCity,
        shippingPhone,
        notes = null,
        whatsappLink = null,
        whatsappMessage = null
    }) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // Generar número de orden único
            const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const countResult = await client.query(
                'SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE'
            );
            const count = parseInt(countResult.rows[0].count) + 1;
            const orderNumber = `ORD-${datePart}-${String(count).padStart(4, '0')}`;

            // Crear el pedido
            const orderSql = `
                INSERT INTO orders (
                    order_number, user_id, cart_id, total_amount,
                    shipping_address, shipping_city, shipping_phone, notes, whatsapp_link, whatsapp_message
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            const orderResult = await client.query(orderSql, [
                orderNumber, userId, cartId, totalAmount,
                shippingAddress, shippingCity, shippingPhone, notes, whatsappLink, whatsappMessage
            ]);
            const order = orderResult.rows[0];

            // Copiar items del carrito a order_items
            const itemsSql = `
                INSERT INTO order_items (
                    order_id, product_id, product_name, brand_name, quantity, unit_price, total_price
                )
                SELECT
                    $1, ci.product_id, p.name, b.name, ci.quantity, ci.price_at_time, (ci.quantity * ci.price_at_time)
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE ci.cart_id = $2
            `;
            await client.query(itemsSql, [order.id, cartId]);

            // Actualizar stock de productos
            const stockSql = `
                UPDATE products p
                SET stock = p.stock - ci.quantity
                FROM cart_items ci
                WHERE p.id = ci.product_id AND ci.cart_id = $1
            `;
            await client.query(stockSql, [cartId]);

            // Marcar carrito como convertido
            await client.query(
                "UPDATE carts SET status = 'converted' WHERE id = $1",
                [cartId]
            );

            // Registrar historial de estado
            await client.query(
                'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
                [order.id, 'pending', 'Pedido creado']
            );

            await client.query('COMMIT');
            return order;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Buscar pedido por ID
    static async findById(id) {
        const sql = 'SELECT * FROM order_details WHERE id = $1';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Buscar pedido por número
    static async findByNumber(orderNumber) {
        const sql = 'SELECT * FROM order_details WHERE order_number = $1';
        const result = await query(sql, [orderNumber]);
        return result.rows[0];
    }

    // Listar pedidos de un usuario
    static async findByUser(userId) {
        const sql = `
            SELECT * FROM order_details
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result = await query(sql, [userId]);
        return result.rows;
    }

    // Listar todos los pedidos (para admin) — legacy
    static async findAll({ status = null, limit = 50, offset = 0 } = {}) {
        let sql = 'SELECT * FROM order_details WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (status) {
            sql += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        sql += ' ORDER BY created_at DESC';
        sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows;
    }

    // Listado admin optimizado: sin campos pesados (whatsapp_message) + paginación en 1 query
    static async findAdminPaginated({
        status = null,
        search = null,
        dateFrom = null,
        dateTo = null,
        limit = 20,
        offset = 0
    } = {}) {
        const params = [];
        let n = 1;
        let where = 'WHERE 1=1';

        if (status) {
            where += ` AND o.status = $${n}`;
            params.push(status);
            n++;
        }
        if (search) {
            where += ` AND (o.order_number ILIKE $${n} OR COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Invitado') ILIKE $${n})`;
            params.push(`%${search}%`);
            n++;
        }
        if (dateFrom) {
            where += ` AND o.created_at >= $${n}::date`;
            params.push(dateFrom);
            n++;
        }
        if (dateTo) {
            where += ` AND o.created_at < ($${n}::date + INTERVAL '1 day')`;
            params.push(dateTo);
            n++;
        }

        const sql = `
            SELECT
                o.id,
                o.order_number,
                o.status,
                o.total_amount,
                o.shipping_phone,
                o.created_at,
                COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Invitado') AS customer_name,
                u.phone AS customer_phone,
                COUNT(*) OVER()::int AS total_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ${where}
            ORDER BY o.created_at DESC
            LIMIT $${n} OFFSET $${n + 1}
        `;
        params.push(limit, offset);

        const result = await query(sql, params);
        const total = result.rows[0]?.total_count ?? 0;
        const orders = result.rows.map(({ total_count, ...row }) => row);
        return { orders, total };
    }

    static async count({ status = null } = {}) {
        let sql = 'SELECT COUNT(*) FROM orders WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (status) {
            sql += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        const result = await query(sql, params);
        return parseInt(result.rows[0].count);
    }

    // Actualizar estado del pedido
    static async updateStatus(id, status, notes = null, updatedBy = null) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // Actualizar estado
            const updateSql = `
                UPDATE orders
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                ${status === 'paid' ? ', paid_at = CURRENT_TIMESTAMP' : ''}
                WHERE id = $2
                RETURNING *
            `;
            const result = await client.query(updateSql, [status, id]);

            // Registrar en historial
            await client.query(
                'INSERT INTO order_status_history (order_id, status, notes, created_by) VALUES ($1, $2, $3, $4)',
                [id, status, notes, updatedBy]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Obtener items del pedido
    static async getItems(orderId) {
        const sql = `
            SELECT oi.*, p.image_url
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
        `;
        const result = await query(sql, [orderId]);
        return result.rows;
    }

    // Obtener historial de estados
    static async getStatusHistory(orderId) {
        const sql = `
            SELECT osh.*, u.first_name || ' ' || u.last_name as updated_by_name
            FROM order_status_history osh
            LEFT JOIN users u ON osh.created_by = u.id
            WHERE osh.order_id = $1
            ORDER BY osh.created_at ASC
        `;
        const result = await query(sql, [orderId]);
        return result.rows;
    }

    // Estadísticas de pedidos
    static async getStats() {
        const sql = `
            SELECT
                (SELECT COUNT(*)::int FROM orders WHERE status = 'pending') as pending_count,
                (SELECT COUNT(*)::int FROM orders WHERE DATE(created_at) = CURRENT_DATE) as total_count,
                (SELECT COUNT(*)::int
                    FROM orders o
                    WHERE DATE(COALESCE(
                        o.paid_at,
                        (SELECT MIN(h.created_at) FROM order_status_history h
                         WHERE h.order_id = o.id AND h.status = 'paid')
                    )) = CURRENT_DATE
                    AND (
                        o.paid_at IS NOT NULL
                        OR EXISTS (
                            SELECT 1 FROM order_status_history h2
                            WHERE h2.order_id = o.id AND h2.status = 'paid'
                        )
                    )
                ) as paid_count,
                (SELECT COALESCE(SUM(o.total_amount), 0)
                    FROM orders o
                    WHERE o.paid_at IS NOT NULL
                       OR EXISTS (
                           SELECT 1 FROM order_status_history h
                           WHERE h.order_id = o.id AND h.status = 'paid'
                       )
                ) as total_revenue
        `;
        const result = await query(sql);
        return result.rows[0];
    }

    // Generar link de WhatsApp
    static generateWhatsAppLink(phone, orderDetails) {
        const message = encodeURIComponent(
            `¡Hola! Quiero confirmar mi pedido #${orderDetails.orderNumber}\n` +
            `Total: $${orderDetails.total}\n` +
            `Productos: ${orderDetails.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`
        );
        return `https://wa.me/${phone}?text=${message}`;
    }
}

module.exports = Order;
