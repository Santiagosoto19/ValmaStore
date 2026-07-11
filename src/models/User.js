const { query } = require('../config/database');

class User {
    // Crear nuevo usuario
    static async create({ firstName, lastName, email, password, phone, address, city }) {
        const sql = `
            INSERT INTO users (first_name, last_name, email, password, phone, address, city)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, first_name, last_name, email, phone, address, city, role, created_at
        `;
        const result = await query(sql, [firstName, lastName, email, password, phone, address, city]);
        return result.rows[0];
    }

    // Buscar usuario por email
    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = $1';
        const result = await query(sql, [email]);
        return result.rows[0];
    }

    // Buscar usuario por ID
    static async findById(id) {
        const sql = `
            SELECT id, first_name, last_name, email, phone, address, city, role, is_active, created_at
            FROM users WHERE id = $1
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Actualizar usuario
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const fieldMap = {
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            phone: 'phone',
            address: 'address',
            city: 'city'
        };

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                const dbField = fieldMap[key] || key;
                fields.push(`${dbField} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const sql = `
            UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING id, first_name, last_name, email, phone, address, city, role
        `;

        const result = await query(sql, values);
        return result.rows[0];
    }

    // Obtener pedidos del usuario
    static async getOrders(userId) {
        const sql = `
            SELECT * FROM order_details
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result = await query(sql, [userId]);
        return result.rows;
    }

    // Listar todos los usuarios (para admin)
    static async findAll(limit = 50, offset = 0) {
        const sql = `
            SELECT id, first_name, last_name, email, phone, role, is_active, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;
        const result = await query(sql, [limit, offset]);
        return result.rows;
    }
}

module.exports = User;
