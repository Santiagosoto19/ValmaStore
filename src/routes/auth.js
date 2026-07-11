const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

// Rutas públicas
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);

// Rutas protegidas
router.get('/me', authenticate, authController.getProfile);
router.get('/verify', authenticate, authController.verifyToken);
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;
