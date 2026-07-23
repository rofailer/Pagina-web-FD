const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');
const loginRateLimit = require('../middlewares/loginRateLimit');

const router = express.Router();
const SESSION_DURATION = '8h';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const GENERIC_LOGIN_ERROR = 'No fue posible iniciar sesión. Verifica tus credenciales.';
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('invalid-login-password', 10);
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;
const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000;
const AUTH_USER_COLUMNS = `
    id, nombre, usuario, password, rol, email, estado_cuenta,
    organizacion, cargo, departamento, force_password_change,
    estado_presencia, ultima_actividad,
    (foto_perfil IS NOT NULL) AS has_photo,
    foto_perfil_actualizada_at
`;

function effectivePresenceStatus(status, lastActivity, now = Date.now()) {
    if (status === 'desconectado' || !lastActivity) return 'desconectado';
    const lastActivityMs = new Date(lastActivity).getTime();
    if (!Number.isFinite(lastActivityMs) || now - lastActivityMs > PRESENCE_TIMEOUT_MS) {
        return 'desconectado';
    }
    return ['en_linea', 'ausente', 'ocupado'].includes(status)
        ? status
        : 'desconectado';
}

function normalizeText(value) {
    return typeof value === 'string' ? value.normalize('NFC').trim() : '';
}

function mustChangePassword(user) {
    return authenticate.mustChangePassword(user);
}

function createSessionToken(user) {
    return jwt.sign(
        {
            id: user.id,
            rol: user.rol,
            nombre: user.nombre,
            usuario: user.usuario,
            authVersion: authenticate.createAuthVersion(user.id, user.password)
        },
        process.env.JWT_SECRET,
        { expiresIn: SESSION_DURATION }
    );
}

// Las cuentas se crean exclusivamente desde el panel administrativo.
router.post('/register', (_req, res) => {
    return res.status(403).json({
        error: 'El registro público está deshabilitado. Solicita una cuenta al administrador.'
    });
});

// Login con límite de intentos y respuesta indistinguible para usuario/contraseña.
router.post('/login', loginRateLimit, async (req, res) => {
    const usuario = normalizeText(req.body?.usuario);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    try {
        const [rows] = usuario
            ? await pool.query(
                `SELECT ${AUTH_USER_COLUMNS}
                 FROM users
                 WHERE usuario = ? OR email = ?
                 LIMIT 1`,
                [usuario, usuario]
            )
            : [[]];

        const user = rows[0];
        const passwordMatches = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
        const accountIsActive = !user?.estado_cuenta || user.estado_cuenta === 'activo';

        if (!user || !passwordMatches || !accountIsActive) {
            req.loginRateLimit.recordFailure();
            return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
        }

        req.loginRateLimit.recordSuccess();
        const token = createSessionToken(user);

        await pool.query(
            `UPDATE users
             SET ultimo_acceso = NOW(),
                 ultima_actividad = NOW(),
                 estado_presencia = 'en_linea'
             WHERE id = ?`,
            [user.id]
        );

        return res.json({
            token,
            expiresIn: SESSION_DURATION_MS,
            nombre: user.nombre,
            rol: user.rol,
            usuario: user.usuario,
            presenceStatus: 'en_linea',
            forcePasswordChange: mustChangePassword(user)
        });
    } catch (error) {
        console.error('Error en login:', error.message);
        return res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
});

router.get('/auth-status', authenticate, (req, res) => {
    res.json({ authenticated: true, userId: req.userId, userRole: req.userRole });
});

router.get('/auth/me', authenticate, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT ${AUTH_USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
            [req.userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];
        return res.json({
            id: user.id,
            nombre: user.nombre,
            usuario: user.usuario,
            email: user.email,
            rol: user.rol,
            estado_cuenta: user.estado_cuenta,
            organizacion: user.organizacion,
            cargo: user.cargo,
            departamento: user.departamento,
            hasPhoto: Boolean(user.has_photo),
            photoVersion: user.foto_perfil_actualizada_at,
            selectedPresenceStatus: user.estado_presencia,
            presenceStatus: effectivePresenceStatus(user.estado_presencia, user.ultima_actividad),
            lastSeenAt: user.ultima_actividad,
            forcePasswordChange: mustChangePassword(user)
        });
    } catch (error) {
        console.error('Error obteniendo información del usuario:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar la contrasena propia. Esta operacion sigue disponible cuando la
// cuenta esta obligada a reemplazar una contrasena temporal.
router.post('/auth/change-password', authenticate, async (req, res) => {
    const currentPassword = typeof req.body?.currentPassword === 'string'
        ? req.body.currentPassword
        : '';
    const newPassword = typeof req.body?.newPassword === 'string'
        ? req.body.newPassword
        : '';

    if (!currentPassword || !PASSWORD_PATTERN.test(newPassword)) {
        return res.status(400).json({
            error: 'La nueva contrasena debe tener entre 10 y 128 caracteres, con mayuscula, minuscula, numero y simbolo.'
        });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({ error: 'La nueva contrasena debe ser diferente a la actual.' });
    }

    try {
        const [users] = await pool.query(
            `SELECT ${AUTH_USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
            [req.userId]
        );
        const user = users[0];
        if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(401).json({ error: 'La contrasena actual no es correcta.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await pool.query(
            'UPDATE users SET password = ?, force_password_change = 0, updated_at = NOW() WHERE id = ?',
            [passwordHash, user.id]
        );

        pool.query(
            `INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address)
             VALUES (?, 'change_password', 'Cambio de contrasena de la cuenta', ?)`,
            [user.id, req.ip]
        ).catch(error => console.warn('No se pudo registrar el cambio de contrasena:', error.message));

        const updatedUser = { ...user, password: passwordHash, force_password_change: 0 };
        return res.json({
            success: true,
            token: createSessionToken(updatedUser),
            expiresIn: SESSION_DURATION_MS,
            forcePasswordChange: false
        });
    } catch (error) {
        console.error('Error cambiando contrasena:', error.message);
        return res.status(500).json({ error: 'No fue posible cambiar la contrasena.' });
    }
});

router.post('/auth/renew', authenticate, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT ${AUTH_USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
            [req.userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];
        const newToken = createSessionToken(user);
        await pool.query('UPDATE users SET ultima_actividad = NOW() WHERE id = ?', [user.id]);

        return res.json({
            token: newToken,
            expiresIn: SESSION_DURATION_MS,
            forcePasswordChange: mustChangePassword(user)
        });
    } catch (error) {
        console.error('Error renovando token:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// El JWT sigue expirando por tiempo; este endpoint registra de inmediato que
// la sesión dejó de estar visible para otros usuarios.
router.post('/auth/logout', authenticate, async (req, res) => {
    try {
        await pool.query(
            `UPDATE users
             SET estado_presencia = 'desconectado', ultima_actividad = NOW()
             WHERE id = ?`,
            [req.userId]
        );

        pool.query(
            `INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address)
             VALUES (?, 'logout', 'Cierre de sesión', ?)`,
            [req.userId, req.ip]
        ).catch(error => console.warn('No se pudo registrar el cierre de sesión:', error.message));

        return res.json({
            success: true,
            presenceStatus: 'desconectado'
        });
    } catch (error) {
        console.error('Error cerrando sesión:', error.message);
        return res.status(500).json({ error: 'No fue posible cerrar la sesión.' });
    }
});

router.effectivePresenceStatus = effectivePresenceStatus;
router.PRESENCE_TIMEOUT_MS = PRESENCE_TIMEOUT_MS;

module.exports = router;
