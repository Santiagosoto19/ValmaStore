const { Pool } = require('pg');
require('dotenv').config();

const p = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'valma_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
        }
);

async function main() {
    // 1. Ver si la vista existe
    const views = await p.query(
        "SELECT table_name, table_type FROM information_schema.tables WHERE table_name IN ('product_details','products','product_types') AND table_schema='public'"
    );
    console.log('Tablas/Vistas:', JSON.stringify(views.rows));

    // 2. Probar query a product_details
    try {
        const r = await p.query('SELECT id, type_id, type_name FROM product_details LIMIT 3');
        console.log('product_details OK:', JSON.stringify(r.rows));
    } catch(e) {
        console.error('Error en product_details:', e.message);
    }

    // 3. Contar productos con tipo asignado
    try {
        const c = await p.query('SELECT COUNT(*) FROM products WHERE product_type_id IS NOT NULL');
        console.log('Productos con tipo:', c.rows[0].count);
    } catch(e) {
        console.error('Error contando:', e.message);
    }

    await p.end();
}

main().catch(e => { console.error('FATAL:', e.message); p.end(); });
