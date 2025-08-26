// routes/pdfTemplate.routes.js
const express = require('express');
const router = express.Router();
const { isOwner } = require('../middlewares/isOwner');
const {
    getPdfTemplateConfig,
    setPdfTemplateConfig,
    getPdfTemplatesList
} = require('../controllers/pdfTemplate.controller');

// Obtener configuración global de plantilla PDF (todos los usuarios)
router.get('/config', getPdfTemplateConfig);

// Modificar configuración global de plantilla PDF (solo owner)
const authenticate = require('../middlewares/authenticate');
router.post('/config', authenticate, isOwner, setPdfTemplateConfig);

// Obtener lista de plantillas prediseñadas (todos los usuarios)
router.get('/list', getPdfTemplatesList);

module.exports = router;
