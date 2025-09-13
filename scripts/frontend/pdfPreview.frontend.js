/**
 * ========================================
 * SISTEMA DE PREVIEW PDF - FRONTEND ÚNICAMENTE
 * ========================================
 * 
 * PROPÓSITO: Vista previa de documentos usando las plantillas existentes
 * ARQUITECTURA: Frontend genera preview directo en Canvas usando las plantillas de /templates/
 * GARANTÍA: Usa exactamente las mismas funciones que el sistema de PDFs real
 */

class ProfessionalPDFSystem {
    constructor() {
        this.selectedTemplate = 'clasico';
        this.globalLogo = null;
        this.customInstitution = 'Universidad Firmas Digitales';
        this.templates = {};

        // Inicializando sistema PDF Preview Frontend
    }

    async init() {
        // Inicializando sistema de preview

        // Cargar configuración global
        await this.loadGlobalConfig();

        // Esperar a que las plantillas se carguen en el DOM
        await this.waitForTemplates();

        // Vincular eventos
        this.bindEvents();

        // Actualizar UI
        this.updateUI();

        // Generar preview inicial
        await this.updatePreview();

    }

    async waitForTemplates() {
        // Esperando que las plantillas se carguen

        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo

        while (attempts < maxAttempts) {
            if (window.ClassicTemplate &&
                window.ModernTemplate &&
                window.MinimalTemplate &&
                window.ElegantTemplate) {

                // Todas las plantillas cargadas correctamente

                // Almacenar referencias a las plantillas
                this.templates = {
                    clasico: window.ClassicTemplate,
                    moderno: window.ModernTemplate,
                    minimalista: window.MinimalTemplate,
                    elegante: window.ElegantTemplate
                };

                return;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        console.warn('⚠️ Timeout esperando plantillas, usando fallback');
    }

    async loadGlobalConfig() {
        try {
            // Cargando configuración global
            const response = await fetch('/api/global-template-config');

            if (response.ok) {
                const config = await response.json();
                // Configuración recibida

                this.selectedTemplate = config.selectedTemplate || 'clasico';
                this.customInstitution = config.institutionName || 'Universidad Firmas Digitales';

                // Actualizar campo de institución en UI
                const institutionInput = document.getElementById('institutionInput');
                if (institutionInput) {
                    institutionInput.value = this.customInstitution;
                }

                // Cargar logo si existe
                if (config.logo) {
                    await this.loadLogoFromUrl(config.logo);
                }

                // Configuración aplicada
            }
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
        }
    }

    async loadLogoFromUrl(url) {
        try {
            const img = new Image();
            img.onload = () => {
                this.globalLogo = img;
                this.updatePreview();
            };
            img.onerror = () => {
                console.warn('⚠️ No se pudo cargar el logo');
            };
            img.src = url;
        } catch (error) {
            console.error('❌ Error cargando logo:', error);
        }
    }

    bindEvents() {
        // Vinculando eventos del sistema

        // Selección de plantillas
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const templateType = card.dataset.template;
                if (templateType) {
                    this.selectTemplate(templateType);
                }
            });
        });

        // Upload de logo
        const logoInput = document.getElementById('logoInput');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
        }

        // Input de institución
        const institutionInput = document.getElementById('institutionInput');
        if (institutionInput) {
            institutionInput.addEventListener('input', (e) => {
                this.customInstitution = e.target.value || 'Universidad Firmas Digitales';
                this.updatePreview();
            });
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

        // Eventos vinculados correctamente
    }

    selectTemplate(templateType) {
        this.selectedTemplate = templateType;
        this.updateUI();
        this.updatePreview();
        this.showNotification(`Plantilla "${templateType}" seleccionada`, 'success');
    }

    updateUI() {
        // Actualizar cards de plantillas
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

        if (!file.type.startsWith('image/')) {
            this.showNotification('Por favor selecciona un archivo de imagen válido', 'error');
            return;
        }

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

    async updatePreview() {
        // Generando preview para plantilla

        const canvas = document.getElementById('pdfPreviewCanvas');
        if (!canvas) {
            console.error('❌ Canvas de preview no encontrado');
            return;
        }

        // Configurar canvas con dimensiones de documento A4
        canvas.width = 600;
        canvas.height = 800;

        const ctx = canvas.getContext('2d');

        // Configurar renderizado de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.textRenderingOptimization = 'optimizeQuality';

        try {
            // Limpiar canvas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Preparar datos del documento para preview
            const previewData = this.preparePreviewData();

            // Renderizar usando las plantillas existentes
            await this.renderTemplateOnCanvas(ctx, canvas.width, canvas.height, previewData);

        } catch (error) {
            console.error('❌ Error generando preview:', error);
            this.showPreviewError(ctx, canvas.width, canvas.height);
        }
    }

    preparePreviewData() {
        return {
            titulo: 'Documento de Ejemplo',
            institucion: this.customInstitution,
            autores: ['Dr. Juan Pérez', 'Dra. María García', 'Ing. Carlos López'],
            avaladoPor: 'Comité Académico',
            fecha: new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };
    }

    async renderTemplateOnCanvas(ctx, width, height, data) {
        const templateName = this.selectedTemplate;

        // Verificar que la plantilla existe
        const template = this.templates[templateName];

        if (!template) {
            console.warn(`⚠️ Plantilla "${templateName}" no encontrada, usando fallback`);
            this.renderFallbackTemplate(ctx, width, height, data);
            return;
        }

        try {
            // Usar la función drawTemplateCanvas de la plantilla
            if (template.drawTemplateCanvas) {
                template.drawTemplateCanvas(ctx, template.config, width, height, data);
            } else {
                console.warn(`⚠️ Función drawTemplateCanvas no encontrada en plantilla "${templateName}"`);
                this.renderFallbackTemplate(ctx, width, height, data);
            }

            // Dibujar borde si la plantilla lo soporta
            if (template.drawBorderCanvas) {
                template.drawBorderCanvas(ctx, template.config, width, height);
            }

            // Dibujar logo si existe
            if (this.globalLogo) {
                this.drawLogo(ctx, width, height);
            }

        } catch (error) {
            console.error(`❌ Error renderizando plantilla "${templateName}":`, error);
            this.renderFallbackTemplate(ctx, width, height, data);
        }
    }

    renderFallbackTemplate(ctx, width, height, data) {

        // Plantilla básica de emergencia
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.titulo || 'DOCUMENTO', width / 2, height / 2 - 50);

        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Arial';
        ctx.fillText(data.institucion || 'Universidad', width / 2, height / 2);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Arial';
        ctx.fillText(`Plantilla: ${this.selectedTemplate}`, width / 2, height / 2 + 30);

        // Borde simple
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, width - 40, height - 40);
    }

    drawLogo(ctx, width, height) {
        if (!this.globalLogo) return;

        try {
            // Posición del logo (esquina superior izquierda)
            const logoSize = 60;
            const logoX = 40;
            const logoY = 40;

            // Calcular dimensiones manteniendo proporción
            const aspectRatio = this.globalLogo.width / this.globalLogo.height;
            let logoWidth = logoSize;
            let logoHeight = logoSize;

            if (aspectRatio > 1) {
                logoHeight = logoSize / aspectRatio;
            } else {
                logoWidth = logoSize * aspectRatio;
            }

            ctx.drawImage(this.globalLogo, logoX, logoY, logoWidth, logoHeight);

        } catch (error) {
            console.error('❌ Error dibujando logo:', error);
        }
    }

    showPreviewError(ctx, width, height) {
        ctx.fillStyle = '#fef2f2';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#dc2626';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Error generando preview', width / 2, height / 2 - 10);

        ctx.font = '12px Arial';
        ctx.fillText('Intente nuevamente', width / 2, height / 2 + 15);
    }

    async saveGlobalConfig() {
        try {

            const response = await fetch('/api/save-global-template-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    template: this.selectedTemplate,
                    logo: null, // El logo se maneja por separado
                    institutionName: this.customInstitution
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Configuración guardada globalmente', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error guardando configuración');
            }
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    applyTemplate() {

        const institutionInput = document.getElementById('institutionInput');
        if (institutionInput) {
            this.customInstitution = institutionInput.value.trim() || 'Universidad Firmas Digitales';
        }

        this.saveGlobalConfig();
    }

    resetTemplate() {

        this.selectedTemplate = 'clasico';
        this.globalLogo = null;
        this.customInstitution = 'Universidad Firmas Digitales';

        // Actualizar UI
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });

        const classicCard = document.querySelector('[data-template="clasico"]');
        if (classicCard) {
            classicCard.classList.add('selected');
        }

        const logoInput = document.getElementById('logoInput');
        if (logoInput) {
            logoInput.value = '';
        }

        const institutionInput = document.getElementById('institutionInput');
        if (institutionInput) {
            institutionInput.value = this.customInstitution;
        }

        this.updatePreview();
        this.showNotification('Configuración restaurada', 'info');
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        }
    }

    // Métodos públicos para acceso externo
    getSelectedTemplate() {
        return this.selectedTemplate;
    }

    getDocumentData() {
        return {
            template: this.selectedTemplate,
            selectedTemplate: this.selectedTemplate,
            institution: this.customInstitution,
            hasLogo: !!this.globalLogo
        };
    }
}

// ========================================
// INICIALIZACIÓN Y FUNCIONES GLOBALES
// ========================================

// Variable global única
let professionalPDF;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // DOM cargado, inicializando sistema PDF Preview

    // Dar tiempo a que las plantillas se carguen
    setTimeout(() => {
        if (!professionalPDF) {
            professionalPDF = new ProfessionalPDFSystem();
            professionalPDF.init();

            // Exponer globalmente
            window.professionalPDF = professionalPDF;

            // Sistema PDF Preview inicializado y expuesto globalmente
        }
    }, 500); // Esperar 500ms para que las plantillas se carguen
});

// Funciones globales para compatibilidad
window.getSelectedTemplate = function () {
    return professionalPDF?.getSelectedTemplate() || 'clasico';
};

window.getDocumentData = function () {
    return professionalPDF?.getDocumentData() || {
        template: 'clasico',
        selectedTemplate: 'clasico',
        institution: 'Universidad Firmas Digitales',
        hasLogo: false
    };
};

// Exportar clase para uso externo
window.ProfessionalPDFSystem = ProfessionalPDFSystem;

// Sistema PDF Preview cargado