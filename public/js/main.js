// ============================================
// VALMA - JavaScript Principal
// ============================================

// Variables globales
let currentFilters = {
    brands: [],
    search: '',
    minPrice: null,
    maxPrice: null
};

let currentPage = 1;
let allProducts = [];
let brandsList = [];

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
        initHomePage();
    }

    updateUserMenu();
    updateCartCount();
    initGlobalEvents();
    initNavbarScroll();
    initMarquee();
});

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ============================================
// PÁGINA DE INICIO
// ============================================

function initHomePage() {
    loadBrandsForFilter();
    loadFeaturedProducts();
    loadAllProducts();
    initSearchRealTime();
}

// Cargar marcas para el panel de filtros
async function loadBrandsForFilter() {
    try {
        const response = await fetch('/api/products/brands');
        const data = await response.json();
        if (data.success) {
            brandsList = data.data;
            renderBrandsFilterList(brandsList);
        }
    } catch (error) {
        console.error('Error cargando marcas:', error);
    }
}

function renderBrandsFilterList(brands) {
    const container = document.getElementById('filterBrandsList');
    if (!container) return;

    container.innerHTML = brands.map(brand => `
        <div class="brand-chip" data-brand-id="${brand.id}" onclick="toggleBrandFilter(this)" role="button" tabindex="0">
            <span>${escapeHtml(brand.name)}</span>
            <span class="brand-count">${brand.product_count || 0}</span>
        </div>
    `).join('');
}

// Cargar todos los productos para filtrado client-side
async function loadAllProducts() {
    const container = document.getElementById('productsGrid');
    if (!container) return;

    showSkeleton(container, 8);

    try {
        const response = await fetch('/api/products?limit=500');
        const data = await response.json();

        if (data.success) {
            allProducts = data.data.products;
            applyFiltersAndRender();
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        container.innerHTML = '<p class="text-center">Error al cargar productos</p>';
    }
}

function showSkeleton(container, count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-text" style="width: 60%"></div>
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text" style="width: 40%"></div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Búsqueda en tiempo real
function initSearchRealTime() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilters.search = e.target.value.trim().toLowerCase();
            applyFiltersAndRender();
        }, 300);
    });

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentFilters.search = searchInput.value.trim().toLowerCase();
            applyFiltersAndRender();
        });
    }
}

// Panel flotante de filtros
function toggleFiltersPanel() {
    const panel = document.getElementById('filtersFloatPanel');
    const overlay = document.getElementById('filtersOverlay');
    if (!panel) return;
    const isActive = panel.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active', isActive);
    document.body.style.overflow = isActive ? 'hidden' : '';
}

function closeFiltersPanel() {
    const panel = document.getElementById('filtersFloatPanel');
    const overlay = document.getElementById('filtersOverlay');
    if (panel) panel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Toggle marca (chip style)
function toggleBrandFilter(chip) {
    const brandId = parseInt(chip.dataset.brandId);
    const isActive = chip.classList.toggle('active');
    if (isActive) {
        if (!currentFilters.brands.includes(brandId)) {
            currentFilters.brands.push(brandId);
        }
    } else {
        currentFilters.brands = currentFilters.brands.filter(id => id !== brandId);
    }
    updateFilterBadge();
    renderActiveFilters();
    applyFiltersAndRender();
}

// Filtro de precio manual
function applyCustomPriceFilter() {
    const minInput = document.getElementById('priceMinInput');
    const maxInput = document.getElementById('priceMaxInput');

    const minVal = minInput?.value ? parseInt(minInput.value) : null;
    const maxVal = maxInput?.value ? parseInt(maxInput.value) : null;

    currentFilters.minPrice = (minVal !== null && !isNaN(minVal) && minVal >= 0) ? minVal : null;
    currentFilters.maxPrice = (maxVal !== null && !isNaN(maxVal) && maxVal >= 0) ? maxVal : null;

    updateFilterBadge();
    renderActiveFilters();
    applyFiltersAndRender();
}

function updateFilterBadge() {
    const badge = document.getElementById('filterBadge');
    if (!badge) return;

    let count = currentFilters.brands.length;
    if (currentFilters.minPrice !== null || currentFilters.maxPrice !== null) count++;
    if (currentFilters.search) count++;

    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function renderActiveFilters() {
    const container = document.getElementById('activeFiltersBar');
    if (!container) return;

    let chips = '';

    currentFilters.brands.forEach(brandId => {
        const brand = brandsList.find(b => b.id === brandId);
        if (brand) {
            chips += `
                <span class="active-filter-chip">
                    ${escapeHtml(brand.name)}
                    <button onclick="removeBrandFilter(${brandId})"><i class="fas fa-times"></i></button>
                </span>
            `;
        }
    });

    if (currentFilters.minPrice !== null || currentFilters.maxPrice !== null) {
        let label = '';
        if (currentFilters.maxPrice === null) label = `Más de $${currentFilters.minPrice.toLocaleString('es-CO')}`;
        else if (currentFilters.minPrice === null) label = `Hasta $${currentFilters.maxPrice.toLocaleString('es-CO')}`;
        else label = `$${currentFilters.minPrice.toLocaleString('es-CO')} - $${currentFilters.maxPrice.toLocaleString('es-CO')}`;
        chips += `
            <span class="active-filter-chip">
                ${label}
                <button onclick="removePriceFilter()"><i class="fas fa-times"></i></button>
            </span>
        `;
    }

    if (currentFilters.search) {
        chips += `
            <span class="active-filter-chip">
                "${escapeHtml(currentFilters.search)}"
                <button onclick="removeSearchFilter()"><i class="fas fa-times"></i></button>
            </span>
        `;
    }

    container.innerHTML = chips;
}

function removeBrandFilter(brandId) {
    currentFilters.brands = currentFilters.brands.filter(id => id !== brandId);
    const chip = document.querySelector(`.brand-chip[data-brand-id="${brandId}"]`);
    if (chip) chip.classList.remove('active');
    updateFilterBadge();
    renderActiveFilters();
    applyFiltersAndRender();
}

function removePriceFilter() {
    currentFilters.minPrice = null;
    currentFilters.maxPrice = null;
    const priceMin = document.getElementById('priceMinInput');
    const priceMax = document.getElementById('priceMaxInput');
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    updateFilterBadge();
    renderActiveFilters();
    applyFiltersAndRender();
}

function removeSearchFilter() {
    currentFilters.search = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    updateFilterBadge();
    renderActiveFilters();
    applyFiltersAndRender();
}

function clearAllFilters() {
    currentFilters = { brands: [], search: '', minPrice: null, maxPrice: null };

    document.querySelectorAll('.brand-chip.active').forEach(chip => chip.classList.remove('active'));

    const priceMin = document.getElementById('priceMinInput');
    const priceMax = document.getElementById('priceMaxInput');
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    updateFilterBadge();
    renderActiveFilters();
    applyFiltersAndRender();
    closeFiltersPanel();
}

function applyFiltersAndRender() {
    let filtered = allProducts;

    // Filtro por marcas (brand_id viene como string del backend, convertir a int)
    if (currentFilters.brands.length > 0) {
        filtered = filtered.filter(p => {
            const pid = parseInt(p.brand_id);
            return currentFilters.brands.includes(pid);
        });
    }

    // Filtro de precio
    if (currentFilters.minPrice !== null) {
        filtered = filtered.filter(p => parseFloat(p.price) >= currentFilters.minPrice);
    }
    if (currentFilters.maxPrice !== null) {
        filtered = filtered.filter(p => parseFloat(p.price) <= currentFilters.maxPrice);
    }

    // Filtro de búsqueda
    if (currentFilters.search) {
        const q = currentFilters.search;
        filtered = filtered.filter(p => {
            return (p.name || '').toLowerCase().includes(q) ||
                   (p.brand_name || '').toLowerCase().includes(q) ||
                   (p.description || '').toLowerCase().includes(q);
        });
    }

    renderProducts(filtered);
}

function renderProducts(products) {
    const container = document.getElementById('productsGrid');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-search"></i>
                <h3>No encontramos productos</h3>
                <p>Prueba con otros filtros o términos de búsqueda.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map((product, i) => {
        const card = renderProductCard(product);
        return card.replace('class="product-card"', `class="product-card" style="animation-delay: ${i * 0.05}s"`);
    }).join('');
}

// Cargar productos destacados
async function loadFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;

    // Mostrar skeleton loading
    let skeletonHtml = '';
    for (let i = 0; i < 4; i++) {
        skeletonHtml += `
            <div class="skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-text" style="width: 60%"></div>
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text" style="width: 40%"></div>
            </div>
        `;
    }
    container.innerHTML = skeletonHtml;

    await new Promise(r => setTimeout(r, 400));

    try {
        const response = await fetch('/api/products/featured');
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            container.innerHTML = data.data.map(product => renderProductCard(product)).join('');
        } else {
            container.innerHTML = '<p class="text-center">No hay productos destacados</p>';
        }
    } catch (error) {
        console.error('Error cargando productos destacados:', error);
    }
}

// Cargar productos
async function loadProducts(page = 1) {
    currentPage = page;
    const container = document.getElementById('productsGrid');
    if (!container) return;

    // Mostrar skeleton loading
    let skeletonHtml = '';
    for (let i = 0; i < 8; i++) {
        skeletonHtml += `
            <div class="skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-text" style="width: 60%"></div>
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text" style="width: 40%"></div>
            </div>
        `;
    }
    container.innerHTML = skeletonHtml;

    await new Promise(r => setTimeout(r, 500));

    try {
        let url = `/api/products?page=${page}&limit=12`;

        if (currentFilters.brandId) url += `&brandId=${currentFilters.brandId}`;
        if (currentFilters.typeId) url += `&typeId=${currentFilters.typeId}`;
        if (currentFilters.search) url += `&search=${encodeURIComponent(currentFilters.search)}`;
        if (currentFilters.minPrice) url += `&minPrice=${currentFilters.minPrice}`;
        if (currentFilters.maxPrice) url += `&maxPrice=${currentFilters.maxPrice}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            const { products, pagination } = data.data;

            if (products.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>No se encontraron productos</p>
                    </div>
                `;
            } else {
                container.innerHTML = products.map(product => renderProductCard(product)).join('');
            }

            renderPagination(pagination);
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        container.innerHTML = '<p class="text-center">Error al cargar productos</p>';
    }
}

// Renderizar tarjeta de producto
function renderProductCard(product) {
    const rating = product.rating || (Math.random() > 0.3 ? 5 : 4);
    const isNew = product.is_new || (Math.random() > 0.7);
    const isSale = product.is_sale || (Math.random() > 0.85);
    let badge = '';
    if (product.featured) badge = '<span class="product-badge">Destacado</span>';
    else if (isSale) badge = '<span class="badge-sale">Oferta</span>';
    else if (isNew) badge = '<span class="badge-new">Nuevo</span>';

    const starsHtml = Array(5).fill(0).map((_, i) =>
        `<i class="fas fa-star ${i < rating ? '' : 'empty'}"></i>`
    ).join('');

    return `
        <div class="product-card" onclick="openProductModal(${product.id})"
             data-product-id="${product.id}"
             data-product-name="${escapeHtml(product.name)}"
             data-product-price="${product.price}"
             data-product-stock="${product.stock}">
            <div class="product-image">
                <img src="${resolveProductImage(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">
                ${badge}
                <div class="product-actions" onclick="event.stopPropagation()">
                    <button class="product-action-btn" onclick="addToCart(${product.id}, 1)" title="Agregar al carrito">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                    <button class="product-action-btn" onclick="openProductModal(${product.id})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-brand">${escapeHtml(product.brand_name || 'Sin marca')}</span>
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <div class="rating-stars">${starsHtml}</div>
                <span class="product-type">${escapeHtml(product.type_name || '')}</span>
                <div class="product-footer">
                    <span class="product-price">${formatPrice(product.price)}</span>
                    <span class="product-stock">${product.stock} disp.</span>
                </div>
            </div>
        </div>
    `;
}

// Renderizar paginación
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;

    if (pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Botón anterior
    html += `
        <button class="page-btn" onclick="loadProducts(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Páginas
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (
            i === 1 ||
            i === pagination.totalPages ||
            (i >= pagination.page - 1 && i <= pagination.page + 1)
        ) {
            html += `
                <button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="loadProducts(${i})">
                    ${i}
                </button>
            `;
        } else if (
            i === pagination.page - 2 ||
            i === pagination.page + 2
        ) {
            html += '<span class="page-dots">...</span>';
        }
    }

    // Botón siguiente
    html += `
        <button class="page-btn" onclick="loadProducts(${pagination.page + 1})" ${pagination.page === pagination.totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = html;
}

// ============================================
// MODAL DE PRODUCTO
// ============================================

async function openProductModal(productId) {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) return;

    // Mostrar loading
    modalBody.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    modal.classList.add('active');

    try {
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();

        if (data.success) {
            const product = data.data;
            modalBody.innerHTML = renderProductDetail(product);
        } else {
            modalBody.innerHTML = '<p class="text-center">Producto no encontrado</p>';
        }
    } catch (error) {
        console.error('Error cargando producto:', error);
        modalBody.innerHTML = '<p class="text-center">Error al cargar el producto</p>';
    }
}

function renderProductDetail(product) {
    return `
        <div class="product-detail">
            <div class="product-detail-image">
                <img src="${resolveProductImage(product.image_url)}" alt="${escapeHtml(product.name)}">
            </div>
            <div class="product-detail-info">
                <span class="product-detail-brand">${escapeHtml(product.brand_name || 'Sin marca')}</span>
                <h2>${escapeHtml(product.name)}</h2>
                <div class="product-detail-price">${formatPrice(product.price)}</div>
                <div class="product-detail-description">
                    ${escapeHtml(product.description || 'Sin descripción disponible.')}
                </div>
                <div class="product-detail-meta">
                    <p><i class="fas fa-tag"></i> ${escapeHtml(product.type_name || 'Sin categoría')}</p>
                    <p><i class="fas fa-box"></i> ${product.stock} unidades disponibles</p>
                </div>
                <div class="product-detail-actions">
                    <div class="quantity-selector">
                        <button onclick="updateModalQuantity(-1)">-</button>
                        <span id="modalQuantity">1</span>
                        <button onclick="updateModalQuantity(1)">+</button>
                    </div>
                    <button class="btn btn-primary btn-lg" onclick="addToCartFromModal(${product.id})">
                        <i class="fas fa-cart-plus"></i> Agregar al Carrito
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateModalQuantity(change) {
    const quantityEl = document.getElementById('modalQuantity');
    if (!quantityEl) return;

    let quantity = parseInt(quantityEl.textContent) + change;
    if (quantity < 1) quantity = 1;
    quantityEl.textContent = quantity;
}

function addToCartFromModal(productId) {
    const quantity = parseInt(document.getElementById('modalQuantity')?.textContent || 1);
    addToCart(productId, quantity);
    closeProductModal();
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ============================================
// CARRITO
// ============================================

async function addToCart(productId, quantity = 1) {
    try {
        const response = await fetch('/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId, quantity })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Producto agregado al carrito', 'success');
            updateCartCount();
        } else {
            showToast(data.message || 'Error al agregar al carrito', 'error');
        }
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        showToast('Error de conexión', 'error');
    }
}

async function updateCartCount() {
    try {
        const response = await fetch('/api/cart', {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            const count = data.data.summary?.total_quantity || 0;
            const cartCountEl = document.getElementById('cartCount');
            if (cartCountEl) {
                cartCountEl.textContent = count;
                cartCountEl.style.display = count > 0 ? 'flex' : 'none';
            }
        }
    } catch (error) {
        console.error('Error actualizando contador:', error);
    }
}

// ============================================
// USUARIO
// ============================================

function updateUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;

    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        userMenu.innerHTML = `
            <div class="user-dropdown">
                <button class="nav-link">
                    <i class="fas fa-user"></i>
                    <span>${user.firstName}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-dropdown-content">
                    <a href="/perfil"><i class="fas fa-user-circle"></i> Mi Perfil</a>
                    <a href="/mis-pedidos"><i class="fas fa-box"></i> Mis Pedidos</a>
                    ${user.role === 'admin' ? '<a href="/admin"><i class="fas fa-cog"></i> Administración</a>' : ''}
                    <hr>
                    <a href="#" onclick="logout(); return false;"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
                </div>
            </div>
        `;
    } else {
        userMenu.innerHTML = `
            <a href="/login" class="nav-link"><i class="fas fa-user"></i> Iniciar Sesión</a>
        `;
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {}

    localStorage.removeItem('user');
    window.location.href = '/';
}

// ============================================
// EVENTOS
// ============================================

function initGlobalEvents() {
    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProductModal();
            }
        });
    }

    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
        }
    });

    
}

function initFilterEvents() {
    // Cerrar panel con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const panel = document.getElementById('filtersFloatPanel');
            if (panel && panel.classList.contains('active')) {
                closeFiltersPanel();
            }
        }
    });
}

// ============================================
// UTILIDADES
// ============================================

function formatPrice(price) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(price);
}

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

    const icon = type === 'success' ? 'check-circle' :
                 type === 'error' ? 'exclamation-circle' : 'info-circle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Verificar autenticación al cargar
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/verify', {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
        } else {
            localStorage.removeItem('user');
        }
    } catch (error) {
        console.error('Error verificando auth:', error);
    }
}

// Verificar auth al iniciar
checkAuth();

// ============================================
// MARQUEE EDITABLE
// ============================================
const MARQUEE_STORAGE_KEY = 'valma_marquee_messages';
const DEFAULT_MARQUEE_MESSAGES = [
    'Envío gratis en compras mayores a $150.000',
    '20% de descuento en labiales esta semana',
    'Regalo sorpresa en tu primera compra',
    'Pagos seguros garantizados'
];

function initMarquee() {
    const banner = document.getElementById('marqueeBanner');
    const content = document.getElementById('marqueeContent');
    if (!content) return;

    const messages = getMarqueeMessages();
    const separator = '<span class="marquee-separator"> ✦ </span>';

    if (messages.length === 0) {
        content.classList.add('is-static');
        content.innerHTML = '<span class="marquee-item">Bienvenida a Valma</span>';
        content.style.animation = 'none';
    } else {
        content.classList.remove('is-static');
        const allMessages = [...messages, ...messages, ...messages];
        content.innerHTML = allMessages.map(msg => `
            <span class="marquee-item">${separator} ${escapeHtml(msg)}</span>
        `).join('');
    }

    // Aplicar color personalizado si existe
    try {
        const color = localStorage.getItem('valma_marquee_color');
        if (color && banner) banner.style.background = color;
    } catch (e) {}

    // Aplicar velocidad personalizada si existe
    try {
        const speed = localStorage.getItem('valma_marquee_speed') || 'normal';
        const speedMap = { slow: '40s', normal: '25s', fast: '12s' };
        if (messages.length > 0) {
            content.style.animationDuration = speedMap[speed] || '25s';
        }
    } catch (e) {}
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

// Marquee control functions moved to admin/dashboard.html

// ============================================
// PARTICULAS FLOTANTES
// ============================================
function initParticles() {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const colors = ['rgba(194,24,89,0.15)', 'rgba(142,36,170,0.12)', 'rgba(212,175,55,0.1)', 'rgba(255,255,255,0.3)'];
    let animationId;

    function resize() {
        const hero = document.querySelector('.hero');
        if (!hero) return;
        canvas.width = hero.offsetWidth;
        canvas.height = hero.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function createParticles() {
        particles = [];
        const count = Math.min(40, Math.floor(canvas.width / 30));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 3 + 1,
                dx: (Math.random() - 0.5) * 0.4,
                dy: (Math.random() - 0.5) * 0.4,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }
    createParticles();

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        animationId = requestAnimationFrame(animate);
    }
    animate();

    // Pausar cuando no es visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animationId) animate();
            } else {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        });
    });
    observer.observe(canvas);
}

// ============================================
// RIPPLE EFFECT EN BOTONES
// ============================================
function initRippleEffect() {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
}

// ============================================
// CARRUSEL DE TESTIMONIOS
// ============================================
let carouselIndex = 0;
function moveCarousel(dir) {
    const track = document.getElementById('testimonialsTrack');
    if (!track) return;
    const cards = track.children;
    const visible = window.innerWidth <= 768 ? 1 : 3;
    const maxIndex = Math.max(0, cards.length - visible);
    carouselIndex = Math.max(0, Math.min(carouselIndex + dir, maxIndex));
    const shift = carouselIndex * (100 / visible + 0.5);
    track.style.transform = `translateX(-${shift}%)`;
}

// ============================================
// FILTRO POR CATEGORIA (legacy compat)
// ============================================
function filterByCategory(category) {
    showToast('Usa el panel de Filtros para filtrar por marca o precio', 'info');
}

// ============================================
// INICIALIZACION DE NUEVAS FUNCIONALIDADES
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initRippleEffect();
});
