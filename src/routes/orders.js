const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { orderValidation, orderStatusValidation } = require('../middleware/validation');

// Rutas de administrador (especificas antes de /:id)
router.get('/stats/dashboard', authenticate, requireAdmin, orderController.getOrderStats);
router.get('/', authenticate, requireAdmin, orderController.getAllOrders);
router.put('/:id/status', authenticate, requireAdmin, orderStatusValidation, orderController.updateOrderStatus);
router.post('/:id/whatsapp', authenticate, requireAdmin, orderController.regenerateWhatsAppLink);

// Rutas para usuarios autenticados
router.post('/', authenticate, orderValidation, orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrderById);

module.exports = router;
