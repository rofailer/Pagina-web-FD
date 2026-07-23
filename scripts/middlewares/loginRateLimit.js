const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function normalizeIdentifier(value) {
    return typeof value === 'string'
        ? value.trim().toLowerCase().slice(0, 120)
        : '';
}

function getClientAddress(req) {
    return req.socket?.remoteAddress || req.ip || 'unknown';
}

function getAttemptKey(req) {
    return `${getClientAddress(req)}:${normalizeIdentifier(req.body?.usuario)}`;
}

function getActiveEntry(key, now = Date.now()) {
    const entry = attempts.get(key);
    if (!entry || entry.expiresAt <= now) {
        attempts.delete(key);
        return null;
    }
    return entry;
}

function loginRateLimit(req, res, next) {
    const key = getAttemptKey(req);
    const now = Date.now();
    const entry = getActiveEntry(key, now);

    if (entry && entry.failures >= MAX_FAILURES) {
        const retryAfter = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
            error: 'No fue posible iniciar sesión. Verifica tus credenciales e inténtalo más tarde.'
        });
    }

    req.loginRateLimit = {
        recordFailure() {
            const current = getActiveEntry(key) || {
                failures: 0,
                expiresAt: Date.now() + WINDOW_MS
            };
            current.failures += 1;
            attempts.set(key, current);
        },
        recordSuccess() {
            attempts.delete(key);
        }
    };

    next();
}

const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts.entries()) {
        if (entry.expiresAt <= now) {
            attempts.delete(key);
        }
    }
}, CLEANUP_INTERVAL_MS);

cleanupTimer.unref?.();

module.exports = loginRateLimit;
