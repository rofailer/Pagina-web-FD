const express = require('express');
const router = express.Router();
const VisualConfigController = require('../controllers/visualConfig.controller');
const authenticate = require('../middlewares/authenticate');
const { isAdmin } = require('../middlewares/isAdmin');

// Ruta pública para obtener configuración visual global (sin autenticación)
router.get('/visual-config/public', VisualConfigController.getVisualConfig);

// Rutas para configuración visual (requieren autenticación de admin)
router.get('/visual-config', authenticate, isAdmin, VisualConfigController.getVisualConfig);
router.put('/visual-config', authenticate, isAdmin, VisualConfigController.updateVisualConfig);
router.post('/visual-config/reset', authenticate, isAdmin, VisualConfigController.resetVisualConfig);

module.exports = router;