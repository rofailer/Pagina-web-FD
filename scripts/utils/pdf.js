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

module.exports = { agregarMarcaDeAgua };