const { query } = require('../config/database');

class Brand {
    static async create({ name, description, logoUrl, isActive = true }) {
        const sql = `
            INSERT INTO brands (name, description, logo_url, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await query(sql, [name, description, logoUrl || null, isActive]);
        return result.rows[0];
    }

    static async findById(id) {
        const sql = 'SELECT * FROM brands WHERE id = $1';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    static async findByName(name) {
        const sql = 'SELECT * FROM brands WHERE name ILIKE $1';
        const result = await query(sql, [name]);
        return result.rows[0];
    }

    static async findAll({ activeOnly = false } = {}) {
        const sql = `
            SELECT b.*, COUNT(p.id) FILTER (WHERE p.is_active = true) as product_count
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id
            ${activeOnly ? 'WHERE b.is_active = true' : ''}
            GROUP BY b.id
            ORDER BY b.name
        `;
        const result = await query(sql);
        return result.rows;
    }

    static async update(id, { name, description, logoUrl, isActive }) {
        const sql = `
            UPDATE brands
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                logo_url = COALESCE($3, logo_url),
                is_active = COALESCE($4, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;
        const result = await query(sql, [name, description, logoUrl, isActive, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const sql = 'DELETE FROM brands WHERE id = $1 RETURNING *';
        const result = await query(sql, [id]);
        return result.rows[0];
    }
}

module.exports = Brand;
