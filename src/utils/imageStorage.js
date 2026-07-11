const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const UPLOAD_DIR = path.join(__dirname, '../../public/images/products');

function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
}

function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: process.env.CLOUDINARY_FOLDER || 'valma/products',
                resource_type: 'image',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }]
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
}

async function saveProductImage(file) {
    if (isCloudinaryConfigured()) {
        const result = await uploadToCloudinary(file.buffer);
        return {
            url: result.secure_url,
            path: result.secure_url,
            filename: result.public_id,
            provider: 'cloudinary'
        };
    }

    ensureUploadDir();
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    const relativePath = `/images/products/${filename}`;
    return {
        url: relativePath,
        path: relativePath,
        filename,
        provider: 'local'
    };
}

function resolvePublicImageUrl(relativeOrAbsoluteUrl, baseUrl) {
    if (!relativeOrAbsoluteUrl) return null;
    if (relativeOrAbsoluteUrl.startsWith('http')) return relativeOrAbsoluteUrl;
    const base = (baseUrl || '').replace(/\/$/, '');
    return `${base}${relativeOrAbsoluteUrl}`;
}

module.exports = {
    saveProductImage,
    resolvePublicImageUrl,
    isCloudinaryConfigured,
    UPLOAD_DIR
};
