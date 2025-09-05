// ========================================
// PLANTILLA ELEGANTE
// ========================================

// Para Backend (PDF-lib) - COORDENADAS EXACTAS DEL CANVAS
function drawElegantTemplate(page, width, height, data, helveticaFont, helveticaBold, timesFont, timesBold) {
    const { rgb } = require('pdf-lib');
    const { cleanTextForPdf, wrapText } = require('./base.template');

    // Función para convertir coordenadas Y de Canvas a PDF (Y invertido)
    const canvasToY = (canvasY) => height - canvasY;

    // Título principal centrado - EXACTAMENTE como en canvas
    const tituloText = cleanTextForPdf(data.titulo);
    const tituloWidth = tituloText.length * 16; // Aproximación para centrado
    page.drawText(tituloText, {
        x: width / 2 - (tituloWidth / 2),
        y: canvasToY(170), // Canvas Y=170 → PDF Y=622
        size: 28,
        font: timesBold,
        color: rgb(0.49, 0.18, 0.07) // #7c2d12
    });

    // Decoración elegante - líneas laterales - EXACTAMENTE como en canvas
    page.drawLine({
        start: { x: width / 2 - 120, y: canvasToY(185) }, // Canvas Y=185 → PDF Y=607
        end: { x: width / 2 - 20, y: canvasToY(185) },
        thickness: 1,
        color: rgb(0.85, 0.47, 0.03) // #d97706
    });
    page.drawLine({
        start: { x: width / 2 + 20, y: canvasToY(185) },
        end: { x: width / 2 + 120, y: canvasToY(185) },
        thickness: 1,
        color: rgb(0.85, 0.47, 0.03) // #d97706
    });

    // Rombo central decorativo - EXACTAMENTE como en canvas
    page.drawRectangle({
        x: width / 2 - 4,
        y: canvasToY(194) - 7, // Canvas Y=194 (rombo centrado) → PDF Y=598
        width: 8,
        height: 14,
        color: rgb(0.85, 0.47, 0.03) // #d97706
    });

    // Subtítulo centrado - EXACTAMENTE como en canvas
    const subtitulo = 'Certificacion de Excelencia';
    const subtituloWidth = subtitulo.length * 9;
    page.drawText(subtitulo, {
        x: width / 2 - (subtituloWidth / 2),
        y: canvasToY(220), // Canvas Y=220 → PDF Y=572
        size: 16,
        font: timesFont,
        color: rgb(0.57, 0.25, 0.05) // #92400e
    });

    // Institución centrada - EXACTAMENTE como en canvas
    const institucionText = cleanTextForPdf(data.institucion);
    const institucionWidth = institucionText.length * 8;
    page.drawText(institucionText, {
        x: width / 2 - (institucionWidth / 2),
        y: canvasToY(250), // Canvas Y=250 → PDF Y=542
        size: 14,
        font: timesBold,
        color: rgb(0.49, 0.18, 0.07) // #7c2d12
    });

    // Contenido principal alineado a la izquierda - EXACTAMENTE como en canvas
    const startY = 300; // Canvas Y=300
    page.drawText('Este documento ha sido revisado y avalado bajo', {
        x: 80,
        y: canvasToY(startY), // Canvas Y=300 → PDF Y=492
        size: 14,
        font: timesFont,
        color: rgb(0.57, 0.25, 0.05) // #92400e
    });
    page.drawText('los mas altos estandares de calidad institucional.', {
        x: 80,
        y: canvasToY(startY + 25), // Canvas Y=325 → PDF Y=467
        size: 14,
        font: timesFont,
        color: rgb(0.57, 0.25, 0.05) // #92400e
    });

    // Autores lado izquierdo - EXACTAMENTE como en canvas
    page.drawText('Autores:', {
        x: 80,
        y: canvasToY(startY + 70), // Canvas Y=370 → PDF Y=422
        size: 14,
        font: timesBold,
        color: rgb(0.57, 0.25, 0.05) // #92400e
    });

    data.autores.forEach((autor, index) => {
        page.drawText(`• ${cleanTextForPdf(autor)}`, {
            x: 100,
            y: canvasToY(startY + 100 + (index * 25)), // Canvas Y=400+n*25 → PDF Y=392-n*25
            size: 14,
            font: timesFont,
            color: rgb(0.57, 0.25, 0.05) // #92400e
        });
    });

    // Avalado por lado derecho - EXACTAMENTE como en canvas
    const avaladoTitle = 'Avalado por:';
    const avaladoTitleWidth = avaladoTitle.length * 8;
    page.drawText(avaladoTitle, {
        x: width - 80 - avaladoTitleWidth,
        y: canvasToY(startY + 70), // Canvas Y=370 → PDF Y=422
        size: 14,
        font: timesBold,
        color: rgb(0.57, 0.25, 0.05) // #92400e
    });

    const avaladoText = cleanTextForPdf(data.avaladoPor);
    const avaladoWidth = avaladoText.length * 8;
    page.drawText(avaladoText, {
        x: width - 80 - avaladoWidth,
        y: canvasToY(startY + 100), // Canvas Y=400 → PDF Y=392
        size: 14,
        font: timesFont,
        color: rgb(0.57, 0.25, 0.05) // #92400e
    });

    // Fecha centrada (abajo) - Esta coordenada se mantiene como estaba
    const fechaText = `Fecha: ${cleanTextForPdf(data.fecha)}`;
    const fechaWidth = fechaText.length * 7;
    page.drawText(fechaText, {
        x: width / 2 - (fechaWidth / 2),
        y: 120, // Esta coordenada ya está en PDF (no viene del canvas)
        size: 12,
        font: timesFont,
        color: rgb(0.57, 0.25, 0.05) // #92400e
    });
}

// Borde para plantilla elegante
function drawElegantBorder(page, width, height) {
    const { rgb } = require('pdf-lib');

    // Borde elegante con decoraciones
    page.drawRectangle({
        x: 35,
        y: 35,
        width: width - 70,
        height: height - 70,
        borderColor: rgb(0.4, 0.2, 0.6),
        borderWidth: 1.5
    });

    // Decoraciones en las esquinas
    const decorSize = 15;
    const decorColor = rgb(0.4, 0.2, 0.6);
    page.drawRectangle({ x: 35, y: height - 50, width: decorSize, height: decorSize, color: decorColor });
    page.drawRectangle({ x: width - 50, y: height - 50, width: decorSize, height: decorSize, color: decorColor });
    page.drawRectangle({ x: 35, y: 35, width: decorSize, height: decorSize, color: decorColor });
    page.drawRectangle({ x: width - 50, y: 35, width: decorSize, height: decorSize, color: decorColor });
}

// Para Frontend (Canvas)
function drawElegantTemplateCanvas(ctx, config, width, height, data) {
    // Título principal
    ctx.fillStyle = config.colors.primary;
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.titulo, width / 2, 170);

    // Decoración elegante
    ctx.strokeStyle = config.colors.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 120, 185);
    ctx.lineTo(width / 2 - 20, 185);
    ctx.moveTo(width / 2 + 20, 185);
    ctx.lineTo(width / 2 + 120, 185);
    ctx.stroke();

    // Rombo central
    ctx.fillStyle = config.colors.accent;
    ctx.beginPath();
    ctx.moveTo(width / 2, 180);
    ctx.lineTo(width / 2 + 8, 187);
    ctx.lineTo(width / 2, 194);
    ctx.lineTo(width / 2 - 8, 187);
    ctx.closePath();
    ctx.fill();

    // Subtítulo
    ctx.fillStyle = config.colors.text;
    ctx.font = '16px serif';
    ctx.fillText('Certificación de Excelencia', width / 2, 220);

    // Institución
    ctx.font = 'bold 14px serif';
    ctx.fillStyle = config.colors.primary;
    ctx.fillText(data.institucion, width / 2, 250);

    // Contenido principal
    ctx.textAlign = 'left';
    ctx.fillStyle = config.colors.text;
    ctx.font = '14px serif';
    const startY = 300;
    ctx.fillText('Este documento ha sido revisado y avalado bajo', 80, startY);
    ctx.fillText('los más altos estándares de calidad institucional.', 80, startY + 25);

    // Autores
    ctx.font = 'bold 14px serif';
    ctx.fillText('Autores:', 80, startY + 70);
    ctx.font = '14px serif';
    data.autores.forEach((autor, index) => {
        ctx.fillText(`• ${autor}`, 100, startY + 100 + (index * 25));
    });

    // Avalado por (lado derecho)
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px serif';
    ctx.fillText('Avalado por:', width - 80, startY + 70);
    ctx.font = '14px serif';
    ctx.fillText(data.avaladoPor, width - 80, startY + 100);

    // Firma estándar a la derecha
    if (window.BaseTemplate && window.BaseTemplate.drawStandardSignature) {
        window.BaseTemplate.drawStandardSignature(ctx, config, width - 80, startY + 130, 'right');
    }
}

// Borde para canvas
function drawElegantBorderCanvas(ctx, config, width, height) {
    ctx.strokeStyle = config.colors.primary;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(35, 35, width - 70, height - 70);

    // Decoraciones en las esquinas
    const decorSize = 15;
    ctx.fillStyle = config.colors.primary;
    ctx.fillRect(35, height - 50, decorSize, decorSize);
    ctx.fillRect(width - 50, height - 50, decorSize, decorSize);
    ctx.fillRect(35, 35, decorSize, decorSize);
    ctx.fillRect(width - 50, 35, decorSize, decorSize);
}

// Configuración de la plantilla
const ElegantTemplateConfig = {
    colors: {
        primary: '#7c2d12',
        accent: '#d97706',
        text: '#92400e'
    },
    layout: {
        borderStyle: 'ornate'
    },
    logoPosition: {
        x: 85,
        y: 5
    }
};

// Exportar para Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawElegantTemplate,
        drawElegantBorder,
        ElegantTemplateConfig
    };
}

// Exportar para el navegador (frontend)
if (typeof window !== 'undefined') {
    window.ElegantTemplate = {
        drawTemplateCanvas: drawElegantTemplateCanvas,
        drawBorderCanvas: drawElegantBorderCanvas,
        config: ElegantTemplateConfig
    };
}
