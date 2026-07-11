(function () {
    'use strict';

    function resolveProductImage(imageUrl) {
        if (!imageUrl) return '/images/placeholder.png';
        if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl;
        return `/images/products/${imageUrl}`;
    }

    window.resolveProductImage = resolveProductImage;
})();
