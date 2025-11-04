function isOwner(req, res, next) {
    // Usar req.userRole que es establecido por el middleware authenticate
    if (!req.userRole || req.userRole !== 'owner') {
        return res.status(403).json({
            success: false,
            message: "Acceso denegado. Solo para el propietario del sistema"
        });
    }

    // LOG PARA DETECTAR CUANDO YA SE HAYA ENTRADO COMO OWNER
    // Logs eliminados para producción

    next();
}
module.exports = isOwner;