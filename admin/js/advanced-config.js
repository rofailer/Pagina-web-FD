/* ========================================
   CONFIGURACIÓN AVANZADA DE PDF Y BASE DE DATOS
   ======================================== */

class AdvancedConfiguration {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.pdfConfig = {};
        this.dbConfig = {};
        this.systemInfo = {};
        this.logs = [];
        this.currentLogoPath = ''; // Almacena la ruta actual del logo

        this.init();
    }

    init() {
        this.setupConfigurationEvents();
        this.loadPdfTemplates();
        this.loadDatabaseConfig();
        this.setupLogViewer();
    }

    setupConfigurationEvents() {
        // Test de conexión DB
        const testDbBtn = document.getElementById('testDbConnection');
        if (testDbBtn) {
            testDbBtn.addEventListener('click', () => {
                this.testDatabaseConnection();
            });
        }

        // Backup del sistema
        const backupBtn = document.getElementById('createBackup');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.createSystemBackup();
            });
        }

        // Restaurar backup
        const restoreBtn = document.getElementById('restoreBackup');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                this.showRestoreBackupModal();
            });
        }

        // Limpiar logs
        const clearLogsBtn = document.getElementById('clearLogs');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                this.clearSystemLogs();
            });
        }

        // Configuración de PDF personalizada
        this.setupPdfCustomization();

        // Configuración de base de datos
        this.setupDatabaseConfiguration();

        // Monitoreo del sistema
        this.setupSystemMonitoring();
    }

    /* ========================================
       CONFIGURACIÓN DE PDF
       ======================================== */
    async loadPdfTemplates() {
        try {
            const result = await this.adminPanel.authenticatedFetch(`${this.adminPanel.apiBase}/pdf/templates`);
            if (result.success) {
                this.renderPdfTemplates(result);
            } else {
                console.error('Error cargando templates PDF:', result.message);
            }
        } catch (error) {
            console.error('Error cargando templates PDF:', error);
        }
    }

    renderPdfTemplates(response) {
        const container = document.querySelector('.pdf-template-grid');
        if (!container) return;

        const templates = response.templates || [];

        // Asegurar que al menos un template esté activo
        const hasActiveTemplate = templates.some(template => template.active);
        if (!hasActiveTemplate && templates.length > 0) {
            templates[0].active = true; // Marcar el primer template como activo por defecto
        }

        const templatesHTML = templates.map(template => `
            <div class="pdf-template-card ${template.active ? 'active' : ''}" 
                 data-template-id="${template.id}">
                <div class="pdf-template-preview">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                        </path>
                    </svg>
                </div>
                <div class="pdf-template-info">
                    <h4>${template.name}</h4>
                    <p>${template.description}</p>
                    <div class="template-stats">
                        <span class="stat">Usado ${template.usageCount || 0} veces</span>
                        <span class="stat">Tamaño: ${template.pageSize}</span>
                    </div>
                </div>
                ${template.active ? '<div class="active-badge">Activo</div>' : ''}
            </div>
        `).join('');

        container.innerHTML = templatesHTML;

        // Re-asignar eventos
        document.querySelectorAll('.pdf-template-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectPdfTemplate(card.dataset.templateId);
            });
        });

        // Cargar configuración del template activo por defecto
        const activeTemplate = document.querySelector('.pdf-template-card.active');
        if (activeTemplate) {
            this.selectPdfTemplate(activeTemplate.dataset.templateId);
        }
    }

    selectPdfTemplate(templateId) {

        // Desseleccionar todos
        document.querySelectorAll('.pdf-template-card').forEach(card => {
            card.classList.remove('active');
        });

        // Seleccionar actual
        const selectedCard = document.querySelector(`[data-template-id="${templateId}"]`);

        if (selectedCard) {
            selectedCard.classList.add('active');
        } else {
            console.error('No se encontró el elemento para templateId:', templateId);
        }

        // Cargar configuración específica del template
        this.loadTemplateConfiguration(templateId);
    }

    async loadTemplateConfiguration(templateId) {
        try {
            // Configuraciones por defecto para cada template
            const defaultConfigs = {
                'clasico': {
                    fontFamily: 'Times New Roman',
                    fontSize: 12,
                    margins: { top: 50, bottom: 50, left: 50, right: 50 },
                    colors: { primary: '#1e40af', secondary: '#64748b', text: '#1f2937' }
                },
                'moderno': {
                    fontFamily: 'Arial',
                    fontSize: 11,
                    margins: { top: 40, bottom: 40, left: 40, right: 40 },
                    colors: { primary: '#2563eb', secondary: '#60a5fa', text: '#1e293b' }
                },
                'minimalista': {
                    fontFamily: 'Helvetica',
                    fontSize: 10,
                    margins: { top: 30, bottom: 30, left: 30, right: 30 },
                    colors: { primary: '#6b7280', secondary: '#9ca3af', text: '#374151' }
                },
                'elegante': {
                    fontFamily: 'Georgia',
                    fontSize: 12,
                    margins: { top: 60, bottom: 60, left: 60, right: 60 },
                    colors: { primary: '#7c3aed', secondary: '#a78bfa', text: '#1f2937' }
                }
            };

            const config = defaultConfigs[templateId] || defaultConfigs['clasico'];
            this.populatePdfConfiguration({ config: config });
        } catch (error) {
            console.error('Error cargando configuración de template:', error);
        }
    }

    populatePdfConfiguration(config) {
        // La configuración viene en config.config
        const templateConfig = config.config || config;

        const fields = {
            'pdfMarginTop': templateConfig.margins?.top || 20,
            'pdfMarginBottom': templateConfig.margins?.bottom || 20,
            'pdfMarginLeft': templateConfig.margins?.left || 20,
            'pdfMarginRight': templateConfig.margins?.right || 20,
            'pdfFontSize': templateConfig.fontSize || 12,
            'pdfFontFamily': templateConfig.fontFamily || 'Arial',
            'signaturePositionX': templateConfig.signaturePosition?.x || 100,
            'signaturePositionY': templateConfig.signaturePosition?.y || 100,
            'signatureWidth': templateConfig.signatureSize?.width || 150,
            'signatureHeight': templateConfig.signatureSize?.height || 50,
            'includeTimestamp': templateConfig.includeTimestamp || false,
            'includeMetadata': templateConfig.includeMetadata || false,
            'watermarkText': templateConfig.watermark?.text || '',
            'watermarkOpacity': templateConfig.watermark?.opacity || 0.3
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // Actualizar vista previa
        this.updatePdfPreview(config);
    }

    setupPdfCustomization() {
        // Configurar eventos para todos los inputs de configuración PDF
        const pdfInputs = document.querySelectorAll('#tab-configuracion-pdf input, #tab-configuracion-pdf select');
        pdfInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updatePdfPreview();
                this.updateLogoPreview();
            });
            input.addEventListener('input', () => {
                this.updatePdfPreview();
            });
        });

        // Configurar eventos específicos
        this.setupPdfEvents();

        // Cargar configuración existente al inicializar
        this.loadPdfConfiguration();
    }

    setupPdfEvents() {
        // Vista previa
        const previewBtn = document.getElementById('previewPdfTemplate');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.generatePdfPreview();
            });
        }

        // Preview button en la nueva interfaz
        const newPreviewBtn = document.querySelector('button[onclick="previewPdfConfig()"]');
        if (newPreviewBtn) {
            newPreviewBtn.onclick = () => this.generatePdfPreview();
        }

        // Save button en la nueva interfaz
        const newSaveBtn = document.querySelector('button[onclick="savePdfConfig()"]');
        if (newSaveBtn) {
            newSaveBtn.onclick = () => this.savePdfConfiguration();
        }

        // Reset button en la nueva interfaz
        const newResetBtn = document.querySelector('button[onclick="resetPdfConfig()"]');
        if (newResetBtn) {
            newResetBtn.onclick = () => this.resetPdfConfiguration();
        }

        // Actualizar preview del logo cuando cambia el archivo seleccionado
        const logoPathInput = document.getElementById('pdfLogoPath');
        if (logoPathInput) {
            logoPathInput.addEventListener('change', (event) => {
                this.handleLogoFileSelection(event);
            });
        }
    }

    async loadPdfConfiguration() {
        try {
            const response = await fetch('/api/admin/pdf/config', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const config = await response.json();

                // Siempre obtener el nombre de institución de la configuración general
                try {
                    const institutionResponse = await fetch('/api/config/institution', {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    if (institutionResponse.ok) {
                        const institutionData = await institutionResponse.json();
                        config.institutionName = institutionData.institution_name || 'Firmas Digitales FD';
                    }
                } catch (error) {
                    console.warn('No se pudo obtener nombre de institución de configuración general:', error);
                    config.institutionName = 'Firmas Digitales FD';
                }

                // El logo ya viene en la configuración PDF global
                // No necesitamos obtenerlo de la configuración visual
                // config.logoPath ya está disponible desde la respuesta de /api/admin/pdf/config

                this.populatePdfForm(config);
                this.updatePdfPreview(config);
                this.updateLogoPreview();
            }
        } catch (error) {
            console.error('Error cargando configuración PDF:', error);
        }
    }

    populatePdfForm(config) {
        // Plantilla seleccionada
        const selectedTemplate = document.getElementById('pdfSelectedTemplate');
        if (selectedTemplate && config.selectedTemplate) {
            selectedTemplate.value = config.selectedTemplate;
        }

        // Configuración de colores
        if (config.colorConfig) {
            this.setElementValue('pdfPrimaryColor', config.colorConfig.primary);
            this.setElementValue('pdfSecondaryColor', config.colorConfig.secondary);
            this.setElementValue('pdfAccentColor', config.colorConfig.accent);
            this.setElementValue('pdfTextColor', config.colorConfig.text);
        }

        // Configuración de fuentes
        if (config.fontConfig) {
            this.setElementValue('pdfTitleFont', config.fontConfig.title);
            this.setElementValue('pdfBodyFont', config.fontConfig.body);
            this.setElementValue('pdfMetadataFont', config.fontConfig.metadata);
            this.setElementValue('pdfSignatureFont', config.fontConfig.signature);
        }

        // Configuración de layout
        if (config.layoutConfig) {
            this.setElementValue('pdfMarginTop', config.layoutConfig.marginTop);
            this.setElementValue('pdfMarginBottom', config.layoutConfig.marginBottom);
            this.setElementValue('pdfMarginLeft', config.layoutConfig.marginLeft);
            this.setElementValue('pdfMarginRight', config.layoutConfig.marginRight);
            this.setElementValue('pdfLineHeight', config.layoutConfig.lineHeight);
            this.setElementValue('pdfTitleSize', config.layoutConfig.titleSize);
            this.setElementValue('pdfBodySize', config.layoutConfig.bodySize);
        }

        // Configuración de bordes
        if (config.borderConfig) {
            this.setElementValue('pdfBorderStyle', config.borderConfig.style);
            this.setElementValue('pdfBorderWidth', config.borderConfig.width);
            this.setElementValue('pdfBorderColor', config.borderConfig.color);
            this.setElementValue('pdfCornerRadius', config.borderConfig.cornerRadius);
            this.setCheckboxValue('pdfShowDecorative', config.borderConfig.showDecorative);
        }

        // Configuración visual
        if (config.visualConfig) {
            this.setCheckboxValue('pdfShowLogo', config.visualConfig.showLogo);
            this.setCheckboxValue('pdfShowInstitution', config.visualConfig.showInstitution);
            this.setCheckboxValue('pdfShowDate', config.visualConfig.showDate);
            this.setCheckboxValue('pdfShowSignature', config.visualConfig.showSignature);
            this.setCheckboxValue('pdfShowAuthors', config.visualConfig.showAuthors);
            this.setCheckboxValue('pdfShowAvalador', config.visualConfig.showAvalador);
        }

        // Logo path
        if (config.logoPath) {
            this.currentLogoPath = config.logoPath;
        }
    }

    setElementValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== undefined) {
            element.value = value;
        }
    }

    setCheckboxValue(elementId, checked) {
        const element = document.getElementById(elementId);
        if (element) {
            element.checked = checked !== false;
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

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            window.showNotification('Por favor selecciona un archivo de imagen válido', 'error');
            fileInput.value = '';
            return;
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            window.showNotification('El archivo es demasiado grande. Máximo 5MB permitido', 'error');
            fileInput.value = '';
            return;
        }

        try {
            // Subir el archivo al servidor
            const formData = new FormData();
            formData.append('logo', file);

            this.adminPanel.showLoading('Subiendo logo...');

            const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
            const response = await fetch(`/api/upload/logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.currentLogoPath = result.logoDataUrl;
                window.showNotification('Logo subido correctamente', 'success');
                this.updateLogoPreview();
            } else {
                throw new Error('Error al subir el logo');
            }
        } catch (error) {
            console.error('Error subiendo logo:', error);
            window.showNotification('Error al subir el logo', 'error');
            fileInput.value = '';
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    updateLogoPreview() {
        const logoPreview = document.getElementById('pdfLogoPreview');
        const logoPlaceholder = document.getElementById('logoPlaceholder');

        if (!logoPreview || !logoPlaceholder) return;

        if (this.currentLogoPath) {
            logoPreview.src = this.currentLogoPath;
            logoPreview.style.display = 'block';
            logoPlaceholder.style.display = 'none';

            logoPreview.onerror = () => {
                logoPreview.style.display = 'none';
                logoPlaceholder.style.display = 'flex';
            };

            logoPreview.onload = () => {
                logoPlaceholder.style.display = 'none';
            };
        } else {
            logoPreview.style.display = 'none';
            logoPlaceholder.style.display = 'flex';
        }
    }

    async getCurrentPdfConfig() {
        return {
            selectedTemplate: document.getElementById('pdfSelectedTemplate')?.value || 'clasico',
            logoPath: this.currentLogoPath || '',
            colorConfig: {
                primary: document.getElementById('pdfPrimaryColor')?.value || '#2563eb',
                secondary: document.getElementById('pdfSecondaryColor')?.value || '#64748b',
                accent: document.getElementById('pdfAccentColor')?.value || '#f59e0b',
                text: document.getElementById('pdfTextColor')?.value || '#1f2937',
                background: '#ffffff'
            },
            fontConfig: {
                title: document.getElementById('pdfTitleFont')?.value || 'Helvetica-Bold',
                body: document.getElementById('pdfBodyFont')?.value || 'Helvetica',
                metadata: document.getElementById('pdfMetadataFont')?.value || 'Helvetica-Oblique',
                signature: document.getElementById('pdfSignatureFont')?.value || 'Times-Bold'
            },
            layoutConfig: {
                marginTop: parseInt(document.getElementById('pdfMarginTop')?.value) || 60,
                marginBottom: parseInt(document.getElementById('pdfMarginBottom')?.value) || 60,
                marginLeft: parseInt(document.getElementById('pdfMarginLeft')?.value) || 50,
                marginRight: parseInt(document.getElementById('pdfMarginRight')?.value) || 50,
                lineHeight: parseFloat(document.getElementById('pdfLineHeight')?.value) || 1.6,
                titleSize: parseInt(document.getElementById('pdfTitleSize')?.value) || 24,
                bodySize: parseInt(document.getElementById('pdfBodySize')?.value) || 12
            },
            borderConfig: {
                style: document.getElementById('pdfBorderStyle')?.value || 'classic',
                width: parseInt(document.getElementById('pdfBorderWidth')?.value) || 2,
                color: document.getElementById('pdfBorderColor')?.value || '#1f2937',
                cornerRadius: parseInt(document.getElementById('pdfCornerRadius')?.value) || 0,
                showDecorative: document.getElementById('pdfShowDecorative')?.checked !== false
            },
            visualConfig: {
                showLogo: document.getElementById('pdfShowLogo')?.checked !== false,
                showInstitution: document.getElementById('pdfShowInstitution')?.checked !== false,
                showDate: document.getElementById('pdfShowDate')?.checked !== false,
                showSignature: document.getElementById('pdfShowSignature')?.checked !== false,
                showAuthors: document.getElementById('pdfShowAuthors')?.checked !== false,
                showAvalador: document.getElementById('pdfShowAvalador')?.checked !== false
            }
        };
    }

    async updatePdfPreview(config = null) {
        const currentConfig = config || await this.getCurrentPdfConfig();

        // Obtener institutionName de la configuración general
        if (!currentConfig.institutionName) {
            try {
                // Obtener de la configuración visual global
                const visualConfigResponse = await fetch('/api/visual-config/public');
                if (visualConfigResponse.ok) {
                    const visualConfig = await visualConfigResponse.json();
                    currentConfig.institutionName = visualConfig.institution_name || 'Firmas Digitales FD';
                } else {
                    currentConfig.institutionName = 'Firmas Digitales FD';
                }
            } catch (error) {
                console.warn('No se pudo obtener nombre de institución:', error);
                currentConfig.institutionName = 'Firmas Digitales FD';
            }
        }

        // Aquí puedes implementar una vista previa visual más avanzada
        // Por ahora, solo actualizamos el indicador de cambios
        const previewIndicator = document.querySelector('.pdf-preview-indicator');
        if (previewIndicator) {
            previewIndicator.textContent = 'Configuración modificada - Guardar para aplicar';
            previewIndicator.style.color = '#f59e0b';
        }

        // Crear vista previa visual si existe el contenedor
        const visualPreview = document.getElementById('pdfVisualPreview');
        if (visualPreview) {
            this.renderVisualPreview(currentConfig, visualPreview);
        }
    }

    renderVisualPreview(config, container) {
        container.innerHTML = `
            <div class="pdf-preview-container">
                <div class="pdf-preview-header">
                    <h4>Vista Previa del Documento</h4>
                </div>
                <div class="pdf-preview-page" style="
                    border: ${config.borderConfig?.width || 2}px solid ${config.borderConfig?.color || '#1f2937'};
                    border-radius: ${config.borderConfig?.cornerRadius || 0}px;
                    background: ${config.colorConfig?.background || '#ffffff'};
                    padding: ${config.layoutConfig?.marginTop || 60}px ${config.layoutConfig?.marginRight || 50}px ${config.layoutConfig?.marginBottom || 60}px ${config.layoutConfig?.marginLeft || 50}px;
                    position: relative;
                    min-height: 400px;
                    font-family: ${config.fontConfig?.body || 'Helvetica'}, sans-serif;
                    font-size: ${config.layoutConfig?.bodySize || 12}px;
                    color: ${config.colorConfig?.text || '#1f2937'};
                    line-height: ${config.layoutConfig?.lineHeight || 1.6};
                ">
                    ${config.visualConfig?.showLogo ? `
                        <div class="pdf-preview-logo" style="
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            width: 60px;
                            height: 60px;
                            background: #f3f4f6;
                            border: 1px solid #e5e7eb;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 8px;
                            color: #6b7280;
                        ">
                            LOGO
                        </div>
                    ` : ''}

                    ${config.visualConfig?.showInstitution ? `
                        <div class="pdf-preview-institution" style="
                            font-size: 18px;
                            font-weight: bold;
                            color: ${config.colorConfig?.primary || '#2563eb'};
                            margin-bottom: 20px;
                            text-align: center;
                        ">
                            ${config.institutionName || 'Universidad Ejemplo'}
                        </div>
                    ` : ''}

                    <h1 class="pdf-preview-title" style="
                        color: ${config.colorConfig?.primary || '#2563eb'};
                        font-family: ${config.fontConfig?.title || 'Helvetica-Bold'}, sans-serif;
                        font-size: ${config.layoutConfig?.titleSize || 24}px;
                        margin-bottom: 15px;
                        text-align: center;
                    ">
                        Documento de Ejemplo
                    </h1>

                    ${config.visualConfig?.showDate ? `
                        <div class="pdf-preview-date" style="
                            font-size: 10px;
                            color: ${config.colorConfig?.secondary || '#64748b'};
                            margin-bottom: 10px;
                            text-align: right;
                        ">
                            Fecha: ${new Date().toLocaleDateString('es-ES')}
                        </div>
                    ` : ''}

                    ${config.visualConfig?.showAuthors ? `
                        <div class="pdf-preview-authors" style="
                            font-size: 11px;
                            color: ${config.colorConfig?.secondary || '#64748b'};
                            margin-bottom: 15px;
                        ">
                            <strong>Autor:</strong> Autor de Ejemplo
                        </div>
                    ` : ''}

                    <div class="pdf-preview-content" style="margin-bottom: 30px;">
                        <p style="margin-bottom: 10px;">
                            Este es un documento de ejemplo para mostrar cómo se verá el PDF con la configuración actual.
                            Incluye todos los elementos configurables como márgenes, fuentes, colores y elementos visuales.
                        </p>
                        <p>
                            La configuración actual permite personalizar completamente la apariencia del documento,
                            incluyendo colores, fuentes, márgenes, bordes y elementos decorativos.
                        </p>
                    </div>

                    ${config.visualConfig?.showAvalador ? `
                        <div class="pdf-preview-avalador" style="
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid ${config.colorConfig?.secondary || '#64748b'};
                        ">
                            <div style="
                                font-size: 11px;
                                color: ${config.colorConfig?.secondary || '#64748b'};
                                text-align: right;
                            ">
                                <strong>Avalado por:</strong> Avalador de Ejemplo
                            </div>
                        </div>
                    ` : ''}

                    ${config.visualConfig?.showSignature ? `
                        <div class="pdf-preview-signature" style="
                            position: absolute;
                            right: 50px;
                            bottom: 60px;
                            width: 150px;
                            height: 50px;
                            border: 2px dashed ${config.colorConfig?.accent || '#f59e0b'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            color: ${config.colorConfig?.accent || '#f59e0b'};
                            font-family: ${config.fontConfig?.signature || 'Times-Bold'}, serif;
                        ">
                            Firma Digital
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async savePdfConfiguration() {
        try {
            const config = await this.getCurrentPdfConfig();

            this.adminPanel.showLoading('Guardando configuración PDF...');

            const response = await fetch('/api/admin/pdf/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                const result = await response.json();
                window.showNotification('Configuración PDF guardada correctamente', 'success');

                // Actualizar indicador de preview
                const previewIndicator = document.querySelector('.pdf-preview-indicator');
                if (previewIndicator) {
                    previewIndicator.textContent = 'Configuración guardada';
                    previewIndicator.style.color = '#10b981';
                }

                // Recargar configuración para asegurar consistencia
                setTimeout(() => this.loadPdfConfiguration(), 1000);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error guardando configuración PDF:', error);
            window.showNotification(`Error al guardar configuración PDF: ${error.message}`, 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    // Sincronizar nombre de institución con configuración general
    async generatePdfPreview() {
        try {
            const config = await this.getCurrentPdfConfig();

            // Asegurar que tenemos el nombre de institución
            if (!config.institutionName) {
                try {
                    // Obtener de la configuración visual global
                    const visualConfigResponse = await fetch('/api/visual-config/public');
                    if (visualConfigResponse.ok) {
                        const visualConfig = await visualConfigResponse.json();
                        config.institutionName = visualConfig.institution_name || 'Firmas Digitales FD';
                    } else {
                        config.institutionName = 'Firmas Digitales FD';
                    }
                } catch (error) {
                    console.warn('No se pudo obtener nombre de institución:', error);
                    config.institutionName = 'Firmas Digitales FD';
                }
            }

            this.adminPanel.showLoading('Generando vista previa...');

            // Crear un documento de ejemplo para preview
            const previewData = {
                titulo: 'Documento de Ejemplo - Vista Previa',
                institucion: config.institutionName || 'Universidad Ejemplo',
                autores: ['Autor de Ejemplo'],
                avalador: 'Avalador de Ejemplo',
                fecha: new Date().toLocaleDateString('es-ES'),
                contenido: 'Este es un documento de ejemplo para mostrar cómo se verá el PDF con la configuración actual. Incluye todos los elementos configurables como márgenes, fuentes, colores y elementos visuales.',
                signatureData: null,
                logo: config.logoPath || null
            };

            const response = await fetch('/api/generate-pdf-preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: previewData,
                    config: config
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Abrir PDF en nueva ventana
                window.open(url, '_blank');

                window.showNotification('Vista previa generada correctamente', 'success');
            } else {
                throw new Error('Error al generar vista previa');
            }
        } catch (error) {
            console.error('Error generando vista previa:', error);
            window.showNotification('Error al generar vista previa', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    async resetPdfConfiguration() {
        if (!confirm('¿Estás seguro de que quieres restablecer toda la configuración PDF a los valores por defecto? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            this.adminPanel.showLoading('Restableciendo configuración...');

            // Resetear todos los campos del formulario
            this.populatePdfForm(this.getDefaultPdfConfig());

            // Guardar configuración por defecto
            await this.savePdfConfiguration();

            window.showNotification('Configuración restablecida correctamente', 'success');
        } catch (error) {
            console.error('Error restableciendo configuración:', error);
            window.showNotification('Error al restablecer configuración', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    getDefaultPdfConfig() {
        return {
            selectedTemplate: 'clasico',
            institutionName: 'Universidad Ejemplo',
            logoPath: '../../recursos/logotipo-de-github.png',
            colorConfig: {
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#f59e0b',
                text: '#1f2937',
                background: '#ffffff'
            },
            fontConfig: {
                title: 'Helvetica-Bold',
                body: 'Helvetica',
                metadata: 'Helvetica-Oblique',
                signature: 'Times-Bold'
            },
            layoutConfig: {
                marginTop: 60,
                marginBottom: 60,
                marginLeft: 50,
                marginRight: 50,
                lineHeight: 1.6,
                titleSize: 24,
                bodySize: 12
            },
            borderConfig: {
                style: 'classic',
                width: 2,
                color: '#1f2937',
                cornerRadius: 0,
                showDecorative: true
            },
            visualConfig: {
                showLogo: true,
                showInstitution: true,
                showDate: true,
                showSignature: true,
                showAuthors: true,
                showAvalador: true
            }
        };
    }

    async updatePdfPreview(config = null) {
        const preview = document.getElementById('pdfConfigPreview');
        if (!preview) return;

        const currentConfig = config || await this.getCurrentPdfConfig();

        preview.innerHTML = `
            <div class="pdf-preview-page">
                <div class="pdf-preview-margins" style="
                    margin: ${currentConfig.margins?.top || 20}px ${currentConfig.margins?.right || 20}px 
                           ${currentConfig.margins?.bottom || 20}px ${currentConfig.margins?.left || 20}px;
                ">
                    <div class="pdf-preview-content" style="
                        font-size: ${currentConfig.fontSize || 12}px;
                        font-family: ${currentConfig.fontFamily || 'Arial'};
                    ">
                        <h3>Documento de Ejemplo</h3>
                        <p>Este es un ejemplo de cómo se verá el documento PDF con la configuración actual.</p>
                        <div class="signature-placeholder" style="
                            position: absolute;
                            left: ${currentConfig.signaturePosition?.x || 100}px;
                            top: ${currentConfig.signaturePosition?.y || 100}px;
                            width: ${currentConfig.signatureSize?.width || 150}px;
                            height: ${currentConfig.signatureSize?.height || 50}px;
                            border: 2px dashed #3b82f6;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            color: #3b82f6;
                        ">
                            Firma Digital
                        </div>
                        ${currentConfig.watermark?.text ? `
                            <div class="watermark" style="
                                position: absolute;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%) rotate(-45deg);
                                font-size: 48px;
                                color: rgba(0, 0, 0, ${currentConfig.watermark.opacity || 0.3});
                                pointer-events: none;
                                font-weight: bold;
                            ">
                                ${currentConfig.watermark.text}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getCurrentPdfConfig() {
        return {
            margins: {
                top: document.getElementById('pdfMarginTop')?.value || 20,
                bottom: document.getElementById('pdfMarginBottom')?.value || 20,
                left: document.getElementById('pdfMarginLeft')?.value || 20,
                right: document.getElementById('pdfMarginRight')?.value || 20
            },
            fontSize: document.getElementById('pdfFontSize')?.value || 12,
            fontFamily: document.getElementById('pdfFontFamily')?.value || 'Arial',
            signaturePosition: {
                x: document.getElementById('signaturePositionX')?.value || 100,
                y: document.getElementById('signaturePositionY')?.value || 100
            },
            signatureSize: {
                width: document.getElementById('signatureWidth')?.value || 150,
                height: document.getElementById('signatureHeight')?.value || 50
            },
            includeTimestamp: document.getElementById('includeTimestamp')?.checked || false,
            includeMetadata: document.getElementById('includeMetadata')?.checked || false,
            watermark: {
                text: document.getElementById('watermarkText')?.value || '',
                opacity: document.getElementById('watermarkOpacity')?.value || 0.3
            }
        };
    }

    async savePdfConfiguration() {
        try {
            const selectedTemplate = document.getElementById('pdfSelectedTemplate');
            if (!selectedTemplate || !selectedTemplate.value) {
                window.showNotification('Selecciona un template para configurar', 'warning');
                return;
            }

            const config = await this.getCurrentPdfConfig();

            // Obtener token de autenticación
            const token = localStorage.getItem('token') || localStorage.getItem('admin_token');

            const response = await fetch('/api/admin/pdf/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                window.showNotification('Configuración PDF guardada correctamente', 'success');
            } else {
                throw new Error('Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error guardando configuración PDF:', error);
            window.showNotification('Error al guardar configuración PDF', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    async generatePdfPreview() {
        try {
            const config = await this.getCurrentPdfConfig();

            this.adminPanel.showLoading('Generando vista previa...');

            // Obtener token de autenticación
            const token = localStorage.getItem('token') || localStorage.getItem('admin_token');

            const response = await fetch(`${this.adminPanel.apiBase}/pdf/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Abrir PDF en nueva ventana
                window.open(url, '_blank');

                window.showNotification('Vista previa generada correctamente', 'success');
            } else {
                // Intentar obtener el mensaje de error del servidor
                let errorMessage = 'Error al generar vista previa';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // Si no se puede parsear como JSON, usar el status
                    errorMessage = `Error ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error generando vista previa:', error);
            window.showNotification('Error al generar vista previa', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    /* ========================================
       CONFIGURACIÓN DE BASE DE DATOS
       ======================================== */
    async loadDatabaseConfig() {
        try {
            const result = await this.adminPanel.authenticatedFetch(`${this.adminPanel.apiBase}/database/config`);
            if (result.success) {
                this.dbConfig = result.config;
                this.populateDatabaseConfiguration();
                this.updateDatabaseStatus();
            } else {
                console.error('Error cargando configuración de DB:', result.message);
            }
        } catch (error) {
            console.error('Error cargando configuración de DB:', error);
        }
    }

    populateDatabaseConfiguration() {
        const fields = {
            'dbHost': this.dbConfig.host || 'localhost',
            'dbPort': this.dbConfig.port || 5432,
            'dbName': this.dbConfig.database || 'firmas_digitales',
            'dbUser': this.dbConfig.user || 'postgres',
            'dbMaxConnections': this.dbConfig.maxConnections || 10,
            'dbConnectionTimeout': this.dbConfig.connectionTimeout || 30000,
            'dbQueryTimeout': this.dbConfig.queryTimeout || 5000,
            'dbSslMode': this.dbConfig.ssl?.mode || 'prefer',
            'dbBackupFrequency': this.dbConfig.backup?.frequency || 'daily',
            'dbBackupRetention': this.dbConfig.backup?.retention || 30
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value;
            }
        });
    }

    setupDatabaseConfiguration() {
        // Configuración de conexión
        const dbConfigInputs = document.querySelectorAll('#databaseTab input, #databaseTab select');
        dbConfigInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.validateDatabaseConfig();
            });
        });

        // Backup manual
        const manualBackupBtn = document.getElementById('manualBackup');
        if (manualBackupBtn) {
            manualBackupBtn.addEventListener('click', () => {
                this.createManualBackup();
            });
        }

        // Optimizar base de datos
        const optimizeBtn = document.getElementById('optimizeDatabase');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => {
                this.optimizeDatabase();
            });
        }

        // Ver estadísticas de DB
        const statsBtn = document.getElementById('viewDbStats');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                this.showDatabaseStats();
            });
        }
    }

    async testDatabaseConnection() {
        try {
            this.adminPanel.showLoading('Probando conexión a la base de datos...');

            const config = this.getCurrentDatabaseConfig();

            const response = await fetch(`${this.adminPanel.apiBase}/database/test-connection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`
                },
                body: JSON.stringify(config)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.updateConnectionStatus('connected', result);
                window.showNotification('Conexión exitosa a la base de datos', 'success');
            } else {
                this.updateConnectionStatus('disconnected', result);
                window.showNotification(
                    result.error || 'Error de conexión a la base de datos',
                    'error'
                );
            }
        } catch (error) {
            console.error('Error probando conexión:', error);
            this.updateConnectionStatus('disconnected', { error: error.message });
            window.showNotification('Error al probar conexión', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    updateConnectionStatus(status, result) {
        const statusCard = document.querySelector('.db-status-card');
        if (!statusCard) return;

        const icon = statusCard.querySelector('.db-status-icon');
        const text = statusCard.querySelector('.db-status-text');

        if (status === 'connected') {
            icon.className = 'db-status-icon connected';
            icon.innerHTML = '✅';
            text.innerHTML = `
                <h4>Conexión Exitosa</h4>
                <p>Base de datos conectada correctamente</p>
                <div class="connection-details">
                    <small>Tiempo de respuesta: ${result.responseTime}ms</small>
                    <small>Versión: ${result.version || 'N/A'}</small>
                </div>
            `;
        } else {
            icon.className = 'db-status-icon disconnected';
            icon.innerHTML = '❌';
            text.innerHTML = `
                <h4>Error de Conexión</h4>
                <p>${result.error || 'No se pudo conectar a la base de datos'}</p>
            `;
        }

        // Actualizar indicador global
        this.updateDatabaseStatus();
    }

    async updateDatabaseStatus() {
        try {
            const result = await this.adminPanel.authenticatedFetch(`${this.adminPanel.apiBase}/database/status`);
            if (result.success) {
                this.renderDatabaseMetrics(result);
            } else {
                console.error('Error actualizando estado de DB:', result.message);
            }
        } catch (error) {
            console.error('Error actualizando estado de DB:', error);
        }
    }

    renderDatabaseMetrics(status) {
        const metricsContainer = document.getElementById('dbMetrics');
        if (!metricsContainer) return;

        metricsContainer.innerHTML = `
            <div class="db-metric">
                <h5>Conexiones Activas</h5>
                <span class="metric-value">${status.activeConnections || 0}</span>
            </div>
            <div class="db-metric">
                <h5>Tamaño de BD</h5>
                <span class="metric-value">${this.formatBytes(status.databaseSize || 0)}</span>
            </div>
            <div class="db-metric">
                <h5>Tablas</h5>
                <span class="metric-value">${status.tableCount || 0}</span>
            </div>
            <div class="db-metric">
                <h5>Último Backup</h5>
                <span class="metric-value">${this.formatDate(status.lastBackup)}</span>
            </div>
        `;
    }

    getCurrentDatabaseConfig() {
        return {
            host: document.getElementById('dbHost')?.value || 'localhost',
            port: parseInt(document.getElementById('dbPort')?.value) || 5432,
            database: document.getElementById('dbName')?.value || 'firmas_digitales',
            user: document.getElementById('dbUser')?.value || 'postgres',
            password: document.getElementById('dbPassword')?.value || '',
            maxConnections: parseInt(document.getElementById('dbMaxConnections')?.value) || 10,
            connectionTimeout: parseInt(document.getElementById('dbConnectionTimeout')?.value) || 30000,
            queryTimeout: parseInt(document.getElementById('dbQueryTimeout')?.value) || 5000,
            ssl: {
                mode: document.getElementById('dbSslMode')?.value || 'prefer'
            },
            backup: {
                frequency: document.getElementById('dbBackupFrequency')?.value || 'daily',
                retention: parseInt(document.getElementById('dbBackupRetention')?.value) || 30
            }
        };
    }

    validateDatabaseConfig() {
        const config = this.getCurrentDatabaseConfig();
        const errors = [];

        if (!config.host) errors.push('Host es requerido');
        if (!config.port || config.port < 1 || config.port > 65535) errors.push('Puerto inválido');
        if (!config.database) errors.push('Nombre de base de datos es requerido');
        if (!config.user) errors.push('Usuario es requerido');

        const errorContainer = document.getElementById('dbConfigErrors');
        if (errorContainer) {
            if (errors.length > 0) {
                errorContainer.innerHTML = `
                    <div class="admin-alert error">
                        <div class="admin-alert-content">
                            <h4>Errores de Configuración</h4>
                            <ul>${errors.map(error => `<li>${error}</li>`).join('')}</ul>
                        </div>
                    </div>
                `;
            } else {
                errorContainer.innerHTML = '';
            }
        }

        return errors.length === 0;
    }

    async saveDatabaseConfiguration() {
        try {
            if (!this.validateDatabaseConfig()) {
                window.showNotification('Corrige los errores de configuración', 'error');
                return;
            }

            const config = this.getCurrentDatabaseConfig();

            this.adminPanel.showLoading('Guardando configuración de base de datos...');

            const response = await fetch(`${this.adminPanel.apiBase}/database/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.dbConfig = config;
                window.showNotification('Configuración de base de datos guardada', 'success');
            } else {
                throw new Error('Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error guardando configuración de DB:', error);
            window.showNotification('Error al guardar configuración de base de datos', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    /* ========================================
       SISTEMA AVANZADO Y LOGS
       ======================================== */
    async loadSystemInfo() {
        try {
            const response = await fetch(`${this.adminPanel.apiBase}/system/info`);
            if (response.ok) {
                this.systemInfo = await response.json();
                this.renderSystemInfo();
            }
        } catch (error) {
            console.error('Error cargando información del sistema:', error);
        }
    }

    renderSystemInfo() {
        const container = document.querySelector('.system-info-grid');
        if (!container) return;

        const info = this.systemInfo;

        container.innerHTML = `
            <div class="system-info-item">
                <h5>Versión del Sistema</h5>
                <div class="value">${info.version || '1.0.0'}</div>
                <div class="description">Versión actual</div>
            </div>
            <div class="system-info-item">
                <h5>Node.js</h5>
                <div class="value">${info.nodeVersion || 'N/A'}</div>
                <div class="description">Versión de Node</div>
            </div>
            <div class="system-info-item">
                <h5>Memoria RAM</h5>
                <div class="value">${this.formatBytes(info.memoryUsage?.rss || 0)}</div>
                <div class="description">Memoria en uso</div>
            </div>
            <div class="system-info-item">
                <h5>Uptime</h5>
                <div class="value">${this.formatUptime(info.uptime || 0)}</div>
                <div class="description">Tiempo activo</div>
            </div>
            <div class="system-info-item">
                <h5>CPU</h5>
                <div class="value">${info.cpuUsage || 'N/A'}%</div>
                <div class="description">Uso de CPU</div>
            </div>
            <div class="system-info-item">
                <h5>Disco</h5>
                <div class="value">${this.formatBytes(info.diskUsage?.free || 0)}</div>
                <div class="description">Espacio libre</div>
            </div>
        `;
    }

    setupLogViewer() {
        this.loadSystemLogs();

        // Auto-refresh logs cada 30 segundos
        setInterval(() => {
            if (this.adminPanel.currentTab === 'advanced') {
                this.loadSystemLogs();
            }
        }, 30000);

        // Filtros de logs
        const logFilters = document.querySelectorAll('.log-filter');
        logFilters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.filterLogs();
            });
        });
    }

    async loadSystemLogs() {
        try {
            const result = await this.adminPanel.authenticatedFetch(`${this.adminPanel.apiBase}/system/logs`);
            if (result.success) {
                this.logs = result.logs || [];
                this.renderLogs();
            } else {
                console.error('Error cargando logs:', result.message);
                this.logs = [];
                this.renderLogs();
            }
        } catch (error) {
            console.error('Error cargando logs:', error);
            this.logs = [];
            this.renderLogs();
        }
    }

    renderLogs() {
        const container = document.querySelector('.log-viewer');
        if (!container) return;

        if (this.logs.length === 0) {
            container.innerHTML = '<div class="log-entry">No hay logs disponibles</div>';
            return;
        }

        const logsHTML = this.logs.map(log => `
            <div class="log-entry">
                <span class="log-timestamp">[${this.formatLogTime(log.timestamp)}]</span>
                <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                <span class="log-message">${log.message}</span>
                ${log.details ? `<div class="log-details">${log.details}</div>` : ''}
            </div>
        `).join('');

        container.innerHTML = logsHTML;

        // Auto-scroll hacia abajo
        container.scrollTop = container.scrollHeight;
    }

    filterLogs() {
        const levelFilter = document.getElementById('logLevelFilter')?.value;
        const searchTerm = document.getElementById('logSearch')?.value?.toLowerCase();

        let filteredLogs = this.logs;

        if (levelFilter && levelFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level === levelFilter);
        }

        if (searchTerm) {
            filteredLogs = filteredLogs.filter(log =>
                log.message.toLowerCase().includes(searchTerm) ||
                (log.details && log.details.toLowerCase().includes(searchTerm))
            );
        }

        // Renderizar logs filtrados
        const container = document.querySelector('.log-viewer');
        if (container) {
            const logsHTML = filteredLogs.map(log => `
                <div class="log-entry">
                    <span class="log-timestamp">[${this.formatLogTime(log.timestamp)}]</span>
                    <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                    <span class="log-message">${log.message}</span>
                    ${log.details ? `<div class="log-details">${log.details}</div>` : ''}
                </div>
            `).join('');

            container.innerHTML = logsHTML || '<div class="log-entry">No se encontraron logs</div>';
        }
    }

    async clearSystemLogs() {
        try {
            const confirmed = confirm('¿Estás seguro de que quieres limpiar todos los logs del sistema?');
            if (!confirmed) return;

            this.adminPanel.showLoading('Limpiando logs...');

            const response = await fetch(`${this.adminPanel.apiBase}/system/logs`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.logs = [];
                this.renderLogs();
                window.showNotification('Logs limpiados correctamente', 'success');
            } else {
                throw new Error('Error al limpiar logs');
            }
        } catch (error) {
            console.error('Error limpiando logs:', error);
            window.showNotification('Error al limpiar logs', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    /* ========================================
       BACKUP Y RESTAURACIÓN
       ======================================== */
    async createSystemBackup() {
        try {
            this.adminPanel.showLoading('Creando backup del sistema...');

            const response = await fetch(`${this.adminPanel.apiBase}/system/backup`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();

                // Descargar backup
                const link = document.createElement('a');
                link.href = result.downloadUrl;
                link.download = result.filename;
                link.click();

                window.showNotification('Backup creado y descargado correctamente', 'success');
            } else {
                throw new Error('Error al crear backup');
            }
        } catch (error) {
            console.error('Error creando backup:', error);
            window.showNotification('Error al crear backup del sistema', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    setupSystemMonitoring() {
        // Monitorear métricas del sistema cada minuto
        setInterval(() => {
            if (this.adminPanel.currentTab === 'advanced') {
                this.loadSystemInfo();
            }
        }, 60000);
    }

    /* ========================================
       UTILIDADES
       ======================================== */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    formatLogTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('es-ES');
    }

    formatDate(dateString) {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString('es-ES');
    }
}

// Funciones globales para ser llamadas desde HTML
function savePdfConfig() {
    if (window.adminPanel && window.adminPanel.advancedConfig) {
        window.adminPanel.advancedConfig.savePdfConfiguration();
    }
}

function previewPdfConfig() {
    if (window.adminPanel && window.adminPanel.advancedConfig) {
        window.adminPanel.advancedConfig.generatePdfPreview();
    }
}

function resetPdfConfig() {
    if (window.adminPanel && window.adminPanel.advancedConfig) {
        window.adminPanel.advancedConfig.resetPdfConfiguration();
    }
}

// Hacer funciones disponibles globalmente
window.savePdfConfig = savePdfConfig;
window.previewPdfConfig = previewPdfConfig;
window.resetPdfConfig = resetPdfConfig;

// Exportar para uso en el panel principal
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedConfiguration;
}
