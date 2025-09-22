// controllers/pdfTemplate.controller.js
const fs = require('fs');
const path = require('path');
const db = require('../db/pool');

// Configuración de plantillas predefinidas
const PREDEFINED_TEMPLATES = [
    { id: 'clasico', name: 'Diseño Clásico' },
    { id: 'moderno', name: 'Diseño Moderno' },
    { id: 'minimalista', name: 'Diseño Minimalista' },
    { id: 'elegante', name: 'Diseño Elegante' },
    { id: 'custom', name: 'Personalizado' }
];

/**
 * Inicializar configuración PDF por defecto
 */
async function initializeDefaultPdfConfig() {
    try {
        const defaultConfig = {
            selectedTemplate: 'clasico',
            colorConfig: {
                primary: '#1f2937',
                secondary: '#4b5563',
                accent: '#f59e0b'
            },
            fontConfig: {
                title: 'Times-Bold',
                body: 'Times-Roman',
                signature: 'Times-Bold'
            },
            layoutConfig: {
                marginTop: 60,
                marginBottom: 60,
                marginLeft: 50,
                marginRight: 50,
                titleSize: 28,
                bodySize: 14
            },
            borderConfig: {
                style: 'solid',
                width: 1,
                color: '#1f2937'
            },
            visualConfig: {
                showInstitution: true,
                showAuthors: true,
                showDate: true,
                showAvalador: true,
                showSignature: true,
                showBackground: false
            }
        };

        const query = `
            INSERT INTO global_pdf_config (
                id, selected_template,
                color_config, font_config, layout_config, border_config, visual_config,
                updated_by
            ) VALUES (
                1, ?,
                ?, ?, ?, ?, ?,
                'system'
            )
        `;

        const params = [
            defaultConfig.selectedTemplate,
            JSON.stringify(defaultConfig.colorConfig),
            JSON.stringify(defaultConfig.fontConfig),
            JSON.stringify(defaultConfig.layoutConfig),
            JSON.stringify(defaultConfig.borderConfig),
            JSON.stringify(defaultConfig.visualConfig)
        ];

        await db.execute(query, params);
    } catch (error) {
        console.error('Error inicializando configuración PDF por defecto:', error);
        throw error;
    }
}

/**
 * Obtener configuración global de plantilla PDF desde BD
 */
async function getPdfTemplateConfig(req, res) {
    try {
        const query = `
            SELECT
                selected_template,
                color_config,
                font_config,
                layout_config,
                border_config,
                visual_config,
                updated_by,
                updated_at
            FROM global_pdf_config
            WHERE id = 1
        `;

        const [rows] = await db.execute(query);

        if (rows.length === 0) {
            // Si no existe configuración, crear una por defecto
            await initializeDefaultPdfConfig();
            return getPdfTemplateConfig(req, res);
        }

        const config = rows[0];

        // Parsear JSON fields - manejar tanto strings como objetos ya parseados
        const parseJsonField = (field) => {
            if (typeof field === 'string') {
                try {
                    return JSON.parse(field || '{}');
                } catch (e) {
                    console.warn('Error parseando campo JSON como string:', e);
                    return {};
                }
            } else if (typeof field === 'object' && field !== null) {
                // Ya está parseado como objeto
                return field;
            } else {
                return {};
            }
        };

        const parsedConfig = {
            selectedTemplate: config.selected_template,
            logoPath: null, // Se obtendrá del visual_config
            colorConfig: parseJsonField(config.color_config),
            fontConfig: parseJsonField(config.font_config),
            layoutConfig: parseJsonField(config.layout_config),
            borderConfig: parseJsonField(config.border_config),
            visualConfig: parseJsonField(config.visual_config),
            updatedBy: config.updated_by,
            updatedAt: config.updated_at
        };

        // Obtener el logo_path de la configuración visual global
        try {
            const [visualRows] = await db.execute('SELECT logo_data FROM visual_config WHERE id = 1');
            if (visualRows.length > 0 && visualRows[0].logo_data) {
                parsedConfig.logoPath = '/api/logo';
            } else {
                parsedConfig.logoPath = null;
            }
        } catch (visualError) {
            console.warn('No se pudo obtener logo de configuración visual:', visualError.message);
            parsedConfig.logoPath = null;
        }

        res.json(parsedConfig);
    } catch (error) {
        console.error('Error obteniendo configuración PDF:', error);
        res.status(500).json({ error: 'Error al obtener la configuración PDF.' });
    }
}

/**
 * Guardar configuración global de plantilla PDF en BD
 */
async function setPdfTemplateConfig(req, res) {
    try {
        const {
            selectedTemplate,
            colorConfig,
            fontConfig,
            layoutConfig,
            borderConfig,
            visualConfig
        } = req.body;

        // Validar plantilla
        if (!PREDEFINED_TEMPLATES.some(t => t.id === selectedTemplate)) {
            return res.status(400).json({ error: 'Plantilla no válida.' });
        }

        // Obtener usuario actual (de JWT o sesión)
        const updatedBy = req.user?.id || req.body.updatedBy || 'system';

        const query = `
            INSERT INTO global_pdf_config (
                id, selected_template,
                color_config, font_config, layout_config, border_config, visual_config,
                updated_by
            ) VALUES (
                1, ?,
                ?, ?, ?, ?, ?,
                ?
            ) ON DUPLICATE KEY UPDATE
                selected_template = VALUES(selected_template),
                color_config = VALUES(color_config),
                font_config = VALUES(font_config),
                layout_config = VALUES(layout_config),
                border_config = VALUES(border_config),
                visual_config = VALUES(visual_config),
                updated_by = VALUES(updated_by)
        `;

        const params = [
            selectedTemplate,
            JSON.stringify(colorConfig || {}),
            JSON.stringify(fontConfig || {}),
            JSON.stringify(layoutConfig || {}),
            JSON.stringify(borderConfig || {}),
            JSON.stringify(visualConfig || {}),
            updatedBy
        ];

        await db.execute(query, params);

        res.json({
            success: true,
            message: 'Configuración PDF guardada correctamente',
            config: {
                selectedTemplate,
                colorConfig,
                fontConfig,
                layoutConfig,
                borderConfig,
                visualConfig,
                updatedBy,
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error guardando configuración PDF:', error);
        res.status(500).json({ error: 'Error al guardar la configuración PDF.' });
    }
}

/**
 * Inicializar configuración PDF por defecto
 */
async function initializeDefaultPdfConfig() {
    try {
        const defaultConfig = {
            selected_template: 'clasico',
            logo_path: '../../recursos/logotipo-de-github.png',
            color_config: JSON.stringify({
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#f59e0b',
                text: '#1f2937',
                background: '#ffffff'
            }),
            font_config: JSON.stringify({
                title: 'Helvetica-Bold',
                body: 'Helvetica',
                metadata: 'Helvetica-Oblique',
                signature: 'Times-Bold'
            }),
            layout_config: JSON.stringify({
                marginTop: 60,
                marginBottom: 60,
                marginLeft: 50,
                marginRight: 50,
                lineHeight: 1.6,
                titleSize: 24,
                bodySize: 12
            }),
            border_config: JSON.stringify({
                style: 'classic',
                width: 2,
                color: '#1f2937',
                cornerRadius: 0,
                showDecorative: true
            }),
            visual_config: JSON.stringify({
                showLogo: true,
                showInstitution: true,
                showDate: true,
                showSignature: true,
                showAuthors: true,
                showAvalador: true
            }),
            updated_by: 'system'
        };

        const query = `
            INSERT INTO global_pdf_config (
                id, selected_template, logo_path,
                color_config, font_config, layout_config, border_config, visual_config,
                updated_by
            ) VALUES (
                1, ?, ?,
                ?, ?, ?, ?, ?,
                ?
            )
        `;

        const params = [
            defaultConfig.selected_template,
            defaultConfig.logo_path,
            defaultConfig.color_config,
            defaultConfig.font_config,
            defaultConfig.layout_config,
            defaultConfig.border_config,
            defaultConfig.visual_config,
            defaultConfig.updated_by
        ];

        await db.execute(query, params);
    } catch (error) {
        console.error('Error inicializando configuración PDF por defecto:', error);
    }
}

/**
 * Obtener lista de plantillas disponibles
 */
function getPdfTemplatesList(req, res) {
    res.json(PREDEFINED_TEMPLATES);
}

/**
 * Actualizar configuración específica de una plantilla
 */
async function updatePdfTemplateConfig(req, res) {
    try {
        const { templateId } = req.params;
        const updates = req.body;

        // Validar que la plantilla existe
        if (!PREDEFINED_TEMPLATES.some(t => t.id === templateId)) {
            return res.status(400).json({ error: 'Plantilla no válida.' });
        }

        // Construir query dinámico basado en los campos a actualizar
        const updateFields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (['colorConfig', 'fontConfig', 'layoutConfig', 'borderConfig', 'visualConfig'].includes(key)) {
                updateFields.push(`${key.toLowerCase().replace('config', '_config')} = ?`);
                params.push(JSON.stringify(updates[key]));
            } else if (key === 'logoPath') {
                updateFields.push('logo_path = ?');
                params.push(updates[key]);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No se especificaron campos válidos para actualizar.' });
        }

        const query = `
            UPDATE global_pdf_config
            SET ${updateFields.join(', ')}, updated_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `;

        params.push(req.user?.id || 'system');

        await db.execute(query, params);

        res.json({
            success: true,
            message: `Configuración de plantilla ${templateId} actualizada correctamente`
        });
    } catch (error) {
        console.error('Error actualizando configuración de plantilla:', error);
        res.status(500).json({ error: 'Error al actualizar la configuración de plantilla.' });
    }
}

module.exports = {
    getPdfTemplateConfig,
    setPdfTemplateConfig,
    getPdfTemplatesList,
    updatePdfTemplateConfig,
    initializeDefaultPdfConfig
};
