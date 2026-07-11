const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/products-init', authenticate, requireAdmin, adminController.getProductsPageInit);

module.exports = router;
