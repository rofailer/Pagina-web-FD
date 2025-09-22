// ========================================
// PLANTILLA MINIMALISTA - DISEÑO LIMPIO Y ESENCIAL
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
 * Dibujar elementos minimalistas - líneas sutiles
 */
function drawMinimalistElements(page, width, height, config) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};
    const primaryColor = hexToRgb(colorConfig.primary || '#6b7280');

    // Línea horizontal superior sutil
    page.drawLine({
        start: { x: 50, y: canvasToPdfY(70, height) },
        end: { x: width - 50, y: canvasToPdfY(70, height) },
        thickness: 1,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    // Línea horizontal inferior sutil
    page.drawLine({
        start: { x: 50, y: canvasToPdfY(height - 80, height) },
        end: { x: width - 50, y: canvasToPdfY(height - 80, height) },
        thickness: 1,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });
}

/**
 * Dibujar borde minimalista - solo líneas esenciales
 */
function drawMinimalistBorder(page, width, height, borderConfig) {
    const { rgb } = require('pdf-lib');

    const borderColor = hexToRgb(borderConfig?.color || '#e5e7eb');
    const borderWidth = borderConfig?.width || 1;

    // Solo bordes exteriores sutiles
    page.drawRectangle({
        x: 40,
        y: 40,
        width: width - 80,
        height: height - 80,
        borderWidth: borderWidth,
        borderColor: rgb(borderColor.r, borderColor.g, borderColor.b)
    });
}

/**
 * Template minimalista principal
 */
async function drawMinimalistTemplate(page, width, height, data, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc) {
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

    let currentY = 90;

    // 1. Elementos minimalistas sutiles
    drawMinimalistElements(page, width, height, config);

    // 2. Header con institución y logo
    currentY = drawInstitutionHeader(page, width, height, data, config, fontObjects);

    // 3. Título de certificación
    currentY = drawCertificationTitle(page, width, height, currentY, config, fontObjects);

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
function drawMinimalistTemplateCanvas(ctx, config, width, height, data) {
    if (!ctx || !config) return;

    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};
    const visualConfig = config.visualConfig || {};

    // Fondo limpio
    ctx.fillStyle = colorConfig.background || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Elementos minimalistas
    ctx.strokeStyle = colorConfig.primary || '#6b7280';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Líneas sutiles
    ctx.beginPath();
    ctx.moveTo(50, 70);
    ctx.lineTo(width - 50, 70);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(50, height - 80);
    ctx.lineTo(width - 50, height - 80);
    ctx.stroke();

    let currentY = 90;

    // Header simplificado para canvas
    ctx.fillStyle = colorConfig.primary || '#6b7280';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICACIÓN', width / 2, currentY);

    // Título del documento
    ctx.fillStyle = colorConfig.accent || '#374151';
    ctx.font = 'bold 18px sans-serif';
    const titleLines = wrapText(cleanTextForPdf(data.titulo || ''), 40);
    titleLines.forEach((line, index) => {
        ctx.fillText(line, width / 2, currentY + 50 + (index * 20));
    });

    // Área de firma minimalista
    const signatureY = height - 120;
    ctx.strokeStyle = colorConfig.primary || '#6b7280';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(width / 2 - 100, signatureY, 200, 60);
    ctx.setLineDash([]);

    ctx.fillStyle = colorConfig.accent || '#374151';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FIRMA', width / 2, signatureY + 25);
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawMinimalistTemplate,
        drawMinimalistBorder,
        drawMinimalistTemplateCanvas
    };
}

if (typeof window !== 'undefined') {
    window.MinimalistTemplate = {
        drawTemplate: drawMinimalistTemplateCanvas,
        drawBorder: drawMinimalistBorder
    };
}
