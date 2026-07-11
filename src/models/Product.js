const { query } = require('../config/database');

let avgPriceCache = { value: null, at: 0 };

class Product {
    // Crear nuevo producto
    static async create({ name, description, price, stock, brandId, productTypeId, imageUrl, featured = false, isActive = true }) {
        const sql = `
            INSERT INTO products (name, description, price, stock, brand_id, product_type_id, image_url, featured, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const result = await query(sql, [name, description, price, stock, brandId, productTypeId, imageUrl, featured, isActive]);
        return result.rows[0];
    }

    // Buscar producto por ID
    static async findById(id) {
        const sql = 'SELECT * FROM product_details WHERE id = $1';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    static async getCachedAvgPrice() {
        const TTL = 5 * 60 * 1000;
        if (avgPriceCache.value !== null && Date.now() - avgPriceCache.at < TTL) {
            return avgPriceCache.value;
        }
        const result = await query('SELECT COALESCE(AVG(price), 0)::numeric AS avg FROM products WHERE is_active = true');
        avgPriceCache.value = parseFloat(result.rows[0].avg) || 0;
        avgPriceCache.at = Date.now();
        return avgPriceCache.value;
    }

    static async findAdminPaginated({
        brandId = null,
        typeId = null,
        search = null,
        featured = null,
        onSale = null,
        active = null,
        lowStock = null,
        activeOnly = null,
        limit = 20,
        offset = 0
    } = {}) {
        const params = [];
        let n = 1;
        let where = 'WHERE 1=1';

        if (active === true) where += ' AND p.is_active = true';
        else if (active === false) where += ' AND p.is_active = false';
        if (activeOnly) where += ' AND p.is_active = true';
        if (lowStock) where += ' AND p.stock = 0';

        if (brandId) {
            where += ` AND p.brand_id = $${n}`;
            params.push(brandId);
            n++;
        }
        if (typeId) {
            where += ` AND p.product_type_id = $${n}`;
            params.push(typeId);
            n++;
        }
        if (featured === true) where += ' AND p.featured = true';
        if (search) {
            where += ` AND (p.name ILIKE $${n} OR b.name ILIKE $${n})`;
            params.push(`%${search}%`);
            n++;
        }
        if (onSale) {
            const avg = await this.getCachedAvgPrice();
            where += ` AND p.price < $${n}`;
            params.push(avg);
            n++;
        }

        const sql = `
            SELECT
                p.id, p.name, p.price, p.stock, p.image_url, p.is_active, p.featured,
                p.brand_id, p.product_type_id,
                b.name AS brand_name,
                pt.name AS type_name,
                pt.id AS type_id,
                COUNT(*) OVER()::int AS total_count
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN product_types pt ON p.product_type_id = pt.id
            ${where}
            ORDER BY p.featured DESC, p.created_at DESC
            LIMIT $${n} OFFSET $${n + 1}
        `;
        params.push(limit, offset);

        const result = await query(sql, params);
        const total = result.rows[0]?.total_count ?? 0;
        const products = result.rows.map(({ total_count, ...row }) => row);
        return { products, total };
    }

    static async getAdminSummary() {
        const sql = `
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE is_active)::int AS active,
                COUNT(*) FILTER (WHERE stock = 0)::int AS no_stock,
                COUNT(*) FILTER (WHERE featured)::int AS featured
            FROM products
        `;
        const result = await query(sql);
        return result.rows[0];
    }

    // Listar productos con filtros
    static async findAll({
        brandId = null,
        typeId = null,
        typeIds = null,
        categories = null,
        search = null,
        minPrice = null,
        maxPrice = null,
        featured = null,
        onSale = null,
        active = true,
        limit = 20,
        offset = 0
    } = {}) {
        let sql = 'SELECT * FROM product_details WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (active !== null) {
            sql += ` AND is_active = $${paramCount}`;
            params.push(active);
            paramCount++;
        }

        if (brandId) {
            sql += ` AND brand_id = $${paramCount}`;
            params.push(brandId);
            paramCount++;
        }

        if (typeId) {
            sql += ` AND type_id = $${paramCount}`;
            params.push(typeId);
            paramCount++;
        }

        if (typeIds && typeIds.length > 0) {
            sql += ` AND type_id = ANY($${paramCount})`;
            params.push(typeIds);
            paramCount++;
        }

        if (categories && categories.length > 0) {
            const catsLower = categories.map(c => c.toLowerCase());
            sql += ` AND LOWER(type_name) = ANY($${paramCount})`;
            params.push(catsLower);
            paramCount++;
        }

        if (minPrice !== null) {
            sql += ` AND price >= $${paramCount}`;
            params.push(minPrice);
            paramCount++;
        }

        if (maxPrice !== null) {
            sql += ` AND price <= $${paramCount}`;
            params.push(maxPrice);
            paramCount++;
        }

        if (featured !== null) {
            sql += ` AND featured = $${paramCount}`;
            params.push(featured);
            paramCount++;
        }

        if (onSale !== null) {
            const avg = await Product.getCachedAvgPrice();
            sql += ` AND price < $${paramCount}`;
            params.push(avg);
            paramCount++;
        }

        if (search) {
            sql += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR brand_name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        sql += ' ORDER BY featured DESC, created_at DESC';
        sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows;
    }

    // Contar productos (para paginación)
    static async count({ brandId = null, typeId = null, typeIds = null, categories = null, search = null, featured = null, onSale = null, active = true } = {}) {
        let sql = 'SELECT COUNT(*) FROM product_details WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (active !== null) {
            sql += ` AND is_active = $${paramCount}`;
            params.push(active);
            paramCount++;
        }

        if (brandId) {
            sql += ` AND brand_id = $${paramCount}`;
            params.push(brandId);
            paramCount++;
        }

        if (typeId) {
            sql += ` AND type_id = $${paramCount}`;
            params.push(typeId);
            paramCount++;
        }

        if (typeIds && typeIds.length > 0) {
            sql += ` AND type_id = ANY($${paramCount})`;
            params.push(typeIds);
            paramCount++;
        }

        if (categories && categories.length > 0) {
            const catsLower = categories.map(c => c.toLowerCase());
            sql += ` AND LOWER(type_name) = ANY($${paramCount})`;
            params.push(catsLower);
            paramCount++;
        }

        if (featured !== null) {
            sql += ` AND featured = $${paramCount}`;
            params.push(featured);
            paramCount++;
        }

        if (onSale !== null) {
            const avg = await Product.getCachedAvgPrice();
            sql += ` AND price < $${paramCount}`;
            params.push(avg);
            paramCount++;
        }

        if (search) {
            sql += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        const result = await query(sql, params);
        return parseInt(result.rows[0].count);
    }

    // Contar productos por categoría
    static async countByCategory() {
        const sql = `
            SELECT
                COALESCE(LOWER(pt.name), 'sin categoria') as category,
                COUNT(p.id) as count
            FROM products p
            LEFT JOIN product_types pt ON p.product_type_id = pt.id
            WHERE p.is_active = true
            GROUP BY LOWER(pt.name)
        `;
        const result = await query(sql);
        return result.rows;
    }

    // Actualizar producto
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const fieldMap = {
            name: 'name',
            description: 'description',
            price: 'price',
            stock: 'stock',
            brandId: 'brand_id',
            productTypeId: 'product_type_id',
            imageUrl: 'image_url',
            isActive: 'is_active',
            featured: 'featured'
        };

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                const dbField = fieldMap[key];
                if (dbField) {
                    fields.push(`${dbField} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const sql = `
            UPDATE products SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(sql, values);
        return result.rows[0];
    }

    // Eliminar producto (soft delete)
    static async delete(id) {
        const sql = 'UPDATE products SET is_active = false WHERE id = $1 RETURNING *';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Eliminar producto permanentemente
    static async hardDelete(id) {
        const sql = 'DELETE FROM products WHERE id = $1 RETURNING *';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Actualizar stock
    static async updateStock(id, quantity) {
        const sql = `
            UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, name, stock
        `;
        const result = await query(sql, [quantity, id]);
        return result.rows[0];
    }
}

module.exports = Product;
