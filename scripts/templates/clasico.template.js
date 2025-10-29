// ========================================
// PLANTILLA CLÁSICA - FORMATO CARTA ACADÉMICA
// ========================================

const {
    cleanTextForPdf,
    wrapText,
    canvasToPdfY,
    hexToRgb,
    drawElectronicSignature
} = require('./base.template');

const TemplateManager = require('./template.manager');

/**
 * Dibujar template clásico completo - Formato carta académica
 */
async function drawClassicTemplate(page, width, height, data, helveticaFont, helveticaBold, timesFont, timesBold, config, pdfDoc) {
    const { rgb } = require('pdf-lib');

    // Extraer configuración global simplificada
    const templateConfig = data.config || {};
    // Usar solo color y fuente general
    const color = (templateConfig.colorConfig && templateConfig.colorConfig.text) || '#000000';
    const fontFamily = (templateConfig.fontConfig && templateConfig.fontConfig.body) || 'Times-Roman';
    // Preparar fuente
    let fontObj = helveticaFont;
    if (fontFamily === 'Times-Roman' || fontFamily === 'Times New Roman') fontObj = timesFont;
    // Márgenes fijos
    const marginLeft = 60;
    const marginRight = 60;
    const marginTop = 80;
    const maxWidth = width - marginLeft - marginRight;
    let currentY = marginTop;

    // 1. UBICACIÓN Y FECHA (arriba a la izquierda)
    currentY = drawLocationAndDateSimple(page, width, height, data, currentY, fontObj, color, marginLeft);
    // 2. DESTINATARIOS
    currentY = drawRecipientsSimple(page, width, height, data, currentY, fontObj, color, marginLeft);
    // 3. TEXTO DEL AVAL COMPLETO (incluye saludo, cuerpo y despedida si el usuario lo desea)
    currentY = await drawFullAvalText(page, width, height, data, currentY, fontObj, color, marginLeft, maxWidth);
    // 4. ÁREA DE FIRMA
    await drawSignatureAreaSimple(page, width, height, data, currentY, fontObj, color, marginLeft, pdfDoc);
    return currentY;
}

// Dibuja el texto completo del aval (incluyendo saltos de línea y cualquier saludo/despedida que el usuario haya puesto)
async function drawFullAvalText(page, width, height, data, currentY, fontObj, color, marginLeft, maxWidth) {
    const { rgb } = require('pdf-lib');
    let mainText;
    if (data.contenidoAval) {
        mainText = cleanTextForPdf(data.contenidoAval);
    } else {
        try {
            const { TemplateManager } = require('./template.manager');
            const templateManager = new TemplateManager();
            mainText = await templateManager.getAvalText(data.config, data);
        } catch (error) {
            mainText = 'Este documento ha sido procesado y avalado digitalmente.';
        }
    }
    // Normalizar saltos de línea a \n (acepta \r\n, \r o \n)
    mainText = mainText.replace(/\r\n|\r|\n/g, '\n');
    const lines = wrapTextToLines(mainText, 90);
    const rgbColor = hexToRgb(color);
    lines.forEach((line, index) => {
        page.drawText(line, {
            x: marginLeft,
            y: canvasToPdfY(currentY + (index * 18), height),
            size: 11,
            font: fontObj,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b)
        });
    });
    return currentY + (lines.length * 18) + 30;
}

// Versión simplificada: solo color y fuente general
function drawLocationAndDateSimple(page, width, height, data, currentY, fontObj, color, marginLeft) {
    const { rgb } = require('pdf-lib');
    let ubicacion = data.ubicacion || (typeof TemplateManager !== 'undefined' && TemplateManager.detectSystemLocation ? TemplateManager.detectSystemLocation() : 'UBICACIÓN, PAÍS');
    ubicacion = ubicacion.replace(/,\s*([a-záéíóúñ])/g, (m, p1) => ', ' + p1.toUpperCase());
    const fecha = data.fecha || new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const locationText = `${ubicacion} ${fecha}`;
    const rgbColor = hexToRgb(color);
    page.drawText(locationText, {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fontObj,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b)
    });
    return currentY + 40;
}

function drawRecipientsSimple(page, width, height, data, currentY, fontObj, color, marginLeft) {
    const { rgb } = require('pdf-lib');
    const rgbColor = hexToRgb(color);
    page.drawText('Señores:', {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fontObj,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b)
    });
    currentY += 20;
    page.drawText('COMITÉ DE INVESTIGACIÓN DE FACULTAD', {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fontObj,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b)
    });
    currentY += 15;
    const institucion = cleanTextForPdf(data.institucion);
    page.drawText(institucion, {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fontObj,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b)
    });
    return currentY + 40;
}


async function drawSignatureAreaSimple(page, width, height, data, currentY, fontObj, color, marginLeft, pdfDoc) {
    const { rgb } = require('pdf-lib');
    const signatureAreaY = currentY + 60;
    const rgbColor = hexToRgb(color);
    // Firma electrónica (si existe)
    if (data.signatureData && typeof data.signatureData === 'string' && data.signatureData.trim() !== '' &&
        data.signatureData !== 'null' && data.signatureData !== 'undefined' && data.signatureData !== 'NaN') {
        try {
            const firmaWidth = 200;
            const firmaHeight = 60;
            const firmaX = marginLeft;
            const firmaY = canvasToPdfY(signatureAreaY + 90, height);
            page.drawRectangle({
                x: firmaX - 5,
                y: firmaY - 5,
                width: firmaWidth + 10,
                height: firmaHeight + 10,
                borderColor: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
                borderWidth: 1,
                opacity: 0.8
            });
            const { drawElectronicSignature } = require('./base.template.js');
            await drawElectronicSignature(page, width, height, data, pdfDoc, firmaX, firmaY, firmaWidth, firmaHeight);
        } catch (err) { }
    }
    // Nombre del firmante
    const nombreFirmante = cleanTextForPdf(data.avaladoPor || 'NOMBRE DEL FIRMANTE');
    page.drawText(nombreFirmante, {
        x: marginLeft,
        y: canvasToPdfY(signatureAreaY + 110, height),
        size: 11,
        font: fontObj,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b)
    });
    // Correo del firmante
    if (data.correoFirmante) {
        const correoText = cleanTextForPdf(data.correoFirmante);
        page.drawText(correoText, {
            x: marginLeft,
            y: canvasToPdfY(signatureAreaY + 125, height),
            size: 10,
            font: fontObj,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b)
        });
    }
    // Logo
    await drawLogoBottomRight(page, width, height, data);
    return signatureAreaY + 120;
}

/**
 * Función para dividir texto en líneas justificadas
 */
function wrapTextJustified(text, maxWidth, font, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentWords = [];
    let currentWidth = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordWidth = font.widthOfTextAtSize(word, fontSize);
        const spaceWidth = font.widthOfTextAtSize(' ', fontSize);

        // Calcular ancho si agregamos esta palabra
        const testWidth = currentWidth + wordWidth + (currentWords.length > 0 ? spaceWidth : 0);

        if (testWidth <= maxWidth || currentWords.length === 0) {
            // Agregar palabra a la línea actual
            currentWords.push(word);
            currentWidth = testWidth;
        } else {
            // Crear línea justificada
            if (currentWords.length > 1) {
                const totalWordWidth = currentWords.reduce((sum, w) => sum + font.widthOfTextAtSize(w, fontSize), 0);
                const totalSpaceNeeded = maxWidth - totalWordWidth;
                const spaceBetweenWords = totalSpaceNeeded / (currentWords.length - 1);

                lines.push({
                    words: currentWords,
                    spaceWidth: spaceBetweenWords,
                    isJustified: true,
                    text: currentWords.join(' ')
                });
            } else {
                // Línea con una sola palabra
                lines.push({
                    words: currentWords,
                    spaceWidth: spaceWidth,
                    isJustified: false,
                    text: currentWords.join(' ')
                });
            }

            // Empezar nueva línea
            currentWords = [word];
            currentWidth = wordWidth;
        }
    }

    // Agregar última línea (no justificada)
    if (currentWords.length > 0) {
        const spaceWidth = font.widthOfTextAtSize(' ', fontSize);
        lines.push({
            words: currentWords,
            spaceWidth: spaceWidth,
            isJustified: false,
            text: currentWords.join(' ')
        });
    }

    return lines;
}

/**
 * Función auxiliar para dividir texto en líneas respetando límites (versión simple)
 */
function wrapTextToLines(text, maxCharsPerLine) {
    // Dividir el texto por saltos de línea explícitos (\n) y agregar línea vacía entre párrafos
    // Cada salto de línea simple es una línea nueva, dobles saltos de línea dejan línea vacía
    const paragraphs = text.split(/\r?\n/);
    const lines = [];
    for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        if (paragraph === '' && i > 0) {
            // Línea vacía (párrafo vacío)
            lines.push('');
            continue;
        }
        const words = paragraph.split(' ');
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                    while (currentLine.length > maxCharsPerLine) {
                        lines.push(currentLine.substring(0, maxCharsPerLine - 1) + '-');
                        currentLine = currentLine.substring(maxCharsPerLine - 1);
                    }
                } else {
                    let longWord = word;
                    while (longWord.length > maxCharsPerLine) {
                        lines.push(longWord.substring(0, maxCharsPerLine - 1) + '-');
                        longWord = longWord.substring(maxCharsPerLine - 1);
                    }
                    currentLine = longWord;
                }
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
    }
    return lines;
}

/**
 * Dibujar logo en la esquina derecha inferior
 */
async function drawLogoBottomRight(page, width, height, data) {
    // Si hay logoPath (ej: '/api/logo'), descargar y embeber
    const fetch = require('node-fetch');
    let logoBuffer = null;
    let logoType = 'png';
    if (data.logoPath && typeof data.logoPath === 'string') {
        try {
            const res = await fetch(data.logoPath.startsWith('http') ? data.logoPath : `http://localhost:3000${data.logoPath}`);
            if (res.ok) {
                logoBuffer = Buffer.from(await res.arrayBuffer());
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('png')) logoType = 'png';
                else if (contentType.includes('jpeg') || contentType.includes('jpg')) logoType = 'jpg';
            }
        } catch (e) {
            console.warn('No se pudo descargar logo para PDF:', e.message);
        }
    }
    // Compatibilidad: si no hay logoPath, intentar con logoData.buffer (legacy)
    if (!logoBuffer && data.logoData && data.logoData.buffer) {
        logoBuffer = data.logoData.buffer;
        logoType = data.logoData.extension || 'png';
    }
    if (!logoBuffer) return;
    try {
        let logoImage;
        if (logoType === 'png') logoImage = await page.doc.embedPng(logoBuffer);
        else logoImage = await page.doc.embedJpg(logoBuffer);
        // Logo en esquina inferior derecha
        const logoWidth = 80;
        const logoHeight = 40;
        const logoX = width - logoWidth - 10;
        const logoY = canvasToPdfY(height - 100, height);
        page.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoWidth,
            height: logoHeight,
            opacity: 0.8
        });
        console.log('✅ Logo dibujado en esquina derecha inferior');
    } catch (err) {
        console.warn('❌ Error cargando logo:', err.message);
    }
}

/**
 * Dibujar borde clásico simple (para compatibilidad con template manager)
 */
function drawClassicBorder(page, width, height, borderConfig) {
    const { rgb } = require('pdf-lib');

    if (!borderConfig || borderConfig.showBorder === false) {
        return; // No dibujar borde si está deshabilitado
    }

    const borderColor = hexToRgb(borderConfig?.color || '#000000');
    const borderWidth = borderConfig?.width || 1;

    // Borde simple y elegante
    page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderWidth: borderWidth,
        borderColor: rgb(borderColor.r, borderColor.g, borderColor.b)
    });
}

/**
 * Función para canvas (frontend) - versión simplificada
 */
function drawClassicTemplateCanvas(ctx, config, width, height, data) {
    if (!ctx || !config) return;

    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};

    // Fondo
    ctx.fillStyle = colorConfig.background || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const marginLeft = layoutConfig.marginLeft || 60;
    let currentY = 80;

    // Ubicación y fecha
    ctx.fillStyle = '#000000';
    ctx.font = '11px Times New Roman';
    ctx.textAlign = 'left';
    let ubicacion2 = data.ubicacion || TemplateManager.detectSystemLocation();
    ubicacion2 = ubicacion2.replace(/,\s*([a-záéíóúñ])/g, (m, p1) => ', ' + p1.toUpperCase());
    const fecha = data.fecha || new Date().toLocaleDateString('es-ES');
    ctx.fillText(`${ubicacion2} ${fecha}`, marginLeft, currentY);

    currentY += 40;

    // Destinatarios
    ctx.fillText('Señores:', marginLeft, currentY);
    currentY += 20;
    ctx.font = 'bold 11px Arial';
    ctx.fillText('COMITÉ DE INVESTIGACIÓN DE FACULTAD', marginLeft, currentY);
    currentY += 15;
    const institucion = data.institucion;
    ctx.fillText(institucion, marginLeft, currentY);

    currentY += 40;

    // TEXTO DEL AVAL COMPLETO (editable por el usuario, con saltos de línea)
    ctx.font = '11px Arial';
    const avalText = (config.avalTextConfig && typeof config.avalTextConfig.template === 'string') ? config.avalTextConfig.template : '';
    const avalLines = avalText.split('\n');
    avalLines.forEach((line, index) => {
        ctx.fillText(line, marginLeft, currentY + (index * 18));
    });
    currentY += avalLines.length * 18 + 30;
    currentY += 50;

    // Área de firma - Nombre y correo del firmante (quien avaló)
    ctx.font = 'bold 11px Arial';
    const nombreFirmante = data.avaladoPor || 'NOMBRE DEL FIRMANTE';
    ctx.fillText(nombreFirmante, marginLeft, currentY);

    if (data.correoFirmante) {
        currentY += 15;
        ctx.font = '10px Arial';
        ctx.fillText(data.correoFirmante, marginLeft, currentY);
    }
}

// Exportar solo las funciones simplificadas y necesarias
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawClassicTemplate,
        drawClassicTemplateCanvas,
        drawClassicBorder,
        drawLocationAndDateSimple,
        drawRecipientsSimple,
        drawSignatureAreaSimple,
        wrapTextToLines,
        drawLogoBottomRight
    };
}

if (typeof window !== 'undefined') {
    window.ClassicTemplate = {
        drawTemplate: drawClassicTemplateCanvas
    };
}
