const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { productValidation, productFilterValidation, brandValidation, brandUpdateValidation } = require('../middleware/validation');

// Rutas públicas
router.get('/', productFilterValidation, productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/brands/admin/list', authenticate, requireAdmin, productController.getAdminBrands);
router.get('/brands', productController.getBrands);
router.get('/types', productController.getProductTypes);
router.get('/counts/by-category', productController.getProductCountsByCategory);
router.get('/admin/list', authenticate, requireAdmin, productController.getAdminProducts);
router.get('/:id', productController.getProductById);

// Rutas de administrador
router.post('/', authenticate, requireAdmin, productValidation, productController.createProduct);
router.put('/:id', authenticate, requireAdmin, productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, productController.deleteProduct);

// Rutas de administrador para marcas y tipos
router.post('/brands', authenticate, requireAdmin, brandValidation, productController.createBrand);
router.put('/brands/:id', authenticate, requireAdmin, brandUpdateValidation, productController.updateBrand);
router.patch('/brands/:id/status', authenticate, requireAdmin, productController.toggleBrandStatus);
router.post('/types', authenticate, requireAdmin, productController.createProductType);

module.exports = router;
