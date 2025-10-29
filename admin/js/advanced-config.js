/* ========================================
   CONFIGURACIÓN AVANZADA DE PDF Y BASE DE DATOS
   ======================================== */

class AdvancedConfiguration {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.currentLogoPath = '';
        this.init();
    }

    init() {
        this.setupPdfCustomization();
    }

    setupPdfCustomization() {
        document.querySelectorAll('.pdf-template-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectPdfTemplate(card.dataset.templateId);
            });
        });
        const activeTemplate = document.querySelector('.pdf-template-card.active');
        if (activeTemplate) {
            this.selectPdfTemplate(activeTemplate.dataset.templateId);
        }
        const saveBtn = document.getElementById('savePdfConfigBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.savePdfConfiguration());
        }
        const logoPathInput = document.getElementById('pdfLogoPath');
        if (logoPathInput) {
            logoPathInput.addEventListener('change', (event) => {
                this.handleLogoFileSelection(event);
            });
        }
        this.loadPdfConfiguration();
    }

    selectPdfTemplate(templateId) {
        document.querySelectorAll('.pdf-template-card').forEach(card => {
            card.classList.remove('active');
        });
        const selectedCard = document.querySelector(`[data-template-id="${templateId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
        const selectedTemplateInput = document.getElementById('pdfSelectedTemplate');
        if (selectedTemplateInput) {
            selectedTemplateInput.value = templateId;
        }
    }

    async loadPdfConfiguration() {
        try {
            const response = await fetch('/api/pdf-template/config', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const config = await response.json();
                this.populatePdfForm(config);
            }
        } catch (e) { }
    }

    async getCurrentPdfConfig() {
        return {
            selectedTemplate: document.getElementById('pdfSelectedTemplate')?.value || 'clasico',
            logoPath: this.currentLogoPath || '',
            colorConfig: {
                text: document.getElementById('pdfGeneralColor')?.value || '#1f2937'
            },
            fontConfig: {
                body: document.getElementById('pdfGeneralFont')?.value || 'Helvetica'
            },
            avalTextConfig: {
                template: document.getElementById('pdfAvalText')?.value || '',
                variables: ['$autores', '$titulo', '$modalidad', '$avalador', '$fecha', '$institucion', '$ubicacion']
            }
        };
    }

    populatePdfForm(config) {
        const selectedTemplate = document.getElementById('pdfSelectedTemplate');
        if (selectedTemplate && config.selectedTemplate) {
            selectedTemplate.value = config.selectedTemplate;
        }
        if (config.colorConfig && config.colorConfig.text) {
            this.setElementValue('pdfGeneralColor', config.colorConfig.text);
        }
        if (config.fontConfig && config.fontConfig.body) {
            this.setElementValue('pdfGeneralFont', config.fontConfig.body);
        }
        // Siempre setear el texto del aval, aunque sea vacío
        const avalText = (config.avalTextConfig && typeof config.avalTextConfig.template === 'string') ? config.avalTextConfig.template : '';
        this.setElementValue('pdfAvalText', avalText);
        setTimeout(() => {
            if (window.updateAvalPreview) {
                window.updateAvalPreview();
            }
        }, 100);
        if (config.logoPath) {
            this.currentLogoPath = config.logoPath;
        }
    }

    async savePdfConfiguration() {
        const config = await this.getCurrentPdfConfig();
        const saveBtn = document.querySelector('.admin-actions .admin-btn.primary');
        if (saveBtn) {
            saveBtn.disabled = true;
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span class="spinner"></span> Guardando...';
        }
        try {
            // Flatten config for backend compatibility
            const payload = {
                selectedTemplate: config.selectedTemplate,
                colorConfig: config.colorConfig,
                fontConfig: config.fontConfig,
                avalTextConfig: config.avalTextConfig,
                logoPath: config.logoPath
            };
            const response = await fetch('/api/pdf-template/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                window.showNotification('Configuración de PDF guardada correctamente', 'success');
            } else {
                let msg = 'Error al guardar la configuración de PDF';
                try {
                    const err = await response.json();
                    if (err && err.error) msg = err.error;
                } catch { }
                window.showNotification(msg, 'error');
            }
        } catch (e) {
            window.showNotification('Error al guardar la configuración de PDF', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Guardar Configuración';
            }
        }
    }

    async handleLogoFileSelection(event) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        if (!file) {
            this.currentLogoPath = '';
            this.updateLogoPreview();
            return;
        }
        if (!file.type.startsWith('image/')) {
            window.showNotification('Por favor selecciona un archivo de imagen válido', 'error');
            fileInput.value = '';
            this.currentLogoPath = '';
            this.updateLogoPreview();
            return;
        }
        // Subir el archivo al backend usando FormData
        const formData = new FormData();
        formData.append('logo', file);
        try {
            const response = await fetch('/api/pdf-template/logo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            if (response.ok) {
                const data = await response.json();
                if (data.logoUrl) {
                    this.currentLogoPath = data.logoUrl;
                    this.updateLogoPreview();
                    window.showNotification('Logo actualizado correctamente', 'success');
                } else {
                    throw new Error('No se recibió la URL del logo');
                }
            } else {
                window.showNotification('Error al subir el logo', 'error');
            }
        } catch (e) {
            window.showNotification('Error al subir el logo', 'error');
        }
    }

    updateLogoPreview() {
        const logoPreview = document.getElementById('pdfLogoPreview');
        const logoPlaceholder = document.getElementById('pdfLogoPlaceholder');
        if (this.currentLogoPath) {
            logoPreview.src = this.currentLogoPath;
            logoPreview.style.display = 'block';
            logoPlaceholder.style.display = 'none';
        } else {
            logoPreview.style.display = 'none';
            logoPlaceholder.style.display = 'flex';
        }
    }

    setElementValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== undefined) {
            element.value = value;
        }
    }
}

// Función global mínima para guardar la configuración PDF
function savePdfConfig() {
    if (window.adminPanel && window.adminPanel.advancedConfig) {
        window.adminPanel.advancedConfig.savePdfConfiguration();
    }
}

window.savePdfConfig = savePdfConfig;
