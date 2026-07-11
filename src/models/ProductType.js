const { query } = require('../config/database');

class ProductType {
    // Crear nuevo tipo
    static async create({ name, description, icon }) {
        const sql = `
            INSERT INTO product_types (name, description, icon)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await query(sql, [name, description, icon]);
        return result.rows[0];
    }

    // Buscar tipo por ID
    static async findById(id) {
        const sql = 'SELECT * FROM product_types WHERE id = $1';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Buscar tipo por nombre
    static async findByName(name) {
        const sql = 'SELECT * FROM product_types WHERE name ILIKE $1';
        const result = await query(sql, [name]);
        return result.rows[0];
    }

    // Listar todos los tipos
    static async findAll() {
        const sql = `
            SELECT pt.*, COUNT(p.id) as product_count
            FROM product_types pt
            LEFT JOIN products p ON pt.id = p.product_type_id AND p.is_active = true
            GROUP BY pt.id
            ORDER BY pt.name
        `;
        const result = await query(sql);
        return result.rows;
    }

    // Actualizar tipo
    static async update(id, { name, description, icon }) {
        const sql = `
            UPDATE product_types
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                icon = COALESCE($3, icon)
            WHERE id = $4
            RETURNING *
        `;
        const result = await query(sql, [name, description, icon, id]);
        return result.rows[0];
    }

    // Eliminar tipo
    static async delete(id) {
        const sql = 'DELETE FROM product_types WHERE id = $1 RETURNING *';
        const result = await query(sql, [id]);
        return result.rows[0];
    }
}

module.exports = ProductType;
