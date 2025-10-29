// routes/pdfTemplate.routes.js
const express = require('express');
const router = express.Router();
const isOwner = require('../middlewares/isOwner');
const authenticate = require('../middlewares/authenticate');
const {
    getPdfTemplateConfig,
    setPdfTemplateConfig,
    getPdfTemplatesList,
    updatePdfTemplateConfig
} = require('../controllers/pdfTemplate.controller');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Obtener configuración global de plantilla PDF (todos los usuarios)
router.get('/config', getPdfTemplateConfig);

// Modificar configuración global de plantilla PDF (solo owner)
// ...existing code...
router.post('/config', authenticate, isOwner, setPdfTemplateConfig);

// Actualizar configuración específica de plantilla (solo owner)
router.put('/config/:templateId', authenticate, isOwner, updatePdfTemplateConfig);

// Obtener lista de plantillas prediseñadas (todos los usuarios)
router.get('/list', getPdfTemplatesList);

// Endpoint para subir logo institucional (solo owner)
const db = require('../db/pool');
router.post('/logo', authenticate, isOwner, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
        }
        const logoBuffer = req.file.buffer;
        const logoMimetype = req.file.mimetype;
        await db.execute('UPDATE visual_config SET logo_data = ?, logo_mimetype = ? WHERE id = 1', [logoBuffer, logoMimetype]);
        // Devolver la URL para preview (siempre será /api/logo)
        res.json({ success: true, logoUrl: '/api/logo' });
    } catch (err) {
        console.error('Error al subir logo:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
