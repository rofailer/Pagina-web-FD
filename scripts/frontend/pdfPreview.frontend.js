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
            // Configuración por defecto (ya no se carga desde API)
            this.selectedTemplate = 'clasico';
            this.customInstitution = 'Universidad Firmas Digitales';

            // No intentar actualizar UI ya que los elementos no existen
            console.log('Configuración por defecto aplicada (PDF preview removido del frontend)');
        } catch (error) {
            console.error('❌ Error en configuración por defecto:', error);
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
        // Eventos removidos - elementos del DOM ya no existen en el frontend
        console.log('Event binding skipped (PDF preview removido del frontend)');
    }

    selectTemplate(templateType) {
        this.selectedTemplate = templateType;
        this.updateUI();
        this.updatePreview();
        this.showNotification(`Plantilla "${templateType}" seleccionada`, 'success');
    }

    updateUI() {
        // UI update skipped - elementos del DOM ya no existen en el frontend
        console.log('UI update skipped (PDF preview removido del frontend)');
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
        // Preview removido del frontend - solo logging
        console.log('Preview update skipped (PDF preview removido del frontend)');
        return;
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
        // Configuración ya no se guarda globalmente (movido a admin panel)
        console.log('Configuración guardada localmente (global save removido)');
    }

    applyTemplate() {
        // Elemento institutionInput ya no existe en el frontend
        this.customInstitution = 'Universidad Firmas Digitales';
        this.saveGlobalConfig();
    }

    resetTemplate() {
        this.selectedTemplate = 'clasico';
        this.globalLogo = null;
        this.customInstitution = 'Universidad Firmas Digitales';
        // UI update skipped - elementos del DOM ya no existen
        console.log('Template reset to default (UI update skipped)');
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