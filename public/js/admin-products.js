/**
 * Gestión de productos — Panel Admin Valma
 */
(function () {
    'use strict';

    let currentPage = 1;
    let brands = [];
    let types = [];
    let quickFilters = { active: false, noStock: false, featured: false, sale: false };
    let deleteTargetId = null;
    let pendingImageFile = null;
    let existingImageUrl = null;

    const TYPE_COLORS = {
        labios: '#ec4899',
        ojos: '#8b5cf6',
        rostro: '#f97316',
        skincare: '#10b981',
        default: '#6b7280'
    };

    let filtersLoaded = false;
    let initialLoadDone = false;

    document.addEventListener('DOMContentLoaded', () => {
        bindEvents();
        initPage();
    });

    async function initPage() {
        const user = await AdminCommon.requireAdminSession({ fast: true });
        if (!user) return;
        await loadProducts(1, { bootstrap: true });
    }

    function bindEvents() {
        document.getElementById('productForm').addEventListener('submit', saveProduct);
        document.getElementById('confirmDeleteBtn').addEventListener('click', deleteProduct);
        document.getElementById('searchInput').addEventListener('input', AdminCommon.debounce(() => loadProducts(1), 300));
        document.getElementById('brandFilter').addEventListener('change', () => loadProducts(1));
        document.getElementById('typeFilter').addEventListener('change', () => loadProducts(1));
        document.getElementById('productModal').addEventListener('click', (e) => {
            if (e.target.id === 'productModal') closeProductModal();
        });
        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') closeDeleteModal();
        });
        bindImageUploadEvents();
    }

    function bindImageUploadEvents() {
        const dropZone = document.getElementById('imageDropZone');
        const fileInput = document.getElementById('productImageFile');
        const externalInput = document.getElementById('productImageExternal');

        dropZone?.addEventListener('click', (e) => {
            if (e.target.closest('#btnChangeImage, #btnRemoveImage')) return;
            fileInput?.click();
        });

        fileInput?.addEventListener('change', () => {
            const file = fileInput.files?.[0];
            if (file) setPendingImageFile(file);
        });

        document.getElementById('btnChangeImage')?.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput?.click();
        });

        document.getElementById('btnRemoveImage')?.addEventListener('click', (e) => {
            e.stopPropagation();
            clearImageSelection();
        });

        externalInput?.addEventListener('input', () => {
            const url = externalInput.value.trim();
            if (url) {
                pendingImageFile = null;
                if (fileInput) fileInput.value = '';
                existingImageUrl = url;
                document.getElementById('productImageUrl').value = url;
                showImagePreview(url);
            } else if (!pendingImageFile) {
                clearImageSelection(false);
            }
        });

        ['dragenter', 'dragover'].forEach(evt => {
            dropZone?.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.add('is-dragover');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropZone?.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.remove('is-dragover');
            });
        });

        dropZone?.addEventListener('drop', (e) => {
            const file = e.dataTransfer?.files?.[0];
            if (file && file.type.startsWith('image/')) {
                setPendingImageFile(file);
            } else {
                AdminCommon.showToast('Selecciona un archivo de imagen válido', 'error');
            }
        });
    }

    function setPendingImageFile(file) {
        if (!file.type.startsWith('image/')) {
            AdminCommon.showToast('Solo se permiten archivos de imagen', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            AdminCommon.showToast('La imagen no puede superar 5 MB', 'error');
            return;
        }

        pendingImageFile = file;
        existingImageUrl = null;
        document.getElementById('productImageExternal').value = '';
        document.getElementById('productImageUrl').value = '';

        const reader = new FileReader();
        reader.onload = (e) => showImagePreview(e.target.result);
        reader.readAsDataURL(file);
    }

    function showImagePreview(src) {
        const placeholder = document.getElementById('imageUploadPlaceholder');
        const preview = document.getElementById('imageUploadPreview');
        const img = document.getElementById('imagePreviewImg');
        if (!placeholder || !preview || !img) return;
        img.src = src;
        placeholder.hidden = true;
        preview.hidden = false;
    }

    function clearImageSelection(clearExternal = true) {
        pendingImageFile = null;
        existingImageUrl = null;
        document.getElementById('productImageUrl').value = '';
        const fileInput = document.getElementById('productImageFile');
        if (fileInput) fileInput.value = '';
        if (clearExternal) {
            document.getElementById('productImageExternal').value = '';
        }
        const placeholder = document.getElementById('imageUploadPlaceholder');
        const preview = document.getElementById('imageUploadPreview');
        const img = document.getElementById('imagePreviewImg');
        if (placeholder) placeholder.hidden = false;
        if (preview) preview.hidden = true;
        if (img) img.src = '';
    }

    async function uploadProductImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch('/api/upload/product-image', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(AdminCommon.parseApiError(data, 'Error al subir la imagen'));
        }
        return data.data.url;
    }

    function resolveImageUrlForSave() {
        const external = document.getElementById('productImageExternal').value.trim();
        if (external) return external;
        if (existingImageUrl) return existingImageUrl;
        return document.getElementById('productImageUrl').value.trim() || null;
    }

    function populateFilters(brandsList, typesList) {
        if (filtersLoaded) return;
        const brandSelect = document.getElementById('brandFilter');
        const productBrand = document.getElementById('productBrand');
        const typeSelect = document.getElementById('typeFilter');
        const productType = document.getElementById('productType');

        const brandOptions = brandsList.map(b =>
            `<option value="${b.id}">${AdminCommon.escapeHtml(b.name)}</option>`
        ).join('');
        const typeOptions = typesList.map(t =>
            `<option value="${t.id}">${AdminCommon.escapeHtml(t.name)}</option>`
        ).join('');

        brandSelect.innerHTML = '<option value="">Todas las marcas</option>' + brandOptions;
        productBrand.innerHTML = '<option value="">Seleccionar marca</option>' + brandOptions;
        typeSelect.innerHTML = '<option value="">Todos los tipos</option>' + typeOptions;
        productType.innerHTML = '<option value="">Seleccionar tipo</option>' + typeOptions;

        brands = brandsList;
        types = typesList;
        filtersLoaded = true;
    }

    function buildProductsQuery(page, limit, includeSummary) {
        const search = document.getElementById('searchInput').value;
        const brandId = document.getElementById('brandFilter').value;
        const typeId = document.getElementById('typeFilter').value;
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set('search', search);
        if (brandId) params.set('brandId', brandId);
        if (typeId) params.set('typeId', typeId);
        if (quickFilters.featured) params.set('featured', 'true');
        if (quickFilters.sale) params.set('onSale', 'true');
        if (quickFilters.active) params.set('activeOnly', 'true');
        if (quickFilters.noStock) params.set('lowStock', 'true');
        if (includeSummary) params.set('includeSummary', 'true');
        return params;
    }

    async function loadProducts(page = 1, { bootstrap = false } = {}) {
        currentPage = page;
        const limit = document.getElementById('itemsPerPage').value || 10;
        const includeSummary = bootstrap || !initialLoadDone;

        AdminCommon.showTableLoading('productsTable', 6);

        try {
            const params = buildProductsQuery(page, limit, includeSummary);
            const endpoint = bootstrap
                ? `/api/admin/products-init?${params}`
                : `/api/products/admin/list?${params}`;

            const signal = AdminCommon.createAbortController('products-list').signal;
            const response = await fetch(endpoint, { credentials: 'include', signal });
            const data = await response.json();

            if (!data.success) {
                AdminCommon.showToast(AdminCommon.parseApiError(data, 'Error al cargar productos'), 'error');
                return;
            }

            if (bootstrap && data.data.brands && data.data.types) {
                populateFilters(data.data.brands, data.data.types);
            }

            renderProducts(data.data.products);
            renderPagination(data.data.pagination);
            updateCounter(data.data.pagination);

            if (data.data.summary) {
                requestAnimationFrame(() => renderProductStats(data.data.summary));
            }

            initialLoadDone = true;
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Error cargando productos:', error);
            AdminCommon.showToast('Error al cargar productos', 'error');
        }
    }

    function renderProductStats(summary) {
        document.getElementById('productStats').innerHTML = `
            <div class="stat-card"><div class="stat-icon stat-icon-pink"><i class="fas fa-box"></i></div><div class="stat-info"><span class="stat-value">${summary.total}</span><span class="stat-label">Total</span></div></div>
            <div class="stat-card"><div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div><div class="stat-info"><span class="stat-value">${summary.active}</span><span class="stat-label">Activos</span></div></div>
            <div class="stat-card"><div class="stat-icon stat-icon-gold"><i class="fas fa-exclamation-circle"></i></div><div class="stat-info"><span class="stat-value">${summary.no_stock}</span><span class="stat-label">Sin Stock</span></div></div>
            <div class="stat-card"><div class="stat-icon stat-icon-blue"><i class="fas fa-star"></i></div><div class="stat-info"><span class="stat-value">${summary.featured}</span><span class="stat-label">Destacados</span></div></div>
        `;
    }

    function updateCounter(pagination) {
        const counter = document.getElementById('productsCounter');
        if (!counter || !pagination) return;
        const start = pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        counter.textContent = `Mostrando ${start}-${end} de ${pagination.total} productos`;
    }

    function getTypeColor(typeName) {
        if (!typeName) return TYPE_COLORS.default;
        return TYPE_COLORS[typeName.toLowerCase().trim()] || TYPE_COLORS.default;
    }

    function getStockBadge(stock) {
        const qty = Number(stock);
        if (qty === 0) return { class: 'stock-badge-zero', label: 'Agotado' };
        if (qty <= 5) return { class: 'stock-badge-low', label: `${qty} unidades` };
        return { class: 'stock-badge-high', label: `${qty} en stock` };
    }

    function renderProducts(products) {
        const tbody = document.getElementById('productsTable');
        if (!products.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron productos</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(product => {
            const typeColor = getTypeColor(product.type_name);
            const stockBadge = getStockBadge(product.stock);
            return `
                <tr>
                    <td>
                        <div class="product-cell">
                            <img src="${AdminCommon.resolveProductImage(product.image_url)}" alt="${AdminCommon.escapeHtml(product.name)}" class="product-thumb-img" loading="lazy" decoding="async" width="48" height="48">
                            <div class="product-info">
                                <span class="product-name">${AdminCommon.escapeHtml(product.name)}</span>
                                <span class="product-brand">${AdminCommon.escapeHtml(product.brand_name || 'Sin marca')}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="product-type-badge" style="background:${typeColor}20;color:${typeColor};border:1px solid ${typeColor}40;">${AdminCommon.escapeHtml(product.type_name || 'Sin tipo')}</span></td>
                    <td><strong>${AdminCommon.formatPrice(product.price)}</strong></td>
                    <td><span class="stock-badge ${stockBadge.class}">${stockBadge.label}</span></td>
                    <td>
                        <label class="toggle-switch" title="${product.is_active ? 'Activo' : 'Inactivo'}">
                            <input type="checkbox" ${product.is_active ? 'checked' : ''} onchange="AdminProducts.toggleProductStatus(${product.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </td>
                    <td>
                        <button type="button" class="btn-icon btn-edit" onclick="AdminProducts.editProduct(${product.id})" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button type="button" class="btn-icon btn-delete" onclick="AdminProducts.confirmDeleteProduct(${product.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
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

        let html = `<button class="page-btn ${pagination.page === 1 ? 'disabled' : ''}" onclick="AdminProducts.loadProducts(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
        const maxVisible = 5;
        let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
        let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="AdminProducts.loadProducts(${i})">${i}</button>`;
        }
        html += `<button class="page-btn ${pagination.page === pagination.totalPages ? 'disabled' : ''}" onclick="AdminProducts.loadProducts(${pagination.page + 1})" ${pagination.page === pagination.totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
        container.innerHTML = html;
    }

    function toggleQuickFilter(key) {
        quickFilters[key] = !quickFilters[key];
        const chipMap = { active: 'chipActive', noStock: 'chipNoStock', featured: 'chipFeatured', sale: 'chipSale' };
        document.getElementById(chipMap[key])?.classList.toggle('active', quickFilters[key]);
        loadProducts(1);
    }

    function openProductModal(product = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('modalTitle');
        form.reset();
        document.getElementById('productId').value = '';
        document.getElementById('productActive').checked = true;
        clearImageSelection();

        if (product) {
            title.textContent = 'Editar Producto';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productBrand').value = product.brand_id || '';
            document.getElementById('productType').value = product.type_id || product.product_type_id || '';
            document.getElementById('productFeatured').checked = !!product.featured;
            document.getElementById('productActive').checked = product.is_active !== false;

            if (product.image_url) {
                existingImageUrl = product.image_url;
                document.getElementById('productImageUrl').value = product.image_url;
                const previewSrc = AdminCommon.resolveProductImage(product.image_url);
                if (product.image_url.startsWith('http')) {
                    document.getElementById('productImageExternal').value = product.image_url;
                }
                showImagePreview(previewSrc);
            }
        } else {
            title.textContent = 'Nuevo Producto';
        }

        modal.classList.add('active');
    }

    function closeProductModal() {
        document.getElementById('productModal').classList.remove('active');
        clearImageSelection();
    }

    async function editProduct(id) {
        try {
            const response = await fetch(`/api/products/${id}`);
            const data = await response.json();
            if (data.success) openProductModal(data.data);
            else AdminCommon.showToast('No se pudo cargar el producto', 'error');
        } catch (error) {
            AdminCommon.showToast('Error al cargar producto', 'error');
        }
    }

    async function saveProduct(e) {
        e.preventDefault();
        const productId = document.getElementById('productId').value;
        const saveBtn = document.getElementById('btnSaveProduct');

        let imageUrl = resolveImageUrlForSave();

        try {
            saveBtn.classList.add('is-loading');
            saveBtn.disabled = true;

            if (pendingImageFile) {
                imageUrl = await uploadProductImage(pendingImageFile);
            }

            const productData = {
                name: document.getElementById('productName').value.trim(),
                description: document.getElementById('productDescription').value.trim(),
                price: parseFloat(document.getElementById('productPrice').value),
                stock: parseInt(document.getElementById('productStock').value, 10),
                brandId: document.getElementById('productBrand').value || null,
                productTypeId: document.getElementById('productType').value || null,
                imageUrl,
                featured: document.getElementById('productFeatured').checked,
                isActive: document.getElementById('productActive').checked
            };

            const url = productId ? `/api/products/${productId}` : '/api/products';
            const method = productId ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(productData)
            });
            const data = await response.json();
            if (data.success) {
                AdminCommon.showToast(productId ? 'Producto actualizado' : 'Producto creado', 'success');
                closeProductModal();
                loadProducts(currentPage);
            } else {
                AdminCommon.showToast(AdminCommon.parseApiError(data, 'Error al guardar'), 'error');
            }
        } catch (error) {
            AdminCommon.showToast(error.message || 'Error de conexión', 'error');
        } finally {
            saveBtn.classList.remove('is-loading');
            saveBtn.disabled = false;
        }
    }

    async function toggleProductStatus(id, isActive) {
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ isActive })
            });
            const data = await response.json();
            if (data.success) {
                AdminCommon.showToast(isActive ? 'Producto activado' : 'Producto desactivado', 'success');
            } else {
                AdminCommon.showToast(AdminCommon.parseApiError(data), 'error');
                loadProducts(currentPage);
            }
        } catch (error) {
            AdminCommon.showToast('Error de conexión', 'error');
        }
    }

    function confirmDeleteProduct(id) {
        deleteTargetId = id;
        document.getElementById('deleteModal').classList.add('active');
    }

    function closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('active');
        deleteTargetId = null;
    }

    async function deleteProduct() {
        if (!deleteTargetId) return;
        try {
            const response = await fetch(`/api/products/${deleteTargetId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                AdminCommon.showToast('Producto desactivado', 'success');
                loadProducts(currentPage);
            } else {
                AdminCommon.showToast(AdminCommon.parseApiError(data, 'Error al eliminar'), 'error');
            }
        } catch (error) {
            AdminCommon.showToast('Error de conexión', 'error');
        } finally {
            closeDeleteModal();
        }
    }

    window.AdminProducts = {
        loadProducts,
        toggleQuickFilter,
        openProductModal,
        closeProductModal,
        editProduct,
        toggleProductStatus,
        confirmDeleteProduct,
        closeDeleteModal
    };

    window.openProductModal = () => openProductModal();
    window.closeProductModal = closeProductModal;
    window.closeDeleteModal = closeDeleteModal;
    window.toggleQuickFilter = toggleQuickFilter;
})();
