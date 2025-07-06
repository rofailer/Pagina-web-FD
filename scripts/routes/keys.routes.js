const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');
const { encryptAES, encryptWithType } = require('../utils/crypto');

// Ruta para generar llaves (protegida)
router.post("/generate-keys", authenticate, async (req, res) => {
    const userId = req.userId;
    const { keyPassword, encryptionType = "aes-256-cbc" } = req.body;
    if (!keyPassword || keyPassword.length < 4) {
        return res.status(400).json({ error: "La contraseña es requerida y debe tener al menos 4 caracteres." });
    }
    const keysDir = path.join(__dirname, "../llaves");
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    try {
        // Contar las llaves existentes para el usuario
        const [rows] = await pool.query("SELECT COUNT(*) AS count FROM user_keys WHERE user_id = ?", [userId]);
        const keyCount = rows[0].count + 1;

        const privateKeyName = `key${keyCount}.pem`;
        const publicKeyName = `key${keyCount}.pub`;

        const privateKeyPath = path.join(keysDir, privateKeyName);
        const publicKeyPath = path.join(keysDir, publicKeyName);

        // Fecha de expiración: 30 días desde ahora
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);

        // Generar llaves con OpenSSL
        const privateKeyCommand = `openssl genrsa -out "${privateKeyPath}" 4096`;
        const publicKeyCommand = `openssl rsa -in "${privateKeyPath}" -pubout -out "${publicKeyPath}"`;

        exec(privateKeyCommand, (err) => {
            if (err) {
                console.error("Error al generar la llave privada:", err);
                return res.status(500).json({ error: "Error al generar la llave privada" });
            }

            exec(publicKeyCommand, async (err) => {
                if (err) {
                    console.error("Error al generar la llave pública:", err);
                    return res.status(500).json({ error: "Error al generar la llave pública" });
                }

                // Leer las llaves generadas
                const privateKeyContent = fs.readFileSync(privateKeyPath, "utf8");
                const publicKeyContent = fs.readFileSync(publicKeyPath, "utf8");

                // Cifrar la privada con la contraseña del usuario y el tipo seleccionado
                const encryptedPrivateKey = encryptWithType(privateKeyContent, keyPassword, encryptionType);

                // Cifrar la pública con el userId como clave (simple, pero suficiente)
                const encryptedPublicKey = encryptAES(publicKeyContent, String(userId), 'aes-256-cbc');

                // Guarda la llave privada (cifrada), la pública y el tipo de cifrado en la base de datos
                await pool.query(
                    "INSERT INTO user_keys (user_id, key_name, private_key, public_key, encryption_type, created_at, expiration_date) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
                    [userId, `key${keyCount}`, encryptedPrivateKey, encryptedPublicKey, encryptionType, expirationDate]
                );

                // Limpieza: elimina archivos temporales
                fs.unlink(privateKeyPath, () => { });
                fs.unlink(publicKeyPath, () => { });

                res.json({
                    success: true,
                    keyName: `key${keyCount}`,
                    expirationDate,
                    message: "Llaves generadas correctamente"
                });
            });
        });
    } catch (err) {
        console.error("Error al generar las llaves:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Listar llaves del usuario
router.get("/list-keys", authenticate, async (req, res) => {
    const userId = req.userId;
    try {
        const [keys] = await pool.query(
            "SELECT id, key_name, expiration_date, encryption_type FROM user_keys WHERE user_id = ? ORDER BY expiration_date DESC",
            [userId]
        );
        const keysWithExpiration = keys.map((key) => {
            const now = new Date();
            const expirationDate = new Date(key.expiration_date);
            const timeRemaining = expirationDate - now;
            return {
                ...key,
                timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
                expired: timeRemaining <= 0,
            };
        });
        res.json(keysWithExpiration);
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Obtener llave activa
router.get("/active-key", authenticate, async (req, res) => {
    const userId = req.userId;
    try {
        const [rows] = await pool.query(
            "SELECT key_name, expiration_date FROM user_keys WHERE id = (SELECT active_key_id FROM users WHERE id = ?)",
            [userId]
        );
        if (rows.length === 0) {
            return res.json({ activeKey: null, message: "No hay una llave activa seleccionada" });
        }
        res.json({ activeKey: rows[0].key_name, expirationDate: rows[0].expiration_date });
    } catch (err) {
        res.status(500).json({ error: "Error al obtener la llave activa" });
    }
});

// Seleccionar llave activa
router.post("/select-key", authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, key_name FROM user_keys WHERE id = ? AND user_id = ?", [req.body.keyId, req.userId]);
        if (rows.length === 0) {
            return res.status(400).json({ error: "La llave seleccionada no pertenece al usuario" });
        }
        await pool.query("UPDATE users SET active_key_id = ? WHERE id = ?", [req.body.keyId, req.userId]);
        res.json({ success: true, activeKeyName: rows[0].key_name });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Obtener todas las llaves del usuario (para modal, etc.)
router.get("/user-keys", authenticate, async (req, res) => {
    const userId = req.userId;
    try {
        const [keys] = await pool.query(
            "SELECT id, key_name AS nombre, created_at, expiration_date FROM user_keys WHERE user_id = ?",
            [userId]
        );
        res.json({ keys });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

module.exports = router;