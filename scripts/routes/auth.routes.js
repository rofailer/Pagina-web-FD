const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');

// Registro de usuario
router.post("/register", async (req, res) => {
    const { nombre, usuario, password } = req.body || {};
    if (!nombre || !usuario || !password) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
    }
    // Validación de contraseña fuerte
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{4,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres, una mayúscula, un número y un carácter especial." });
    }
    try {
        // Verificar si el usuario ya existe
        const [users] = await pool.query("SELECT id FROM users WHERE usuario = ?", [usuario]);
        if (users.length > 0) {
            return res.status(409).json({ error: "El usuario ya existe." });
        }
        const hash = await bcrypt.hash(password, 10);
        const rol = "profesor"; // Rol por defecto
        await pool.query(
            "INSERT INTO users (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)",
            [nombre, usuario, hash, rol]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error al registrar usuario." });
    }
});

// Login de usuario
router.post("/login", async (req, res) => {
    // log eliminado
    const { usuario, password } = req.body || {};

    try {
        // Buscar por usuario o email
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE usuario = ? OR email = ?",
            [usuario, usuario]
        );

        if (!rows.length) {
            return res.status(404).json({ error: "Usuario inexistente." });
        }

        const user = rows[0];

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre, usuario: user.usuario },
            process.env.JWT_SECRET,
            { expiresIn: "30d" } // Cambiado de 8h a 30 días para sesiones persistentes
        );


        // Actualizar último acceso
        await pool.query("UPDATE users SET ultimo_acceso = NOW() WHERE id = ?", [user.id]);

        // Ejemplo de respuesta en /api/login
        res.json({
            token,
            nombre: user.nombre,
            rol: user.rol,
            usuario: user.usuario
        });

    } catch (err) {
        console.error('❌ Error en login:', err);
        res.status(500).json({ error: "Error al iniciar sesión.", details: err.message });
    }
});

// Estado de autenticación (opcional)
router.get('/api/auth-status', authenticate, async (req, res) => {
    res.json({ authenticated: true, userId: req.userId, userRole: req.userRole });
});

// Obtener información del usuario actual
router.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, nombre, nombre_completo, usuario, email, rol, estado_cuenta, organizacion, cargo, departamento FROM users WHERE id = ?',
            [req.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];
        res.json({
            id: user.id,
            nombre: user.nombre,
            nombre_completo: user.nombre_completo,
            usuario: user.usuario,
            email: user.email,
            rol: user.rol,
            estado_cuenta: user.estado_cuenta,
            organizacion: user.organizacion,
            cargo: user.cargo,
            departamento: user.departamento
        });
    } catch (error) {
        console.error('Error obteniendo información del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Renovar token de sesión
router.post('/api/auth/renew', authenticate, async (req, res) => {
    try {
        // Obtener información del usuario actual
        const [users] = await pool.query(
            'SELECT id, nombre, usuario, rol FROM users WHERE id = ?',
            [req.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];

        // Generar nuevo token con expiración extendida
        const newToken = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre, usuario: user.usuario },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        // Actualizar último acceso
        await pool.query("UPDATE users SET ultimo_acceso = NOW() WHERE id = ?", [user.id]);

        res.json({
            token: newToken,
            expiresIn: 30 * 24 * 60 * 60 * 1000 // 30 días en milisegundos
        });
    } catch (error) {
        console.error('Error renovando token:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;