/**
 * Gestión de marcas — Panel Admin Valma
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async () => {
        const user = await AdminCommon.requireAdminSession({ fast: true });
        if (!user) return;
        bindEvents();
        loadBrands();
    });

    function bindEvents() {
        document.getElementById('btnOpenBrandModal')?.addEventListener('click', () => openBrandModal());
        document.getElementById('btnCloseBrandModal')?.addEventListener('click', closeBrandModal);
        document.getElementById('btnCancelBrand')?.addEventListener('click', closeBrandModal);
        document.getElementById('brandForm')?.addEventListener('submit', saveBrand);
        document.getElementById('brandActive')?.addEventListener('change', syncBrandActiveUI);
        document.getElementById('brandModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'brandModal') closeBrandModal();
        });
    }

    function syncBrandActiveUI() {
        const isActive = document.getElementById('brandActive')?.checked ?? true;
        const row = document.getElementById('brandVisibilityRow');
        const icon = document.getElementById('brandActiveIcon');
        const label = document.getElementById('brandActiveLabel');
        const hint = document.getElementById('brandActiveHint');

        row?.classList.toggle('is-inactive', !isActive);
        if (icon) {
            icon.className = isActive ? 'fas fa-eye' : 'fas fa-eye-slash';
        }
        if (label) {
            label.textContent = isActive ? 'Marca activa' : 'Marca inactiva';
        }
        if (hint) {
            hint.textContent = isActive
                ? 'Visible en la tienda y formulario de productos'
                : 'Oculta en la tienda y formulario de productos';
        }
    }

    async function loadBrands() {
        AdminCommon.showTableLoading('brandsTable', 5);
        try {
            const response = await fetch('/api/products/brands/admin/list', { credentials: 'include' });
            const data = await response.json();
            if (!data.success) {
                AdminCommon.showToast(AdminCommon.parseApiError(data, 'Error al cargar marcas'), 'error');
                return;
            }
            renderBrands(data.data || []);
        } catch (error) {
            AdminCommon.showToast('Error al cargar marcas', 'error');
        }
    }

    function renderBrands(brands) {
        const tbody = document.getElementById('brandsTable');
        if (!brands.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay marcas registradas</td></tr>';
            return;
        }

        tbody.innerHTML = brands.map(brand => {
            const isActive = brand.is_active !== false;
            return `
                <tr>
                    <td><strong>${AdminCommon.escapeHtml(brand.name)}</strong></td>
                    <td>${AdminCommon.escapeHtml(brand.description || '—')}</td>
                    <td>${Number(brand.product_count) || 0}</td>
                    <td>
                        <span class="status-badge ${isActive ? 'status-delivered' : 'status-cancelled'}">
                            ${isActive ? 'Activa' : 'Inactiva'}
                        </span>
                    </td>
                    <td class="table-actions">
                        <button type="button" class="btn btn-sm btn-outline" onclick="AdminBrands.editBrand(${brand.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="AdminBrands.toggleBrand(${brand.id}, ${!isActive})" title="${isActive ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${isActive ? 'eye-slash' : 'eye'}"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openBrandModal(brand = null) {
        const form = document.getElementById('brandForm');
        form.reset();
        document.getElementById('brandId').value = '';
        document.getElementById('brandActive').checked = true;
        document.getElementById('brandModalTitle').textContent = brand ? 'Editar Marca' : 'Nueva Marca';
        document.getElementById('btnSaveBrandText').textContent = brand ? 'Guardar cambios' : 'Crear marca';

        if (brand) {
            document.getElementById('brandId').value = brand.id;
            document.getElementById('brandName').value = brand.name;
            document.getElementById('brandDescription').value = brand.description || '';
            document.getElementById('brandActive').checked = brand.is_active !== false;
        }

        syncBrandActiveUI();
        document.getElementById('brandModal').classList.add('active');
    }

    function closeBrandModal() {
        document.getElementById('brandModal')?.classList.remove('active');
    }

    async function editBrand(id) {
        try {
            const response = await fetch('/api/products/brands/admin/list', { credentials: 'include' });
            const data = await response.json();
            const brand = data.data?.find(b => b.id === id);
            if (brand) openBrandModal(brand);
            else AdminCommon.showToast('Marca no encontrada', 'error');
        } catch (error) {
            AdminCommon.showToast('Error al cargar la marca', 'error');
        }
    }

    async function saveBrand(e) {
        e.preventDefault();
        const form = document.getElementById('brandForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('brandId').value;
        const payload = {
            name: document.getElementById('brandName').value.trim(),
            description: document.getElementById('brandDescription').value.trim() || null,
            isActive: document.getElementById('brandActive').checked
        };

        const saveBtn = document.getElementById('btnSaveBrand');
        saveBtn.disabled = true;

        try {
            const url = id ? `/api/products/brands/${id}` : '/api/products/brands';
            const method = id ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                AdminCommon.showToast(id ? 'Marca actualizada' : 'Marca creada', 'success');
                closeBrandModal();
                loadBrands();
            } else {
                AdminCommon.showToast(AdminCommon.parseApiError(data, 'Error al guardar'), 'error');
            }
        } catch (error) {
            AdminCommon.showToast('Error de conexión', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    }

    async function toggleBrand(id, isActive) {
        try {
            const response = await fetch(`/api/products/brands/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ isActive })
            });
            const data = await response.json();
            if (data.success) {
                AdminCommon.showToast(data.message || 'Estado actualizado', 'success');
                loadBrands();
            } else {
                AdminCommon.showToast(AdminCommon.parseApiError(data), 'error');
            }
        } catch (error) {
            AdminCommon.showToast('Error de conexión', 'error');
        }
    }

    window.AdminBrands = { editBrand, toggleBrand, loadBrands };
})();
