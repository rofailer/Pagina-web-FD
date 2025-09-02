const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");

async function agregarMarcaDeAgua(inputPath, outputPath, texto) {
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pages = pdfDoc.getPages();
    pages.forEach(page => {
        page.drawText(texto, {
            x: 50,
            y: 50,
            size: 24,
            color: rgb(0.8, 0.8, 0.8),
            opacity: 0.5,
            rotate: { degrees: 45 }
        });
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
}


/**
 * Renderiza un PDF con campos configurables (título, autores, etc.) según plantilla.
 * @param {string} inputPath - Ruta del PDF base (puede ser una hoja en blanco).
 * @param {string} outputPath - Ruta de salida.
 * @param {object} data - Datos a renderizar (titulo, autores, institucion, avalador, logo, etc.).
 * @param {object} config - Configuración de posiciones y estilos por campo.
 */
async function renderPdfWithTemplate(inputPath, outputPath, data, config) {
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    // Dibujar borde si está configurado
    if (config.border) {
        const border = config.border;
        const borderColor = rgb(border.color[0], border.color[1], border.color[2]);
        const borderWidth = border.width || 2;

        switch (border.style) {
            case 'classic':
                // Borde simple rectangular
                page.drawRectangle({
                    x: 30,
                    y: 30,
                    width: width - 60,
                    height: height - 60,
                    borderColor: borderColor,
                    borderWidth: borderWidth,
                    color: undefined
                });
                break;

            case 'modern':
                // Borde con esquinas redondeadas y línea de acento
                page.drawRectangle({
                    x: 20,
                    y: 20,
                    width: width - 40,
                    height: height - 40,
                    borderColor: borderColor,
                    borderWidth: borderWidth,
                    color: undefined
                });
                // Línea de acento superior
                page.drawLine({
                    start: { x: 20, y: height - 50 },
                    end: { x: width - 20, y: height - 50 },
                    thickness: borderWidth * 2,
                    color: borderColor
                });
                break;

            case 'minimal':
                // Solo líneas en las esquinas
                const cornerLength = 30;
                // Esquina superior izquierda
                page.drawLine({
                    start: { x: 30, y: height - 30 },
                    end: { x: 30 + cornerLength, y: height - 30 },
                    thickness: borderWidth,
                    color: borderColor
                });
                page.drawLine({
                    start: { x: 30, y: height - 30 },
                    end: { x: 30, y: height - 30 - cornerLength },
                    thickness: borderWidth,
                    color: borderColor
                });
                // Esquina superior derecha
                page.drawLine({
                    start: { x: width - 30, y: height - 30 },
                    end: { x: width - 30 - cornerLength, y: height - 30 },
                    thickness: borderWidth,
                    color: borderColor
                });
                page.drawLine({
                    start: { x: width - 30, y: height - 30 },
                    end: { x: width - 30, y: height - 30 - cornerLength },
                    thickness: borderWidth,
                    color: borderColor
                });
                // Esquinas inferiores
                page.drawLine({
                    start: { x: 30, y: 30 },
                    end: { x: 30 + cornerLength, y: 30 },
                    thickness: borderWidth,
                    color: borderColor
                });
                page.drawLine({
                    start: { x: 30, y: 30 },
                    end: { x: 30, y: 30 + cornerLength },
                    thickness: borderWidth,
                    color: borderColor
                });
                page.drawLine({
                    start: { x: width - 30, y: 30 },
                    end: { x: width - 30 - cornerLength, y: 30 },
                    thickness: borderWidth,
                    color: borderColor
                });
                page.drawLine({
                    start: { x: width - 30, y: 30 },
                    end: { x: width - 30, y: 30 + cornerLength },
                    thickness: borderWidth,
                    color: borderColor
                });
                break;

            case 'elegant':
                // Borde doble con decoración
                page.drawRectangle({
                    x: 25,
                    y: 25,
                    width: width - 50,
                    height: height - 50,
                    borderColor: borderColor,
                    borderWidth: borderWidth,
                    color: undefined
                });
                page.drawRectangle({
                    x: 35,
                    y: 35,
                    width: width - 70,
                    height: height - 70,
                    borderColor: borderColor,
                    borderWidth: 1,
                    color: undefined
                });
                break;
        }
    }

    // Renderizar campos según config
    for (const field in config) {
        if (field === 'border') continue; // Ya procesado

        const fieldConf = config[field];
        const value = data[field];
        if (!value || !fieldConf) continue;

        // Soporte para logo (imagen)
        if (field === 'logo' && value) {
            try {
                const imageBytes = fs.readFileSync(value);
                let image;
                if (value.endsWith('.png')) {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                }
                page.drawImage(image, {
                    x: fieldConf.x,
                    y: fieldConf.y,
                    width: fieldConf.width || 80,
                    height: fieldConf.height || 80,
                });
            } catch (err) {
                // Si no se puede cargar el logo, continuar sin él
            }
        } else {
            // Texto
            const textColor = fieldConf.color ? rgb(fieldConf.color[0], fieldConf.color[1], fieldConf.color[2]) : rgb(0, 0, 0);
            page.drawText(String(value), {
                x: fieldConf.x,
                y: fieldConf.y,
                size: fieldConf.size || 18,
                color: textColor,
                opacity: fieldConf.opacity || 1,
                font: undefined,
                ...fieldConf.extra
            });
        }
    }

    // Agregar contenido principal del documento
    if (data.contenido) {
        const contentY = 400;
        const lineHeight = 20;
        const maxWidth = width - 120;
        const words = data.contenido.split(' ');
        let lines = [];
        let currentLine = '';

        // Dividir el texto en líneas
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (testLine.length > 80) { // Aproximadamente 80 caracteres por línea
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    lines.push(word);
                }
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }

        // Dibujar las líneas
        lines.forEach((line, index) => {
            page.drawText(line, {
                x: 60,
                y: contentY - (index * lineHeight),
                size: 12,
                color: rgb(0.2, 0.2, 0.2)
            });
        });
    }

    // Agregar firma electrónica si está disponible
    if (data.signatureData) {
        try {
            // Decodificar la imagen base64 de la firma
            const signatureBase64 = data.signatureData.split(',')[1] || data.signatureData;
            const signatureBytes = Buffer.from(signatureBase64, 'base64');

            let signatureImage;
            if (data.signatureData.includes('data:image/png')) {
                signatureImage = await pdfDoc.embedPng(signatureBytes);
            } else {
                // Asumir JPG si no es PNG
                signatureImage = await pdfDoc.embedJpg(signatureBytes);
            }

            // Posicionar la firma en un área dedicada
            const signatureWidth = 200;
            const signatureHeight = 100;
            const signatureX = width - signatureWidth - 60;
            const signatureY = 180; // Posición fija para todas las plantillas

            // Dibujar marco de la firma
            const borderColor = config.border ? rgb(config.border.color[0], config.border.color[1], config.border.color[2]) : rgb(0.2, 0.2, 0.2);
            page.drawRectangle({
                x: signatureX - 10,
                y: signatureY - 10,
                width: signatureWidth + 20,
                height: signatureHeight + 20,
                borderColor: borderColor,
                borderWidth: 1,
                color: undefined
            });

            // Dibujar la firma
            page.drawImage(signatureImage, {
                x: signatureX,
                y: signatureY,
                width: signatureWidth,
                height: signatureHeight,
                opacity: 0.9
            });

            // Agregar texto "Firma electrónica" debajo
            page.drawText('Firma Electrónica Certificada', {
                x: signatureX + 20,
                y: signatureY - 25,
                size: 10,
                color: borderColor
            });

            page.drawText(`Método: ${data.signatureMethod || 'Canvas'}`, {
                x: signatureX + 20,
                y: signatureY - 40,
                size: 8,
                color: rgb(0.5, 0.5, 0.5)
            });

        } catch (err) {
            // Agregar texto indicativo si no se puede mostrar la firma
            page.drawText('Documento firmado electrónicamente', {
                x: width - 250,
                y: 200,
                size: 10,
                color: rgb(0.5, 0.5, 0.5)
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
}

module.exports = { agregarMarcaDeAgua, renderPdfWithTemplate };