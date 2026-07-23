const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const PASSWORD_CHANGE_ALLOWED_PATHS = new Set([
    '/api/auth/change-password',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/auth-status',
    '/api/profile/heartbeat',
    '/api/profile/presence'
]);

function mustChangePassword(user) {
    return Boolean(user?.force_password_change);
}

function createAuthVersion(userId, passwordHash) {
    if (!process.env.JWT_SECRET || !passwordHash) {
        return null;
    }

    return crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(`${userId}:${passwordHash}`)
        .digest('base64url')
        .slice(0, 32);
}

function safeEqual(left, right) {
    if (typeof left !== 'string' || typeof right !== 'string') {
        return false;
    }

    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length
        && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function tokenMatchesCurrentUser(payload, user) {
    const expectedVersion = createAuthVersion(user.id, user.password);
    return safeEqual(payload.authVersion, expectedVersion);
}

/**
 * Autentica usuarios mediante JWT y vuelve a consultar permisos y estado en BD.
 */
async function authenticate(req, res, next) {
    // Las rutas administrativas ya validaron el token y el rol vigente en BD.
    if (req.adminAuthenticated && req.userId) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado: token no proporcionado' });
    }

    try {
        const token = authHeader.slice(7).trim();
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (!payload.id || payload.type === 'admin-panel') {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        const [rows] = await pool.query(
            `SELECT id, nombre, usuario, password, rol, estado_cuenta,
                    force_password_change
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [payload.id]
        );

        if (rows.length === 0 || !tokenMatchesCurrentUser(payload, rows[0])) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        const userData = rows[0];
        if (userData.estado_cuenta && userData.estado_cuenta !== 'activo') {
            return res.status(403).json({ error: 'La cuenta no está activa' });
        }

        req.userId = userData.id;
        req.userRole = userData.rol;
        req.authVersion = createAuthVersion(userData.id, userData.password);
        req.forcePasswordChange = mustChangePassword(userData);
        req.user = {
            id: userData.id,
            nombre: userData.nombre,
            usuario: userData.usuario,
            rol: userData.rol,
            estado_cuenta: userData.estado_cuenta,
            forcePasswordChange: req.forcePasswordChange
        };

        const requestPath = String(req.originalUrl || req.url || '').split('?')[0];
        if (req.forcePasswordChange && !PASSWORD_CHANGE_ALLOWED_PATHS.has(requestPath)) {
            return res.status(403).json({
                success: false,
                code: 'PASSWORD_CHANGE_REQUIRED',
                error: 'Debes cambiar la contrasena temporal antes de continuar.'
            });
        }

        return next();
    } catch (error) {
        const isTokenError = error.name === 'JsonWebTokenError'
            || error.name === 'TokenExpiredError'
            || error.name === 'NotBeforeError';

        if (!isTokenError) {
            console.error('Error verificando autenticación:', error.message);
        }

        return res.status(isTokenError ? 401 : 503).json({
            error: isTokenError
                ? 'Token inválido o expirado'
                : 'Servicio de autenticación no disponible'
        });
    }
}

authenticate.createAuthVersion = createAuthVersion;
authenticate.tokenMatchesCurrentUser = tokenMatchesCurrentUser;
authenticate.mustChangePassword = mustChangePassword;

module.exports = authenticate;
