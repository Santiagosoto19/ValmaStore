const multer = require('multer');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const fileFilter = (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG, WebP o GIF'), false);
    }
};

const productImageUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

function handleUploadError(err, req, res, next) {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'La imagen no puede superar 5 MB' });
    }
    return res.status(400).json({ success: false, message: err.message || 'Error al subir la imagen' });
}

module.exports = { productImageUpload, handleUploadError };
