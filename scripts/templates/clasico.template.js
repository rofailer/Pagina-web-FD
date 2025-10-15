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

    // Colores
    const primaryColor = hexToRgb(colorConfig.primary || '#000000');
    const accentColor = hexToRgb(colorConfig.accent || '#000000');

    // Márgenes
    const marginLeft = layoutConfig.marginLeft || 60;
    const marginRight = layoutConfig.marginRight || 60;
    const marginTop = layoutConfig.marginTop || 80;
    const maxWidth = width - marginLeft - marginRight;

    let currentY = marginTop;

    // 1. UBICACIÓN Y FECHA (arriba a la izquierda)
    currentY = drawLocationAndDate(page, width, height, data, currentY, fontObjects, primaryColor, marginLeft);

    // 2. DESTINATARIOS
    currentY = drawRecipients(page, width, height, data, currentY, fontObjects, primaryColor, marginLeft);

    // 3. SALUDO
    currentY = drawGreeting(page, width, height, currentY, fontObjects, primaryColor, marginLeft);

    // 4. CUERPO DEL TEXTO
    currentY = await drawMainContent(page, width, height, data, currentY, fontObjects, primaryColor, marginLeft, maxWidth);

    // 5. DESPEDIDA
    currentY = drawClosing(page, width, height, currentY, fontObjects, primaryColor, marginLeft);

    // 6. ÁREA DE FIRMA
    await drawSignatureArea(page, width, height, data, currentY, fontObjects, primaryColor, accentColor, marginLeft, pdfDoc);

    return currentY;
}

/**
 * Dibujar ubicación y fecha
 */
function drawLocationAndDate(page, width, height, data, currentY, fonts, primaryColor, marginLeft) {
    const { rgb } = require('pdf-lib');

    // Ubicación (ciudad donde se hace)
    const ubicacion = data.ubicacion || TemplateManager.detectSystemLocation();
    const fecha = data.fecha || new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const locationText = `${ubicacion} ${fecha}`;

    page.drawText(locationText, {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fonts.body,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    return currentY + 40; // Espacio después de la fecha
}

/**
 * Dibujar destinatarios
 */
function drawRecipients(page, width, height, data, currentY, fonts, primaryColor, marginLeft) {
    const { rgb } = require('pdf-lib');

    // SEÑORES:
    page.drawText('Señores:', {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fonts.body,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    currentY += 20;

    // COMITÉ DE INVESTIGACIÓN DE FACULTAD
    page.drawText('COMITÉ DE INVESTIGACIÓN DE FACULTAD', {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fonts.helveticaBold,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    currentY += 15;

    // Nombre de la institución
    const institucion = cleanTextForPdf(data.institucion);
    page.drawText(institucion, {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fonts.helveticaBold,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    return currentY + 40; // Espacio después de los destinatarios
}

/**
 * Dibujar saludo
 */
function drawGreeting(page, width, height, currentY, fonts, primaryColor, marginLeft) {
    const { rgb } = require('pdf-lib');

    page.drawText('Respetados señores:', {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fonts.body,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    return currentY + 30; // Espacio después del saludo
}

/**
 * Dibujar contenido principal con texto justificado usando configuración dinámica
 */
async function drawMainContent(page, width, height, data, currentY, fonts, primaryColor, marginLeft, maxWidth) {
    const { rgb } = require('pdf-lib');

    // Obtener el texto del aval dinámicamente
    let mainText;

    // Si hay contenido personalizado configurado, usar ese
    if (data.contenidoAval) {
        mainText = cleanTextForPdf(data.contenidoAval);
    } else {
        // Usar el sistema de texto dinámico del TemplateManager
        try {
            const { TemplateManager } = require('./template.manager');
            const templateManager = new TemplateManager();
            mainText = await templateManager.getAvalText(data.config, data);
        } catch (error) {
            console.error('Error obteniendo texto dinámico del aval:', error.message);
            throw new Error('No se pudo obtener el texto del aval desde la configuración. Verifique la configuración del texto del aval en el panel de administración.');
        }
    }

    // Dividir el texto en líneas justificadas
    const lines = wrapTextJustified(mainText, maxWidth, fonts.body, 11);

    // Dibujar cada línea justificada
    lines.forEach((lineData, index) => {
        if (lineData.isJustified && lineData.words.length > 1) {
            // Dibujar línea justificada palabra por palabra
            let currentX = marginLeft;
            const spaceWidth = lineData.spaceWidth;

            lineData.words.forEach((word, wordIndex) => {
                page.drawText(word, {
                    x: currentX,
                    y: canvasToPdfY(currentY + (index * 18), height),
                    size: 11,
                    font: fonts.body,
                    color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
                });

                // Calcular posición de la siguiente palabra
                const wordWidth = fonts.body.widthOfTextAtSize(word, 11);
                currentX += wordWidth + spaceWidth;
            });
        } else {
            // Línea normal (última línea o línea corta)
            page.drawText(lineData.text, {
                x: marginLeft,
                y: canvasToPdfY(currentY + (index * 18), height),
                size: 11,
                font: fonts.body,
                color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
            });
        }
    });

    return currentY + (lines.length * 18) + 30; // Espacio después del contenido principal
}

/**
 * Dibujar despedida
 */
function drawClosing(page, width, height, currentY, fonts, primaryColor, marginLeft) {
    const { rgb } = require('pdf-lib');

    page.drawText('Cordial saludo.', {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fonts.body,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    return currentY + 50; // Espacio para la firma
}

/**
 * Dibujar área de firma con logo en esquina derecha
 */
async function drawSignatureArea(page, width, height, data, currentY, fonts, primaryColor, accentColor, marginLeft, pdfDoc) {
    const { rgb } = require('pdf-lib');

    const signatureAreaY = currentY + 60; // Espacio para la firma

    // Área para la firma electrónica (si existe) - VA EN LA POSICIÓN DEL ANTIGUO COMITÉ ACADÉMICO
    if (data.signatureData && typeof data.signatureData === 'string' && data.signatureData.trim() !== '' &&
        data.signatureData !== 'null' && data.signatureData !== 'undefined' && data.signatureData !== 'NaN') {

        try {
            const firmaWidth = 200;
            const firmaHeight = 60;
            const firmaX = marginLeft; // Misma posición X que el nombre del avalador
            const firmaY = canvasToPdfY(signatureAreaY + 90, height); // MÁS ARRIBA que el nombre

            // Dibujar borde alrededor de la firma
            const borderPadding = 5; // Espacio entre el borde y la firma
            page.drawRectangle({
                x: firmaX - borderPadding,
                y: firmaY - borderPadding,
                width: firmaWidth + (borderPadding * 2),
                height: firmaHeight + (borderPadding * 2),
                borderColor: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
                borderWidth: 1,
                opacity: 0.8
            });

            const { drawElectronicSignature } = require('./base.template.js');
            const firmaResult = await drawElectronicSignature(page, width, height, data, pdfDoc, firmaX, firmaY, firmaWidth, firmaHeight);
            if (firmaResult) {
                console.log('✅ Firma electrónica dibujada correctamente');
            } else {
                console.warn('⚠️ No se pudo dibujar la firma electrónica');
            }
        } catch (err) {
            console.warn('❌ Error dibujando firma electrónica:', err.message);
        }
    }

    // Nombre del firmante (quien avaló) - VA DEBAJO DE LA FIRMA
    const nombreFirmante = cleanTextForPdf(data.avaladoPor || 'NOMBRE DEL FIRMANTE');
    page.drawText(nombreFirmante, {
        x: marginLeft, // Misma posición X que la firma
        y: canvasToPdfY(signatureAreaY + 110, height), // Debajo de la firma
        size: 11,
        font: fonts.helveticaBold,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    // Correo del firmante (si existe) - VA DEBAJO DEL NOMBRE
    if (data.correoFirmante) {
        const correoText = cleanTextForPdf(data.correoFirmante);
        page.drawText(correoText, {
            x: marginLeft, // Misma posición X que la firma y el nombre
            y: canvasToPdfY(signatureAreaY + 125, height), // Debajo del nombre
            size: 10,
            font: fonts.body,
            color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
        });
    }

    // Dibujar logo en esquina derecha inferior
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
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;

        if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;

                // Si la palabra sola es muy larga, dividirla
                while (currentLine.length > maxCharsPerLine) {
                    lines.push(currentLine.substring(0, maxCharsPerLine - 1) + '-');
                    currentLine = currentLine.substring(maxCharsPerLine - 1);
                }
            } else {
                // Palabra muy larga, dividir por caracteres
                while (word.length > maxCharsPerLine) {
                    lines.push(word.substring(0, maxCharsPerLine - 1) + '-');
                    word = word.substring(maxCharsPerLine - 1);
                }
                currentLine = word;
            }
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Dibujar logo en la esquina derecha inferior
 */
async function drawLogoBottomRight(page, width, height, data) {
    if (!data.logoData && !data.logo) {
        return; // No hay logo para dibujar
    }

    try {
        let logoImage;

        if (data.logoData && data.logoData.buffer) {
            // Logo desde buffer
            const logoExtension = data.logoData.extension || 'png';
            if (logoExtension.toLowerCase() === 'png') {
                logoImage = await page.doc.embedPng(data.logoData.buffer);
            } else {
                logoImage = await page.doc.embedJpg(data.logoData.buffer);
            }
        } else if (data.logo && typeof data.logo === 'string') {
            // Logo desde archivo
            const fs = require('fs');
            if (fs.existsSync(data.logo)) {
                const imageBytes = fs.readFileSync(data.logo);
                if (data.logo.toLowerCase().endsWith('.png')) {
                    logoImage = await page.doc.embedPng(imageBytes);
                } else {
                    logoImage = await page.doc.embedJpg(imageBytes);
                }
            }
        }

        if (logoImage) {
            // Logo en esquina inferior derecha
            const logoWidth = 80;
            const logoHeight = 40;
            const logoX = width - logoWidth - 10; // Margen derecho
            const logoY = canvasToPdfY(height - 100, height); // Parte inferior

            page.drawImage(logoImage, {
                x: logoX,
                y: logoY,
                width: logoWidth,
                height: logoHeight,
                opacity: 0.8
            });

            console.log('✅ Logo dibujado en esquina derecha inferior');
        }
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
    ctx.fillStyle = colorConfig.primary || '#000000';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    const ubicacion = data.ubicacion || TemplateManager.detectSystemLocation();
    const fecha = data.fecha || new Date().toLocaleDateString('es-ES');
    ctx.fillText(`${ubicacion} ${fecha}`, marginLeft, currentY);

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

    // Saludo
    ctx.font = '11px Arial';
    ctx.fillText('Respetados señores:', marginLeft, currentY);

    currentY += 30;

    // Contenido principal (simplificado para vista previa)
    const autoresText = Array.isArray(data.autores) ? data.autores.join(', ') : (data.autores || 'el estudiante');
    const tituloDocumento = data.titulo || 'el trabajo de investigación';

    const lines = [
        'Actuando como director del trabajo de investigación y/o tutor de la modalidad',
        `de grado, presentado por el estudiante/s ${autoresText}; informo a ustedes`,
        'que cumplido el proceso de asesorías, alcanzados los objetivos y desarrollados',
        'debidamente los criterios de suficiencia académica propuestos, se completa',
        `el desarrollo de su propuesta de trabajo de grado titulado: ${tituloDocumento};`,
        'para lo cual se emite el concepto: APROBADO, por lo que se solicita la',
        'designación de jurados para su correspondiente evaluación.'
    ];

    lines.forEach((line, index) => {
        ctx.fillText(line, marginLeft, currentY + (index * 18));
    });

    currentY += lines.length * 18 + 30;

    // Despedida
    ctx.fillText('Cordial saludo.', marginLeft, currentY);

    currentY += 80;

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

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawClassicTemplate,
        drawClassicTemplateCanvas,
        drawClassicBorder,
        drawLocationAndDate,
        drawRecipients,
        drawGreeting,
        drawMainContent,
        drawClosing,
        drawSignatureArea,
        wrapTextToLines,
        wrapTextJustified,
        drawLogoBottomRight
    };
}

if (typeof window !== 'undefined') {
    window.ClassicTemplate = {
        drawTemplate: drawClassicTemplateCanvas
    };
}
