const express = require('express');
const router = express.Router();
const VisualConfigController = require('../controllers/visualConfig.controller');
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');
const multer = require('multer');
const path = require('path');

// Configuración de multer para logos
const logoUpload = multer({
    dest: path.join(__dirname, '../../uploads/logos'),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
        // Solo permitir imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// Ruta pública para obtener configuración visual global (sin autenticación)
router.get('/visual-config/public', VisualConfigController.getPublicVisualConfig);

// Rutas para configuración visual (requieren autenticación de admin)
router.get('/visual-config', authenticate, isAdmin, VisualConfigController.getVisualConfig);
router.put('/visual-config', authenticate, isAdmin, VisualConfigController.updateVisualConfig);
router.post('/visual-config/reset', authenticate, isAdmin, VisualConfigController.resetVisualConfig);

// Rutas específicas para configuración de institución
router.get('/config/institution', authenticate, isAdmin, VisualConfigController.getInstitutionConfig);
router.post('/config/institution', authenticate, isAdmin, VisualConfigController.updateInstitutionConfig);

// Ruta para subir logos
router.post('/upload/logo', authenticate, isAdmin, logoUpload.single('logo'), VisualConfigController.uploadLogo);

// Ruta para obtener el logo
router.get('/logo', VisualConfigController.getLogo);

module.exports = router;