// ========================================
// BASE TEMPLATE - FUNCIONES COMPARTIDAS
// ========================================
// Sistema unificado para templates PDF con autores dinámicos

const fs = require('fs');
const path = require('path');
const { rgb } = require('pdf-lib');

/**
 * Función para limpiar texto y hacerlo compatible con WinAnsi
 */
function cleanTextForPdf(text) {
    if (!text) return '';
    return String(text)
        .replace(/[→]/g, '>')
        .replace(/[✦]/g, '*')
        .replace(/[–—]/g, '-')
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/[…]/g, '...')
        .replace(/[áàäâ]/gi, 'a')
        .replace(/[éèëê]/gi, 'e')
        .replace(/[íìïî]/gi, 'i')
        .replace(/[óòöô]/gi, 'o')
        .replace(/[úùüû]/gi, 'u')
        .replace(/[ñ]/gi, 'n')
        .replace(/[ç]/gi, 'c')
        .replace(/[^\x00-\x7F]/g, '');
}

/**
 * Función para dividir texto en líneas
 */
function wrapText(text, maxChars) {
    if (!text) return [''];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if ((currentLine + word).length > maxChars) {
            if (currentLine) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                lines.push(word);
            }
        } else {
            currentLine += word + ' ';
        }
    }

    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }

    return lines.length ? lines : [''];
}

/**
 * Convertir coordenadas Y de Canvas a PDF
 */
function canvasToPdfY(canvasY, pageHeight) {
    return pageHeight - canvasY;
}

/**
 * Convertir colores hex a RGB para PDF-lib
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0.12, g: 0.16, b: 0.22 };
}

/**
 * Calcular layout dinámico para autores (1-3 autores)
 */
function calculateAuthorLayout(authors, width, height, marginLeft, marginRight, startY) {
    const numAuthors = Math.min(authors.length, 3);
    const availableWidth = width - marginLeft - marginRight;

    if (numAuthors === 1) {
        // Un autor centrado
        return [{
            name: authors[0],
            x: width / 2,
            y: startY,
            align: 'center',
            fontSize: 12
        }];
    } else if (numAuthors === 2) {
        // Dos autores lado a lado
        const spacing = availableWidth / 3;
        return [
            {
                name: authors[0],
                x: marginLeft + spacing,
                y: startY,
                align: 'center',
                fontSize: 11
            },
            {
                name: authors[1],
                x: marginLeft + (spacing * 2),
                y: startY,
                align: 'center',
                fontSize: 11
            }
        ];
    } else {
        // Tres autores en fila
        const spacing = availableWidth / 4;
        return [
            {
                name: authors[0],
                x: marginLeft + spacing,
                y: startY,
                align: 'center',
                fontSize: 10
            },
            {
                name: authors[1],
                x: marginLeft + (spacing * 2),
                y: startY,
                align: 'center',
                fontSize: 10
            },
            {
                name: authors[2],
                x: marginLeft + (spacing * 3),
                y: startY,
                align: 'center',
                fontSize: 10
            }
        ];
    }
}

/**
 * Dibujar header con logo e institución
 */
function drawInstitutionHeader(page, width, height, data, config, fonts) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};
    const visualConfig = config.visualConfig || {};

    const marginTop = layoutConfig.marginTop || 60;
    const marginLeft = layoutConfig.marginLeft || 50;
    const marginRight = layoutConfig.marginRight || 50;

    const primaryColor = hexToRgb(colorConfig.primary || '#1f2937');
    const titleFont = fonts.title || fonts.helveticaBold;

    // Logo si está habilitado
    if (visualConfig.showLogo !== false && data.logo) {
        try {
            const fs = require('fs');
            if (fs.existsSync(data.logo)) {
                const imageBytes = fs.readFileSync(data.logo);
                let logoImage;
                if (data.logo.toLowerCase().endsWith('.png')) {
                    logoImage = page.doc.embedPng(imageBytes);
                } else {
                    logoImage = page.doc.embedJpg(imageBytes);
                }

                page.drawImage(logoImage, {
                    x: marginLeft,
                    y: canvasToPdfY(marginTop + 20, height),
                    width: 40,
                    height: 40
                });
            }
        } catch (err) {
            console.warn('Error cargando logo:', err.message);
        }
    }

    // Nombre de la institución
    if (visualConfig.showInstitution !== false) {
        const institutionText = cleanTextForPdf(data.institucion);
        const institutionWidth = institutionText.length * 8;

        page.drawText(institutionText, {
            x: width - marginRight - institutionWidth,
            y: canvasToPdfY(marginTop + 10, height),
            size: 14,
            font: titleFont,
            color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
        });
    }

    return marginTop + 60; // Retorna la siguiente posición Y
}

/**
 * Dibujar título del certificado
 */
function drawCertificationTitle(page, width, height, currentY, config, fonts) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};

    const primaryColor = hexToRgb(colorConfig.primary || '#1f2937');
    const titleFont = fonts.title || fonts.helveticaBold;

    const titleText = 'CERTIFICACIÓN DE AUTENTICIDAD Y CALIDAD';
    const titleWidth = titleText.length * 6;

    page.drawText(titleText, {
        x: (width - titleWidth) / 2,
        y: canvasToPdfY(currentY, height),
        size: 16,
        font: titleFont,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    return currentY + 40;
}

/**
 * Dibujar título del documento avalado
 */
function drawDocumentTitle(page, width, height, data, currentY, config, fonts) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};

    const accentColor = hexToRgb(colorConfig.accent || '#f59e0b');
    const titleFont = fonts.title || fonts.helveticaBold;

    const documentTitle = cleanTextForPdf(data.titulo);
    const titleLines = wrapText(documentTitle, 50);

    titleLines.forEach((line, index) => {
        const lineWidth = line.length * 7;
        page.drawText(line, {
            x: (width - lineWidth) / 2,
            y: canvasToPdfY(currentY + (index * 20), height),
            size: 18,
            font: titleFont,
            color: rgb(accentColor.r, accentColor.g, accentColor.b)
        });
    });

    return currentY + (titleLines.length * 20) + 20;
}

/**
 * Dibujar texto explicativo del documento
 */
function drawDocumentDescription(page, width, height, data, currentY, config, fonts) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};

    const marginLeft = layoutConfig.marginLeft || 50;
    const marginRight = layoutConfig.marginRight || 50;
    const secondaryColor = hexToRgb(colorConfig.secondary || '#64748b');
    const bodyFont = fonts.body || fonts.helvetica;

    const descriptionText = cleanTextForPdf(data.contenido);
    const descriptionLines = wrapText(descriptionText, 80);

    descriptionLines.forEach((line, index) => {
        page.drawText(line, {
            x: marginLeft,
            y: canvasToPdfY(currentY + (index * 15), height),
            size: 11,
            font: bodyFont,
            color: rgb(secondaryColor.r, secondaryColor.g, secondaryColor.b)
        });
    });

    return currentY + (descriptionLines.length * 15) + 30;
}

/**
 * Dibujar sección de autores
 */
function drawAuthorsSection(page, width, height, data, currentY, config, fonts) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};

    const marginLeft = layoutConfig.marginLeft || 50;
    const marginRight = layoutConfig.marginRight || 50;
    const primaryColor = hexToRgb(colorConfig.primary || '#1f2937');
    const bodyFont = fonts.body || fonts.helvetica;

    // Título "AUTORES"
    page.drawText('AUTORES', {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 12,
        font: fonts.helveticaBold,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    // Calcular layout de autores
    const authors = Array.isArray(data.autores) ? data.autores : [data.autores || 'Autor Desconocido'];
    const authorLayout = calculateAuthorLayout(authors, width, height, marginLeft, marginRight, currentY + 25);

    // Dibujar autores
    authorLayout.forEach((author, index) => {
        const authorName = cleanTextForPdf(author.name);
        const nameWidth = authorName.length * (author.fontSize * 0.4);

        page.drawText(authorName, {
            x: author.x - (nameWidth / 2),
            y: canvasToPdfY(author.y, height),
            size: author.fontSize,
            font: bodyFont,
            color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
        });
    });

    return currentY + 60;
}

/**
 * Dibujar información del avalador
 */
function drawAvaladorInfo(page, width, height, data, currentY, config, fonts) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};
    const layoutConfig = config.layoutConfig || {};

    const marginLeft = layoutConfig.marginLeft || 50;
    const marginRight = layoutConfig.marginRight || 50;
    const primaryColor = hexToRgb(colorConfig.primary || '#1f2937');
    const bodyFont = fonts.body || fonts.helvetica;

    const avaladorName = cleanTextForPdf(data.avaladoPor);
    const fecha = data.fecha || new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // "AVALADO POR"
    page.drawText('AVALADO POR:', {
        x: marginLeft,
        y: canvasToPdfY(currentY, height),
        size: 11,
        font: fonts.helveticaBold,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    // Nombre del avalador
    page.drawText(avaladorName, {
        x: marginLeft + 100,
        y: canvasToPdfY(currentY, height),
        size: 12,
        font: bodyFont,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    // Fecha
    const fechaText = `FECHA: ${fecha}`;
    page.drawText(fechaText, {
        x: width - marginRight - 150,
        y: canvasToPdfY(currentY, height),
        size: 10,
        font: bodyFont,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b)
    });

    return currentY + 40;
}

/**
 * Dibujar área de firma del avalador con firma electrónica integrada
 */
async function drawSignatureArea(page, width, height, data, currentY, config, fonts, pdfDoc) {
    const { rgb } = require('pdf-lib');
    const colorConfig = config.colorConfig || {};

    const accentColor = hexToRgb(colorConfig.accent || '#f59e0b');

    const signatureWidth = 200;
    const signatureHeight = 80;
    const signatureX = (width - signatureWidth) / 2;
    const signatureY = currentY;

    // Marco de la firma
    page.drawRectangle({
        x: signatureX,
        y: canvasToPdfY(signatureY + signatureHeight, height),
        width: signatureWidth,
        height: signatureHeight,
        borderWidth: 2,
        borderColor: rgb(accentColor.r, accentColor.g, accentColor.b),
        borderStyle: 'dashed'
    });

    // Dibujar firma electrónica dentro del área si está disponible
    if (data.signatureData && typeof data.signatureData === 'string' && data.signatureData.trim() !== '' &&
        data.signatureData !== 'null' && data.signatureData !== 'undefined' && data.signatureData !== 'NaN') {
        try {
            // Calcular posición centrada dentro del marco
            const firmaWidth = 160;
            const firmaHeight = 50;
            const firmaX = signatureX + (signatureWidth - firmaWidth) / 2;
            const firmaY = canvasToPdfY(signatureY + signatureHeight - firmaHeight - 10, height);

            await drawElectronicSignature(page, width, height, data, pdfDoc, firmaX, firmaY, firmaWidth, firmaHeight);
        } catch (err) {
            console.warn('Error dibujando firma electrónica en área de firma:', err.message);
        }
    }

    return signatureY + signatureHeight + 20;
}

/**
 * Dibujar logo si está disponible
 */
function drawLogo(page, logoPath, templateName, width, height, pdfDoc) {
    if (!logoPath || !pdfDoc) return;

    try {
        // Leer archivo de logo
        const fs = require('fs');
        if (!fs.existsSync(logoPath)) {
            console.warn('Logo file not found:', logoPath);
            return;
        }

        const logoBytes = fs.readFileSync(logoPath);

        // Determinar tipo de imagen y embed
        let logoImage;
        if (logoPath.toLowerCase().endsWith('.png')) {
            logoImage = pdfDoc.embedPng(logoBytes);
        } else if (logoPath.toLowerCase().endsWith('.jpg') || logoPath.toLowerCase().endsWith('.jpeg')) {
            logoImage = pdfDoc.embedJpg(logoBytes);
        } else {
            console.warn('Unsupported logo format:', logoPath);
            return;
        }

        // Dimensiones del logo
        const logoWidth = 80;
        const logoHeight = 40;

        // Posición del logo según template
        let logoX, logoY;

        switch (templateName) {
            case 'clasico':
                logoX = 50;
                logoY = canvasToPdfY(70, height);
                break;
            case 'moderno':
                logoX = width - 130;
                logoY = canvasToPdfY(70, height);
                break;
            case 'minimalista':
                logoX = width / 2 - logoWidth / 2;
                logoY = canvasToPdfY(60, height);
                break;
            case 'elegante':
                logoX = 60;
                logoY = canvasToPdfY(90, height);
                break;
            default:
                logoX = 50;
                logoY = canvasToPdfY(70, height);
        }

        // Dibujar logo
        page.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoWidth,
            height: logoHeight,
            opacity: 0.9
        });

    } catch (err) {
        console.warn('Error drawing logo:', err.message);
    }
}
async function drawElectronicSignature(page, width, height, data, pdfDoc, signatureX = null, signatureY = null, signatureWidth = 180, signatureHeight = 60) {
    if (!data || !data.signatureData || !pdfDoc) {
        console.warn('drawElectronicSignature: Missing required data or pdfDoc');
        return false;
    }

    try {
        // Verificar que signatureData sea una cadena válida y no null/undefined/NaN
        if (typeof data.signatureData !== 'string' ||
            data.signatureData.trim() === '' ||
            data.signatureData === 'null' ||
            data.signatureData === 'undefined' ||
            data.signatureData === 'NaN' ||
            !data.signatureData) {
            console.warn('drawElectronicSignature: Invalid signatureData format:', {
                type: typeof data.signatureData,
                value: data.signatureData,
                length: data.signatureData ? data.signatureData.length : 'N/A'
            });
            return false;
        }

        const signatureBase64 = data.signatureData.split(',')[1] || data.signatureData;

        if (!signatureBase64 || signatureBase64.trim() === '') {
            console.warn('drawElectronicSignature: No valid base64 data found');
            return false;
        }

        // Verificar que el base64 sea válido (reducir requisito de longitud para pruebas)
        if (signatureBase64.length < 20) {
            console.warn('drawElectronicSignature: Base64 data too short, likely invalid');
            return false;
        }

        // Verificar que solo contenga caracteres base64 válidos
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(signatureBase64.replace(/\s/g, ''))) {
            console.warn('drawElectronicSignature: Invalid base64 characters');
            return;
        }

        let signatureBytes;
        try {
            signatureBytes = Buffer.from(signatureBase64, 'base64');
        } catch (bufferError) {
            console.warn('drawElectronicSignature: Error creating buffer from base64:', bufferError.message);
            return;
        }

        // Verificar que el buffer tenga contenido válido
        if (!signatureBytes || signatureBytes.length === 0) {
            console.warn('drawElectronicSignature: Empty or invalid buffer');
            return;
        }

        let signatureImage;
        if (data.signatureData.includes('data:image/png')) {
            // Convertir Buffer a Uint8Array para PDF-lib
            const uint8Array = new Uint8Array(signatureBytes);
            try {
                signatureImage = await pdfDoc.embedPng(uint8Array);
            } catch (embedError) {
                console.error('drawElectronicSignature: embedPng failed:', embedError.message);
                return;
            }
        } else if (data.signatureData.includes('data:image/jpeg') || data.signatureData.includes('data:image/jpg')) {
            // Convertir Buffer a Uint8Array para PDF-lib
            const uint8Array = new Uint8Array(signatureBytes);
            try {
                signatureImage = await pdfDoc.embedJpg(uint8Array);
            } catch (embedError) {
                console.error('drawElectronicSignature: embedJpg failed:', embedError.message);
                return;
            }
        } else {
            // Intentar PNG por defecto
            // Convertir Buffer a Uint8Array para PDF-lib
            const uint8Array = new Uint8Array(signatureBytes);
            try {
                signatureImage = await pdfDoc.embedPng(uint8Array);
            } catch (embedError) {
                console.error('drawElectronicSignature: embedPng failed:', embedError.message);
                return;
            }
        }

        // Verificar que la imagen se haya creado correctamente
        if (!signatureImage) {
            console.warn('drawElectronicSignature: Failed to create PDF image');
            return;
        }

        // Usar posición proporcionada o calcular posición por defecto
        const finalSignatureX = signatureX !== null ? signatureX : (width - signatureWidth) / 2;
        const finalSignatureY = signatureY !== null ? signatureY : height - 150;

        page.drawImage(signatureImage, {
            x: finalSignatureX,
            y: finalSignatureY,
            width: signatureWidth,
            height: signatureHeight,
            opacity: 0.9
        });

        return true; // Indica que la firma se dibujó exitosamente

    } catch (err) {
        console.warn('Error dibujando firma electrónica:', err.message);
        // Dibujar un placeholder de texto si falla la imagen
        try {
            page.drawText('Firma Electrónica', {
                x: width / 2 - 50,
                y: height - 130,
                size: 12,
                color: rgb(0.5, 0.5, 0.5)
            });
        } catch (textErr) {
            console.warn('Error dibujando texto placeholder:', textErr.message);
        }
        return false; // Indica que no se pudo dibujar la firma
    }
}

/**
 * Dibujar logo de la institución si está disponible
 */
async function drawLogo(page, width, height, data, pdfDoc) {
    if (!data || !data.logoData || !pdfDoc) {
        console.warn('drawLogo: Missing required data or pdfDoc');
        return;
    }

    try {
        // Verificar que logoData tenga los datos necesarios
        if (!data.logoData.buffer || !Buffer.isBuffer(data.logoData.buffer)) {
            console.warn('drawLogo: No logo buffer data found or invalid buffer:', {
                hasBuffer: !!data.logoData.buffer,
                isBuffer: data.logoData.buffer ? Buffer.isBuffer(data.logoData.buffer) : false,
                bufferLength: data.logoData.buffer ? data.logoData.buffer.length : 'N/A'
            });
            return;
        }

        // Verificar que el buffer tenga contenido
        if (data.logoData.buffer.length === 0) {
            console.warn('drawLogo: Empty logo buffer');
            return;
        }

        // Verificar que el buffer no sea NaN o inválido
        if (data.logoData.buffer.length === undefined || isNaN(data.logoData.buffer.length)) {
            console.warn('drawLogo: Invalid buffer length');
            return;
        }

        // Verificar que el buffer tenga contenido mínimo
        if (data.logoData.buffer.length < 100) {
            console.warn('drawLogo: Buffer too small, likely invalid');
            return;
        }

        let logoImage;
        const mimetype = data.logoData.mimetype || 'image/png';

        if (mimetype.includes('png')) {
            // Convertir Buffer a Uint8Array para PDF-lib
            const uint8Array = new Uint8Array(data.logoData.buffer);
            try {
                logoImage = await pdfDoc.embedPng(uint8Array);
            } catch (embedError) {
                console.error('drawLogo: embedPng failed:', embedError.message);
                return;
            }
        } else if (mimetype.includes('jpeg') || mimetype.includes('jpg')) {
            // Convertir Buffer a Uint8Array para PDF-lib
            const uint8Array = new Uint8Array(data.logoData.buffer);
            try {
                logoImage = await pdfDoc.embedJpg(uint8Array);
            } catch (embedError) {
                console.error('drawLogo: embedJpg failed:', embedError.message);
                return;
            }
        } else {
            console.warn('drawLogo: Unsupported logo format:', mimetype);
            return;
        }

        // Verificar que la imagen se haya creado correctamente
        if (!logoImage) {
            console.warn('drawLogo: Failed to create PDF image from logo');
            return;
        }

        // Dimensiones y posición del logo manteniendo resolución original
        // Calcular tamaño basado en la resolución original de la imagen
        const originalWidth = logoImage.width;
        const originalHeight = logoImage.height;
        const aspectRatio = originalWidth / originalHeight;

        // Tamaño máximo permitido para el logo (para que no ocupe demasiado espacio)
        const maxLogoWidth = 150;
        const maxLogoHeight = 80;

        let logoWidth, logoHeight;

        // Calcular tamaño manteniendo proporciones
        if (originalWidth > originalHeight) {
            // Imagen más ancha que alta
            logoWidth = Math.min(originalWidth, maxLogoWidth);
            logoHeight = logoWidth / aspectRatio;
            // Si la altura calculada es demasiado grande, ajustar
            if (logoHeight > maxLogoHeight) {
                logoHeight = maxLogoHeight;
                logoWidth = logoHeight * aspectRatio;
            }
        } else {
            // Imagen más alta que ancha
            logoHeight = Math.min(originalHeight, maxLogoHeight);
            logoWidth = logoHeight * aspectRatio;
            // Si el ancho calculado es demasiado grande, ajustar
            if (logoWidth > maxLogoWidth) {
                logoWidth = maxLogoWidth;
                logoHeight = logoWidth / aspectRatio;
            }
        }

        // Si la imagen es pequeña, usar tamaño original
        if (originalWidth <= maxLogoWidth && originalHeight <= maxLogoHeight) {
            logoWidth = originalWidth;
            logoHeight = originalHeight;
        }

        const logoX = width - logoWidth - 50; // Esquina superior derecha
        const logoY = height - logoHeight - 30;

        page.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoWidth,
            height: logoHeight,
            opacity: 0.9
        });

    } catch (err) {
        console.warn('Error dibujando logo:', err.message);
    }
}

// Exportar para Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
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
        drawElectronicSignature,
        drawLogo
    };
}
