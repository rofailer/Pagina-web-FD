// ========================================
// PLANTILLA BASE - FUNCIONES COMPARTIDAS
// ========================================

/**
 * Función para limpiar texto y hacerlo compatible con WinAnsi (para backend)
 */
function cleanTextForPdf(text) {
    if (!text) return '';
    return String(text)
        .replace(/[→]/g, '>')
        .replace(/[✦]/g, '*')
        .replace(/[»]/g, '-')
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
        // Remover cualquier otro carácter no ASCII
        .replace(/[^\x00-\x7F]/g, '');
}

/**
 * Función para dividir texto en líneas (para backend)
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
 * Función para dibujar logo en backend
 */
async function drawLogo(page, logoPath, templateName, width, height, pdfDoc) {
    if (!logoPath || !require('fs').existsSync(logoPath)) return;

    const fs = require('fs');
    const imageBytes = fs.readFileSync(logoPath);
    let image;

    try {
        if (logoPath.toLowerCase().endsWith('.png')) {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
            image = await pdfDoc.embedJpg(imageBytes);
        }

        // Posicionar logo según la plantilla
        let logoX, logoY, logoSize;
        switch (templateName) {
            case 'clasico':
                logoX = width - 130;
                logoY = height - 130;
                logoSize = 60;
                break;
            case 'moderno':
                logoX = width - 120;
                logoY = height - 110;
                logoSize = 50;
                break;
            case 'minimalista':
                logoX = width / 2 - 25;
                logoY = height - 50;
                logoSize = 50;
                break;
            case 'elegante':
                logoX = width - 120;
                logoY = height - 110;
                logoSize = 55;
                break;
            default:
                logoX = width - 130;
                logoY = height - 130;
                logoSize = 60;
        }

        page.drawImage(image, {
            x: logoX,
            y: logoY,
            width: logoSize,
            height: logoSize
        });
    } catch (err) {
        console.warn('WARNING: Error al cargar logo:', err.message);
    }
}

/**
 * Función para dibujar firma electrónica en backend
 */
async function drawElectronicSignature(page, data, width, height, pdfDoc) {
    if (!data.signatureData) return;

    try {
        const signatureBase64 = data.signatureData.split(',')[1] || data.signatureData;
        const signatureBytes = Buffer.from(signatureBase64, 'base64');

        let signatureImage;
        if (data.signatureData.includes('data:image/png')) {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
        } else {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
        }

        // Área de firma
        const signatureWidth = 180;
        const signatureHeight = 90;
        const signatureX = width - signatureWidth - 80;
        const signatureY = 160;

        // Marco de la firma
        page.drawRectangle({
            x: signatureX - 5,
            y: signatureY - 5,
            width: signatureWidth + 10,
            height: signatureHeight + 10,
            borderColor: require('pdf-lib').rgb(0.7, 0.7, 0.7),
            borderWidth: 1
        });

        // Dibujar la firma
        page.drawImage(signatureImage, {
            x: signatureX,
            y: signatureY,
            width: signatureWidth,
            height: signatureHeight,
            opacity: 0.9
        });

        // Texto de certificación
        page.drawText('Firma Digital Certificada', {
            x: signatureX + 20,
            y: signatureY - 15,
            size: 8,
            color: require('pdf-lib').rgb(0.4, 0.4, 0.4)
        });

    } catch (err) {
        // Fallback: texto indicativo
        page.drawText('Documento Firmado Digitalmente', {
            x: width - 200,
            y: 180,
            size: 9,
            color: require('pdf-lib').rgb(0.5, 0.5, 0.5)
        });
    }
}

// ========================================
// FUNCIONES PARA FRONTEND (CANVAS)
// ========================================

/**
 * Función para dibujar logo en canvas (frontend)
 */
function drawLogoOnCanvas(ctx, canvasWidth, canvasHeight, logo, templateName) {
    if (!logo) return;

    const logoConfigs = {
        clasico: { x: 15, y: 5 },
        moderno: { x: 85, y: 5 },
        minimalista: { x: 15, y: 5 },
        elegante: { x: 85, y: 5 }
    };

    const config = logoConfigs[templateName] || logoConfigs.clasico;
    const logoWidth = 35;
    const logoHeight = 30;

    const x = (config.x / 100) * canvasWidth - (logoWidth / 2);
    const y = (config.y / 100) * canvasHeight;

    // Dibujar el logo con sombra sutil
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.drawImage(logo, x, y, logoWidth, logoHeight);

    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

/**
 * Función estándar para dibujar firma en canvas (frontend)
 */
function drawStandardSignature(ctx, config, x, y, align = 'right') {
    if (!ctx || !config) {
        console.error('❌ Contexto o configuración inválidos');
        return;
    }

    // ✅ SINCRONIZADO CON PDF - Dibujar rectángulo como en drawElectronicSignature
    const signatureWidth = 180;
    const signatureHeight = 90;

    // Ajustar posición según alineación
    let signatureX = x;
    if (align === 'right') {
        signatureX = x - signatureWidth;
    } else if (align === 'center') {
        signatureX = x - (signatureWidth / 2);
    }

    // Marco de la firma - EXACTAMENTE como en PDF
    ctx.strokeStyle = config.colors.accent || '#b3b3b3';
    ctx.lineWidth = 1;
    ctx.strokeRect(signatureX - 5, y - signatureHeight - 5, signatureWidth + 10, signatureHeight + 10);

    // Área de firma
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(signatureX, y - signatureHeight, signatureWidth, signatureHeight);

    // Texto de firma - centrado en el rectángulo
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px serif';
    ctx.fillStyle = config.colors.primary || '#000000';
    ctx.fillText('Firma Digital', signatureX + (signatureWidth / 2), y - (signatureHeight / 2) - 10);

    ctx.font = '10px serif';
    ctx.fillStyle = config.colors.text || '#666666';
    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    ctx.fillText(`Fecha: ${fecha}`, signatureX + (signatureWidth / 2), y - (signatureHeight / 2) + 10);
}

// Exportar para Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cleanTextForPdf,
        wrapText,
        drawLogo,
        drawElectronicSignature
    };
}

// Exportar para el navegador (frontend)
if (typeof window !== 'undefined') {
    window.BaseTemplate = {
        drawLogoOnCanvas,
        drawStandardSignature
    };
}
