/**
 * Página Mi Carrito — Valma
 */
(function () {
    'use strict';

    /** @type {{ items: object[], summary: object } | null} */
    let currentCartData = null;

    document.addEventListener('DOMContentLoaded', () => {
        loadCart();
        if (typeof updateUserMenu === 'function') updateUserMenu();
    });

    async function loadCart() {
        const cartContent = document.getElementById('cartContent');
        if (!cartContent) return;

        cartContent.innerHTML = `
            <div class="cart-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando tu carrito...</p>
            </div>
        `;

        try {
            const response = await fetch('/api/cart', { credentials: 'include' });
            const data = await response.json();

            if (!data.success || !data.data.items || data.data.items.length === 0) {
                currentCartData = null;
                cartContent.innerHTML = `
                    <div class="empty-cart">
                        <i class="fas fa-shopping-basket"></i>
                        <h2>Tu carrito está vacío</h2>
                        <p>¡Explora nuestros productos y encuentra lo que necesitas!</p>
                        <a href="/" class="btn btn-primary">Ver Productos</a>
                    </div>
                `;
                return;
            }

            currentCartData = data.data;
            const { items, summary } = data.data;

            cartContent.innerHTML = `
                <div class="cart-layout">
                    <div class="cart-items">
                        ${items.map(item => `
                            <div class="cart-item" data-item-id="${item.id}">
                                <img src="${resolveProductImage(item.image_url)}" alt="${escapeAttr(item.product_name)}" class="cart-item-image">
                                <div class="cart-item-details">
                                    <h3>${escapeHtml(item.product_name)}</h3>
                                    <p class="cart-item-brand">${escapeHtml(item.brand_name || 'Sin marca')}</p>
                                    <p class="cart-item-price">${formatPrice(item.price_at_time)}</p>
                                </div>
                                <div class="cart-item-actions">
                                    <div class="quantity-selector">
                                        <button type="button" onclick="CartPage.updateQuantity(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                                        <span>${item.quantity}</span>
                                        <button type="button" onclick="CartPage.updateQuantity(${item.id}, ${item.quantity + 1})" ${item.quantity >= item.available_stock ? 'disabled' : ''}>+</button>
                                    </div>
                                    <button type="button" class="btn-remove" onclick="CartPage.removeItem(${item.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                                <div class="cart-item-total">
                                    ${formatPrice(item.price_at_time * item.quantity)}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="cart-summary">
                        <h3>Resumen del Pedido</h3>
                        <div class="summary-row">
                            <span>Subtotal (${summary.total_quantity} productos)</span>
                            <span>${formatPrice(summary.subtotal)}</span>
                        </div>
                        <div class="summary-row summary-total">
                            <span>Total</span>
                            <span>${formatPrice(summary.subtotal)}</span>
                        </div>

                        <div class="whatsapp-checkout-wrap">
                            <button type="button" class="btn btn-whatsapp btn-whatsapp-cart btn-block btn-lg" id="btnWhatsAppCheckout">
                                <i class="fab fa-whatsapp"></i> Finalizar Pedido por WhatsApp
                            </button>
                            <p class="whatsapp-trust-text">Sin pasarelas. Proceso rápido y personalizado vía Chat.</p>
                        </div>

                        <a href="/" class="btn btn-outline btn-block">Seguir Comprando</a>
                    </div>
                </div>
            `;

            document.getElementById('btnWhatsAppCheckout')?.addEventListener('click', handleWhatsAppCheckout);

        } catch (error) {
            console.error('Error cargando carrito:', error);
            cartContent.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error al cargar el carrito. Intenta de nuevo.</p>
                </div>
            `;
        }
    }

    function handleWhatsAppCheckout() {
        if (!currentCartData?.items?.length) {
            showToast('Tu carrito está vacío', 'error');
            return;
        }

        const btn = document.getElementById('btnWhatsAppCheckout');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando pedido...';
        }

        WhatsAppCheckout.irACheckoutWhatsApp()
            .then((result) => {
                showToast(`Pedido ${result.order?.order_number || ''} registrado. Redirigiendo a WhatsApp...`, 'success');
                if (typeof updateCartCount === 'function') updateCartCount();
                setTimeout(() => loadCart(), 800);
            })
            .catch((error) => showToast(error.message || 'Error al procesar el pedido', 'error'))
            .finally(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fab fa-whatsapp"></i> Finalizar Pedido por WhatsApp';
                }
            });
    }

    async function updateQuantity(itemId, quantity) {
        if (quantity < 1) return;

        try {
            const response = await fetch(`/api/cart/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ quantity })
            });

            const data = await response.json();

            if (data.success) {
                loadCart();
                if (typeof updateCartCount === 'function') updateCartCount();
            } else {
                showToast(data.message || 'Error al actualizar cantidad', 'error');
            }
        } catch (error) {
            showToast('Error de conexión', 'error');
        }
    }

    async function removeItem(itemId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

        try {
            const response = await fetch(`/api/cart/items/${itemId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                showToast('Producto eliminado', 'success');
                loadCart();
                if (typeof updateCartCount === 'function') updateCartCount();
            } else {
                showToast(data.message || 'Error al eliminar', 'error');
            }
        } catch (error) {
            showToast('Error de conexión', 'error');
        }
    }

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

    function escapeAttr(text) {
        return escapeHtml(text).replace(/"/g, '&quot;');
    }

    window.CartPage = {
        loadCart,
        updateQuantity,
        removeItem,
        handleWhatsAppCheckout
    };
})();
