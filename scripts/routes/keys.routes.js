const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');
const {
    V2_ENCRYPTION_TYPE,
    encryptWithType,
    decryptWithType,
    isSupportedEncryptionType
} = require('../utils/crypto');

const router = express.Router();
const MIN_NEW_KEY_PASSWORD_LENGTH = 12;
const MAX_KEY_PASSWORD_LENGTH = 1024;

function parseBoundedInteger(value, fallback, minimum, maximum) {
    const parsed = value === undefined || value === '' ? fallback : Number(value);
    return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
        ? parsed
        : fallback;
}

const MAX_KEYS_PER_USER = parseBoundedInteger(process.env.MAX_KEYS_PER_USER, 10, 1, 100);
const KEY_GENERATION_WINDOW_MS = parseBoundedInteger(
    process.env.KEY_GENERATION_WINDOW_MS,
    60 * 60 * 1000,
    60 * 1000,
    24 * 60 * 60 * 1000
);
const KEY_GENERATION_MAX_REQUESTS = parseBoundedInteger(
    process.env.KEY_GENERATION_MAX_REQUESTS,
    3,
    1,
    100
);
const KEY_GENERATION_CONCURRENCY = parseBoundedInteger(
    process.env.KEY_GENERATION_CONCURRENCY,
    2,
    1,
    16
);

class KeyGenerationGate {
    constructor(options = {}) {
        this.windowMs = options.windowMs || KEY_GENERATION_WINDOW_MS;
        this.maxRequests = options.maxRequests || KEY_GENERATION_MAX_REQUESTS;
        this.maxConcurrent = options.maxConcurrent || KEY_GENERATION_CONCURRENCY;
        this.attempts = new Map();
        this.activeUsers = new Set();
        this.activeCount = 0;
    }

    acquire(userId, now = Date.now()) {
        const identifier = String(userId);
        let rate = this.attempts.get(identifier);
        if (!rate || now - rate.windowStartedAt >= this.windowMs) {
            rate = { windowStartedAt: now, count: 0 };
            this.attempts.set(identifier, rate);
        }

        if (rate.count >= this.maxRequests) {
            return {
                allowed: false,
                code: 'KEY_GENERATION_RATE_LIMIT',
                retryAfterSeconds: Math.max(
                    1,
                    Math.ceil((rate.windowStartedAt + this.windowMs - now) / 1000)
                )
            };
        }
        rate.count += 1;

        if (this.activeUsers.has(identifier) || this.activeCount >= this.maxConcurrent) {
            return {
                allowed: false,
                code: 'KEY_GENERATION_BUSY',
                retryAfterSeconds: 5
            };
        }

        this.activeUsers.add(identifier);
        this.activeCount += 1;
        let released = false;
        return {
            allowed: true,
            release: () => {
                if (released) return;
                released = true;
                this.activeUsers.delete(identifier);
                this.activeCount = Math.max(0, this.activeCount - 1);
            }
        };
    }
}

const keyGenerationGate = new KeyGenerationGate();

function generateRsaKeyPair() {
    return new Promise((resolve, reject) => {
        crypto.generateKeyPair('rsa', {
            modulusLength: 4096,
            publicExponent: 0x10001,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, (error, publicKey, privateKey) => {
            if (error) return reject(error);
            resolve({ publicKey, privateKey });
        });
    });
}

async function insertGeneratedKeyWithQuota(connection, options) {
    const {
        userId,
        requestedKeyName,
        encryptedPrivateKey,
        encryptedPublicKey,
        encryptionType,
        expirationDate,
        maximumKeys = MAX_KEYS_PER_USER
    } = options;

    await connection.beginTransaction();
    try {
        // Bloquear la fila del usuario serializa el COUNT + INSERT incluso
        // cuando distintas instancias de la aplicación reciben solicitudes.
        const [userRows] = await connection.query(
            'SELECT id FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        if (userRows.length === 0) {
            const error = new Error('Usuario no encontrado');
            error.code = 'KEY_USER_NOT_FOUND';
            throw error;
        }

        const [countRows] = await connection.query(
            'SELECT COUNT(*) AS count FROM user_keys WHERE user_id = ?',
            [userId]
        );
        const existingKeyCount = Number(countRows[0].count);
        if (!Number.isSafeInteger(existingKeyCount) || existingKeyCount >= maximumKeys) {
            const error = new Error('El usuario alcanzo el limite de llaves');
            error.code = 'KEY_QUOTA_EXCEEDED';
            throw error;
        }

        const finalKeyName = requestedKeyName || `Key${existingKeyCount + 1}`;
        await connection.query(
            'INSERT INTO user_keys (user_id, key_name, private_key, public_key, encryption_type, created_at, expiration_date) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
            [
                userId,
                finalKeyName,
                encryptedPrivateKey,
                encryptedPublicKey,
                encryptionType,
                expirationDate
            ]
        );
        await connection.commit();
        return {
            finalKeyName,
            isFirstKey: existingKeyCount === 0
        };
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error('No se pudo revertir la reserva de llave:', rollbackError.message);
        }
        throw error;
    }
}

function isValidPassword(password, minimumLength = 1) {
    return typeof password === 'string' &&
        password.length >= minimumLength &&
        password.length <= MAX_KEY_PASSWORD_LENGTH;
}

router.get('/api/user-keys', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, key_name, created_at, expiration_date, encryption_type FROM user_keys WHERE user_id = ? ORDER BY created_at DESC',
            [req.userId]
        );
        res.json({ keys: rows, hasKeys: rows.length > 0 });
    } catch (error) {
        console.error('Error al obtener llaves del usuario:', error);
        res.status(500).json({ error: 'Error al obtener las llaves del usuario' });
    }
});

router.post('/generate-keys', authenticate, async (req, res) => {
    const userId = req.userId;
    const {
        keyPassword,
        keyName,
        encryptionType = V2_ENCRYPTION_TYPE
    } = req.body;

    if (!isValidPassword(keyPassword, MIN_NEW_KEY_PASSWORD_LENGTH)) {
        return res.status(400).json({
            error: `La contrasena debe tener entre ${MIN_NEW_KEY_PASSWORD_LENGTH} y ${MAX_KEY_PASSWORD_LENGTH} caracteres.`
        });
    }
    if (keyName != null && (typeof keyName !== 'string' || keyName.trim().length > 100)) {
        return res.status(400).json({ error: 'El nombre de la llave debe tener maximo 100 caracteres.' });
    }
    if (!isSupportedEncryptionType(encryptionType)) {
        return res.status(400).json({ error: 'El tipo de cifrado seleccionado no es compatible.' });
    }

    const permit = keyGenerationGate.acquire(userId);
    if (!permit.allowed) {
        res.setHeader('Retry-After', String(permit.retryAfterSeconds));
        return res.status(429).json({
            error: permit.code === 'KEY_GENERATION_RATE_LIMIT'
                ? 'Has alcanzado el limite temporal de generacion de llaves.'
                : 'El servicio de generacion de llaves esta ocupado. Intenta de nuevo en unos segundos.',
            code: permit.code
        });
    }

    let connection;
    try {
        // Esta consulta evita gastar CPU si la cuota ya estaba agotada. La
        // comprobación transaccional posterior es la que garantiza el límite.
        const [rows] = await pool.query('SELECT COUNT(*) AS count FROM user_keys WHERE user_id = ?', [userId]);
        const existingKeyCount = Number(rows[0].count);
        if (!Number.isSafeInteger(existingKeyCount) || existingKeyCount >= MAX_KEYS_PER_USER) {
            return res.status(409).json({
                error: `No puedes almacenar mas de ${MAX_KEYS_PER_USER} llaves.`,
                code: 'KEY_QUOTA_EXCEEDED'
            });
        }

        const requestedKeyName = keyName && keyName.trim() ? keyName.trim() : null;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);

        // Ambas llaves se generan y cifran en memoria. La llave privada nunca toca el disco.
        const { privateKey, publicKey } = await generateRsaKeyPair();
        const encryptedPrivateKey = encryptWithType(privateKey, keyPassword, encryptionType);
        // La pública no es secreta; el cifrado autenticado detecta alteraciones en la fila.
        const encryptedPublicKey = encryptWithType(publicKey, String(userId), encryptionType);

        connection = await pool.getConnection();
        const { finalKeyName, isFirstKey } = await insertGeneratedKeyWithQuota(connection, {
            userId,
            requestedKeyName,
            encryptedPrivateKey,
            encryptedPublicKey,
            encryptionType,
            expirationDate,
            maximumKeys: MAX_KEYS_PER_USER
        });

        res.json({
            success: true,
            keyName: finalKeyName,
            expirationDate,
            isFirstKey,
            encryptionType,
            message: 'Llaves generadas correctamente'
        });
    } catch (error) {
        if (error.code === 'KEY_QUOTA_EXCEEDED') {
            return res.status(409).json({
                error: `No puedes almacenar mas de ${MAX_KEYS_PER_USER} llaves.`,
                code: error.code
            });
        }
        if (error.code === 'KEY_USER_NOT_FOUND') {
            return res.status(404).json({ error: 'Usuario no encontrado', code: error.code });
        }
        console.error('Error al generar las llaves:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (connection) connection.release();
        permit.release();
    }
});

router.get('/list-keys', authenticate, async (req, res) => {
    try {
        const [keys] = await pool.query(
            'SELECT id, key_name, expiration_date, encryption_type FROM user_keys WHERE user_id = ? ORDER BY expiration_date DESC',
            [req.userId]
        );
        const now = new Date();
        res.json(keys.map(key => {
            const timeRemaining = new Date(key.expiration_date) - now;
            return {
                ...key,
                timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
                expired: timeRemaining <= 0
            };
        }));
    } catch (error) {
        console.error('Error al listar llaves:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.get('/active-key', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, key_name, expiration_date, encryption_type FROM user_keys WHERE id = (SELECT active_key_id FROM users WHERE id = ?) AND user_id = ?',
            [req.userId, req.userId]
        );
        if (rows.length === 0) {
            return res.json({ activeKey: null, message: 'No hay una llave activa seleccionada' });
        }
        res.json({
            activeKey: rows[0].key_name,
            activeKeyId: rows[0].id,
            expirationDate: rows[0].expiration_date,
            encryptionType: rows[0].encryption_type
        });
    } catch (error) {
        console.error('Error al obtener la llave activa:', error);
        res.status(500).json({ error: 'Error al obtener la llave activa' });
    }
});

router.post('/select-key', authenticate, async (req, res) => {
    const keyId = Number.parseInt(req.body.keyId, 10);
    if (!Number.isSafeInteger(keyId) || keyId <= 0) {
        return res.status(400).json({ error: 'La llave seleccionada no es valida' });
    }

    try {
        const [rows] = await pool.query(
            'SELECT id, key_name, expiration_date FROM user_keys WHERE id = ? AND user_id = ?',
            [keyId, req.userId]
        );
        if (rows.length === 0) {
            return res.status(400).json({ error: 'La llave seleccionada no pertenece al usuario' });
        }
        if (new Date(rows[0].expiration_date) <= new Date()) {
            return res.status(400).json({ error: 'No se puede activar una llave expirada' });
        }
        await pool.query('UPDATE users SET active_key_id = ? WHERE id = ?', [keyId, req.userId]);
        res.json({ success: true, activeKeyName: rows[0].key_name });
    } catch (error) {
        console.error('Error al seleccionar la llave:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.get('/user-keys', authenticate, async (req, res) => {
    try {
        const [keys] = await pool.query(
            'SELECT id, key_name, created_at, expiration_date, encryption_type FROM user_keys WHERE user_id = ?',
            [req.userId]
        );
        res.json({ keys });
    } catch (error) {
        console.error('Error al obtener llaves:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.delete('/delete-key', authenticate, async (req, res) => {
    const { keyName, password } = req.body;
    if (typeof keyName !== 'string' || !keyName.trim() || !isValidPassword(password)) {
        return res.status(400).json({ error: 'Nombre de llave y contrasena validos son requeridos' });
    }

    try {
        const [keyRows] = await pool.query(
            'SELECT id, private_key, encryption_type FROM user_keys WHERE user_id = ? AND key_name = ?',
            [req.userId, keyName]
        );
        if (keyRows.length === 0) {
            return res.status(404).json({ error: 'Llave no encontrada' });
        }

        const key = keyRows[0];
        try {
            const privateKey = decryptWithType(key.private_key, password, key.encryption_type);
            // Validar también la estructura PEM antes de autorizar la eliminación.
            crypto.createPrivateKey(privateKey);
        } catch (error) {
            return res.status(401).json({ error: 'Contrasena incorrecta' });
        }

        const [userRows] = await pool.query('SELECT active_key_id FROM users WHERE id = ?', [req.userId]);
        const isActiveKey = userRows.length > 0 && Number(userRows[0].active_key_id) === Number(key.id);
        if (isActiveKey) {
            await pool.query('UPDATE users SET active_key_id = NULL WHERE id = ?', [req.userId]);
        }
        await pool.query('DELETE FROM user_keys WHERE id = ? AND user_id = ?', [key.id, req.userId]);

        res.json({
            success: true,
            message: `Llave "${keyName}" eliminada correctamente`,
            wasActiveKey: isActiveKey
        });
    } catch (error) {
        console.error('Error al eliminar llave:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.KeyGenerationGate = KeyGenerationGate;
router.insertGeneratedKeyWithQuota = insertGeneratedKeyWithQuota;
router.MAX_KEYS_PER_USER = MAX_KEYS_PER_USER;

module.exports = router;
