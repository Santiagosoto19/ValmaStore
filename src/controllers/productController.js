const Product = require('../models/Product');
const Brand = require('../models/Brand');
const ProductType = require('../models/ProductType');
const cache = require('../utils/cache');
const { apiResponse, paginate, sanitizeSearch } = require('../utils/helpers');

function buildProductFilters(query, { includeInactive = false } = {}) {
    const {
        brandId,
        typeId,
        typeIds,
        categories,
        search,
        minPrice,
        maxPrice,
        featured,
        onSale,
        page = 1,
        limit = 20
    } = query;

    const pagination = paginate(page, limit);

    let parsedCategories = null;
    if (categories) {
        parsedCategories = categories.split(',').map(c => c.trim().toLowerCase());
    }

    let parsedTypeIds = null;
    if (typeIds) {
        parsedTypeIds = typeIds.split(',').map(id => parseInt(id.trim()));
    }

    const filters = {
        brandId: brandId ? parseInt(brandId) : null,
        typeId: typeId ? parseInt(typeId) : null,
        typeIds: parsedTypeIds,
        categories: parsedCategories,
        search: sanitizeSearch(search),
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        featured: featured === 'true' ? true : featured === 'false' ? false : null,
        onSale: onSale === 'true' ? true : null,
        active: includeInactive ? null : true,
        limit: pagination.limit,
        offset: pagination.offset
    };

    return { filters, pagination };
}

async function fetchProductsResponse(filters, pagination) {
    const [products, total] = await Promise.all([
        Product.findAll(filters),
        Product.count(filters)
    ]);

    return apiResponse(true, {
        products,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit)
        }
    });
}

// Obtener todos los productos con filtros (tienda pública)
const getProducts = async (req, res) => {
    try {
        const { filters, pagination } = buildProductFilters(req.query, { includeInactive: false });
        res.json(await fetchProductsResponse(filters, pagination));
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener productos'));
    }
};

// Listado completo para administración (incluye inactivos, optimizado)
const getAdminProducts = async (req, res) => {
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
            limit = 20
        } = req.query;

        const pagination = paginate(page, limit);
        const includeSummary = req.query.includeSummary !== 'false';

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

        const tasks = [Product.findAdminPaginated(filters)];
        if (includeSummary) {
            const cached = cache.get('products:admin-summary');
            tasks.push(cached ? Promise.resolve(cached) : Product.getAdminSummary().then(s => {
                cache.set('products:admin-summary', s, 30000);
                return s;
            }));
        }

        const [listResult, summary] = await Promise.all(tasks);
        const { products, total } = listResult;

        res.json(apiResponse(true, {
            products,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit)
            },
            summary: summary || undefined
        }));
    } catch (error) {
        console.error('Error obteniendo productos admin:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener productos'));
    }
};

// Obtener un producto por ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json(apiResponse(false, null, 'Producto no encontrado'));
        }

        res.json(apiResponse(true, product));
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener producto'));
    }
};

// Crear nuevo producto (Admin)
const createProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            stock,
            brandId,
            productTypeId,
            imageUrl,
            featured,
            isActive
        } = req.body;

        const product = await Product.create({
            name: name,
            description: description,
            price: parseFloat(price),
            stock: parseInt(stock),
            brandId: brandId ? parseInt(brandId) : null,
            productTypeId: productTypeId ? parseInt(productTypeId) : null,
            imageUrl,
            featured: featured === true || featured === 'true',
            isActive: isActive !== false && isActive !== 'false'
        });

        cache.del('products:admin-summary');
        res.status(201).json(apiResponse(true, product, 'Producto creado exitosamente'));
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json(apiResponse(false, null, 'Error al crear producto'));
    }
};

// Actualizar producto (Admin)
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            price,
            stock,
            brandId,
            productTypeId,
            imageUrl,
            isActive,
            featured
        } = req.body;

        const product = await Product.update(id, {
            name,
            description,
            price: price !== undefined ? parseFloat(price) : undefined,
            stock: stock !== undefined ? parseInt(stock) : undefined,
            brandId: brandId !== undefined ? (brandId ? parseInt(brandId) : null) : undefined,
            productTypeId: productTypeId !== undefined ? (productTypeId ? parseInt(productTypeId) : null) : undefined,
            imageUrl,
            isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            featured: featured !== undefined ? Boolean(featured) : undefined
        });

        if (!product) {
            return res.status(404).json(apiResponse(false, null, 'Producto no encontrado'));
        }

        cache.del('products:admin-summary');
        res.json(apiResponse(true, product, 'Producto actualizado exitosamente'));
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json(apiResponse(false, null, 'Error al actualizar producto'));
    }
};

// Eliminar producto (Admin)
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.delete(id);

        if (!product) {
            return res.status(404).json(apiResponse(false, null, 'Producto no encontrado'));
        }

        cache.del('products:admin-summary');
        res.json(apiResponse(true, null, 'Producto desactivado exitosamente'));
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json(apiResponse(false, null, 'Error al eliminar producto'));
    }
};

// Obtener todas las marcas
const getBrands = async (req, res) => {
    try {
        let brands = cache.get('brands:all');
        if (!brands) {
            brands = await Brand.findAll();
            cache.set('brands:all', brands, 300000);
        }
        res.json(apiResponse(true, brands));
    } catch (error) {
        console.error('Error obteniendo marcas:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener marcas'));
    }
};

// Crear marca (Admin)
const createBrand = async (req, res) => {
    try {
        const { name, description, logoUrl } = req.body;

        const existingBrand = await Brand.findByName(name);
        if (existingBrand) {
            return res.status(400).json(apiResponse(false, null, 'La marca ya existe'));
        }

        const brand = await Brand.create({ name, description, logoUrl });
        res.status(201).json(apiResponse(true, brand, 'Marca creada exitosamente'));
    } catch (error) {
        console.error('Error creando marca:', error);
        res.status(500).json(apiResponse(false, null, 'Error al crear marca'));
    }
};

// Obtener todos los tipos de producto
const getProductTypes = async (req, res) => {
    try {
        let types = cache.get('types:all');
        if (!types) {
            types = await ProductType.findAll();
            cache.set('types:all', types, 300000);
        }
        res.json(apiResponse(true, types));
    } catch (error) {
        console.error('Error obteniendo tipos:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener tipos de producto'));
    }
};

// Crear tipo de producto (Admin)
const createProductType = async (req, res) => {
    try {
        const { name, description, icon } = req.body;

        const existingType = await ProductType.findByName(name);
        if (existingType) {
            return res.status(400).json(apiResponse(false, null, 'El tipo de producto ya existe'));
        }

        const type = await ProductType.create({ name, description, icon });
        res.status(201).json(apiResponse(true, type, 'Tipo de producto creado exitosamente'));
    } catch (error) {
        console.error('Error creando tipo:', error);
        res.status(500).json(apiResponse(false, null, 'Error al crear tipo de producto'));
    }
};

// Obtener productos destacados
const getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            featured: true,
            active: true,
            limit: 8
        });
        res.json(apiResponse(true, products));
    } catch (error) {
        console.error('Error obteniendo productos destacados:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener productos destacados'));
    }
};

// Obtener conteo de productos por categoría
const getProductCountsByCategory = async (req, res) => {
    try {
        const counts = await Product.countByCategory();
        const featuredCount = await Product.count({ featured: true, active: true });
        const onSaleCount = await Product.count({ onSale: true, active: true });
        const totalCount = await Product.count({ active: true });

        const result = {
            total: totalCount,
            featured: featuredCount,
            onSale: onSaleCount,
            categories: counts.reduce((acc, row) => {
                acc[row.category] = parseInt(row.count);
                return acc;
            }, {})
        };

        res.json(apiResponse(true, result));
    } catch (error) {
        console.error('Error obteniendo conteos:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener conteos'));
    }
};

module.exports = {
    getProducts,
    getAdminProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getBrands,
    createBrand,
    getProductTypes,
    createProductType,
    getFeaturedProducts,
    getProductCountsByCategory
};
