const jwt = require('jsonwebtoken');
const User = require('../models/User');
const cache = require('../utils/cache');

// ==============================
// GENERAR TOKEN
// ==============================
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId }, // 🔥 consistente en todo el sistema
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};


// ==============================
// AUTH MIDDLEWARE
// ==============================
const authenticate = async (req, res, next) => {
    try {
        let token = null;

        // 🔹 1. Buscar token en cookie
        if (req.cookies?.token) {
            token = req.cookies.token;
        }

        // 🔹 2. Buscar token en header
        if (!token && req.headers.authorization) {
            token = req.headers.authorization.startsWith('Bearer ')
                ? req.headers.authorization.split(' ')[1]
                : null;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado. Token no proporcionado.'
            });
        }

        // 🔐 Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const cacheKey = `user:${decoded.id}`;
        let user = cache.get(cacheKey);

        if (!user) {
            user = await User.findById(decoded.id);
            if (user && user.is_active !== false) {
                cache.set(cacheKey, user, 120000);
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        // ⚠️ Validación correcta
        if (user.is_active === false) {
            return res.status(401).json({
                success: false,
                message: 'Usuario inactivo.'
            });
        }

        // Guardar usuario en request
        req.user = user;

        next();

    } catch (err) {
        console.error('❌ Error en auth:', err);

        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido.'
            });
        }

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error en la autenticación.'
        });
    }
};


// ==============================
// ADMIN ONLY
// ==============================
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo administradores.'
        });
    }
    next();
};


// ==============================
// AUTH OPCIONAL (carrito)
// ==============================
const optionalAuth = async (req, res, next) => {
    try {
        let token = null;

        if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token && req.headers.authorization) {
            token = req.headers.authorization.startsWith('Bearer ')
                ? req.headers.authorization.split(' ')[1]
                : null;
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (user && user.is_active !== false) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        next(); // no rompe si falla
    }
};


module.exports = {
    authenticate,
    requireAdmin,
    optionalAuth,
    generateToken
};
