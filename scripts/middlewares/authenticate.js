const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

/**
 * Middleware para autenticar usuarios mediante JWT.
 * Agrega req.userId, req.userRole y req.user si el token es válido.
 */
function authenticate(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "No autorizado: token no proporcionado" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar inactividad (30 días = 30 * 24 * 60 * 60 * 1000 ms)
        const inactivityLimit = 30 * 24 * 60 * 60 * 1000; // 30 días
        const lastAccess = new Date(payload.iat * 1000); // iat es "issued at" del token
        const now = new Date();

        if (now - lastAccess > inactivityLimit) {
            return res.status(401).json({ error: "Token expirado por inactividad" });
        }

        req.userId = payload.id;
        req.userRole = payload.rol;

        // Agregar también req.user para compatibilidad con nuevas rutas
        req.user = {
            id: payload.id,
            rol: payload.rol,
            usuario: payload.usuario || payload.username || 'unknown'
        };

        // 🔐 VERIFICACIÓN CRÍTICA: Verificar que el usuario existe en la BD antes de permitir acceso
        pool.getConnection()
            .then(conn => {
                conn.query("SELECT id, usuario, rol FROM users WHERE id = ?", [req.userId])
                    .then(([rows]) => {
                        if (rows.length === 0) {
                            conn.release();
                            return res.status(401).json({ error: "Usuario no encontrado en la base de datos" });
                        }

                        const userData = rows[0];
                        req.user = { ...req.user, ...userData }; // Actualizar con datos de BD

                        // Actualizar último acceso de forma asíncrona (no bloquea la respuesta)
                        conn.query("UPDATE users SET ultimo_acceso = NOW() WHERE id = ?", [req.userId])
                            .catch(err => console.error('Error actualizando último acceso:', err))
                            .finally(() => conn.release());

                        next();
                    })
                    .catch(err => {
                        conn.release();
                        console.error('❌ Error verificando usuario en BD:', err.message);
                        return res.status(500).json({ error: "Error interno del servidor al verificar usuario" });
                    });
            })
            .catch(err => {
                console.error('❌ Base de datos no disponible para autenticación:', err.message);
                return res.status(503).json({ error: "Servicio no disponible: base de datos desconectada" });
            });
    } catch (err) {
        console.error('❌ AUTHENTICATE - Error validando token:', err.message);
        return res.status(403).json({ error: "Token inválido o expirado" });
    }
}

module.exports = authenticate;