const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderController');
const { optionalAuth } = require('../middleware/auth');
const { cartItemValidation } = require('../middleware/validation');

// Todas las rutas de carrito pueden funcionar con o sin autenticación
router.use(optionalAuth);
router.get('/', cartController.getOrCreateCart);

// Agregar item al carrito
router.post('/items', cartItemValidation, cartController.addItem);

// Actualizar cantidad de item
router.put('/items/:itemId', cartController.updateItemQuantity);

// Eliminar item del carrito
router.delete('/items/:itemId', cartController.removeItem);

// Vaciar carrito
router.delete('/', cartController.clearCart);

// Enlace de checkout por WhatsApp (solo preview)
router.get('/whatsapp-link', cartController.getWhatsAppLink);

// Crear pedido y abrir WhatsApp
router.post('/checkout-whatsapp', orderController.createWhatsAppCheckout);

module.exports = router;
