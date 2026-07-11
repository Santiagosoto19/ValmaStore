const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('./database');

const initDatabase = async () => {
    try {
        console.log('🚀 Inicializando base de datos VALMA...\n');

        // Verificar conexión
        const connected = await testConnection();
        if (!connected) {
            console.error('No se pudo conectar a la base de datos. Verifica tu configuración.');
            process.exit(1);
        }

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '../../database.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar el script SQL
        console.log('📄 Ejecutando script SQL...');
        await pool.query(sql);

        console.log('\n✅ Base de datos inicializada correctamente');
        console.log('\n📋 Datos iniciales creados:');
        console.log('   - 10 marcas de maquillaje');
        console.log('   - 14 tipos de productos');
        console.log('   - Usuario admin (admin@valma.com / admin123)');

    } catch (err) {
        console.error('❌ Error inicializando la base de datos:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

// Ejecutar si se llama directamente
if (require.main === module) {
    initDatabase();
}

module.exports = { initDatabase };
