// Script de prueba para verificar las actualizaciones de templates PDF
const { TemplateManager } = require('./scripts/templates/template.manager');
const fs = require('fs');
const path = require('path');

async function testPdfGeneration() {
    try {

        const templateManager = new TemplateManager();

        // Datos de prueba
        const testData = {
            titulo: 'DOCUMENTO DE PRUEBA - FIRMAS DIGITALES',
            institucion: 'Universidad de Prueba',
            autores: ['Juan Pérez', 'María García'],
            avalador: 'Dr. Carlos Rodríguez',
            fecha: new Date().toLocaleDateString('es-ES'),
            contenido: 'Este es un documento de prueba para verificar que las firmas electrónicas se integren correctamente dentro de las áreas de firma decorativas y que los logos mantengan su resolución original.',
            signatureData: 'Prueba de firma electrónica',
            logoData: {
                buffer: fs.readFileSync(path.join(__dirname, 'recursos', 'logotipo-de-github.png'))
            }
        };

        // Probar cada template
        const templates = ['clasico', 'moderno', 'minimalista', 'elegante'];

        for (const templateName of templates) {

            const inputPath = path.join(__dirname, 'uploads', 'template.pdf'); // Usar un PDF base
            const outputPath = path.join(__dirname, 'test_output', `${templateName}_test.pdf`);

            // Crear directorio de salida si no existe
            if (!fs.existsSync(path.dirname(outputPath))) {
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            }

            // Crear un PDF base simple si no existe
            if (!fs.existsSync(inputPath)) {
                const { PDFDocument } = require('pdf-lib');
                const pdfDoc = await PDFDocument.create();
                pdfDoc.addPage();
                const pdfBytes = await pdfDoc.save();
                fs.writeFileSync(inputPath, pdfBytes);
            }

            // Configuración para el template específico
            const config = {
                selectedTemplate: templateName,
                visualConfig: {
                    showLogo: true,
                    showSignature: true
                }
            };

            // Generar PDF
            await templateManager.renderPdfWithTemplate(inputPath, outputPath, testData, config);

        }

    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Ejecutar la prueba
testPdfGeneration();