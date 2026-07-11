/**
 * Generador unificado de mensajes WhatsApp para Valma.
 * Usa formato nativo de WhatsApp (*negrita*) sin emojis para maxima compatibilidad.
 */

const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(Number(price) || 0);
};

const SEPARATOR = '--------------------------------';

/**
 * Normaliza un item de carrito o pedido al formato interno.
 */
const normalizeItem = (item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(
        item.unit_price ?? item.price_at_time ?? item.price
    ) || 0;
    const lineTotal = Number(item.total_price) || (quantity * unitPrice);

    return {
        name: item.product_name || item.name || 'Producto',
        brand: item.brand_name || item.brand || null,
        quantity,
        lineTotal
    };
};

/**
 * Construye el mensaje de pedido/carrito listo para WhatsApp.
 */
const buildWhatsAppMessage = ({
    orderNumber = null,
    items = [],
    subtotal = null,
    total = null,
    customerName = null,
    shippingAddress = null,
    shippingCity = null,
    shippingPhone = null,
    notes = null
} = {}) => {
    const lines = [];
    const normalizedItems = items.map(normalizeItem);
    const computedSubtotal = subtotal ?? normalizedItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const computedTotal = total ?? computedSubtotal;

    lines.push(orderNumber ? `*VALMA | Pedido ${orderNumber}*` : '*VALMA | Solicitud de Pedido*');
    lines.push('');
    lines.push('Hola, me encantaría completar mi pedido.');
    lines.push('');

    if (customerName) lines.push(`*Cliente:* ${customerName}`);
    if (shippingPhone) lines.push(`*Teléfono:* ${shippingPhone}`);
    if (shippingAddress) {
        const city = shippingCity ? `, ${shippingCity}` : '';
        lines.push(`*Dirección:* ${shippingAddress}${city}`);
    }
    if (customerName || shippingPhone || shippingAddress) lines.push('');

    lines.push('*DETALLE DEL CARRITO*');
    lines.push(SEPARATOR);

    normalizedItems.forEach((item, index) => {
        lines.push(`*${index + 1}. ${item.name}*`);
        lines.push(`   Cantidad: ${item.quantity}`);
        lines.push(`   Precio: ${formatPrice(item.lineTotal)}`);
        if (item.brand) lines.push(`   Marca: ${item.brand}`);
        lines.push(SEPARATOR);
    });

    lines.push(`*Total a pagar:* ${formatPrice(computedTotal)}`);
    lines.push(SEPARATOR);
    lines.push('');

    if (notes) {
        lines.push(`*Notas:* ${notes}`);
        lines.push('');
    }

    lines.push('Quedo atento/a para coordinar el método de pago.');
    lines.push('');
    lines.push('Muchas gracias!');

    return lines.join('\n');
};

/**
 * Mensaje desde items de carrito (checkout directo).
 */
const buildCartWhatsAppMessage = (items, subtotal) => {
    return buildWhatsAppMessage({
        items,
        subtotal,
        total: subtotal
    });
};

/**
 * Mensaje desde pedido confirmado.
 */
const buildOrderWhatsAppMessage = (order, items) => {
    return buildWhatsAppMessage({
        orderNumber: order.order_number,
        items,
        total: order.total_amount,
        customerName: order.customer_name || null,
        shippingAddress: order.shipping_address,
        shippingCity: order.shipping_city,
        shippingPhone: order.shipping_phone,
        notes: order.notes
    });
};

/**
 * Genera URL wa.me con codificacion UTF-8 correcta.
 */
const buildWhatsAppUrl = (phone, message) => {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * Extrae el mensaje decodificado desde un enlace wa.me almacenado.
 */
const parseWhatsAppMessageFromLink = (link) => {
    if (!link) return '';
    try {
        const url = new URL(link);
        const text = url.searchParams.get('text');
        return text ? decodeURIComponent(text) : '';
    } catch {
        return '';
    }
};

module.exports = {
    formatPrice,
    buildWhatsAppMessage,
    buildCartWhatsAppMessage,
    buildOrderWhatsAppMessage,
    buildWhatsAppUrl,
    parseWhatsAppMessageFromLink
};
