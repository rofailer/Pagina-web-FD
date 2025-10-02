// ========================================
// GESTOR DE PLANTILLAS - BACKEND
// ========================================

const { cleanTextForPdf, wrapText, drawLogo, drawElectronicSignature } = require('./base.template');
const { drawClassicTemplate, drawClassicBorder } = require('./clasico.template');
const { drawModernTemplate, drawModernBorder } = require('./moderno.template');
const { drawMinimalistTemplate, drawMinimalistBorder } = require('./minimalista.template');
const { drawElegantTemplate, drawElegantBorder } = require('./elegante.template');
const { rgb } = require('pdf-lib');
const db = require('../db/pool');

class TemplateManager {
    constructor() {
        this.globalConfig = null;
        this.lastConfigUpdate = null;
    }

    /**
     * Obtener configuración global desde la base de datos
     */
    async getGlobalConfig() {
        try {
            // Cache de 5 minutos para evitar consultas excesivas
            if (this.globalConfig && this.lastConfigUpdate &&
                (Date.now() - this.lastConfigUpdate) < 300000) {
                return this.globalConfig;
            }

            const query = `
                SELECT
                    selected_template,
                    logo_path,
                    color_config,
                    font_config,
                    layout_config,
                    border_config,
                    visual_config
                FROM global_pdf_config
                WHERE id = 1
            `;

            const [rows] = await db.execute(query);

            if (rows.length === 0) {
                // Configuración por defecto si no existe
                this.globalConfig = this.getDefaultConfig();
            } else {
                const config = rows[0];

                // Función helper para parsear campos JSON - manejar tanto strings como objetos ya parseados
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

                this.globalConfig = {
                    selectedTemplate: config.selected_template,
                    logoPath: config.logo_path,
                    colorConfig: parseJsonField(config.color_config),
                    fontConfig: parseJsonField(config.font_config),
                    layoutConfig: parseJsonField(config.layout_config),
                    borderConfig: parseJsonField(config.border_config),
                    visualConfig: parseJsonField(config.visual_config)
                };
            }

            this.lastConfigUpdate = Date.now();
            return this.globalConfig;
        } catch (error) {
            console.error('Error obteniendo configuración global:', error);
            return this.getDefaultConfig();
        }
    }

    /**
     * Configuración por defecto
     */
    getDefaultConfig() {
        return {
            selectedTemplate: 'clasico',
            logoPath: '../../recursos/logotipo-de-github.png',
            colorConfig: {
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#f59e0b',
                text: '#1f2937',
                background: '#ffffff'
            },
            fontConfig: {
                title: 'Helvetica-Bold',
                body: 'Helvetica',
                metadata: 'Helvetica-Oblique',
                signature: 'Times-Bold'
            },
            layoutConfig: {
                marginTop: 60,
                marginBottom: 60,
                marginLeft: 50,
                marginRight: 50,
                lineHeight: 1.6,
                titleSize: 24,
                bodySize: 12
            },
            borderConfig: {
                style: 'classic',
                width: 2,
                color: '#1f2937',
                cornerRadius: 0,
                showDecorative: true
            },
            visualConfig: {
                showLogo: true,
                showInstitution: true,
                showDate: true,
                showSignature: true,
                showAuthors: true,
                showAvalador: true
            }
        };
    }

    /**
     * Determina el nombre de la plantilla desde la configuración
     */
    getTemplateName(config) {
        // ✅ MODERNIZADO - Usar nombres directos
        if (config && config.templateName) {
            return config.templateName;
        }

        // Si viene como selectedTemplate (nuevo sistema)
        if (config && config.selectedTemplate) {
            return config.selectedTemplate;
        }


        // Detectar por características del config (fallback)
        if (config && config.border) {
            switch (config.border.style) {
                case 'classic': return 'clasico';
                case 'modern': return 'moderno';
                case 'minimal': return 'minimalista';
                case 'elegant': return 'elegante';
                default: return 'clasico';
            }
        }

        return 'clasico'; // Por defecto
    }

    /**
     * Dibuja el borde según la plantilla usando configuración global
     */
    async drawTemplateBorder(page, templateName, width, height, customConfig = null) {
        const config = customConfig || await this.getGlobalConfig();
        const borderConfig = config.borderConfig || {};

        switch (templateName) {
            case 'clasico':
                drawClassicBorder(page, width, height, borderConfig);
                break;
            case 'moderno':
                drawModernBorder(page, width, height, borderConfig);
                break;
            case 'minimalista':
                drawMinimalistBorder(page, width, height, borderConfig);
                break;
            case 'elegante':
                drawElegantBorder(page, width, height, borderConfig);
                break;
            default:
                drawClassicBorder(page, width, height, borderConfig);
                break;
        }
    }

    /**
     * Dibuja la plantilla específica usando configuración global
     */
    async drawTemplate(page, templateName, width, height, documentData, helveticaFont, helveticaBold, timesFont, timesBold, customConfig = null, pdfDoc = null) {
        const config = customConfig || await this.getGlobalConfig();
        const colorConfig = config.colorConfig || {};
        const fontConfig = config.fontConfig || {};
        const layoutConfig = config.layoutConfig || {};
        const visualConfig = config.visualConfig || {};

        // Aplicar configuración visual a los datos del documento
        const enhancedDocumentData = {
            ...documentData,
            config: {
                colorConfig,
                fontConfig,
                layoutConfig,
                visualConfig
            },
            visualConfig,
            colorConfig,
            fontConfig,
            layoutConfig
        };

        switch (templateName) {
            case 'clasico':
                await drawClassicTemplate(page, width, height, enhancedDocumentData, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc);
                break;
            case 'moderno':
                await drawModernTemplate(page, width, height, enhancedDocumentData, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc);
                break;
            case 'minimalista':
                await drawMinimalistTemplate(page, width, height, enhancedDocumentData, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc);
                break;
            case 'elegante':
                await drawElegantTemplate(page, width, height, enhancedDocumentData, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc);
                break;
            default:
                await drawClassicTemplate(page, width, height, enhancedDocumentData, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc);
                break;
        }
    }

    /**
     * Prepara los datos del documento con limpieza de texto
     */
    prepareDocumentData(data) {
        return {
            titulo: cleanTextForPdf(data.titulo),
            institucion: cleanTextForPdf(data.institucion), // ✅ Usa el valor configurado que viene del servidor
            autores: Array.isArray(data.autores) ?
                data.autores.map(a => cleanTextForPdf(a)) :
                [cleanTextForPdf(data.autores)],
            avaladoPor: cleanTextForPdf(data.avaladoPor), // ✅ Corregido: era data.avalador
            correoFirmante: data.correoFirmante, // ✅ Agregado campo faltante
            ubicacion: cleanTextForPdf(data.ubicacion),
            modalidad: cleanTextForPdf(data.modalidad),
            comiteDestinatario: cleanTextForPdf(data.comiteDestinatario),
            fecha: data.fecha || new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            contenido: cleanTextForPdf(data.contenido) || 'Este documento ha sido procesado y avalado digitalmente.',
            signatureData: data.signatureData, // No limpiar los datos de firma
            config: data.config // ✅ Asegurar que la config se pase
        };
    }

    /**
     * Renderiza un PDF completo con la plantilla especificada usando configuración global
     */
    async renderPdfWithTemplate(inputPath, outputPath, data, templateConfig = null) {
        const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
        const fs = require("fs");

        const existingPdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const page = pages[0];
        const { width, height } = page.getSize();

        // Cargar fuentes estándar
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        // Obtener configuración global o usar la proporcionada
        const config = templateConfig || await this.getGlobalConfig();

        // Determinar el nombre de la plantilla
        const templateName = this.getTemplateName(config);

        // Preparar datos del documento
        const documentData = this.prepareDocumentData(data);

        // Dibujar borde según la plantilla
        await this.drawTemplateBorder(page, templateName, width, height, config);

        // Dibujar plantilla específica
        await this.drawTemplate(page, templateName, width, height, documentData, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc);

        // Dibujar logo si existe y está habilitado
        const visualConfig = config.visualConfig || {};
        if (visualConfig.showLogo !== false && data.logoData && data.logoData.buffer && Buffer.isBuffer(data.logoData.buffer) && data.logoData.buffer.length > 0) {
            try {
                await drawLogo(page, width, height, data, pdfDoc);
            } catch (err) {
                console.warn('WARNING: Error al cargar logo:', err.message);
            }
        }

        // Los templates específicos manejan su propia lógica de firma electrónica
        // El manager solo coordina la configuración

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);
    }
}

// Función legacy para compatibilidad
async function renderPdfWithTemplate(inputPath, outputPath, data, templateConfig) {
    const templateManager = new TemplateManager();
    return await templateManager.renderPdfWithTemplate(inputPath, outputPath, data, templateConfig);
}

module.exports = {
    TemplateManager,
    renderPdfWithTemplate,
    cleanTextForPdf // Exportar también para uso individual
};
