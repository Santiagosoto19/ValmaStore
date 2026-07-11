/**
 * Prueba E2E de APIs del panel admin
 */
require('dotenv').config();

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@valma.com';
const ADMIN_PASSWORD = 'admin123';

let cookie = '';
let createdProductId = null;

async function req(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (cookie) headers.Cookie = cookie;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof String)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    let json = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, json };
}

function ok(name, condition, detail = '') {
    const status = condition ? 'PASS' : 'FAIL';
    console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`);
    return condition;
}

async function run() {
    console.log('=== Pruebas panel admin Valma ===\n');

    // Login
    const login = await req('/api/auth/login', {
        method: 'POST',
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    ok('Login admin', login.json?.success === true, login.json?.message || login.status);

    const verify = await req('/api/auth/verify');
    ok('Verify sesión admin', verify.json?.success && verify.json?.data?.role === 'admin');

    // Dashboard stats
    const stats = await req('/api/orders/stats/dashboard');
    ok('Stats dashboard', stats.json?.success && stats.json?.data !== undefined,
        stats.json?.success ? `pending=${stats.json.data.pending_count}` : stats.status);

    // Orders list
    const orders = await req('/api/orders?limit=5');
    ok('Listar pedidos', orders.json?.success && Array.isArray(orders.json?.data?.orders));
    const firstOrderId = orders.json?.data?.orders?.[0]?.id;

    if (firstOrderId) {
        const orderDetail = await req(`/api/orders/${firstOrderId}`);
        ok('Detalle pedido', orderDetail.json?.success && orderDetail.json?.data?.order?.id === firstOrderId);

        const statusUpdate = await req(`/api/orders/${firstOrderId}/status`, {
            method: 'PUT',
            body: { status: 'confirmed' }
        });
        ok('Actualizar estado pedido', statusUpdate.json?.success === true);

        await req(`/api/orders/${firstOrderId}/status`, { method: 'PUT', body: { status: 'pending' } });
    } else {
        console.log('SKIP detalle/estado pedido — no hay pedidos');
    }

    // Products admin list
    const adminProducts = await req('/api/products/admin/list?limit=5');
    ok('Listar productos admin', adminProducts.json?.success && Array.isArray(adminProducts.json?.data?.products));

    const brands = await req('/api/products/brands');
    ok('Listar marcas', brands.json?.success && brands.json?.data?.length > 0);
    const brandId = brands.json?.data?.[0]?.id;

    const types = await req('/api/products/types');
    ok('Listar tipos', types.json?.success && types.json?.data?.length > 0);
    const typeId = types.json?.data?.[0]?.id;

    // Create product
    const create = await req('/api/products', {
        method: 'POST',
        body: {
            name: 'Producto Test Admin',
            description: 'Prueba automatizada',
            price: 19900,
            stock: 10,
            brandId,
            productTypeId: typeId,
            featured: false,
            isActive: true
        }
    });
    ok('Crear producto', create.json?.success === true, create.json?.message);
    createdProductId = create.json?.data?.id;

    if (createdProductId) {
        const getOne = await req(`/api/products/${createdProductId}`);
        ok('Obtener producto', getOne.json?.success && getOne.json?.data?.name === 'Producto Test Admin');

        const update = await req(`/api/products/${createdProductId}`, {
            method: 'PUT',
            body: { name: 'Producto Test Admin Editado', stock: 5, isActive: false }
        });
        ok('Editar producto', update.json?.success === true);

        const toggle = await req(`/api/products/${createdProductId}`, {
            method: 'PUT',
            body: { isActive: true }
        });
        ok('Toggle activo producto', toggle.json?.success === true);

        const del = await req(`/api/products/${createdProductId}`, { method: 'DELETE' });
        ok('Desactivar producto', del.json?.success === true);
    }

    // Admin pages HTML
    for (const page of ['/admin', '/admin/productos', '/admin/pedidos', '/admin/marquee']) {
        const res = await fetch(`${BASE}${page}`);
        ok(`Página ${page}`, res.status === 200 && (await res.text()).includes('VALMA'));
    }

    console.log('\n=== Fin pruebas ===');
}

run().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
