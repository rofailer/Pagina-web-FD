// ========================================
// PLANTILLA MINIMALISTA
// ========================================

// Para Backend (PDF-lib) - COORDENADAS EXACTAS DEL CANVAS
function drawMinimalTemplate(page, width, height, data, helveticaFont, helveticaBold) {
    const { rgb } = require('pdf-lib');
    const { cleanTextForPdf, wrapText } = require('./base.template');

    // Función para convertir coordenadas Y de Canvas a PDF (Y invertido)
    const canvasToY = (canvasY) => height - canvasY;

    // Título principal centrado - EXACTAMENTE como en canvas
    const tituloText = cleanTextForPdf(data.titulo);
    const tituloWidth = tituloText.length * 14; // Aproximación para centrado
    page.drawText(tituloText, {
        x: width / 2 - (tituloWidth / 2),
        y: canvasToY(150), // Canvas Y=150 → PDF Y=642
        size: 24,
        font: helveticaBold,
        color: rgb(0.42, 0.45, 0.50) // #6b7280
    });

    // Línea minimalista - EXACTAMENTE como en canvas
    page.drawLine({
        start: { x: width / 2 - 80, y: canvasToY(165) }, // Canvas Y=165 → PDF Y=627
        end: { x: width / 2 + 80, y: canvasToY(165) },
        thickness: 1,
        color: rgb(0.42, 0.45, 0.50) // #6b7280
    });

    // Institución centrada - EXACTAMENTE como en canvas
    const institucionText = cleanTextForPdf(data.institucion);
    const institucionWidth = institucionText.length * 7;
    page.drawText(institucionText, {
        x: width / 2 - (institucionWidth / 2),
        y: canvasToY(190), // Canvas Y=190 → PDF Y=602
        size: 12,
        font: helveticaFont,
        color: rgb(0.22, 0.25, 0.32) // #374151
    });

    // Contenido centrado - EXACTAMENTE como en canvas
    const startY = 250; // Canvas Y=250
    const contenido = 'Documento certificado digitalmente';
    const contenidoWidth = contenido.length * 8;
    page.drawText(contenido, {
        x: width / 2 - (contenidoWidth / 2),
        y: canvasToY(startY), // Canvas Y=250 → PDF Y=542
        size: 14,
        font: helveticaFont,
        color: rgb(0.22, 0.25, 0.32) // #374151
    });

    // Autores centrados - EXACTAMENTE como en canvas
    const autoresTitle = 'Autores:';
    const autoresTitleWidth = autoresTitle.length * 8;
    page.drawText(autoresTitle, {
        x: width / 2 - (autoresTitleWidth / 2),
        y: canvasToY(startY + 60), // Canvas Y=310 → PDF Y=482
        size: 14,
        font: helveticaBold,
        color: rgb(0.22, 0.25, 0.32) // #374151
    });

    data.autores.forEach((autor, index) => {
        const autorText = cleanTextForPdf(autor);
        const autorWidth = autorText.length * 7.5;
        page.drawText(autorText, {
            x: width / 2 - (autorWidth / 2),
            y: canvasToY(startY + 90 + (index * 22)), // Canvas Y=340+n*22 → PDF Y=452-n*22
            size: 13,
            font: helveticaFont,
            color: rgb(0.22, 0.25, 0.32) // #374151
        });
    });

    // Avalado por centrado - EXACTAMENTE como en canvas
    const avaladoTitle = 'Avalado por:';
    const avaladoTitleWidth = avaladoTitle.length * 8;
    page.drawText(avaladoTitle, {
        x: width / 2 - (avaladoTitleWidth / 2),
        y: canvasToY(height - 150), // Canvas Y=height-150 → PDF Y=150
        size: 14,
        font: helveticaBold,
        color: rgb(0.22, 0.25, 0.32) // #374151
    });

    const avaladoText = cleanTextForPdf(data.avaladoPor);
    const avaladoWidth = avaladoText.length * 7.5;
    page.drawText(avaladoText, {
        x: width / 2 - (avaladoWidth / 2),
        y: canvasToY(height - 125), // Canvas Y=height-125 → PDF Y=125
        size: 13,
        font: helveticaFont,
        color: rgb(0.22, 0.25, 0.32) // #374151
    });

    // Fecha centrada (abajo) - EXACTAMENTE como en canvas
    const fechaText = `Fecha: ${cleanTextForPdf(data.fecha)}`;
    const fechaWidth = fechaText.length * 7;
    page.drawText(fechaText, {
        x: width / 2 - (fechaWidth / 2),
        y: canvasToY(height - 100), // Canvas Y=height-100 → PDF Y=100
        size: 12,
        font: helveticaFont,
        color: rgb(0.22, 0.25, 0.32) // #374151
    });
}

// Borde para plantilla minimalista
function drawMinimalBorder(page, width, height) {
    const { rgb } = require('pdf-lib');

    // Solo líneas en las esquinas
    const cornerLength = 40;
    const cornerColor = rgb(0.3, 0.3, 0.3);

    // Esquinas superiores
    page.drawLine({ start: { x: 30, y: height - 30 }, end: { x: 30 + cornerLength, y: height - 30 }, thickness: 2, color: cornerColor });
    page.drawLine({ start: { x: 30, y: height - 30 }, end: { x: 30, y: height - 30 - cornerLength }, thickness: 2, color: cornerColor });
    page.drawLine({ start: { x: width - 30, y: height - 30 }, end: { x: width - 30 - cornerLength, y: height - 30 }, thickness: 2, color: cornerColor });
    page.drawLine({ start: { x: width - 30, y: height - 30 }, end: { x: width - 30, y: height - 30 - cornerLength }, thickness: 2, color: cornerColor });

    // Esquinas inferiores
    page.drawLine({ start: { x: 30, y: 30 }, end: { x: 30 + cornerLength, y: 30 }, thickness: 2, color: cornerColor });
    page.drawLine({ start: { x: 30, y: 30 }, end: { x: 30, y: 30 + cornerLength }, thickness: 2, color: cornerColor });
    page.drawLine({ start: { x: width - 30, y: 30 }, end: { x: width - 30 - cornerLength, y: 30 }, thickness: 2, color: cornerColor });
    page.drawLine({ start: { x: width - 30, y: 30 }, end: { x: width - 30, y: 30 + cornerLength }, thickness: 2, color: cornerColor });
}

// Para Frontend (Canvas)
function drawMinimalTemplateCanvas(ctx, config, width, height, data) {
    // Título principal
    ctx.fillStyle = config.colors.primary;
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.titulo, width / 2, 150);

    // Línea minimalista
    ctx.strokeStyle = config.colors.primary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, 165);
    ctx.lineTo(width / 2 + 80, 165);
    ctx.stroke();

    // Institución
    ctx.fillStyle = config.colors.text;
    ctx.font = '12px sans-serif';
    ctx.fillText(data.institucion, width / 2, 190);

    // Contenido
    ctx.font = '14px sans-serif';
    const startY = 250;
    ctx.fillText('Documento certificado digitalmente', width / 2, startY);

    // Autores
    ctx.font = '14px sans-serif';
    ctx.fillText('Autores:', width / 2, startY + 60);
    data.autores.forEach((autor, index) => {
        ctx.font = '13px sans-serif';
        ctx.fillText(autor, width / 2, startY + 90 + (index * 22));
    });

    // Avalado por
    ctx.font = '14px sans-serif';
    ctx.fillText('Avalado por:', width / 2, height - 150);
    ctx.font = '13px sans-serif';
    ctx.fillText(data.avaladoPor, width / 2, height - 125);

    // Firma estándar centrada
    if (window.BaseTemplate && window.BaseTemplate.drawStandardSignature) {
        window.BaseTemplate.drawStandardSignature(ctx, config, width / 2, height - 100, 'center');
    }
}

// Borde para canvas
function drawMinimalBorderCanvas(ctx, config, width, height) {
    const cornerLength = 40;
    const cornerColor = config.colors.primary;
    ctx.strokeStyle = cornerColor;
    ctx.lineWidth = 2;

    // Esquinas minimalistas
    ctx.beginPath();
    ctx.moveTo(30, 30 + cornerLength);
    ctx.lineTo(30, 30);
    ctx.lineTo(30 + cornerLength, 30);
    ctx.moveTo(width - 30 - cornerLength, 30);
    ctx.lineTo(width - 30, 30);
    ctx.lineTo(width - 30, 30 + cornerLength);
    ctx.moveTo(30, height - 30 - cornerLength);
    ctx.lineTo(30, height - 30);
    ctx.lineTo(30 + cornerLength, height - 30);
    ctx.moveTo(width - 30 - cornerLength, height - 30);
    ctx.lineTo(width - 30, height - 30);
    ctx.lineTo(width - 30, height - 30 - cornerLength);
    ctx.stroke();
}

// Configuración de la plantilla
const MinimalTemplateConfig = {
    colors: {
        primary: '#6b7280',
        accent: '#9ca3af',
        text: '#374151'
    },
    layout: {
        borderStyle: 'minimal'
    },
    logoPosition: {
        x: 15,
        y: 5
    }
};

// Exportar para Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawMinimalTemplate,
        drawMinimalBorder,
        MinimalTemplateConfig
    };
}

// Exportar para el navegador (frontend)
if (typeof window !== 'undefined') {
    window.MinimalTemplate = {
        drawTemplateCanvas: drawMinimalTemplateCanvas,
        drawBorderCanvas: drawMinimalBorderCanvas,
        config: MinimalTemplateConfig
    };
}
