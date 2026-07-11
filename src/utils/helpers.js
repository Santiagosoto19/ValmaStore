// Generar ID de sesión único
const generateSessionId = () => {
    return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const {
    buildOrderWhatsAppMessage,
    buildWhatsAppUrl,
    formatPrice
} = require('./whatsappMessage');

// Formatear fecha
const formatDate = (date, options = {}) => {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    return new Date(date).toLocaleDateString('es-CO', defaultOptions);
};

// Generar link de WhatsApp
const generateWhatsAppLink = (phone, message) => buildWhatsAppUrl(phone, message);

// Generar mensaje de pedido para WhatsApp
const generateOrderMessage = (order, items) => buildOrderWhatsAppMessage(order, items);

// Sanitizar string para búsqueda
const sanitizeSearch = (search) => {
    if (!search) return '';
    return search
        .trim()
        .replace(/[%_]/g, '')
        .substring(0, 100);
};

// Paginación
const paginate = (page, limit = 20) => {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    return { page: pageNum, limit: limitNum, offset };
};

// Respuesta estándar de API
const apiResponse = (success, data = null, message = '', errors = null) => {
    const response = { success };
    if (data !== null) response.data = data;
    if (message) response.message = message;
    if (errors) response.errors = errors;
    return response;
};

// Slugify (para URLs amigables)
const slugify = (text) => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

// Validar email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Truncar texto
const truncate = (text, length = 100) => {
    if (!text || text.length <= length) return text;
    return text.substring(0, length).trim() + '...';
};

module.exports = {
    generateSessionId,
    formatPrice,
    formatDate,
    generateWhatsAppLink,
    generateOrderMessage,
    sanitizeSearch,
    paginate,
    apiResponse,
    slugify,
    isValidEmail,
    truncate
};
