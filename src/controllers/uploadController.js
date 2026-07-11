const { apiResponse } = require('../utils/helpers');
const { saveProductImage, resolvePublicImageUrl } = require('../utils/imageStorage');

function getPublicBaseUrl(req) {
    if (process.env.BASE_URL) {
        return process.env.BASE_URL.replace(/\/$/, '');
    }
    return `${req.protocol}://${req.get('host')}`;
}

const uploadProductImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json(apiResponse(false, null, 'No se recibió ninguna imagen'));
        }

        const saved = await saveProductImage(req.file);
        const absoluteUrl = resolvePublicImageUrl(saved.url, getPublicBaseUrl(req)) || saved.url;

        res.status(201).json(apiResponse(true, {
            url: absoluteUrl,
            path: saved.path,
            filename: saved.filename,
            provider: saved.provider
        }, 'Imagen subida exitosamente'));
    } catch (error) {
        console.error('Error subiendo imagen:', error.message);
        res.status(500).json(apiResponse(false, null, 'Error al subir la imagen'));
    }
};

module.exports = { uploadProductImage, getPublicBaseUrl };
