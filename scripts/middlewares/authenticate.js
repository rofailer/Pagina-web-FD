const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const ABSOLUTE_SESSION_LIFETIME_SECONDS = 24 * 60 * 60;
const PASSWORD_CHANGE_ALLOWED_PATHS = new Set([
    '/api/auth/change-password',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/auth-status',
    '/api/profile/heartbeat',
    '/api/profile/presence'
]);
let sessionSchemaPromise = null;

function normalizeSessionVersion(value) {
    const normalized = Number(value);
    return Number.isSafeInteger(normalized) && normalized >= 0 ? normalized : 0;
}

async function ensureSessionVersionColumn(database = pool, environment = process.env) {
    if (database !== pool || environment !== process.env) {
        return ensureSessionVersionColumnForDatabase(database, environment);
    }

    if (!sessionSchemaPromise) {
        sessionSchemaPromise = ensureSessionVersionColumnForDatabase(database, environment)
            .catch(error => {
                sessionSchemaPromise = null;
                throw error;
            });
    }
    return sessionSchemaPromise;
}

async function ensureSessionVersionColumnForDatabase(database, environment = process.env) {
    const [columns] = await database.query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'
           AND COLUMN_NAME = 'session_version'
         LIMIT 1`
    );

    if (columns.length > 0) return false;

    if (String(environment.NODE_ENV || 'development').toLowerCase() === 'production') {
        const error = new Error(
            'La base de datos requiere la migración session_version antes de iniciar en producción'
        );
        error.code = 'SESSION_SCHEMA_MIGRATION_REQUIRED';
        throw error;
    }

    try {
        await database.query(
            `ALTER TABLE users
             ADD COLUMN session_version BIGINT UNSIGNED NOT NULL DEFAULT 0
             AFTER force_password_change`
        );
        return true;
    } catch (error) {
        // Dos instancias pueden intentar la migración al mismo tiempo.
        if (error?.code === 'ER_DUP_FIELDNAME') return false;
        throw error;
    }
}

function mustChangePassword(user) {
    return Boolean(user?.force_password_change);
}

function createAuthVersion(userId, passwordHash, sessionVersion = 0) {
    if (!process.env.JWT_SECRET || !passwordHash) {
        return null;
    }

    return crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(`${userId}:${passwordHash}:${normalizeSessionVersion(sessionVersion)}`)
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
    const expectedSessionVersion = normalizeSessionVersion(user.session_version);
    const expectedAuthVersion = createAuthVersion(
        user.id,
        user.password,
        expectedSessionVersion
    );
    return safeEqual(String(payload.sessionVersion), String(expectedSessionVersion))
        && safeEqual(payload.authVersion, expectedAuthVersion);
}

function isSessionWithinAbsoluteLifetime(payload, nowSeconds = Math.floor(Date.now() / 1000)) {
    const sessionStartedAt = Number(payload?.sessionStartedAt);
    return Number.isSafeInteger(sessionStartedAt)
        && sessionStartedAt > 0
        && sessionStartedAt <= nowSeconds + 60
        && nowSeconds - sessionStartedAt < ABSOLUTE_SESSION_LIFETIME_SECONDS;
}

function isRecentlyAuthenticated(authenticatedAt, maxAgeSeconds, nowSeconds = Math.floor(Date.now() / 1000)) {
    const normalized = Number(authenticatedAt);
    return Number.isSafeInteger(normalized)
        && normalized > 0
        && normalized <= nowSeconds + 60
        && nowSeconds - normalized <= maxAgeSeconds;
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
        await ensureSessionVersionColumn();
        const token = authHeader.slice(7).trim();
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (!payload.id || payload.type === 'admin-panel' || !isSessionWithinAbsoluteLifetime(payload)) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        const [rows] = await pool.query(
            `SELECT id, nombre, usuario, password, rol, estado_cuenta,
                    force_password_change, session_version
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
        req.sessionVersion = normalizeSessionVersion(userData.session_version);
        req.authVersion = createAuthVersion(
            userData.id,
            userData.password,
            req.sessionVersion
        );
        req.sessionStartedAt = Number(payload.sessionStartedAt);
        req.authenticatedAt = Number(payload.authenticatedAt);
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
authenticate.normalizeSessionVersion = normalizeSessionVersion;
authenticate.ensureSessionVersionColumn = ensureSessionVersionColumn;
authenticate.isSessionWithinAbsoluteLifetime = isSessionWithinAbsoluteLifetime;
authenticate.isRecentlyAuthenticated = isRecentlyAuthenticated;
authenticate.ABSOLUTE_SESSION_LIFETIME_SECONDS = ABSOLUTE_SESSION_LIFETIME_SECONDS;

module.exports = authenticate;
