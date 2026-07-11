const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { apiResponse } = require('../utils/helpers');

// ==============================
// REGISTRO
// ==============================
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, address, city } = req.body;

        // Verificar si el email ya existe
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json(
                apiResponse(false, null, 'El email ya está registrado')
            );
        }

        // 🔐 Hash contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario
        const user = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            address,
            city
        });

        // Generar token
        const token = generateToken(user.id);

        // Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json(apiResponse(true, {
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            },
            token
        }, 'Usuario registrado exitosamente'));

    } catch (error) {
        console.error(' Error en registro:', error);
        res.status(500).json(apiResponse(false, null, 'Error al registrar usuario'));
    }
};


// ==============================
// LOGIN
// ==============================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json(
                apiResponse(false, null, 'Credenciales inválidas')
            );
        }

        // Validar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json(
                apiResponse(false, null, 'Credenciales inválidas')
            );
        }

        // ⚠️ Validación segura de is_active
        if (user.is_active === false) {
            return res.status(401).json(
                apiResponse(false, null, 'Usuario inactivo. Contacte al administrador.')
            );
        }

        // Generar token
        const token = generateToken(user.id);

        // Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json(apiResponse(true, {
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            },
            token
        }, 'Login exitoso'));

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json(apiResponse(false, null, 'Error al iniciar sesión'));
    }
};


// ==============================
// LOGOUT
// ==============================
const logout = (req, res) => {
    res.clearCookie('token');
    res.json(apiResponse(true, null, 'Sesión cerrada exitosamente'));
};


// ==============================
// PERFIL
// ==============================
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json(
                apiResponse(false, null, 'Usuario no encontrado')
            );
        }

        res.json(apiResponse(true, {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            city: user.city,
            role: user.role,
            createdAt: user.created_at
        }));

    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        res.status(500).json(apiResponse(false, null, 'Error al obtener perfil'));
    }
};


// ==============================
// ACTUALIZAR PERFIL
// ==============================
const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, address, city } = req.body;

        const user = await User.update(req.user.id, {
            firstName,
            lastName,
            phone,
            address,
            city
        });

        res.json(apiResponse(true, user, 'Perfil actualizado exitosamente'));

    } catch (error) {
        console.error('❌ Error actualizando perfil:', error);
        res.status(500).json(apiResponse(false, null, 'Error al actualizar perfil'));
    }
};


// ==============================
// VERIFY TOKEN
// ==============================
const verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json(
                apiResponse(false, null, 'Usuario no encontrado')
            );
        }

        res.json(apiResponse(true, {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role
        }));

    } catch (error) {
        console.error('❌ Error verificando token:', error);
        res.status(500).json(apiResponse(false, null, 'Error al verificar sesión'));
    }
};


module.exports = {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    verifyToken
};

