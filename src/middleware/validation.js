const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const details = errors.array();
        return res.status(400).json({
            success: false,
            message: details[0]?.msg || 'Error de validación',
            errors: details
        });
    }
    next();
};

// Validaciones para registro de usuario
const registerValidation = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('lastName')
        .trim()
        .notEmpty().withMessage('El apellido es requerido')
        .isLength({ min: 2, max: 100 }).withMessage('El apellido debe tener entre 2 y 100 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('El email no es válido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('phone')
        .optional()
        .trim()
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono no es válido'),
    handleValidationErrors
];

// Validaciones para login
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('El email no es válido'),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida'),
    handleValidationErrors
];

// Validaciones para productos
const productValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('El nombre del producto es requerido')
        .isLength({ max: 200 }).withMessage('El nombre no puede exceder 200 caracteres'),
    body('description')
        .optional()
        .trim(),
    body('price')
        .notEmpty().withMessage('El precio es requerido')
        .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
    body('stock')
        .notEmpty().withMessage('El stock es requerido')
        .isInt({ min: 0 }).withMessage('El stock debe ser un número entero positivo'),
    body('brandId')
        .optional()
        .isInt().withMessage('El ID de marca debe ser un número entero'),
    body('productTypeId')
        .optional()
        .isInt().withMessage('El ID de tipo debe ser un número entero'),
    handleValidationErrors
];

// Validaciones para carrito
const cartItemValidation = [
    body('productId')
        .notEmpty().withMessage('El ID del producto es requerido')
        .isInt().withMessage('El ID del producto debe ser un número entero'),
    body('quantity')
        .notEmpty().withMessage('La cantidad es requerida')
        .isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
    handleValidationErrors
];

// Validaciones para pedidos
const orderValidation = [
    body('shippingAddress')
        .trim()
        .notEmpty().withMessage('La dirección de envío es requerida'),
    body('shippingCity')
        .trim()
        .notEmpty().withMessage('La ciudad es requerida'),
    body('shippingPhone')
        .trim()
        .notEmpty().withMessage('El teléfono de contacto es requerido')
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono no es válido'),
    body('notes')
        .optional()
        .trim(),
    handleValidationErrors
];

// Validaciones para filtros de productos
const productFilterValidation = [
    query('brandId').optional().isInt(),
    query('typeId').optional().isInt(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('offset').optional().isInt({ min: 0 }),
    handleValidationErrors
];

// Validaciones para actualizar estado de pedido
const orderStatusValidation = [
    param('id').isInt().withMessage('ID de pedido inválido'),
    body('status')
        .notEmpty().withMessage('El estado es requerido')
        .isIn(['pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Estado no válido'),
    body('notes').optional().trim(),
    handleValidationErrors
];

module.exports = {
    registerValidation,
    loginValidation,
    productValidation,
    cartItemValidation,
    orderValidation,
    productFilterValidation,
    orderStatusValidation
};
