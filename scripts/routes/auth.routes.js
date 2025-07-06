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
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial." });
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
    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE usuario = ?", [usuario]);
        if (!rows.length) {
            // Usuario no existe
            return res.status(404).json({ error: "Usuario inexistente." });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            // Contraseña incorrecta
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );
        // Ejemplo de respuesta en /api/login
        res.json({
            token,
            nombre: user.nombre,
            rol: user.rol
        });
    } catch (err) {
        res.status(500).json({ error: "Error al iniciar sesión." });
    }
});

// Estado de autenticación (opcional)
router.get('/api/auth-status', authenticate, async (req, res) => {
    res.json({ authenticated: true, userId: req.userId, userRole: req.userRole });
});

module.exports = router;