// ========================================
// PLANTILLA CLÁSICA - DISEÑO TRADICIONAL UNIVERSITARIO
// ========================================

const {
    cleanTextForPdf,
    wrapText,
    canvasToPdfY,
    hexToRgb,
    calculateAuthorLayout,
    drawInstitutionHeader,
    drawCertificationTitle,
    drawDocumentTitle,
    drawDocumentDescription,
    drawAuthorsSection,
    drawAvaladorInfo,
    drawSignatureArea,
    drawElectronicSignature
} = require('./base.template');

/**
 * Dibujar borde clásico con elementos ornamentales
 */
function drawClassicBorder(page, width, height, borderConfig) {
    const { rgb } = require('pdf-lib');

    const borderColor = hexToRgb(borderConfig?.color || '#1f2937');
    const borderWidth = borderConfig?.width || 2;

    // Borde exterior doble
    page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderWidth: borderWidth,
        borderColor: rgb(borderColor.r, borderColor.g, borderColor.b)
    });

    page.drawRectangle({
        x: 40,
        y: 40,
        width: width - 80,
        height: height - 80,
        borderWidth: 1,
        borderColor: rgb(borderColor.r, borderColor.g, borderColor.b)
    });

    // Elementos decorativos en las esquinas
    if (borderConfig?.showDecorative !== false) {
        const cornerSize = 20;
        const cornerColor = hexToRgb(borderConfig?.color || '#1f2937');

        // Esquina superior izquierda
        page.drawLine({
            start: { x: 30, y: 50 },
            end: { x: 50, y: 30 },
            thickness: 1,
            color: rgb(cornerColor.r, cornerColor.g, cornerColor.b)
        });

        // Esquina superior derecha
        page.drawLine({
            start: { x: width - 30, y: 50 },
            end: { x: width - 50, y: 30 },
            thickness: 1,
            color: rgb(cornerColor.r, cornerColor.g, cornerColor.b)
        });

        // Esquina inferior izquierda
        page.drawLine({
            start: { x: 30, y: height - 50 },
            end: { x: 50, y: height - 30 },
            thickness: 1,
            color: rgb(cornerColor.r, cornerColor.g, cornerColor.b)
        });

        // Esquina inferior derecha
        page.drawLine({
            start: { x: width - 30, y: height - 50 },
            end: { x: width - 50, y: height - 30 },
            thickness: 1,
            color: rgb(cornerColor.r, cornerColor.g, cornerColor.b)
        });
    }
}

/**
 * Dibujar línea decorativa clásica
 */
function drawClassicDecorativeLine(page, width, height, y, config) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};
    const primaryColor = hexToRgb(colorConfig.primary || '#1f2937');

    const marginLeft = 60;
    const marginRight = 60;

    // Línea central gruesa
    page.drawLine({
        start: { x: marginLeft, y: canvasToPdfY(y, height) },
        end: { x: width - marginRight, y: canvasToPdfY(y, height) },
        thickness: 3,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    // Líneas decorativas más finas
    page.drawLine({
        start: { x: marginLeft + 20, y: canvasToPdfY(y + 3, height) },
        end: { x: width - marginRight - 20, y: canvasToPdfY(y + 3, height) },
        thickness: 1,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    page.drawLine({
        start: { x: marginLeft + 20, y: canvasToPdfY(y - 3, height) },
        end: { x: width - marginRight - 20, y: canvasToPdfY(y - 3, height) },
        thickness: 1,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });
}

/**
 * Dibujar template clásico completo
 */
async function drawClassicTemplate(page, width, height, data, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc) {
    // Extraer configuración
    const templateConfig = data.config || {};
    const colorConfig = templateConfig.colorConfig || {};
    const fontConfig = templateConfig.fontConfig || {};
    const layoutConfig = templateConfig.layoutConfig || {};
    const visualConfig = templateConfig.visualConfig || {};

    // Preparar fuentes
    const fontObjects = {
        title: fontConfig.title === 'Times-Bold' ? timesBold : helveticaBold,
        body: fontConfig.body === 'Times-Roman' ? timesFont : helveticaFont,
        signature: fontConfig.signature === 'Times-Bold' ? timesBold : helveticaBold,
        helvetica: helveticaFont,
        helveticaBold: helveticaBold,
        times: timesFont,
        timesBold: timesBold
    };

    let currentY = 80;

    // 1. Header con institución y logo
    currentY = drawInstitutionHeader(page, width, height, data, config, fontObjects);

    // 2. Título de certificación
    currentY = drawCertificationTitle(page, width, height, currentY, config, fontObjects);

    // 3. Línea decorativa
    drawClassicDecorativeLine(page, width, height, currentY, config);
    currentY += 40;

    // 4. Título del documento avalado
    currentY = drawDocumentTitle(page, width, height, data, currentY, config, fontObjects);

    // 5. Texto explicativo del documento
    currentY = drawDocumentDescription(page, width, height, data, currentY, config, fontObjects);

    // 6. Sección de autores
    currentY = drawAuthorsSection(page, width, height, data, currentY, config, fontObjects);

    // 7. Información del avalador
    currentY = drawAvaladorInfo(page, width, height, data, currentY, config, fontObjects);

    // 8. Área de firma
    currentY = await drawSignatureArea(page, width, height, data, currentY, config, fontObjects, pdfDoc);

    // 9. Firma electrónica se maneja desde el TemplateManager
}

/**
 * Función para canvas (frontend) - versión simplificada
 */
function drawClassicTemplateCanvas(ctx, config, width, height, data) {
    if (!ctx || !config) return;

    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};
    const visualConfig = config.visualConfig || {};

    // Fondo sutil
    ctx.fillStyle = colorConfig.background || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Borde clásico
    ctx.strokeStyle = colorConfig.primary || '#1f2937';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    let currentY = 80;

    // Header simplificado para canvas
    ctx.fillStyle = colorConfig.primary || '#1f2937';
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICACIÓN DE AUTENTICIDAD Y CALIDAD', width / 2, currentY);

    // Título del documento
    ctx.fillStyle = colorConfig.accent || '#f59e0b';
    ctx.font = 'bold 18px serif';
    const titleLines = wrapText(cleanTextForPdf(data.titulo || ''), 40);
    titleLines.forEach((line, index) => {
        ctx.fillText(line, width / 2, currentY + 60 + (index * 20));
    });

    // Área de firma
    const signatureY = height - 120;
    ctx.strokeStyle = colorConfig.accent || '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(width / 2 - 100, signatureY, 200, 80);
    ctx.setLineDash([]);

    ctx.fillStyle = colorConfig.accent || '#f59e0b';
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('FIRMA DEL AVALADOR', width / 2, signatureY + 30);
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawClassicTemplate,
        drawClassicBorder,
        drawClassicTemplateCanvas
    };
}

if (typeof window !== 'undefined') {
    window.ClassicTemplate = {
        drawTemplate: drawClassicTemplateCanvas,
        drawBorder: drawClassicBorder
    };
}
