const jwt = require('jsonwebtoken');

/**
 * Middleware para autenticar usuarios mediante JWT.
 * Agrega req.userId y req.userRole si el token es válido.
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "No autorizado: token no proporcionado" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.id;
        req.userRole = payload.rol;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Token inválido o expirado" });
    }
}

module.exports = authenticate;