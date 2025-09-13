function isOwner(req, res, next) {
    // Usar req.userRole que es establecido por el middleware authenticate
    if (!req.userRole || req.userRole !== 'owner') {
        return res.status(403).json({
            success: false,
            message: "Acceso denegado. Solo para el propietario del sistema"
        });
    }

    // LOG PARA DETECTAR CUANDO YA SE HAYA ENTRADO COMO OWNER
    console.log("🎉 ¡ACCESO OWNER CONFIRMADO! Usuario autenticado como propietario del sistema");
    console.log("   - UserID:", req.userId);
    console.log("   - UserRole:", req.userRole);

    next();
}
module.exports = { isOwner };