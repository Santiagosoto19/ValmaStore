/**
 * Dashboard — Panel Admin Valma
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async () => {
        const user = await AdminCommon.requireAdminSession();
        if (!user) return;
        document.getElementById('userName').textContent = user.firstName || 'Administrador';
        loadDashboard();
    });

    async function loadDashboard() {
        await Promise.all([loadStats(), loadRecentOrders()]);
    }

    function animateCounter(element, target, duration = 1200, isCurrency = false) {
        const startTime = performance.now();
        function update(currentTime) {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * easeOut);
            element.textContent = isCurrency ? AdminCommon.formatPrice(current) : current.toLocaleString('es-CO');
            if (progress < 1) requestAnimationFrame(update);
            else element.textContent = isCurrency ? AdminCommon.formatPrice(target) : target.toLocaleString('es-CO');
        }
        requestAnimationFrame(update);
    }

    async function loadStats() {
        try {
            const response = await fetch('/api/orders/stats/dashboard', { credentials: 'include' });
            const data = await response.json();
            if (!data.success) {
                AdminCommon.showToast('Error al cargar estadísticas', 'error');
                return;
            }

            const stats = data.data;
            document.getElementById('statsGrid').innerHTML = `
                <div class="stat-card"><div class="stat-icon stat-icon-gold"><i class="fas fa-clock"></i></div><div class="stat-info"><span class="stat-value" data-target="${Number(stats.pending_count) || 0}">0</span><span class="stat-label">Pendientes</span></div></div>
                <div class="stat-card"><div class="stat-icon stat-icon-blue"><i class="fas fa-check-circle"></i></div><div class="stat-info"><span class="stat-value" data-target="${Number(stats.paid_count) || 0}">0</span><span class="stat-label">Pagados Hoy</span></div></div>
                <div class="stat-card"><div class="stat-icon stat-icon-green"><i class="fas fa-shopping-bag"></i></div><div class="stat-info"><span class="stat-value" data-target="${Number(stats.total_count) || 0}">0</span><span class="stat-label">Pedidos Hoy</span></div></div>
                <div class="stat-card"><div class="stat-icon stat-icon-pink"><i class="fas fa-dollar-sign"></i></div><div class="stat-info"><span class="stat-value" data-target="${Number(stats.total_revenue) || 0}" data-currency="true">$0</span><span class="stat-label">Ingresos Totales</span></div></div>
            `;

            document.querySelectorAll('.stat-card').forEach((card, i) => {
                card.classList.add('animate-in');
                const valueEl = card.querySelector('.stat-value');
                const target = Number(valueEl.dataset.target) || 0;
                setTimeout(() => animateCounter(valueEl, target, 1200, valueEl.dataset.currency === 'true'), i * 150 + 300);
            });
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            AdminCommon.showToast('Error al cargar estadísticas', 'error');
        }
    }

    async function loadRecentOrders() {
        try {
            const response = await fetch('/api/orders?limit=5', { credentials: 'include' });
            const data = await response.json();
            const tbody = document.getElementById('recentOrders');

            if (!data.success || !data.data.orders.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay pedidos recientes</td></tr>';
                return;
            }

            tbody.innerHTML = data.data.orders.map((order, index) => `
                <tr style="animation-delay:${index * 100}ms" class="animate-row">
                    <td><strong>#${AdminCommon.escapeHtml(order.order_number)}</strong></td>
                    <td>${AdminCommon.escapeHtml(order.customer_name || 'Invitado')}</td>
                    <td>${AdminCommon.formatPrice(order.total_amount)}</td>
                    <td><span class="status-badge status-${order.status}">${AdminCommon.getStatusLabel(order.status)}</span></td>
                    <td>${AdminCommon.formatDate(order.created_at)}</td>
                    <td><a href="/admin/pedidos" class="btn btn-sm btn-outline">Ver</a></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            AdminCommon.showToast('Error al cargar pedidos recientes', 'error');
        }
    }
})();
