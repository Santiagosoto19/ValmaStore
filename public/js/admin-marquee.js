(function () {
    'use strict';

    const MARQUEE_STORAGE_KEY = 'valma_marquee_messages';
    const MARQUEE_COLOR_KEY = 'valma_marquee_color';
    const MARQUEE_SPEED_KEY = 'valma_marquee_speed';
    const DEFAULT_COLOR = '#c0006a';
    const DEFAULT_MARQUEE_MESSAGES = [
        'Envío gratis en compras mayores a $150.000',
        '20% de descuento en labiales esta semana',
        'Regalo sorpresa en tu primera compra',
        'Pagos seguros garantizados'
    ];
    const SPEED_MAP = { slow: 40, normal: 25, fast: 12 };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    function getMarqueeMessages() {
        try {
            const stored = localStorage.getItem(MARQUEE_STORAGE_KEY);
            if (stored !== null) return JSON.parse(stored);
        } catch (e) {}
        return [...DEFAULT_MARQUEE_MESSAGES];
    }

    function saveMarqueeMessagesToStorage(messages) {
        localStorage.setItem(MARQUEE_STORAGE_KEY, JSON.stringify(messages));
    }

    function getMarqueeColor() {
        return localStorage.getItem(MARQUEE_COLOR_KEY) || DEFAULT_COLOR;
    }

    function getMarqueeSpeed() {
        return localStorage.getItem(MARQUEE_SPEED_KEY) || 'normal';
    }

    function renderMarqueePreview() {
        const bar = document.getElementById('marqueePreviewLive');
        const content = document.getElementById('marqueePreviewContent');
        if (!bar || !content) return;

        const messages = getMarqueeMessages();
        const picker = document.getElementById('marqueeColorPicker');
        const activeSpeedBtn = document.querySelector('.speed-btn.active');
        const color = picker ? picker.value : getMarqueeColor();
        const speed = activeSpeedBtn ? activeSpeedBtn.dataset.speed : getMarqueeSpeed();
        const duration = SPEED_MAP[speed] || 25;

        bar.style.background = color;

        if (messages.length === 0) {
            content.classList.add('is-static');
            content.innerHTML = '<span class="marquee-item">No hay mensajes configurados</span>';
            content.style.animation = 'none';
            return;
        }

        content.classList.remove('is-static');
        content.style.animation = `marqueeScroll ${duration}s linear infinite`;
        const separator = '<span class="marquee-separator"> ✦ </span>';
        const allMessages = [...messages, ...messages, ...messages];
        content.innerHTML = allMessages.map(msg =>
            `<span class="marquee-item">${separator} ${escapeHtml(msg)}</span>`
        ).join('');
    }

    function renderMessagesList() {
        const container = document.getElementById('marqueeMessagesAdmin');
        if (!container) return;

        const messages = getMarqueeMessages();
        if (messages.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay mensajes configurados</p>';
            return;
        }

        container.innerHTML = messages.map((msg, index) => `
            <div class="marquee-admin-item">
                <span class="msg-number">${index + 1}</span>
                <span class="msg-text">${escapeHtml(msg)}</span>
                <div class="msg-actions">
                    <button type="button" class="btn-icon btn-edit" data-action="edit" data-index="${index}" title="Editar">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button type="button" class="btn-icon btn-delete" data-action="delete" data-index="${index}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function addMarqueeMessage() {
        const input = document.getElementById('newMarqueeMessage');
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) {
            showToast('Escribe un mensaje', 'error');
            return;
        }
        const messages = getMarqueeMessages();
        messages.push(msg);
        saveMarqueeMessagesToStorage(messages);
        renderMessagesList();
        renderMarqueePreview();
        input.value = '';
        showToast('Mensaje agregado', 'success');
    }

    function editMarqueeMessage(index) {
        const messages = getMarqueeMessages();
        const current = messages[index];
        if (current === undefined) return;
        const newMsg = prompt('Editar mensaje:', current);
        if (newMsg === null) return;
        const trimmed = newMsg.trim();
        if (!trimmed) {
            showToast('El mensaje no puede estar vacío', 'error');
            return;
        }
        messages[index] = trimmed;
        saveMarqueeMessagesToStorage(messages);
        renderMessagesList();
        renderMarqueePreview();
        showToast('Mensaje actualizado', 'success');
    }

    function deleteMarqueeMessage(index) {
        if (!confirm('¿Eliminar este mensaje?')) return;
        const messages = getMarqueeMessages();
        messages.splice(index, 1);
        saveMarqueeMessagesToStorage(messages);
        renderMessagesList();
        renderMarqueePreview();
        showToast('Mensaje eliminado', 'info');
    }

    function updateMarqueeColor() {
        const picker = document.getElementById('marqueeColorPicker');
        const valueSpan = document.getElementById('marqueeColorValue');
        if (picker && valueSpan) {
            valueSpan.textContent = picker.value;
            renderMarqueePreview();
        }
    }

    function setMarqueeSpeed(speed) {
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.speed === speed);
        });
        renderMarqueePreview();
    }

    function loadSettingsUI() {
        const color = getMarqueeColor();
        const speed = getMarqueeSpeed();
        const picker = document.getElementById('marqueeColorPicker');
        const valueSpan = document.getElementById('marqueeColorValue');
        if (picker) picker.value = color;
        if (valueSpan) valueSpan.textContent = color;
        setMarqueeSpeed(speed);
    }

    function saveMarqueeSettings() {
        const picker = document.getElementById('marqueeColorPicker');
        const activeSpeedBtn = document.querySelector('.speed-btn.active');
        if (picker) localStorage.setItem(MARQUEE_COLOR_KEY, picker.value);
        if (activeSpeedBtn) localStorage.setItem(MARQUEE_SPEED_KEY, activeSpeedBtn.dataset.speed);
        renderMarqueePreview();
        showToast('Configuración guardada', 'success');
    }

    function resetMarqueeDefaults() {
        if (!confirm('¿Restaurar configuración por defecto?')) return;
        localStorage.setItem(MARQUEE_STORAGE_KEY, JSON.stringify(DEFAULT_MARQUEE_MESSAGES));
        localStorage.setItem(MARQUEE_COLOR_KEY, DEFAULT_COLOR);
        localStorage.setItem(MARQUEE_SPEED_KEY, 'normal');
        renderMessagesList();
        renderMarqueePreview();
        loadSettingsUI();
        showToast('Configuración restaurada', 'info');
    }

    function bindEvents() {
        document.getElementById('btnAddMarqueeMessage')?.addEventListener('click', addMarqueeMessage);

        document.getElementById('newMarqueeMessage')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                addMarqueeMessage();
            }
        });

        document.getElementById('marqueeColorPicker')?.addEventListener('input', updateMarqueeColor);
        document.getElementById('marqueeColorPicker')?.addEventListener('change', updateMarqueeColor);

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => setMarqueeSpeed(btn.dataset.speed));
        });

        document.getElementById('btnSaveMarqueeSettings')?.addEventListener('click', saveMarqueeSettings);
        document.getElementById('btnResetMarqueeDefaults')?.addEventListener('click', resetMarqueeDefaults);
        document.getElementById('btnAdminLogout')?.addEventListener('click', () => AdminCommon.adminLogout());

        document.getElementById('marqueeMessagesAdmin')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-action]');
            if (!button) return;
            const index = Number(button.dataset.index);
            if (Number.isNaN(index)) return;
            if (button.dataset.action === 'edit') editMarqueeMessage(index);
            if (button.dataset.action === 'delete') deleteMarqueeMessage(index);
        });
    }

    function initMarqueeAdmin() {
        renderMarqueePreview();
        renderMessagesList();
        loadSettingsUI();
        bindEvents();
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const user = await AdminCommon.requireAdminSession();
        if (!user) return;
        const userName = document.getElementById('userName');
        if (userName) userName.textContent = user.firstName || 'Administrador';
        initMarqueeAdmin();
    });
})();
