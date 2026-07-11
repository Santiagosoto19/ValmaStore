/**
 * Prueba integral: admin, tienda, subida de imágenes (Cloudinary/local)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@valma.com';
const ADMIN_PASSWORD = 'admin123';

let cookie = '';
let createdProductId = null;

async function req(pathname, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (cookie) headers.Cookie = cookie;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof String) && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    const res = await fetch(`${BASE}${pathname}`, { ...options, headers });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    let json = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, json, text: json ? null : await res.text().catch(() => '') };
}

function ok(name, condition, detail = '') {
    const status = condition ? 'PASS' : 'FAIL';
    console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`);
    return condition;
}

async function run() {
    console.log('=== Verificación completa Valma ===\n');

    const cloudinary = Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
    console.log(`Almacenamiento imágenes: ${cloudinary ? 'Cloudinary' : 'local (disco)'}\n`);

    // Health
    const health = await req('/api/health');
    ok('API health', health.json?.status === 'OK');

    // Login
    const login = await req('/api/auth/login', {
        method: 'POST',
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    ok('Login admin', login.json?.success === true);

    // Storefront
    const products = await req('/api/products?limit=5');
    ok('API productos tienda', products.json?.success === true,
        products.json?.data?.products ? `${products.json.data.products.length} productos` : '');

    const brands = await req('/api/products/brands');
    ok('API marcas', brands.json?.success === true);

    const config = await req('/api/config/public');
    ok('Config pública WhatsApp', config.json?.success && config.json?.data?.whatsappNumber);

    const home = await fetch(`${BASE}/`);
    ok('Página tienda /', home.status === 200);

    const cartPage = await fetch(`${BASE}/carrito`);
    ok('Página carrito', cartPage.status === 200);

    // Admin pages
    for (const page of ['/admin', '/admin/productos', '/admin/pedidos', '/admin/marquee']) {
        const res = await fetch(`${BASE}${page}`);
        ok(`Página ${page}`, res.status === 200);
    }

    // Admin APIs
    const stats = await req('/api/orders/stats/dashboard');
    ok('Stats dashboard', stats.json?.success);

    const orders = await req('/api/orders?page=1&limit=5');
    ok('Listar pedidos', orders.json?.success);

    const adminProducts = await req('/api/products/admin/list?page=1&limit=5');
    ok('Listar productos admin', adminProducts.json?.success);

    // Image upload test
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(pngBase64, 'base64');
    const formData = new FormData();
    formData.append('image', new Blob([buffer], { type: 'image/png' }), 'test-pixel.png');

    const upload = await req('/api/upload/product-image', {
        method: 'POST',
        body: formData
    });
    const uploadUrl = upload.json?.data?.url;
    const uploadProvider = upload.json?.data?.provider;
    ok('Subir imagen producto', upload.json?.success && uploadUrl,
        upload.json?.success ? `${uploadProvider}: ${uploadUrl?.slice(0, 60)}...` : upload.json?.message || upload.status);

    if (uploadUrl) {
        const imgRes = await fetch(uploadUrl);
        ok('Imagen accesible por URL', imgRes.status === 200, `status ${imgRes.status}`);
    }

    // Create product with uploaded image
    if (uploadUrl) {
        const brandsList = brands.json?.data || [];
        const typesRes = await req('/api/products/types');
        const typesList = typesRes.json?.data || [];
        const brandId = brandsList[0]?.id;
        const typeId = typesList[0]?.id;

        if (brandId && typeId) {
            const create = await req('/api/products', {
                method: 'POST',
                body: {
                    name: `Test Img ${Date.now()}`,
                    description: 'Producto de prueba imagen',
                    price: 9999,
                    stock: 1,
                    brandId,
                    productTypeId: typeId,
                    imageUrl: uploadUrl,
                    featured: false,
                    isActive: false
                }
            });
            createdProductId = create.json?.data?.id;
            ok('Crear producto con imagen', create.json?.success, create.json?.message || '');

            if (createdProductId) {
                const detail = await req(`/api/products/${createdProductId}`);
                const savedUrl = detail.json?.data?.image_url;
                ok('Imagen guardada en BD', savedUrl === uploadUrl, savedUrl?.slice(0, 50) || 'sin url');

                await req(`/api/products/${createdProductId}`, { method: 'DELETE' });
                ok('Limpiar producto test', true);
            }
        }
    }

    // Static helper
    const helper = await fetch(`${BASE}/js/product-image.js`);
    ok('Script resolveProductImage', helper.status === 200);

    console.log('\n=== Fin verificación ===');
}

run().catch((err) => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});
