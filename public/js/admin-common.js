/**
 * Utilidades compartidas del panel de administración Valma
 */
(function (global) {
    'use strict';

    async function requireAdminSession(options = {}) {
        const { fast = false } = options;

        if (fast) {
            const cached = readCachedAdmin();
            if (cached) {
                verifyAdminInBackground();
                return cached;
            }
        }

        return verifyAdminNow();
    }

    function readCachedAdmin() {
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return null;
            const user = JSON.parse(raw);
            return user?.role === 'admin' ? user : null;
        } catch {
            return null;
        }
    }

    async function verifyAdminNow() {
        try {
            const response = await fetch('/api/auth/verify', { credentials: 'include' });
            const data = await response.json();

            if (!data.success || !data.data || data.data.role !== 'admin') {
                localStorage.removeItem('user');
                window.location.href = '/login';
                return null;
            }

            localStorage.setItem('user', JSON.stringify(data.data));
            return data.data;
        } catch (error) {
            console.error('Error verificando sesión admin:', error);
            window.location.href = '/login';
            return null;
        }
    }

    function verifyAdminInBackground() {
        fetch('/api/auth/verify', { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (!data.success || data.data?.role !== 'admin') {
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return;
                }
                localStorage.setItem('user', JSON.stringify(data.data));
            })
            .catch(() => {});
    }

    function formatPrice(price) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(Number(price) || 0);
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function resolveProductImage(imageUrl) {
        if (!imageUrl) return '/images/placeholder.png';
        if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl;
        return `/images/products/${imageUrl}`;
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function getStatusLabel(status) {
        const labels = {
            pending: 'Pendiente',
            confirmed: 'Confirmado',
            paid: 'Pagado',
            processing: 'En Proceso',
            shipped: 'Enviado',
            delivered: 'Entregado',
            cancelled: 'Cancelado'
        };
        return labels[status] || status;
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async function adminLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {}
        localStorage.removeItem('user');
        window.location.href = '/login';
    }

    function parseApiError(data, fallback = 'Error en la operación') {
        if (data?.message) return data.message;
        if (data?.errors?.[0]?.msg) return data.errors[0].msg;
        if (data?.details?.[0]?.msg) return data.details[0].msg;
        return fallback;
    }

    function showTableLoading(tbodyId, cols = 6) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="${cols}" class="admin-table-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;
    }

    function createAbortController(key) {
        if (!createAbortController._map) createAbortController._map = new Map();
        const prev = createAbortController._map.get(key);
        if (prev) prev.abort();
        const controller = new AbortController();
        createAbortController._map.set(key, controller);
        return controller;
    }

    global.AdminCommon = {
        requireAdminSession,
        formatPrice,
        formatDate,
        escapeHtml,
        resolveProductImage,
        showToast,
        getStatusLabel,
        debounce,
        adminLogout,
        parseApiError,
        showTableLoading,
        createAbortController
    };

    global.logout = adminLogout;
})(window);
