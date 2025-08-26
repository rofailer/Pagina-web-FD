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

    // Renderizar campos según config
    for (const field in config) {
        const fieldConf = config[field];
        const value = data[field];
        if (!value || !fieldConf) continue;

        // Soporte para logo (imagen)
        if (field === 'logo' && value) {
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
        } else {
            // Texto
            page.drawText(String(value), {
                x: fieldConf.x,
                y: fieldConf.y,
                size: fieldConf.size || 18,
                color: fieldConf.color ? rgb(...fieldConf.color) : rgb(0, 0, 0),
                opacity: fieldConf.opacity || 1,
                font: undefined, // Se puede extender para fuentes custom
                ...fieldConf.extra
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
}

module.exports = { agregarMarcaDeAgua, renderPdfWithTemplate };