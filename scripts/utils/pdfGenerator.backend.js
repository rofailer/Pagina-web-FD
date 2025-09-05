/**
 * ========================================
 * PDF GENERATOR - BACKEND (Node.js)
 * ========================================
 * 
 * PROPÓSITO: Genera archivos PDF reales usando pdf-lib
 * UBICACIÓN: Backend - Se ejecuta en el servidor
 * USADO POR: server.js cuando el usuario firma un documento
 * DIFERENCIA CON FRONTEND: Este crea PDFs descargables, el frontend solo muestra previews
 * 
 * FUNCIONES PRINCIPALES:
 * - renderPdfWithTemplate(): Genera PDF con plantillas específicas
 * - drawClassicTemplate(), drawModernTemplate(), etc.: Dibuja cada plantilla
 * - cleanTextForPdf(): Limpia caracteres para compatibilidad WinAnsi
 * 
 * FLUJO: Usuario firma → server.js → este archivo → PDF generado
 */

const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const { TemplateManager, renderPdfWithTemplate, cleanTextForPdf } = require("../templates/template.manager");

async function agregarMarcaDeAgua(inputPath, outputPath, texto) {
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pages = pdfDoc.getPages();
    pages.forEach(page => {
        page.drawText(cleanTextForPdf(texto), {
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

// Usar el renderPdfWithTemplate del TemplateManager
// Esta función ahora solo delega al sistema modular
module.exports = { agregarMarcaDeAgua, renderPdfWithTemplate };