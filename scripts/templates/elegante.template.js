// ========================================
// PLANTILLA ELEGANTE - DISEÑO SOFISTICADO PREMIUM
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
 * Dibujar elementos ornamentales elegantes
 */
function drawElegantOrnaments(page, width, height, config) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};
    const primaryColor = hexToRgb(colorConfig.primary || '#7c3aed');
    const accentColor = hexToRgb(colorConfig.accent || '#f59e0b');

    // Ornamentos superiores
    const topY = 80;

    // Florón superior izquierdo
    page.drawCircle({
        x: 60,
        y: canvasToPdfY(topY, height),
        size: 6,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    page.drawCircle({
        x: 60,
        y: canvasToPdfY(topY + 15, height),
        size: 4,
        color: rgb(accentColor.r, accentColor.g, accentColor.b)
    });

    // Florón superior derecho
    page.drawCircle({
        x: width - 60,
        y: canvasToPdfY(topY, height),
        size: 6,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    page.drawCircle({
        x: width - 60,
        y: canvasToPdfY(topY + 15, height),
        size: 4,
        color: rgb(accentColor.r, accentColor.g, accentColor.b)
    });

    // Elementos ornamentales inferiores
    const bottomY = height - 120;

    // Volutas elegantes
    page.drawLine({
        start: { x: 80, y: canvasToPdfY(bottomY, height) },
        end: { x: 100, y: canvasToPdfY(bottomY - 10, height) },
        thickness: 2,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    page.drawLine({
        start: { x: 100, y: canvasToPdfY(bottomY - 10, height) },
        end: { x: 120, y: canvasToPdfY(bottomY, height) },
        thickness: 2,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    page.drawLine({
        start: { x: width - 80, y: canvasToPdfY(bottomY, height) },
        end: { x: width - 100, y: canvasToPdfY(bottomY - 10, height) },
        thickness: 2,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    page.drawLine({
        start: { x: width - 100, y: canvasToPdfY(bottomY - 10, height) },
        end: { x: width - 120, y: canvasToPdfY(bottomY, height) },
        thickness: 2,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });
}

/**
 * Dibujar borde elegante con elementos decorativos
 */
function drawElegantBorder(page, width, height, borderConfig) {
    const { rgb } = require('pdf-lib');

    const borderColor = hexToRgb(borderConfig?.color || '#7c3aed');
    const borderWidth = borderConfig?.width || 2;

    // Borde exterior elegante
    page.drawRectangle({
        x: 35,
        y: 35,
        width: width - 70,
        height: height - 70,
        borderWidth: borderWidth,
        borderColor: rgb(borderColor.r, borderColor.g, borderColor.b)
    });

    // Borde interior sutil
    page.drawRectangle({
        x: 45,
        y: 45,
        width: width - 90,
        height: height - 90,
        borderWidth: 1,
        borderColor: rgb(borderColor.r, borderColor.g, borderColor.b, 0.3)
    });

    // Elementos decorativos en las esquinas
    if (borderConfig?.showDecorative !== false) {
        const cornerColor = hexToRgb(borderConfig?.color || '#7c3aed');

        // Esquina superior izquierda - voluta
        page.drawLine({
            start: { x: 35, y: 55 },
            end: { x: 55, y: 35 },
            thickness: 1,
            color: rgb(cornerColor.r, cornerColor.g, cornerColor.b)
        });

        // Esquina superior derecha - voluta
        page.drawLine({
            start: { x: width - 35, y: 55 },
            end: { x: width - 55, y: 35 },
            thickness: 1,
            color: rgb(cornerColor.r, cornerColor.g, cornerColor.b)
        });

        // Esquina inferior izquierda - voluta
        page.drawLine({
            start: { x: 35, y: height - 55 },
            end: { x: 55, y: height - 35 },
            thickness: 1,
            color: rgb(cornerColor.r, cornerColor.g, cornerColor.b)
        });

        // Esquina inferior derecha - voluta
        page.drawLine({
            start: { x: width - 35, y: height - 55 },
            end: { x: width - 55, y: height - 35 },
            thickness: 1,
            color: rgb(cornerColor.r, cornerColor.g, cornerColor.b)
        });
    }
}

/**
 * Template elegante principal
 */
async function drawElegantTemplate(page, width, height, data, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc) {
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

    let currentY = 110;

    // 1. Elementos ornamentales elegantes
    drawElegantOrnaments(page, width, height, config);

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
function drawElegantTemplateCanvas(ctx, config, width, height, data) {
    if (!ctx || !config) return;

    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};
    const visualConfig = config.visualConfig || {};

    // Fondo elegante
    ctx.fillStyle = colorConfig.background || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Bordes elegantes
    ctx.strokeStyle = colorConfig.primary || '#7c3aed';
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, width - 70, height - 70);

    ctx.lineWidth = 1;
    ctx.strokeRect(45, 45, width - 90, height - 90);

    // Elementos ornamentales
    ctx.fillStyle = colorConfig.primary || '#7c3aed';
    ctx.beginPath();
    ctx.arc(60, 80, 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = colorConfig.accent || '#f59e0b';
    ctx.beginPath();
    ctx.arc(60, 95, 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = colorConfig.primary || '#7c3aed';
    ctx.beginPath();
    ctx.arc(width - 60, 80, 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = colorConfig.accent || '#f59e0b';
    ctx.beginPath();
    ctx.arc(width - 60, 95, 4, 0, 2 * Math.PI);
    ctx.fill();

    let currentY = 110;

    // Header simplificado para canvas
    ctx.fillStyle = colorConfig.primary || '#7c3aed';
    ctx.font = 'bold 18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICACIÓN PREMIUM', width / 2, currentY);

    // Título del documento
    ctx.fillStyle = colorConfig.accent || '#f59e0b';
    ctx.font = 'bold 20px serif';
    const titleLines = wrapText(cleanTextForPdf(data.titulo || ''), 35);
    titleLines.forEach((line, index) => {
        ctx.fillText(line, width / 2, currentY + 60 + (index * 22));
    });

    // Área de firma elegante
    const signatureY = height - 120;
    ctx.strokeStyle = colorConfig.primary || '#7c3aed';
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 120, signatureY, 240, 70);

    // Elementos decorativos en la firma
    ctx.fillStyle = colorConfig.accent || '#f59e0b';
    ctx.fillRect(width / 2 - 120, signatureY - 8, 50, 4);
    ctx.fillRect(width / 2 + 70, signatureY - 8, 50, 4);

    ctx.fillStyle = colorConfig.accent || '#f59e0b';
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('FIRMA PREMIUM', width / 2, signatureY + 30);
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawElegantTemplate,
        drawElegantBorder,
        drawElegantTemplateCanvas
    };
}

if (typeof window !== 'undefined') {
    window.ElegantTemplate = {
        drawTemplate: drawElegantTemplateCanvas,
        drawBorder: drawElegantBorder
    };
}
