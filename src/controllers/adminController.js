const Product = require('../models/Product');
const Brand = require('../models/Brand');
const ProductType = require('../models/ProductType');
const cache = require('../utils/cache');
const { apiResponse, paginate, sanitizeSearch } = require('../utils/helpers');

async function getCachedBrands() {
    let brands = cache.get('brands:all');
    if (!brands) {
        brands = await Brand.findAll();
        cache.set('brands:all', brands, 300000);
    }
    return brands;
}

async function getCachedTypes() {
    let types = cache.get('types:all');
    if (!types) {
        types = await ProductType.findAll();
        cache.set('types:all', types, 300000);
    }
    return types;
}

async function getCachedProductSummary() {
    let summary = cache.get('products:admin-summary');
    if (!summary) {
        summary = await Product.getAdminSummary();
        cache.set('products:admin-summary', summary, 30000);
    }
    return summary;
}

/** Una sola petición: marcas, tipos, productos y resumen */
const getProductsPageInit = async (req, res) => {
    try {
        const {
            brandId,
            typeId,
            search,
            featured,
            onSale,
            activeOnly,
            lowStock,
            page = 1,
            limit = 10,
            includeSummary = 'true'
        } = req.query;

        const pagination = paginate(page, limit);
        const filters = {
            brandId: brandId ? parseInt(brandId) : null,
            typeId: typeId ? parseInt(typeId) : null,
            search: sanitizeSearch(search),
            featured: featured === 'true' ? true : null,
            onSale: onSale === 'true' ? true : null,
            active: null,
            activeOnly: activeOnly === 'true',
            lowStock: lowStock === 'true',
            limit: pagination.limit,
            offset: pagination.offset
        };

        const tasks = [
            Product.findAdminPaginated(filters),
            getCachedBrands(),
            getCachedTypes()
        ];

        if (includeSummary === 'true') {
            tasks.push(getCachedProductSummary());
        }

        const results = await Promise.all(tasks);
        const listResult = results[0];
        const brands = results[1];
        const types = results[2];
        const summary = includeSummary === 'true' ? results[3] : undefined;
        const { products, total } = listResult;

        res.json(apiResponse(true, {
            brands,
            types,
            products,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit)
            },
            summary
        }));
    } catch (error) {
        console.error('Error en products-init:', error);
        res.status(500).json(apiResponse(false, null, 'Error al cargar datos'));
    }
};

module.exports = { getProductsPageInit };
