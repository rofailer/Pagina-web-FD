// ========================================
// GESTOR DE PLANTILLAS - BACKEND
// ========================================

const { cleanTextForPdf, wrapText, drawLogo, drawElectronicSignature } = require('./base.template');
const { drawClassicTemplate, drawClassicBorder } = require('./clasico.template');
const { drawModernTemplate, drawModernBorder } = require('./moderno.template');
const { drawMinimalTemplate, drawMinimalBorder } = require('./minimalista.template');
const { drawElegantTemplate, drawElegantBorder } = require('./elegante.template');

class TemplateManager {
    constructor() {
        // ❌ ELIMINADO - Ya no usamos mapeo template1/template2
        // Las plantillas se llaman directamente por nombre
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

        // ❌ ELIMINADO - Ya no soportamos template1/template2

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
     * Dibuja el borde según la plantilla
     */
    drawTemplateBorder(page, templateName, width, height) {
        switch (templateName) {
            case 'clasico':
                drawClassicBorder(page, width, height);
                break;
            case 'moderno':
                drawModernBorder(page, width, height);
                break;
            case 'minimalista':
                drawMinimalBorder(page, width, height);
                break;
            case 'elegante':
                drawElegantBorder(page, width, height);
                break;
            default:
                drawClassicBorder(page, width, height);
                break;
        }
    }

    /**
     * Dibuja la plantilla específica
     */
    drawTemplate(page, templateName, width, height, documentData, helveticaFont, helveticaBold, timesFont, timesBold) {
        switch (templateName) {
            case 'clasico':
                drawClassicTemplate(page, width, height, documentData, helveticaFont, helveticaBold, timesFont, timesBold);
                break;
            case 'moderno':
                drawModernTemplate(page, width, height, documentData, helveticaFont, helveticaBold);
                break;
            case 'minimalista':
                drawMinimalTemplate(page, width, height, documentData, helveticaFont, helveticaBold);
                break;
            case 'elegante':
                drawElegantTemplate(page, width, height, documentData, helveticaFont, helveticaBold, timesFont, timesBold);
                break;
            default:
                drawClassicTemplate(page, width, height, documentData, helveticaFont, helveticaBold, timesFont, timesBold);
                break;
        }
    }

    /**
     * Prepara los datos del documento con limpieza de texto
     */
    prepareDocumentData(data) {
        return {
            titulo: cleanTextForPdf(data.titulo) || 'DOCUMENTO OFICIAL AVALADO',
            institucion: cleanTextForPdf(data.institucion) || 'Universidad Firmas Digitales', // ✅ Sistema correcto
            autores: Array.isArray(data.autores) ?
                data.autores.map(a => cleanTextForPdf(a)) :
                [cleanTextForPdf(data.autores) || 'Autor Desconocido'],
            avaladoPor: cleanTextForPdf(data.avalador) || 'Comite Academico',
            fecha: data.fecha || new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            contenido: cleanTextForPdf(data.contenido) || 'Este documento ha sido procesado y avalado digitalmente.',
            signatureData: data.signatureData // No limpiar los datos de firma
        };
    }

    /**
     * Renderiza un PDF completo con la plantilla especificada
     */
    async renderPdfWithTemplate(inputPath, outputPath, data, templateConfig) {
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

        // Determinar el nombre de la plantilla
        const templateName = this.getTemplateName(templateConfig);
        console.log('>>> Renderizando PDF con plantilla:', templateName);

        // Preparar datos del documento
        const documentData = this.prepareDocumentData(data);

        // Dibujar borde según la plantilla
        this.drawTemplateBorder(page, templateName, width, height);

        // Dibujar plantilla específica
        this.drawTemplate(page, templateName, width, height, documentData, helveticaFont, helveticaBold, timesFont, timesBold);

        // Dibujar logo si existe
        if (data.logo && fs.existsSync(data.logo)) {
            try {
                await drawLogo(page, data.logo, templateName, width, height, pdfDoc);
            } catch (err) {
                console.warn('WARNING: Error al cargar logo:', err.message);
            }
        }

        // Agregar firma electrónica si está disponible
        if (data.signatureData) {
            try {
                await drawElectronicSignature(page, data, width, height, pdfDoc);
            } catch (err) {
                console.warn('WARNING: No se pudo agregar la firma electronica:', err.message);
                // Agregar texto indicativo si no se puede mostrar la firma
                page.drawText('Documento firmado electronicamente', {
                    x: width - 250,
                    y: 200,
                    size: 10,
                    color: rgb(0.5, 0.5, 0.5),
                    font: helveticaFont
                });
            }
        }

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
