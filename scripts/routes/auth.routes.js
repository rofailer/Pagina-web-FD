const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');

// Registro de usuario
router.post("/api/register", async (req, res) => {
    const { nombre, usuario, password } = req.body;
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
router.post("/api/login", async (req, res) => {
    const { usuario, password } = req.body;
    console.log('🔐 Intento de login:', { usuario: usuario });

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE usuario = ?", [usuario]);
        console.log('👤 Usuarios encontrados:', rows.length);

        if (!rows.length) {
            console.log('❌ Usuario no encontrado:', usuario);
            return res.status(404).json({ error: "Usuario inexistente." });
        }

        const user = rows[0];
        console.log('👤 Usuario encontrado:', { id: user.id, usuario: user.usuario, rol: user.rol });

        const match = await bcrypt.compare(password, user.password);
        console.log('🔑 Contraseña válida:', match);

        if (!match) {
            console.log('❌ Contraseña incorrecta para usuario:', usuario);
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre, usuario: user.usuario },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        console.log('✅ Token generado para usuario:', usuario);

        // Actualizar último acceso
        await pool.query("UPDATE users SET ultimo_acceso = NOW() WHERE id = ?", [user.id]);

        // Ejemplo de respuesta en /api/login
        res.json({
            token,
            nombre: user.nombre,
            rol: user.rol,
            usuario: user.usuario
        });

        console.log('✅ Login exitoso para usuario:', usuario);
    } catch (err) {
        console.error('❌ Error en login:', err);
        res.status(500).json({ error: "Error al iniciar sesión.", details: err.message });
    }
});

// Estado de autenticación (opcional)
router.get('/api/auth-status', authenticate, async (req, res) => {
    res.json({ authenticated: true, userId: req.userId, userRole: req.userRole });
});

module.exports = router;