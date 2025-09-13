function isAdmin(req, res, next) {

    // Usar req.userRole que es establecido por el middleware authenticate
    if (!req.userRole || (req.userRole !== 'admin' && req.userRole !== 'owner')) {
        return res.status(403).json({
            success: false,
            message: "Acceso denegado. Se requieren permisos de administrador."
        });
    }

    next();
}

module.exports = { isAdmin };