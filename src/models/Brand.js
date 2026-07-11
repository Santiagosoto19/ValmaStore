const { query } = require('../config/database');

class Brand {
    // Crear nueva marca
    static async create({ name, description, logoUrl }) {
        const sql = `
            INSERT INTO brands (name, description, logo_url)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await query(sql, [name, description, logoUrl]);
        return result.rows[0];
    }

    // Buscar marca por ID
    static async findById(id) {
        const sql = 'SELECT * FROM brands WHERE id = $1';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Buscar marca por nombre
    static async findByName(name) {
        const sql = 'SELECT * FROM brands WHERE name ILIKE $1';
        const result = await query(sql, [name]);
        return result.rows[0];
    }

    // Listar todas las marcas
    static async findAll() {
        const sql = `
            SELECT b.*, COUNT(p.id) as product_count
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id AND p.is_active = true
            GROUP BY b.id
            ORDER BY b.name
        `;
        const result = await query(sql);
        return result.rows;
    }

    // Actualizar marca
    static async update(id, { name, description, logoUrl }) {
        const sql = `
            UPDATE brands
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                logo_url = COALESCE($3, logo_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;
        const result = await query(sql, [name, description, logoUrl, id]);
        return result.rows[0];
    }

    // Eliminar marca
    static async delete(id) {
        const sql = 'DELETE FROM brands WHERE id = $1 RETURNING *';
        const result = await query(sql, [id]);
        return result.rows[0];
    }
}

module.exports = Brand;
