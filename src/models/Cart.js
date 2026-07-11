const { query, getClient } = require('../config/database');

class Cart {
    // Crear nuevo carrito
    static async create({ userId = null, sessionId = null }) {
        const sql = `
            INSERT INTO carts (user_id, session_id, status)
            VALUES ($1, $2, 'active')
            RETURNING *
        `;
        const result = await query(sql, [userId, sessionId]);
        return result.rows[0];
    }

    // Buscar carrito activo por usuario
    static async findActiveByUser(userId) {
        const sql = `
            SELECT c.*, COALESCE(SUM(ci.quantity * ci.price_at_time), 0) as total
            FROM carts c
            LEFT JOIN cart_items ci ON c.id = ci.cart_id
            WHERE c.user_id = $1 AND c.status = 'active'
            GROUP BY c.id
        `;
        const result = await query(sql, [userId]);
        return result.rows[0];
    }

    // Buscar carrito por sesión
    static async findBySession(sessionId) {
        const sql = `
            SELECT c.*, COALESCE(SUM(ci.quantity * ci.price_at_time), 0) as total
            FROM carts c
            LEFT JOIN cart_items ci ON c.id = ci.cart_id
            WHERE c.session_id = $1 AND c.status = 'active'
            GROUP BY c.id
        `;
        const result = await query(sql, [sessionId]);
        return result.rows[0];
    }

    // Buscar carrito por ID con items
    static async findByIdWithItems(cartId) {
        const client = await getClient();
        try {
            // Obtener carrito
            const cartSql = 'SELECT * FROM carts WHERE id = $1';
            const cartResult = await client.query(cartSql, [cartId]);
            const cart = cartResult.rows[0];

            if (!cart) return null;

            // Obtener items del carrito
            const itemsSql = `
                SELECT ci.*, p.name as product_name, p.image_url, p.stock as available_stock,
                       b.name as brand_name
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE ci.cart_id = $1
            `;
            const itemsResult = await client.query(itemsSql, [cartId]);

            return {
                ...cart,
                items: itemsResult.rows
            };
        } finally {
            client.release();
        }
    }

    // Agregar item al carrito
    static async addItem(cartId, productId, quantity, price) {
        const sql = `
            INSERT INTO cart_items (cart_id, product_id, quantity, price_at_time)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (cart_id, product_id)
            DO UPDATE SET quantity = cart_items.quantity + $3, price_at_time = $4
            RETURNING *
        `;
        const result = await query(sql, [cartId, productId, quantity, price]);
        return result.rows[0];
    }

    // Actualizar cantidad de item
    static async updateItemQuantity(cartItemId, quantity) {
        if (quantity <= 0) {
            return this.removeItem(cartItemId);
        }

        const sql = `
            UPDATE cart_items
            SET quantity = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await query(sql, [quantity, cartItemId]);
        return result.rows[0];
    }

    // Eliminar item del carrito
    static async removeItem(cartItemId) {
        const sql = 'DELETE FROM cart_items WHERE id = $1 RETURNING *';
        const result = await query(sql, [cartItemId]);
        return result.rows[0];
    }

    // Vaciar carrito
    static async clearCart(cartId) {
        const sql = 'DELETE FROM cart_items WHERE cart_id = $1';
        await query(sql, [cartId]);
    }

    // Marcar carrito como convertido (a pedido)
    static async markAsConverted(cartId) {
        const sql = `
            UPDATE carts
            SET status = 'converted', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await query(sql, [cartId]);
        return result.rows[0];
    }

    // Asignar carrito a usuario (cuando inicia sesión)
    static async assignToUser(cartId, userId) {
        const sql = `
            UPDATE carts
            SET user_id = $1, session_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await query(sql, [userId, cartId]);
        return result.rows[0];
    }

    // Fusionar carritos (cuando usuario inicia sesión con carrito existente)
    static async mergeCarts(sessionCartId, userCartId) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // Mover items del carrito de sesión al carrito del usuario
            const mergeSql = `
                INSERT INTO cart_items (cart_id, product_id, quantity, price_at_time)
                SELECT $1, product_id, quantity, price_at_time
                FROM cart_items
                WHERE cart_id = $2
                ON CONFLICT (cart_id, product_id)
                DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
            `;
            await client.query(mergeSql, [userCartId, sessionCartId]);

            // Eliminar items del carrito de sesión
            await client.query('DELETE FROM cart_items WHERE cart_id = $1', [sessionCartId]);

            // Marcar carrito de sesión como abandonado
            await client.query(
                "UPDATE carts SET status = 'abandoned' WHERE id = $1",
                [sessionCartId]
            );

            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Obtener resumen del carrito
    static async getSummary(cartId) {
        const sql = `
            SELECT
                COUNT(*) as item_count,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(quantity * price_at_time), 0) as subtotal
            FROM cart_items
            WHERE cart_id = $1
        `;
        const result = await query(sql, [cartId]);
        return result.rows[0];
    }
}

module.exports = Cart;
