// ========================================
// PLANTILLA MODERNA - DISEÑO CONTEMPORÁNEO PROFESIONAL
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
 * Dibujar elementos modernos - líneas geométricas y formas
 */
function drawModernGeometricElements(page, width, height, config) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};
    const primaryColor = hexToRgb(colorConfig.primary || '#2563eb');
    const accentColor = hexToRgb(colorConfig.accent || '#06b6d4');

    // Elementos geométricos superiores
    const topY = 60;

    // Rectángulo superior izquierdo
    page.drawRectangle({
        x: 40,
        y: canvasToPdfY(topY, height),
        width: 80,
        height: 4,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    // Círculo superior derecho
    page.drawCircle({
        x: width - 60,
        y: canvasToPdfY(topY + 10, height),
        size: 8,
        color: rgb(accentColor.r, accentColor.g, accentColor.b)
    });

    // Elementos inferiores
    const bottomY = height - 100;

    // Línea diagonal inferior
    page.drawLine({
        start: { x: 40, y: canvasToPdfY(bottomY, height) },
        end: { x: 120, y: canvasToPdfY(bottomY - 20, height) },
        thickness: 2,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    // Triángulo inferior derecho
    page.drawLine({
        start: { x: width - 80, y: canvasToPdfY(bottomY, height) },
        end: { x: width - 40, y: canvasToPdfY(bottomY, height) },
        thickness: 2,
        color: rgb(accentColor.r, accentColor.g, accentColor.b)
    });

    page.drawLine({
        start: { x: width - 40, y: canvasToPdfY(bottomY, height) },
        end: { x: width - 60, y: canvasToPdfY(bottomY + 20, height) },
        thickness: 2,
        color: rgb(accentColor.r, accentColor.g, accentColor.b)
    });

    page.drawLine({
        start: { x: width - 60, y: canvasToPdfY(bottomY + 20, height) },
        end: { x: width - 80, y: canvasToPdfY(bottomY, height) },
        thickness: 2,
        color: rgb(accentColor.r, accentColor.g, accentColor.b)
    });
}

/**
 * Dibujar borde moderno con elementos asimétricos
 */
function drawModernBorder(page, width, height, borderConfig) {
    const { rgb } = require('pdf-lib');

    const borderColor = hexToRgb(borderConfig?.color || '#2563eb');
    const borderWidth = borderConfig?.width || 1;

    // Borde superior asimétrico
    page.drawLine({
        start: { x: 30, y: height - 30 },
        end: { x: width / 2 - 50, y: height - 30 },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b)
    });

    page.drawLine({
        start: { x: width / 2 + 50, y: height - 30 },
        end: { x: width - 30, y: height - 30 },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b)
    });

    // Borde inferior
    page.drawLine({
        start: { x: 30, y: 30 },
        end: { x: width - 30, y: 30 },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b)
    });

    // Borde izquierdo
    page.drawLine({
        start: { x: 30, y: height - 30 },
        end: { x: 30, y: 30 },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b)
    });

    // Borde derecho
    page.drawLine({
        start: { x: width - 30, y: height - 30 },
        end: { x: width - 30, y: 30 },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b)
    });
}

/**
 * Template moderno principal
 */
async function drawModernTemplate(page, width, height, data, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc) {
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

    let currentY = 100;

    // 1. Elementos geométricos modernos
    drawModernGeometricElements(page, width, height, config);

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
function drawModernTemplateCanvas(ctx, config, width, height, data) {
    if (!ctx || !config) return;

    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};
    const visualConfig = config.visualConfig || {};

    // Fondo moderno
    ctx.fillStyle = colorConfig.background || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Elementos geométricos modernos
    ctx.fillStyle = colorConfig.primary || '#2563eb';
    ctx.fillRect(40, 60, 80, 4);

    ctx.fillStyle = colorConfig.accent || '#06b6d4';
    ctx.beginPath();
    ctx.arc(width - 60, 70, 8, 0, 2 * Math.PI);
    ctx.fill();

    let currentY = 100;

    // Header simplificado para canvas
    ctx.fillStyle = colorConfig.primary || '#2563eb';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICACIÓN PROFESIONAL', width / 2, currentY);

    // Título del documento
    ctx.fillStyle = colorConfig.accent || '#06b6d4';
    ctx.font = 'bold 20px sans-serif';
    const titleLines = wrapText(cleanTextForPdf(data.titulo || ''), 35);
    titleLines.forEach((line, index) => {
        ctx.fillText(line, width / 2, currentY + 60 + (index * 22));
    });

    // Área de firma moderna
    const signatureY = height - 120;
    ctx.strokeStyle = colorConfig.primary || '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 120, signatureY, 240, 60);

    // Elementos decorativos en la firma
    ctx.fillStyle = colorConfig.accent || '#06b6d4';
    ctx.fillRect(width / 2 - 120, signatureY - 5, 40, 3);
    ctx.fillRect(width / 2 + 80, signatureY - 5, 40, 3);

    ctx.fillStyle = colorConfig.accent || '#06b6d4';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FIRMA DIGITAL PROFESIONAL', width / 2, signatureY + 25);
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawModernTemplate,
        drawModernBorder,
        drawModernTemplateCanvas
    };
}

if (typeof window !== 'undefined') {
    window.ModernTemplate = {
        drawTemplate: drawModernTemplateCanvas,
        drawBorder: drawModernBorder
    };
}
