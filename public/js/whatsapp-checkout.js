/**
 * Checkout por WhatsApp — crea el pedido en el sistema y abre WhatsApp.
 */
(function (global) {
    'use strict';

    async function checkoutWhatsApp() {
        const response = await fetch('/api/cart/checkout-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'No se pudo procesar el pedido');
        }
        return data.data;
    }

    async function irACheckoutWhatsApp() {
        const checkout = await checkoutWhatsApp();
        if (checkout.whatsappLink) {
            window.open(checkout.whatsappLink, '_blank', 'noopener,noreferrer');
        }
        return checkout;
    }

    global.WhatsAppCheckout = {
        checkoutWhatsApp,
        irACheckoutWhatsApp
    };

    global.irACheckoutWhatsApp = irACheckoutWhatsApp;
})(window);
