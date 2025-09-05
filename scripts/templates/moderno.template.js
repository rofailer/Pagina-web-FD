// ========================================
// PLANTILLA MODERNA
// ========================================

// Para Backend (PDF-lib) - DISEÑO IDÉNTICO AL FRONTEND MEJORADO
function drawModernTemplate(page, width, height, data, helveticaFont, helveticaBold) {
    const { rgb } = require('pdf-lib');
    const { cleanTextForPdf, wrapText } = require('./base.template');

    // Fondo sutil moderno
    page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: height,
        color: rgb(0.99, 0.99, 1) // Tinte azul muy sutil
    });

    // Título principal centrado - exactamente como en canvas
    const tituloText = cleanTextForPdf(data.titulo);
    const tituloWidth = tituloText.length * 15; // Aproximación para centrado
    page.drawText(tituloText, {
        x: width / 2 - (tituloWidth / 2),
        y: height - 160,
        size: 26,
        font: helveticaBold,
        color: rgb(0.15, 0.39, 0.92) // #2563eb
    });

    // Línea de acento moderna - exactamente como en canvas
    page.drawRectangle({
        x: width / 2 - 100,
        y: height - 175,
        width: 200,
        height: 3,
        color: rgb(0.23, 0.51, 0.96) // #3b82f6
    });

    // Subtítulo - exactamente como en canvas
    const subtitulo = 'Validacion Digital Institucional';
    const subtituloWidth = subtitulo.length * 9;
    page.drawText(subtitulo, {
        x: width / 2 - (subtituloWidth / 2),
        y: height - 200,
        size: 16,
        font: helveticaFont,
        color: rgb(0.39, 0.45, 0.55) // #64748b
    });

    // Institución con marco moderno - exactamente como en canvas
    page.drawRectangle({
        x: width / 2 - 120,
        y: height - 245,
        width: 240,
        height: 30,
        borderColor: rgb(0.15, 0.39, 0.92), // #2563eb
        borderWidth: 2
    });

    const institucionText = cleanTextForPdf(data.institucion);
    const institucionWidth = institucionText.length * 8;
    page.drawText(institucionText, {
        x: width / 2 - (institucionWidth / 2),
        y: height - 235,
        size: 14,
        font: helveticaBold,
        color: rgb(0.15, 0.39, 0.92) // #2563eb
    });

    // Contenido principal con tarjeta - exactamente como en canvas
    page.drawRectangle({
        x: 60,
        y: height - 350,
        width: width - 120,
        height: 80,
        color: rgb(1, 1, 1) // Fondo blanco
    });
    page.drawRectangle({
        x: 60,
        y: height - 350,
        width: width - 120,
        height: 80,
        borderColor: rgb(0.23, 0.51, 0.96), // #3b82f6
        borderWidth: 1
    });

    const startY = height - 295;
    const texto1 = 'Documento procesado y certificado';
    const texto1Width = texto1.length * 8;
    page.drawText(texto1, {
        x: width / 2 - (texto1Width / 2),
        y: startY,
        size: 14,
        font: helveticaFont,
        color: rgb(0.39, 0.45, 0.55) // #64748b
    });

    const texto2 = 'mediante sistema de validacion digital';
    const texto2Width = texto2.length * 8;
    page.drawText(texto2, {
        x: width / 2 - (texto2Width / 2),
        y: startY - 25,
        size: 14,
        font: helveticaFont,
        color: rgb(0.39, 0.45, 0.55) // #64748b
    });

    // Autores con viñetas modernas - exactamente como en canvas
    const autoresTitle = 'Autores del Documento';
    const autoresTitleWidth = autoresTitle.length * 8;
    page.drawText(autoresTitle, {
        x: width / 2 - (autoresTitleWidth / 2),
        y: startY - 70,
        size: 14,
        font: helveticaBold,
        color: rgb(0.15, 0.39, 0.92) // #2563eb
    });

    data.autores.forEach((autor, index) => {
        // Viñeta moderna (círculo)
        page.drawCircle({
            x: width / 2 - 100,
            y: startY - 95 - (index * 25),
            size: 3,
            color: rgb(0.23, 0.51, 0.96) // #3b82f6
        });

        const autorText = cleanTextForPdf(autor);
        page.drawText(autorText, {
            x: width / 2 - 90,
            y: startY - 100 - (index * 25),
            size: 14,
            font: helveticaFont,
            color: rgb(0.39, 0.45, 0.55) // #64748b
        });
    });

    // Panel de avalado moderno - EXACTAMENTE como en canvas
    const panelY = height - 180; // Canvas Y = height - 180
    page.drawRectangle({
        x: width / 2 - 120,
        y: panelY - 50, // Ajuste para PDF (Y invertido)
        width: 240,
        height: 50,
        color: rgb(0.97, 0.98, 1) // Fondo azul muy claro
    });

    const avaladoTitle = 'Avalado por:';
    const avaladoTitleWidth = avaladoTitle.length * 8;
    page.drawText(avaladoTitle, {
        x: width / 2 - (avaladoTitleWidth / 2),
        y: height - (height - 150), // Canvas Y=height-150 → PDF Y=150
        size: 14,
        font: helveticaBold,
        color: rgb(0.15, 0.39, 0.92) // #2563eb
    });

    const avaladoText = cleanTextForPdf(data.avaladoPor);
    const avaladoWidth = avaladoText.length * 8;
    page.drawText(avaladoText, {
        x: width / 2 - (avaladoWidth / 2),
        y: height - (height - 130), // Canvas Y=height-130 → PDF Y=130
        size: 14,
        font: helveticaFont,
        color: rgb(0.15, 0.39, 0.92) // #2563eb
    });

    // Fecha centrada (abajo) - EXACTAMENTE como en canvas
    const fechaText = `Fecha: ${cleanTextForPdf(data.fecha)}`;
    const fechaWidth = fechaText.length * 7;
    page.drawText(fechaText, {
        x: width / 2 - (fechaWidth / 2),
        y: height - (height - 100), // Canvas Y=height-100 → PDF Y=100
        size: 12,
        font: helveticaFont,
        color: rgb(0.39, 0.45, 0.55) // #64748b
    });
}

// Borde para plantilla moderna
function drawModernBorder(page, width, height) {
    const { rgb } = require('pdf-lib');

    // Borde moderno con línea de acento
    page.drawRectangle({
        x: 25,
        y: 25,
        width: width - 50,
        height: height - 50,
        borderColor: rgb(0.2, 0.5, 0.8),
        borderWidth: 2
    });
    // Línea de acento
    page.drawRectangle({
        x: 25,
        y: height - 80,
        width: width - 50,
        height: 5,
        color: rgb(0.2, 0.5, 0.8)
    });
}

// Para Frontend (Canvas) - DISEÑO MEJORADO Y DISTINTIVO
function drawModernTemplateCanvas(ctx, config, width, height, data) {
    // Fondo degradado moderno
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.03)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Título principal centrado con estilo moderno
    ctx.fillStyle = config.colors.primary;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.titulo, width / 2, 160);

    // Línea de acento moderna con degradado
    const lineGradient = ctx.createLinearGradient(width / 2 - 100, 170, width / 2 + 100, 170);
    lineGradient.addColorStop(0, 'transparent');
    lineGradient.addColorStop(0.1, config.colors.accent);
    lineGradient.addColorStop(0.9, config.colors.accent);
    lineGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = lineGradient;
    ctx.fillRect(width / 2 - 100, 170, 200, 3);

    // Subtítulo moderno
    ctx.fillStyle = config.colors.text;
    ctx.font = '16px sans-serif';
    ctx.fillText('Validación Digital Institucional', width / 2, 200);

    // Institución con marco moderno
    ctx.strokeStyle = config.colors.primary;
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 120, 215, 240, 30);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = config.colors.primary;
    ctx.fillText(data.institucion, width / 2, 235);

    // Contenido principal con diseño en tarjetas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(60, 270, width - 120, 80);
    ctx.strokeStyle = config.colors.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 270, width - 120, 80);

    ctx.fillStyle = config.colors.text;
    ctx.font = '14px sans-serif';
    const startY = 295;
    ctx.fillText('Documento procesado y certificado', width / 2, startY);
    ctx.fillText('mediante sistema de validación digital', width / 2, startY + 25);

    // Autores en lista moderna
    ctx.fillStyle = config.colors.primary;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Autores del Documento', width / 2, startY + 70);

    ctx.fillStyle = config.colors.text;
    ctx.font = '14px sans-serif';
    data.autores.forEach((autor, index) => {
        // Crear círculo de viñeta moderno
        ctx.fillStyle = config.colors.accent;
        ctx.beginPath();
        ctx.arc(width / 2 - 100, startY + 95 + (index * 25), 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = config.colors.text;
        ctx.fillText(autor, width / 2 - 90, startY + 100 + (index * 25));
    });

    // Panel de avalado moderno
    ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
    ctx.fillRect(width / 2 - 120, height - 180, 240, 50);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = config.colors.primary;
    ctx.fillText('Avalado por:', width / 2, height - 150);
    ctx.font = '14px sans-serif';
    ctx.fillText(data.avaladoPor, width / 2, height - 130);

    // Firma estándar centrada abajo
    if (window.BaseTemplate && window.BaseTemplate.drawStandardSignature) {
        window.BaseTemplate.drawStandardSignature(ctx, config, width / 2, height - 100, 'center');
    }
}

// Borde para canvas
function drawModernBorderCanvas(ctx, config, width, height) {
    ctx.strokeStyle = config.colors.primary;
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, width - 30, height - 30);

    // Línea de acento
    ctx.fillStyle = config.colors.accent;
    ctx.fillRect(15, height - 50, width - 30, 4);
}

// Configuración de la plantilla
const ModernTemplateConfig = {
    colors: {
        primary: '#2563eb',
        accent: '#3b82f6',
        text: '#64748b'
    },
    layout: {
        borderStyle: 'accent'
    },
    logoPosition: {
        x: 85,
        y: 5
    }
};

// Exportar para Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawModernTemplate,
        drawModernBorder,
        ModernTemplateConfig
    };
}

// Exportar para el navegador (frontend)
if (typeof window !== 'undefined') {
    window.ModernTemplate = {
        drawTemplateCanvas: drawModernTemplateCanvas,
        drawBorderCanvas: drawModernBorderCanvas,
        config: ModernTemplateConfig
    };
}
