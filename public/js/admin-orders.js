/**
 * Gestión de pedidos — Panel Admin Valma (optimizado)
 */
(function () {
    'use strict';

    let currentPage = 1;

    const STATUS_FLOW = ['pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered'];
    const STATUS_ICONS = {
        pending: 'clock',
        confirmed: 'check',
        paid: 'dollar-sign',
        processing: 'cog',
        shipped: 'truck',
        delivered: 'check-double',
        cancelled: 'times'
    };

    let statsRendered = false;

    document.addEventListener('DOMContentLoaded', () => {
        bindEvents();
        initPage();
    });

    async function initPage() {
        const user = await AdminCommon.requireAdminSession({ fast: true });
        if (!user) return;
        loadOrders(1);
    }

    function bindEvents() {
        document.getElementById('orderModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'orderModal') closeOrderModal();
        });
        document.getElementById('searchInput')?.addEventListener('input', AdminCommon.debounce(() => loadOrders(1), 350));
    }

    async function loadOrders(page = 1) {
        currentPage = page;
        const status = document.getElementById('statusFilter').value;
        const search = document.getElementById('searchInput').value.trim();
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        AdminCommon.showTableLoading('ordersTable', 7);

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: '10'
            });
            if (!statsRendered) params.set('includeStats', 'true');
            if (status) params.set('status', status);
            if (search) params.set('search', search);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);

            const signal = AdminCommon.createAbortController('orders-list').signal;
            const response = await fetch(`/api/orders?${params}`, { credentials: 'include', signal });
            const data = await response.json();

            if (!data.success) {
                AdminCommon.showToast('Error al cargar pedidos', 'error');
                return;
            }

            renderOrders(data.data.orders);
            renderPagination(data.data.pagination);
            if (data.data.stats && !statsRendered) {
                requestAnimationFrame(() => {
                    renderOrderStats(data.data.stats);
                    statsRendered = true;
                });
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            AdminCommon.showToast('Error al cargar pedidos', 'error');
        }
    }

    function renderOrderStats(s) {
        const grid = document.getElementById('orderStats');
        grid.innerHTML = `
            <div class="stat-card"><div class="stat-icon stat-icon-blue"><i class="fas fa-shopping-bag"></i></div><div class="stat-info"><span class="stat-value">${Number(s.total_count) || 0}</span><span class="stat-label">Total Pedidos Hoy</span></div></div>
            <div class="stat-card"><div class="stat-icon stat-icon-gold"><i class="fas fa-clock"></i></div><div class="stat-info"><span class="stat-value">${Number(s.pending_count) || 0}</span><span class="stat-label">Pendientes</span></div></div>
            <div class="stat-card"><div class="stat-icon stat-icon-pink"><i class="fas fa-check-circle"></i></div><div class="stat-info"><span class="stat-value">${Number(s.paid_count) || 0}</span><span class="stat-label">Pagados Hoy</span></div></div>
            <div class="stat-card"><div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div><div class="stat-info"><span class="stat-value">${AdminCommon.formatPrice(s.total_revenue)}</span><span class="stat-label">Ingresos Hoy</span></div></div>
        `;
        grid.classList.remove('stats-grid--hidden');
    }

    function clearOrderFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        loadOrders(1);
        AdminCommon.showToast('Filtros limpiados', 'info');
    }

    function getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    function renderOrders(orders) {
        const tbody = document.getElementById('ordersTable');
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron pedidos</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map((order) => {
            const phone = order.customer_phone || order.shipping_phone || '';
            const waLink = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '';
            const statusIcon = STATUS_ICONS[order.status] || 'circle';
            return `
                <tr>
                    <td><span class="order-number">#${order.order_number}</span></td>
                    <td>
                        <div class="customer-cell">
                            <div class="customer-avatar">${getInitials(order.customer_name)}</div>
                            <span>${AdminCommon.escapeHtml(order.customer_name || 'Invitado')}</span>
                        </div>
                    </td>
                    <td>
                        <div class="contact-cell">
                            <span>${phone || '-'}</span>
                            ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="whatsapp-link"><i class="fab fa-whatsapp"></i></a>` : ''}
                        </div>
                    </td>
                    <td><strong>${AdminCommon.formatPrice(order.total_amount)}</strong></td>
                    <td><span class="status-badge status-${order.status}"><i class="fas fa-${statusIcon}"></i> ${AdminCommon.getStatusLabel(order.status)}</span></td>
                    <td>${AdminCommon.formatDate(order.created_at)}</td>
                    <td><button type="button" class="btn-icon btn-view" onclick="AdminOrders.viewOrderDetails(${order.id})" title="Ver detalle"><i class="fas fa-eye"></i></button></td>
                </tr>
            `;
        }).join('');
    }

    function renderPagination(pagination) {
        const container = document.getElementById('pagination');
        if (!pagination || pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        let html = `<button class="page-btn ${pagination.page === 1 ? 'disabled' : ''}" onclick="AdminOrders.loadOrders(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
        const maxVisible = 5;
        let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
        let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="AdminOrders.loadOrders(${i})">${i}</button>`;
        }
        html += `<button class="page-btn ${pagination.page === pagination.totalPages ? 'disabled' : ''}" onclick="AdminOrders.loadOrders(${pagination.page + 1})" ${pagination.page === pagination.totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
        container.innerHTML = html;
    }

    async function viewOrderDetails(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
            const data = await response.json();
            if (!data.success) {
                AdminCommon.showToast('Error al cargar detalles', 'error');
                return;
            }

            const { order, items, statusHistory } = data.data;
            const currentIndex = STATUS_FLOW.indexOf(order.status);

            document.getElementById('orderModalBody').innerHTML = `
                <div class="order-detail">
                    <div class="order-modal-header">
                        <div class="order-modal-title">
                            <h3>Pedido #${order.order_number}</h3>
                            <span class="status-badge status-${order.status}">
                                <i class="fas fa-${STATUS_ICONS[order.status]}"></i> ${AdminCommon.getStatusLabel(order.status)}
                            </span>
                        </div>
                    </div>
                    <div class="order-detail-grid">
                        <div class="order-info-section">
                            <h4><i class="fas fa-user"></i> Cliente</h4>
                            <p><strong>${AdminCommon.escapeHtml(order.customer_name || 'Invitado')}</strong></p>
                            <p>${AdminCommon.escapeHtml(order.customer_email || '-')}</p>
                            <p>${order.customer_phone || order.shipping_phone || '-'}</p>
                        </div>
                        <div class="order-info-section">
                            <h4><i class="fas fa-map-marker-alt"></i> Envío</h4>
                            <p>${AdminCommon.escapeHtml(order.shipping_address || '-')}</p>
                            <p>${AdminCommon.escapeHtml(order.shipping_city || '-')}</p>
                        </div>
                    </div>
                    <div class="order-items-section">
                        <h4><i class="fas fa-box"></i> Productos</h4>
                        <div class="order-items-table">
                            ${items.map(item => `
                                <div class="order-item-row-detailed">
                                    <div class="order-item-product">
                                        <img src="${AdminCommon.resolveProductImage(item.image_url)}" alt="" class="order-item-img" loading="lazy" decoding="async" width="40" height="40">
                                        <div class="order-item-info">
                                            <span class="order-item-name">${AdminCommon.escapeHtml(item.product_name)}</span>
                                        </div>
                                    </div>
                                    <span class="order-item-qty">${item.quantity}</span>
                                    <span class="order-item-subtotal">${AdminCommon.formatPrice(item.total_price)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-total-detailed">
                            <span>Total</span>
                            <span class="order-total-amount">${AdminCommon.formatPrice(order.total_amount)}</span>
                        </div>
                    </div>
                    <div class="order-actions-section">
                        <h4><i class="fas fa-cog"></i> Actualizar Estado</h4>
                        <div class="status-actions-group">${renderNextStatusButtons(order)}</div>
                        ${order.whatsapp_link || order.whatsapp_message ? `
                            <div class="whatsapp-message-preview">
                                <pre class="whatsapp-message-text" id="whatsappMessage-${order.id}">${AdminCommon.escapeHtml(getWhatsAppMessage(order))}</pre>
                                <button type="button" class="btn btn-outline btn-sm" onclick="AdminOrders.copyWhatsAppMessage(${order.id})"><i class="fas fa-copy"></i> Copiar</button>
                                ${order.whatsapp_link ? `<a href="${order.whatsapp_link}" target="_blank" rel="noopener" class="btn btn-whatsapp"><i class="fab fa-whatsapp"></i> Abrir WhatsApp</a>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            document.getElementById('orderModal').classList.add('active');
        } catch {
            AdminCommon.showToast('Error al cargar detalles', 'error');
        }
    }

    function renderNextStatusButtons(order) {
        if (order.status === 'cancelled' || order.status === 'delivered') {
            return `<p class="text-muted">Pedido ${order.status === 'cancelled' ? 'cancelado' : 'entregado'}.</p>`;
        }
        const idx = STATUS_FLOW.indexOf(order.status);
        let buttons = '';
        if (idx >= 0 && idx < STATUS_FLOW.length - 1) {
            const next = STATUS_FLOW[idx + 1];
            buttons += `<button type="button" class="btn btn-primary" onclick="AdminOrders.updateOrderStatus(${order.id}, '${next}')"><i class="fas fa-${STATUS_ICONS[next]}"></i> ${AdminCommon.getStatusLabel(next)}</button>`;
        }
        buttons += `<button type="button" class="btn btn-danger" onclick="AdminOrders.updateOrderStatus(${order.id}, 'cancelled')"><i class="fas fa-times"></i> Cancelar</button>`;
        return buttons;
    }

    async function updateOrderStatus(orderId, status) {
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (data.success) {
                AdminCommon.showToast('Estado actualizado', 'success');
                closeOrderModal();
                loadOrders(currentPage);
            } else {
                AdminCommon.showToast(AdminCommon.parseApiError(data, 'Error al actualizar'), 'error');
            }
        } catch {
            AdminCommon.showToast('Error de conexión', 'error');
        }
    }

    function closeOrderModal() {
        document.getElementById('orderModal').classList.remove('active');
    }

    function getWhatsAppMessage(order) {
        if (order.whatsapp_message) return order.whatsapp_message;
        if (!order.whatsapp_link) return '';
        try {
            const url = new URL(order.whatsapp_link);
            const text = url.searchParams.get('text');
            return text ? decodeURIComponent(text) : '';
        } catch {
            return '';
        }
    }

    async function copyWhatsAppMessage(orderId) {
        const el = document.getElementById(`whatsappMessage-${orderId}`);
        if (!el) return;
        try {
            await navigator.clipboard.writeText(el.textContent);
            AdminCommon.showToast('Mensaje copiado', 'success');
        } catch {
            AdminCommon.showToast('No se pudo copiar', 'error');
        }
    }

    window.AdminOrders = {
        loadOrders,
        viewOrderDetails,
        updateOrderStatus,
        copyWhatsAppMessage,
        closeOrderModal,
        clearOrderFilters
    };
    window.loadOrders = loadOrders;
    window.clearOrderFilters = clearOrderFilters;
    window.closeOrderModal = closeOrderModal;
})();
