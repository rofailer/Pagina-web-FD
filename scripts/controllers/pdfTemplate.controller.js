// controllers/pdfTemplate.controller.js
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config/pdfTemplateConfig.json');
const PREDEFINED_TEMPLATES = [
    { id: 'template1', name: 'Diseño Clásico' },
    { id: 'template2', name: 'Diseño Moderno' },
    { id: 'template3', name: 'Diseño Minimalista' },
    { id: 'template4', name: 'Diseño Elegante' },
    { id: 'custom', name: 'Personalizado' }
];

function getPdfTemplateConfig(req, res) {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return res.json({ template: 'template1', customConfig: {} });
        }
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: 'Error al leer la configuración global de plantilla PDF.' });
    }
}

function setPdfTemplateConfig(req, res) {
    try {
        const { template, customConfig } = req.body;
        if (!PREDEFINED_TEMPLATES.some(t => t.id === template)) {
            return res.status(400).json({ error: 'Plantilla no válida.' });
        }
        const config = { template, customConfig: customConfig || {} };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ error: 'Error al guardar la configuración global de plantilla PDF.' });
    }
}

function getPdfTemplatesList(req, res) {
    res.json(PREDEFINED_TEMPLATES);
}

module.exports = {
    getPdfTemplateConfig,
    setPdfTemplateConfig,
    getPdfTemplatesList
};
