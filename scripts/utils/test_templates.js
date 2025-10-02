// Script de prueba para verificar las actualizaciones de templates PDF
const { TemplateManager } = require('./scripts/templates/template.manager');
const fs = require('fs');
const path = require('path');

async function testPdfGeneration() {
    try {

        const templateManager = new TemplateManager();

        // Datos de prueba específicos para la plantilla clásica
        const testData = {
            titulo: 'PÁGINA WEB MULTIMEDIA DE LA HISTORIA DE GRANDES JUGADORES DE CARTAGENA, COLOMBIA A FIN DE INSPIRAR A NUEVAS GENERACIONES DEL FÚTBOL',
            institucion: 'UNIVERSIDAD DE SAN BUENAVENTURA CARTAGENA',
            autores: ['Fernando Enrique Caraballo Lareus'],
            avaladoPor: 'JOSE LUIS BOLAÑO HERAZO',
            correoFirmante: 'jbolano@usbctg.edu.co',
            ubicacion: 'CARTAGENA DE INDIAS D, T Y C',
            modalidad: 'Programa de Ingeniería Multimedia',
            fecha: 'Julio 31 de 2024',
            contenido: 'Actuando como director del trabajo de investigación y/o tutor de la modalidad de grado: Programa de Ingeniería Multimedia, presentado por el estudiante Fernando Enrique Caraballo Lareus; informo al comité que cumplido el proceso de asesorías, alcanzados los objetivos y desarrollados debidamente los criterios de suficiencia académica propuestos, se completa el desarrollo de su propuesta de trabajo de grado titulado: PÁGINA WEB MULTIMEDIA DE LA HISTORIA DE GRANDES JUGADORES DE CARTAGENA, COLOMBIA A FIN DE INSPIRAR A NUEVAS GENERACIONES DEL FÚTBOL; para lo cual se emite el concepto: APROBADO, por lo que se solicita la designación de jurados para su correspondiente evaluación, con el fin de formalizar su desarrollo.',
            signatureData: 'Firma_digital_Jose_Luis_Bolano_2024',
            config: {
                colorConfig: {
                    primary: '#000000',
                    accent: '#000000',
                    background: '#ffffff'
                },
                fontConfig: {
                    title: 'Times-Bold',
                    body: 'Times-Roman',
                    signature: 'Times-Bold'
                },
                layoutConfig: {
                    marginLeft: 60,
                    marginRight: 60,
                    marginTop: 80
                },
                visualConfig: {
                    showLogo: false,
                    showDate: true,
                    showInstitution: true
                }
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