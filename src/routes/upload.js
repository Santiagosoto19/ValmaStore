const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { productImageUpload, handleUploadError } = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

router.post(
    '/product-image',
    authenticate,
    requireAdmin,
    productImageUpload.single('image'),
    handleUploadError,
    uploadController.uploadProductImage
);

module.exports = router;
