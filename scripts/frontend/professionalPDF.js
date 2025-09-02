// ========================================
// SISTEMA PDF PROFESIONAL - VERSIÓN SIMPLIFICADA
// ========================================

class ProfessionalPDFSystem {
    constructor() {
        this.selectedTemplate = 'clasico'; // Corregido a español
        this.globalLogo = null;
        this.customInstitution = 'Universidad Nacional'; // Institución por defecto

        // Crear logo de prueba para preview
        this.createTestLogo();

        // Mapeo entre nombres del frontend y del servidor (corregido)
        this.templateMapping = {
            'clasico': 'template1',
            'moderno': 'template2',
            'minimalista': 'template3',
            'elegante': 'template4'
        };

        // Configuraciones de plantillas simplificadas con posiciones de logo predeterminadas
        this.templateConfig = {
            clasico: {
                colors: { primary: '#1f2937', accent: '#374151', text: '#4b5563' },
                layout: { borderStyle: 'solid' },
                logoPosition: { x: 15, y: 5 } // Esquina superior izquierda, más arriba
            },
            moderno: {
                colors: { primary: '#2563eb', accent: '#3b82f6', text: '#64748b' },
                layout: { borderStyle: 'accent' },
                logoPosition: { x: 85, y: 5 } // Esquina superior derecha, más arriba
            },
            minimalista: {
                colors: { primary: '#6b7280', accent: '#9ca3af', text: '#374151' },
                layout: { borderStyle: 'minimal' },
                logoPosition: { x: 15, y: 5 } // Esquina superior izquierda, más arriba
            },
            elegante: {
                colors: { primary: '#7c2d12', accent: '#d97706', text: '#92400e' },
                layout: { borderStyle: 'ornate' },
                logoPosition: { x: 85, y: 5 } // Esquina superior derecha, más arriba
            }
        };

        // No auto-inicializar aquí, esperar DOMContentLoaded
        console.log('🏗️ Constructor ProfessionalPDFSystem completado');
    }

    createTestLogo() {
        // Crear un logo de prueba para el preview
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');

        // Fondo circular azul
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(30, 30, 25, 0, 2 * Math.PI);
        ctx.fill();

        // Texto "LOGO" en blanco
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LOGO', 30, 35);

        // Convertir a imagen
        const img = new Image();
        img.onload = () => {
            this.globalLogo = img;
            console.log('🖼️ Logo de prueba creado');
        };
        img.src = canvas.toDataURL();
    }

    async init() {
        await this.loadGlobalConfig();
        this.bindEvents();
        this.updateUI();
        this.updatePreview();
    }

    async loadGlobalConfig() {
        try {
            console.log('🔄 Cargando configuración global de plantillas...');
            const response = await fetch('/api/template-config');
            console.log('📡 Respuesta del servidor:', response.status, response.statusText);

            if (response.ok) {
                const config = await response.json();
                console.log('📋 Configuración recibida:', config);

                // Mapear template del servidor al frontend (corregido)
                const frontendTemplate = Object.keys(this.templateMapping).find(
                    key => this.templateMapping[key] === config.selectedTemplate
                ) || 'clasico';

                this.selectedTemplate = frontendTemplate;

                // Cargar logo global si existe
                if (config.logo) {
                    const img = new Image();
                    img.onload = () => {
                        this.globalLogo = img;
                        this.updatePreview();
                    };
                    img.src = config.logo;
                }
            } else {
                console.error('❌ Error al cargar configuración:', response.status, response.statusText);
            }
        } catch (error) {
            console.warn('⚠️ No se pudo cargar configuración global:', error);
        }
    }

    bindEvents() {
        console.log('🔗 Vinculando eventos del sistema PDF...');

        // Selección de plantillas con debugging
        const templateCards = document.querySelectorAll('.template-card');
        console.log(`📋 Encontradas ${templateCards.length} tarjetas de plantilla`);

        templateCards.forEach(card => {
            console.log(`🎨 Vinculando evento para plantilla: ${card.dataset.template}`);
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const templateType = card.dataset.template;
                console.log(`🖱️ Click en plantilla: ${templateType}`);
                this.selectTemplate(templateType);
            });
        });

        // Upload de logo global (solo para admins)
        const logoInput = document.getElementById('logoInput');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
            console.log('📁 Event listener de logo configurado');
        } else {
            console.warn('⚠️ Input de logo no encontrado');
        }

        // Input de institución personalizada
        const institutionInput = document.getElementById('institutionInput');
        if (institutionInput) {
            institutionInput.addEventListener('input', (e) => {
                this.customInstitution = e.target.value || 'Universidad Nacional';
                console.log('🏛️ Institución actualizada:', this.customInstitution);
                this.updatePreview(); // Actualizar preview en tiempo real
            });
            console.log('🏛️ Event listener de institución configurado');
        } else {
            console.warn('⚠️ Input de institución no encontrado');
        }

        // Botones de control
        const updateBtn = document.getElementById('updateTemplateBtn');
        const resetBtn = document.getElementById('resetTemplateBtn');

        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.applyTemplate());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetTemplate());
        }
    }

    selectTemplate(templateType) {
        console.log(`🎨 Cambiando a plantilla: ${templateType}`);
        this.selectedTemplate = templateType;

        // Actualización inmediata de UI y preview
        this.updateUI();
        this.updatePreview();

        // Forzar re-render del canvas
        requestAnimationFrame(() => {
            this.updatePreview();
        });

        this.showNotification(`Plantilla "${templateType}" seleccionada`, 'success');
    }

    updateUI() {
        // Actualizar tarjetas de plantilla
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });

        const selectedCard = document.querySelector(`[data-template="${this.selectedTemplate}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            this.showNotification('Por favor selecciona un archivo de imagen válido', 'error');
            return;
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('El archivo es demasiado grande. Máximo 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.globalLogo = img;
                this.updatePreview();
                this.showNotification('Logo cargado correctamente', 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updatePreview() {
        const canvas = document.getElementById('pdfPreviewCanvas');
        console.log('🖼️ Canvas encontrado:', !!canvas);
        if (!canvas) {
            console.error('❌ Canvas pdfPreviewCanvas no encontrado!');
            return;
        }

        const ctx = canvas.getContext('2d');
        const config = this.templateConfig[this.selectedTemplate];

        console.log('⚙️ Configuración de plantilla:', this.selectedTemplate, config);
        if (!config) {
            console.error('❌ Configuración no encontrada para:', this.selectedTemplate);
            return;
        }

        // Actualización inmediata para tiempo real
        console.log('🎨 Dibujando preview para:', this.selectedTemplate);
        this.drawPreview(ctx, config, canvas.width, canvas.height);
    }

    drawPreview(ctx, config, width, height) {
        // Limpiar canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Dibujar borde según la plantilla
        this.drawTemplateBorder(ctx, config, width, height);

        // Datos de ejemplo para la preview (usando institución personalizada)
        const previewData = {
            titulo: 'Documento de Ejemplo',
            institucion: this.customInstitution, // Usar institución personalizada
            autores: ['Dr. Juan Pérez', 'Dra. María García', 'Ing. Carlos López'],
            avaladoPor: 'Comité Académico',
            fecha: new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };

        // Dibujar plantilla específica (corregido para nombres en español)
        switch (this.selectedTemplate) {
            case 'clasico':
                this.drawClassicTemplate(ctx, config, width, height, previewData);
                break;
            case 'moderno':
                this.drawModernTemplate(ctx, config, width, height, previewData);
                break;
            case 'minimalista':
                this.drawMinimalTemplate(ctx, config, width, height, previewData);
                break;
            case 'elegante':
                this.drawElegantTemplate(ctx, config, width, height, previewData);
                break;
            default:
                console.warn(`⚠️ Plantilla desconocida: ${this.selectedTemplate}`);
                this.drawClassicTemplate(ctx, config, width, height, previewData);
                break;
        }

        // Dibujar logo global si existe (ANTES que el texto para que no tape)
        if (this.globalLogo) {
            this.drawLogoOnCanvas(ctx, width, height);
        }
    }

    drawLogoOnCanvas(ctx, canvasWidth, canvasHeight) {
        if (!this.globalLogo) return;

        const config = this.templateConfig[this.selectedTemplate];
        if (!config || !config.logoPosition) return;

        // Logo aún más pequeño para evitar choques
        const logoWidth = 35;  // Reducido de 50 a 35
        const logoHeight = 30; // Reducido de 40 a 30

        // Calcular posición en píxeles basada en porcentajes
        const x = (config.logoPosition.x / 100) * canvasWidth - (logoWidth / 2);
        const y = (config.logoPosition.y / 100) * canvasHeight;

        console.log(`🖼️ Logo posicionado en: x=${x}, y=${y} para plantilla ${this.selectedTemplate}`);

        // Dibujar el logo con sombra sutil
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.drawImage(this.globalLogo, x, y, logoWidth, logoHeight);

        // Resetear sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    drawTemplateBorder(ctx, config, width, height) {
        ctx.strokeStyle = config.colors.primary;
        ctx.lineWidth = 3;

        switch (config.layout.borderStyle) {
            case 'solid':
                ctx.strokeRect(20, 20, width - 40, height - 40);
                break;
            case 'accent':
                ctx.strokeRect(15, 15, width - 30, height - 30);
                ctx.fillStyle = config.colors.accent;
                ctx.fillRect(15, height - 50, width - 30, 4);
                break;
            case 'minimal':
                const cornerLength = 40;
                ctx.lineWidth = 2;
                // Esquinas minimalistas
                ctx.beginPath();
                ctx.moveTo(30, 30 + cornerLength);
                ctx.lineTo(30, 30);
                ctx.lineTo(30 + cornerLength, 30);
                ctx.moveTo(width - 30 - cornerLength, 30);
                ctx.lineTo(width - 30, 30);
                ctx.lineTo(width - 30, 30 + cornerLength);
                ctx.moveTo(30, height - 30 - cornerLength);
                ctx.lineTo(30, height - 30);
                ctx.lineTo(30 + cornerLength, height - 30);
                ctx.moveTo(width - 30 - cornerLength, height - 30);
                ctx.lineTo(width - 30, height - 30);
                ctx.lineTo(width - 30, height - 30 - cornerLength);
                ctx.stroke();
                break;
            case 'ornate':
                ctx.strokeRect(20, 20, width - 40, height - 40);
                ctx.strokeStyle = config.colors.accent;
                ctx.lineWidth = 1;
                ctx.strokeRect(30, 30, width - 60, height - 60);
                break;
        }
    }

    // Función estándar para dibujar firma en todas las plantillas
    drawStandardSignature(ctx, config, x, y, align = 'right') {
        // Asegurar que tenemos el contexto correcto
        if (!ctx || !config) {
            console.error('❌ Contexto o configuración inválidos');
            return;
        }

        // Línea de firma
        ctx.textAlign = align;
        ctx.font = 'bold 12px serif';
        ctx.fillStyle = config.colors.primary || '#000000';
        ctx.fillText('_____________________', x, y);

        // Texto "Firma Digital"
        ctx.font = '10px serif';
        ctx.fillStyle = config.colors.text || '#666666';
        ctx.fillText('Firma Digital', x, y + 15);

        // Fecha debajo
        ctx.font = '12px serif';
        ctx.fillStyle = config.colors.accent || '#888888';
        const fecha = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        ctx.fillText(`Fecha: ${fecha}`, x, y + 35);
    }

    drawClassicTemplate(ctx, config, width, height, data) {
        // Título principal
        ctx.fillStyle = config.colors.primary;
        ctx.font = 'bold 28px serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.titulo, width / 2, 100);

        // Subtítulo
        ctx.fillStyle = config.colors.text;
        ctx.font = '16px serif';
        ctx.fillText('Certificación de Autenticidad', width / 2, 130);

        // Institución
        ctx.textAlign = 'right';
        ctx.font = 'bold 14px serif';
        ctx.fillStyle = config.colors.primary;
        ctx.fillText(data.institucion, width - 60, 60);

        // Contenido principal
        ctx.textAlign = 'left';
        ctx.fillStyle = config.colors.text;
        ctx.font = '14px serif';
        const startY = 200;
        ctx.fillText('Este documento certifica que el contenido ha sido avalado', 60, startY);
        ctx.fillText('digitalmente y cumple con los estándares institucionales.', 60, startY + 25);

        // Autores
        ctx.font = 'bold 14px serif';
        ctx.fillText('Autores:', 60, startY + 70);
        ctx.font = '14px serif';
        data.autores.forEach((autor, index) => {
            ctx.fillText(`• ${autor}`, 80, startY + 100 + (index * 25));
        });

        // Avalado por (arriba a la izquierda)
        ctx.font = 'bold 14px serif';
        ctx.fillText('Avalado por:', 60, height - 180);
        ctx.font = '14px serif';
        ctx.fillText(data.avaladoPor, 60, height - 155);

        // Firma estándar a la derecha abajo
        this.drawStandardSignature(ctx, config, width - 60, height - 120, 'right');
    }

    drawModernTemplate(ctx, config, width, height, data) {
        // Título principal centrado
        ctx.fillStyle = config.colors.primary;
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.titulo, width / 2, 160);

        // Solo UNA línea de acento (eliminamos la segunda)
        ctx.fillStyle = config.colors.accent;
        ctx.fillRect(width / 2 - 100, 170, 200, 3);

        // Subtítulo
        ctx.fillStyle = config.colors.text;
        ctx.font = '16px sans-serif';
        ctx.fillText('Validación Digital Institucional', width / 2, 200);

        // Institución
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = config.colors.primary;
        ctx.fillText(data.institucion, width / 2, 230);

        // Contenido principal
        ctx.fillStyle = config.colors.text;
        ctx.font = '14px sans-serif';
        const startY = 280;
        ctx.fillText('Documento procesado y certificado', width / 2, startY);
        ctx.fillText('mediante sistema de validación digital', width / 2, startY + 25);

        // Autores
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('Autores del Documento', width / 2, startY + 70);
        ctx.font = '14px sans-serif';
        data.autores.forEach((autor, index) => {
            ctx.fillText(autor, width / 2, startY + 100 + (index * 25));
        });

        // Avalado por
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('Avalado por:', width / 2, height - 150);
        ctx.font = '14px sans-serif';
        ctx.fillText(data.avaladoPor, width / 2, height - 125);

        // Firma estándar centrada
        this.drawStandardSignature(ctx, config, width / 2, height - 100, 'center');
    }

    drawMinimalTemplate(ctx, config, width, height, data) {
        // Título principal
        ctx.fillStyle = config.colors.primary;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.titulo, width / 2, 150);

        // Línea minimalista
        ctx.strokeStyle = config.colors.primary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 80, 165);
        ctx.lineTo(width / 2 + 80, 165);
        ctx.stroke();

        // Institución
        ctx.fillStyle = config.colors.text;
        ctx.font = '12px sans-serif';
        ctx.fillText(data.institucion, width / 2, 190);

        // Contenido
        ctx.font = '14px sans-serif';
        const startY = 250;
        ctx.fillText('Documento certificado digitalmente', width / 2, startY);

        // Autores
        ctx.font = '14px sans-serif';
        ctx.fillText('Autores:', width / 2, startY + 60);
        data.autores.forEach((autor, index) => {
            ctx.font = '13px sans-serif';
            ctx.fillText(autor, width / 2, startY + 90 + (index * 22));
        });

        // Avalado por
        ctx.font = '14px sans-serif';
        ctx.fillText('Avalado por:', width / 2, height - 150);
        ctx.font = '13px sans-serif';
        ctx.fillText(data.avaladoPor, width / 2, height - 125);

        // Firma estándar centrada
        this.drawStandardSignature(ctx, config, width / 2, height - 100, 'center');
    }

    drawElegantTemplate(ctx, config, width, height, data) {
        // Título principal
        ctx.fillStyle = config.colors.primary;
        ctx.font = 'bold 28px serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.titulo, width / 2, 170);

        // Decoración elegante
        ctx.strokeStyle = config.colors.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 120, 185);
        ctx.lineTo(width / 2 - 20, 185);
        ctx.moveTo(width / 2 + 20, 185);
        ctx.lineTo(width / 2 + 120, 185);
        ctx.stroke();

        // Rombo central
        ctx.fillStyle = config.colors.accent;
        ctx.beginPath();
        ctx.moveTo(width / 2, 180);
        ctx.lineTo(width / 2 + 8, 187);
        ctx.lineTo(width / 2, 194);
        ctx.lineTo(width / 2 - 8, 187);
        ctx.closePath();
        ctx.fill();

        // Subtítulo
        ctx.fillStyle = config.colors.text;
        ctx.font = '16px serif';
        ctx.fillText('Certificación de Excelencia', width / 2, 220);

        // Institución
        ctx.font = 'bold 14px serif';
        ctx.fillStyle = config.colors.primary;
        ctx.fillText(data.institucion, width / 2, 250);

        // Contenido principal
        ctx.textAlign = 'left';
        ctx.fillStyle = config.colors.text;
        ctx.font = '14px serif';
        const startY = 300;
        ctx.fillText('Este documento ha sido revisado y avalado bajo', 80, startY);
        ctx.fillText('los más altos estándares de calidad institucional.', 80, startY + 25);

        // Autores
        ctx.font = 'bold 14px serif';
        ctx.fillText('Autores:', 80, startY + 70);
        ctx.font = '14px serif';
        data.autores.forEach((autor, index) => {
            ctx.fillText(`• ${autor}`, 100, startY + 100 + (index * 25));
        });

        // Avalado por (lado derecho)
        ctx.textAlign = 'right';
        ctx.font = 'bold 14px serif';
        ctx.fillText('Avalado por:', width - 80, startY + 70);
        ctx.font = '14px serif';
        ctx.fillText(data.avaladoPor, width - 80, startY + 100);

        // Firma estándar a la derecha
        this.drawStandardSignature(ctx, config, width - 80, startY + 130, 'right');
    }

    applyTemplate() {
        const serverTemplate = this.templateMapping[this.selectedTemplate];
        const logoData = this.globalLogo ? this.getCanvasImageData() : null;

        fetch('/api/save-template-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                template: serverTemplate,
                logo: logoData
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showNotification('Plantilla aplicada correctamente a todo el sistema', 'success');
                    this.updateStatus('configurado');
                } else {
                    this.showNotification(data.error || 'Error al aplicar la plantilla', 'error');
                }
            })
            .catch(error => {
                this.showNotification('Error de conexión', 'error');
            });
    }

    getCanvasImageData() {
        if (!this.globalLogo) return null;

        // Crear un canvas temporal para obtener los datos de la imagen
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.globalLogo.width;
        tempCanvas.height = this.globalLogo.height;
        tempCtx.drawImage(this.globalLogo, 0, 0);

        return tempCanvas.toDataURL();
    }

    resetTemplate() {
        this.selectedTemplate = 'classic';
        this.globalLogo = null;

        // Resetear UI
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });
        const classicCard = document.querySelector('[data-template="classic"]');
        if (classicCard) {
            classicCard.classList.add('selected');
        }

        // Limpiar logo
        const logoInput = document.getElementById('logoInput');
        if (logoInput) {
            logoInput.value = '';
        }

        this.updatePreview();
        this.updateStatus('sin-configurar');
        this.showNotification('Configuración restaurada', 'info');
    }

    updateStatus(status = 'configurado') {
        const statusElement = document.querySelector('.status-indicator');
        if (!statusElement) return;

        const statusTexts = {
            'sin-configurar': 'Sin configurar',
            'configurado': 'Configurado',
            'aplicando': 'Aplicando cambios...'
        };

        const statusColors = {
            'sin-configurar': '#ef4444',
            'configurado': '#10b981',
            'aplicando': '#f59e0b'
        };

        const statusText = statusElement.querySelector('span');
        const statusDot = statusElement.querySelector('.status-dot');

        if (statusText) {
            statusText.textContent = statusTexts[status] || statusTexts.configurado;
        }

        if (statusDot) {
            statusDot.style.background = statusColors[status] || statusColors.configurado;
        }
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Inicializar el sistema cuando el DOM esté listo
let professionalPDF;

document.addEventListener('DOMContentLoaded', () => {
    professionalPDF = new ProfessionalPDFSystem();
});

// Función global para obtener la plantilla seleccionada
window.getSelectedTemplate = function () {
    if (professionalPDF && professionalPDF.templateMapping) {
        return professionalPDF.templateMapping[professionalPDF.selectedTemplate] || 'template1';
    }
    return 'template1';
};

// Función global para obtener datos del documento
window.getDocumentData = function () {
    if (professionalPDF) {
        return {
            template: window.getSelectedTemplate(),
            selectedTemplate: professionalPDF.selectedTemplate || 'classic'
        };
    }
    return {
        template: 'template1',
        selectedTemplate: 'classic'
    };
};

// Exportar para uso global
window.ProfessionalPDFSystem = ProfessionalPDFSystem;

// Inicialización mejorada para tiempo real
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 DOM cargado, inicializando sistema PDF...');
    if (typeof window.professionalPDF === 'undefined') {
        window.professionalPDF = new ProfessionalPDFSystem();
        window.professionalPDF.init(); // Llamar init manualmente
        console.log('✅ Sistema PDF inicializado correctamente');
    }
});

// Inicialización alternativa si DOMContentLoaded ya pasó
if (document.readyState === 'loading') {
    console.log('⏳ Esperando carga del DOM...');
} else {
    console.log('🚀 DOM ya cargado, inicializando sistema PDF...');
    if (typeof window.professionalPDF === 'undefined') {
        window.professionalPDF = new ProfessionalPDFSystem();
        window.professionalPDF.init(); // Llamar init manualmente
        console.log('✅ Sistema PDF inicializado correctamente');
    }
}
