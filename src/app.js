const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const routes = require('./routes');
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas API
app.use('/api', routes);

// Rutas de vistas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/producto/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/register.html'));
});

app.get('/carrito', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/cart.html'));
});

app.get('/mis-pedidos', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/orders.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/profile.html'));
});

// Rutas de administrador
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/dashboard.html'));
});

app.get('/admin/productos', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/products.html'));
});

app.get('/admin/pedidos', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/orders.html'));
});

app.get('/admin/marquee', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/marquee.html'));
});

app.get('/admin/marcas', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/brands.html'));
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.name === 'MulterError') {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen no puede superar 5 MB'
            : 'Error al procesar la imagen';
        return res.status(400).json({ success: false, message });
    }
    if (err.message && err.message.includes('Solo se permiten imágenes')) {
        return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Iniciar servidor
const startServer = async () => {
    try {
        // Verificar conexión a base de datos
        const connected = await testConnection();
        if (!connected) {
            console.error('No se pudo conectar a la base de datos. El servidor se iniciará pero puede no funcionar correctamente.');
        }

        app.listen(PORT, () => {
            console.log(`\n🚀 Servidor VALMA iniciado en http://localhost:${PORT}`);
            console.log(`📁 Directorio: ${path.resolve(__dirname, '..')}`);
            console.log('\n📋 Rutas disponibles:');
            console.log(`   - Tienda: http://localhost:${PORT}/`);
            console.log(`   - Login: http://localhost:${PORT}/login`);
            console.log(`   - Admin: http://localhost:${PORT}/admin`);
            console.log(`   - API: http://localhost:${PORT}/api`);
        });
    } catch (err) {
        console.error('Error iniciando servidor:', err);
        process.exit(1);
    }
};

module.exports = app;

if (require.main === module) {
    startServer();
}
