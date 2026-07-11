/**
 * Asegura que exista el usuario admin con contraseña conocida.
 * Uso: node scripts/ensure-admin.js [password]
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, testConnection } = require('../src/config/database');

const ADMIN_EMAIL = 'admin@valma.com';
const ADMIN_PASSWORD = process.argv[2] || 'admin123';

async function ensureAdmin() {
    const ok = await testConnection();
    if (!ok) process.exit(1);

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const existing = await query('SELECT id, email FROM users WHERE email = $1', [ADMIN_EMAIL]);

    if (existing.rows.length) {
        await query(
            'UPDATE users SET password = $1, role = $2, first_name = $3, last_name = $4 WHERE email = $5',
            [hash, 'admin', 'Administrador', 'Valma', ADMIN_EMAIL]
        );
        console.log(`Admin actualizado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
        await query(
            `INSERT INTO users (first_name, last_name, email, password, phone, role)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['Administrador', 'Valma', ADMIN_EMAIL, hash, '3001234567', 'admin']
        );
        console.log(`Admin creado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    }

    process.exit(0);
}

ensureAdmin().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
