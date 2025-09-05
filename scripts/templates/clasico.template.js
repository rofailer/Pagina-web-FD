// ========================================
// PLANTILLA CLÁSICA
// ========================================

// Para Backend (PDF-lib) - COORDENADAS EXACTAS DEL CANVAS
function drawClassicTemplate(page, width, height, data, helveticaFont, helveticaBold, timesFont, timesBold) {
    const { rgb } = require('pdf-lib');
    const { cleanTextForPdf, wrapText } = require('./base.template');

    // Función para convertir coordenadas Y de Canvas a PDF (Y invertido)
    const canvasToY = (canvasY) => height - canvasY;

    // Título principal - EXACTAMENTE como en canvas
    const tituloText = cleanTextForPdf(data.titulo);
    const tituloWidth = tituloText.length * 16;
    page.drawText(tituloText, {
        x: width / 2 - (tituloWidth / 2),
        y: canvasToY(100), // Canvas Y=100 → PDF Y=692
        size: 28,
        font: timesBold,
        color: rgb(0.12, 0.16, 0.22) // #1f2937
    });

    // Subtítulo - EXACTAMENTE como en canvas
    const subtitulo = 'Certificacion de Autenticidad';
    const subtituloWidth = subtitulo.length * 9;
    page.drawText(subtitulo, {
        x: width / 2 - (subtituloWidth / 2),
        y: canvasToY(130), // Canvas Y=130 → PDF Y=662
        size: 16,
        font: timesFont,
        color: rgb(0.29, 0.33, 0.39) // #4b5563
    });

    // Institución arriba a la derecha - EXACTAMENTE como en canvas
    const institucionText = cleanTextForPdf(data.institucion);
    const institucionWidth = institucionText.length * 8;
    page.drawText(institucionText, {
        x: width - 60 - institucionWidth,
        y: canvasToY(60), // Canvas Y=60 → PDF Y=732
        size: 14,
        font: timesBold,
        color: rgb(0.12, 0.16, 0.22) // #1f2937
    });

    // Línea decorativa clásica doble - EXACTAMENTE como en canvas
    page.drawLine({
        start: { x: 80, y: canvasToY(150) }, // Canvas Y=150 → PDF Y=642
        end: { x: width - 80, y: canvasToY(150) },
        thickness: 2,
        color: rgb(0.12, 0.16, 0.22) // #1f2937
    });

    page.drawLine({
        start: { x: 90, y: canvasToY(155) }, // Canvas Y=155 → PDF Y=637
        end: { x: width - 90, y: canvasToY(155) },
        thickness: 1,
        color: rgb(0.12, 0.16, 0.22) // #1f2937
    });

    // Contenido principal - EXACTAMENTE como en canvas
    const startY = 200; // Canvas Y=200
    page.drawText('Este documento certifica que el contenido ha sido avalado', {
        x: 60,
        y: canvasToY(startY), // Canvas Y=200 → PDF Y=592
        size: 14,
        font: timesFont,
        color: rgb(0.29, 0.33, 0.39) // #4b5563
    });
    page.drawText('digitalmente y cumple con los estandares institucionales.', {
        x: 60,
        y: canvasToY(startY + 25), // Canvas Y=225 → PDF Y=567
        size: 14,
        font: timesFont,
        color: rgb(0.29, 0.33, 0.39) // #4b5563
    });

    // Autores - EXACTAMENTE como en canvas
    page.drawText('Autores:', {
        x: 60,
        y: canvasToY(startY + 70), // Canvas Y=270 → PDF Y=522
        size: 14,
        font: timesBold,
        color: rgb(0.29, 0.33, 0.39) // #4b5563
    });

    data.autores.forEach((autor, index) => {
        page.drawText(`• ${cleanTextForPdf(autor)}`, {
            x: 80,
            y: canvasToY(startY + 100 + (index * 25)), // Canvas Y=300+n*25 → PDF Y=492-n*25
            size: 14,
            font: timesFont,
            color: rgb(0.29, 0.33, 0.39) // #4b5563
        });
    });

    // Marco clásico para avalado por - EXACTAMENTE como en canvas
    const marcoY = height - 200; // Canvas Y = height - 200
    page.drawRectangle({
        x: 50,
        y: marcoY - 60, // Ajuste para que coincida con canvas strokeRect
        width: width - 100,
        height: 60,
        borderColor: rgb(0.12, 0.16, 0.22), // #1f2937
        borderWidth: 1
    });

    page.drawText('Avalado por:', {
        x: 60,
        y: canvasToY(height - 170), // Canvas Y=height-170 → coordenada correcta
        size: 14,
        font: timesBold,
        color: rgb(0.29, 0.33, 0.39) // #4b5563
    });
    page.drawText(cleanTextForPdf(data.avaladoPor), {
        x: 60,
        y: canvasToY(height - 150), // Canvas Y=height-150 → coordenada correcta
        size: 14,
        font: timesFont,
        color: rgb(0.29, 0.33, 0.39) // #4b5563
    });

    // Fecha (abajo derecha) - EXACTAMENTE como en canvas
    page.drawText(`Fecha: ${cleanTextForPdf(data.fecha)}`, {
        x: width - 200,
        y: canvasToY(height - 120), // Canvas Y=height-120 → coordenada correcta
        size: 12,
        font: timesFont,
        color: rgb(0.29, 0.33, 0.39) // #4b5563
    });
}// Borde para plantilla clásica
function drawClassicBorder(page, width, height) {
    const { rgb } = require('pdf-lib');

    // Borde clásico doble
    page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderColor: rgb(0.1, 0.2, 0.4),
        borderWidth: 2
    });
    page.drawRectangle({
        x: 40,
        y: 40,
        width: width - 80,
        height: height - 80,
        borderColor: rgb(0.1, 0.2, 0.4),
        borderWidth: 1
    });
}

// Para Frontend (Canvas) - DISEÑO IDÉNTICO AL BACKEND
function drawClassicTemplateCanvas(ctx, config, width, height, data) {
    // Título principal - EXACTAMENTE como en backend
    ctx.fillStyle = config.colors.primary;
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.titulo, width / 2, 100);

    // Subtítulo - EXACTAMENTE como en backend
    ctx.fillStyle = config.colors.text;
    ctx.font = '16px serif';
    ctx.fillText('Certificación de Autenticidad', width / 2, 130);

    // Institución arriba a la derecha - EXACTAMENTE como en backend
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px serif';
    ctx.fillStyle = config.colors.primary;
    ctx.fillText(data.institucion, width - 60, 60);

    // Línea decorativa clásica doble - EXACTAMENTE como en backend
    ctx.strokeStyle = config.colors.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 150);
    ctx.lineTo(width - 80, 150);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(90, 155);
    ctx.lineTo(width - 90, 155);
    ctx.stroke();

    // Contenido principal - EXACTAMENTE como en backend
    ctx.textAlign = 'left';
    ctx.fillStyle = config.colors.text;
    ctx.font = '14px serif';
    const startY = 200;
    ctx.fillText('Este documento certifica que el contenido ha sido avalado', 60, startY);
    ctx.fillText('digitalmente y cumple con los estandares institucionales.', 60, startY + 25);

    // Autores - EXACTAMENTE como en backend
    ctx.font = 'bold 14px serif';
    ctx.fillText('Autores:', 60, startY + 70);
    ctx.font = '14px serif';
    data.autores.forEach((autor, index) => {
        ctx.fillText(`• ${autor}`, 80, startY + 100 + (index * 25));
    });

    // Marco clásico para avalado por - EXACTAMENTE como en backend
    ctx.strokeStyle = config.colors.primary;
    ctx.lineWidth = 1;
    ctx.strokeRect(50, height - 200, width - 100, 60);

    ctx.font = 'bold 14px serif';
    ctx.fillText('Avalado por:', 60, height - 170);
    ctx.font = '14px serif';
    ctx.fillText(data.avaladoPor, 60, height - 150);

    // Fecha (abajo derecha) - EXACTAMENTE como en backend
    ctx.textAlign = 'right';
    ctx.font = '12px serif';
    ctx.fillText(`Fecha: ${data.fecha}`, width - 20, height - 120);
}

// Borde para canvas - IDÉNTICO AL BACKEND
function drawClassicBorderCanvas(ctx, config, width, height) {
    // Borde clásico doble - igual que en backend
    ctx.strokeStyle = '#1a365d'; // Equivalente a rgb(0.1, 0.2, 0.4)
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);
}

// Configuración de la plantilla
const ClassicTemplateConfig = {
    colors: {
        primary: '#1f2937',
        accent: '#374151',
        text: '#4b5563'
    },
    layout: {
        borderStyle: 'solid'
    },
    logoPosition: {
        x: 15,
        y: 5
    }
};

// Exportar para Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawClassicTemplate,
        drawClassicBorder,
        ClassicTemplateConfig
    };
}

// Exportar para el navegador (frontend)
if (typeof window !== 'undefined') {
    window.ClassicTemplate = {
        drawTemplateCanvas: drawClassicTemplateCanvas,
        drawBorderCanvas: drawClassicBorderCanvas,
        config: ClassicTemplateConfig
    };
}
