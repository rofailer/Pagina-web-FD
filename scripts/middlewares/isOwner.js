module.exports = function isOwner(req, res, next) {
    if (req.userRole !== 'owner') {
        return res.status(403).json({ error: "Acceso solo para el dueño del sistema" });
    }
    next();
};