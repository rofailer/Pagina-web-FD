module.exports = function isAdmin(req, res, next) {
    if (req.userRole !== 'admin' && req.userRole !== 'owner') {
        return res.status(403).json({ error: "Acceso solo para administradores" });
    }
    next();
};