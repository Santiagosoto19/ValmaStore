const express = require('express');
const router = express.Router();

// Importar rutas
const authRoutes = require('./auth');
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const uploadRoutes = require('./upload');
const adminRoutes = require('./admin');

// Usar rutas
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin', adminRoutes);

// Ruta de salud
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Configuración pública (número WhatsApp, etc.)
router.get('/config/public', (req, res) => {
    const whatsappNumber = (process.env.WHATSAPP_NUMBER || '573001234567').replace(/\D/g, '');
    res.json({
        success: true,
        data: { whatsappNumber }
    });
});

module.exports = router;
