const { Pool } = require('pg');
require('dotenv').config();

const poolOptions = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'valma_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '4231',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolOptions);

// Manejo de errores en el pool
pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err);
    process.exit(-1);
});

// Función para ejecutar queries
const query = (text, params) => pool.query(text, params);

// Función para obtener un cliente del pool
const getClient = () => pool.connect();

// Verificar conexión
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        console.log('Conexión a PostgreSQL exitosa');
        console.log(' Hora del servidor:', result.rows[0].current_time);
        client.release();
        return true;
    } catch (err) {
        console.error('Error conectando a PostgreSQL:', err.message);
        return false;
    }
};

module.exports = {
    pool,
    query,
    getClient,
    testConnection
};
