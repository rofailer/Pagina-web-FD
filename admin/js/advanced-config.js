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

        this.init();
    }

    init() {
        this.setupConfigurationEvents();
        this.loadPdfTemplates();
        this.loadDatabaseConfig();
        this.setupLogViewer();
    }

    setupConfigurationEvents() {
        // Configuración PDF
        const pdfTemplateCards = document.querySelectorAll('.pdf-template-card');
        pdfTemplateCards.forEach(card => {
            card.addEventListener('click', () => {
                this.selectPdfTemplate(card.dataset.templateId);
            });
        });

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
            const response = await fetch(`${this.adminPanel.apiBase}/pdf/templates`);
            if (response.ok) {
                const templates = await response.json();
                this.renderPdfTemplates(templates);
            }
        } catch (error) {
            console.error('Error cargando templates PDF:', error);
        }
    }

    renderPdfTemplates(templates) {
        const container = document.querySelector('.pdf-template-grid');
        if (!container) return;

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
            card.addEventListener('click', () => {
                this.selectPdfTemplate(card.dataset.templateId);
            });
        });
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
        }

        // Cargar configuración específica del template
        this.loadTemplateConfiguration(templateId);
    }

    async loadTemplateConfiguration(templateId) {
        try {
            const response = await fetch(`${this.adminPanel.apiBase}/pdf/templates/${templateId}/config`);
            if (response.ok) {
                const config = await response.json();
                this.populatePdfConfiguration(config);
            }
        } catch (error) {
            console.error('Error cargando configuración de template:', error);
        }
    }

    populatePdfConfiguration(config) {
        const fields = {
            'pdfMarginTop': config.margins?.top || 20,
            'pdfMarginBottom': config.margins?.bottom || 20,
            'pdfMarginLeft': config.margins?.left || 20,
            'pdfMarginRight': config.margins?.right || 20,
            'pdfFontSize': config.fontSize || 12,
            'pdfFontFamily': config.fontFamily || 'Arial',
            'signaturePositionX': config.signaturePosition?.x || 100,
            'signaturePositionY': config.signaturePosition?.y || 100,
            'signatureWidth': config.signatureSize?.width || 150,
            'signatureHeight': config.signatureSize?.height || 50,
            'includeTimestamp': config.includeTimestamp || false,
            'includeMetadata': config.includeMetadata || false,
            'watermarkText': config.watermark?.text || '',
            'watermarkOpacity': config.watermark?.opacity || 0.3
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
        // Inputs de configuración PDF
        const pdfInputs = document.querySelectorAll('#pdfTab input, #pdfTab select');
        pdfInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updatePdfPreview();
            });
        });

        // Vista previa en tiempo real
        const previewBtn = document.getElementById('previewPdfTemplate');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.generatePdfPreview();
            });
        }
    }

    updatePdfPreview(config = null) {
        const preview = document.getElementById('pdfConfigPreview');
        if (!preview) return;

        const currentConfig = config || this.getCurrentPdfConfig();

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
            const activeTemplate = document.querySelector('.pdf-template-card.active');
            if (!activeTemplate) {
                this.adminPanel.showNotification('Selecciona un template para configurar', 'warning');
                return;
            }

            const templateId = activeTemplate.dataset.templateId;
            const config = this.getCurrentPdfConfig();

            this.adminPanel.showLoading('Guardando configuración PDF...');

            const response = await fetch(`${this.adminPanel.apiBase}/pdf/templates/${templateId}/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.adminPanel.showNotification('Configuración PDF guardada correctamente', 'success');
            } else {
                throw new Error('Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error guardando configuración PDF:', error);
            this.adminPanel.showNotification('Error al guardar configuración PDF', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    async generatePdfPreview() {
        try {
            const config = this.getCurrentPdfConfig();

            this.adminPanel.showLoading('Generando vista previa...');

            const response = await fetch(`${this.adminPanel.apiBase}/pdf/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Abrir PDF en nueva ventana
                window.open(url, '_blank');

                this.adminPanel.showNotification('Vista previa generada correctamente', 'success');
            } else {
                throw new Error('Error al generar vista previa');
            }
        } catch (error) {
            console.error('Error generando vista previa:', error);
            this.adminPanel.showNotification('Error al generar vista previa', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    /* ========================================
       CONFIGURACIÓN DE BASE DE DATOS
       ======================================== */
    async loadDatabaseConfig() {
        try {
            const response = await fetch(`${this.adminPanel.apiBase}/database/config`);
            if (response.ok) {
                this.dbConfig = await response.json();
                this.populateDatabaseConfiguration();
                this.updateDatabaseStatus();
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
                },
                body: JSON.stringify(config)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.updateConnectionStatus('connected', result);
                this.adminPanel.showNotification('Conexión exitosa a la base de datos', 'success');
            } else {
                this.updateConnectionStatus('disconnected', result);
                this.adminPanel.showNotification(
                    result.error || 'Error de conexión a la base de datos',
                    'error'
                );
            }
        } catch (error) {
            console.error('Error probando conexión:', error);
            this.updateConnectionStatus('disconnected', { error: error.message });
            this.adminPanel.showNotification('Error al probar conexión', 'error');
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
            const response = await fetch(`${this.adminPanel.apiBase}/database/status`);
            if (response.ok) {
                const status = await response.json();
                this.renderDatabaseMetrics(status);
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
                this.adminPanel.showNotification('Corrige los errores de configuración', 'error');
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
                this.adminPanel.showNotification('Configuración de base de datos guardada', 'success');
            } else {
                throw new Error('Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error guardando configuración de DB:', error);
            this.adminPanel.showNotification('Error al guardar configuración de base de datos', 'error');
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
            const response = await fetch(`${this.adminPanel.apiBase}/system/logs`);
            if (response.ok) {
                this.logs = await response.json();
                this.renderLogs();
            }
        } catch (error) {
            console.error('Error cargando logs:', error);
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
                this.adminPanel.showNotification('Logs limpiados correctamente', 'success');
            } else {
                throw new Error('Error al limpiar logs');
            }
        } catch (error) {
            console.error('Error limpiando logs:', error);
            this.adminPanel.showNotification('Error al limpiar logs', 'error');
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

                this.adminPanel.showNotification('Backup creado y descargado correctamente', 'success');
            } else {
                throw new Error('Error al crear backup');
            }
        } catch (error) {
            console.error('Error creando backup:', error);
            this.adminPanel.showNotification('Error al crear backup del sistema', 'error');
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

// Exportar para uso en el panel principal
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedConfiguration;
}
