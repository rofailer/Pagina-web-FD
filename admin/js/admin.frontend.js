/* ========================================
   PANEL ADMINISTRATIVO - JAVASCRIPT PRINCIPAL
   Sistema de gestión integral para administración del sitio
   ======================================== */

class AdminPanel {
    constructor() {
        this.currentTab = 'configuracion-general';
        this.isLoading = false;
        this.config = {};
        this.users = [];
        this.apiBase = '/api/admin';

        // Bindear métodos al contexto
        this.handleTabChange = this.handleTabChange.bind(this);
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        // Eliminado: this.handleMobileToggle = this.handleMobileToggle.bind(this);

        this.init();
    }

    /* ========================================
       INICIALIZACIÓN
       ======================================== */
    init() {

        this.loadConfiguration();
        this.setupEventListeners();
        // Eliminado: setupMobileNavigation() - manejado por panelAdmin.js
        // No cargar métricas automáticamente hasta que se autentique
        // this.updateMetrics();
        // this.loadSystemStatus();
        this.setupAutoSave();

        // Activar primera pestaña
        this.switchTab('configuracion-general');

    }

    /* ========================================
       CONFIGURACIÓN DE EVENTOS
       ======================================== */
    setupEventListeners() {
        // Navegación de pestañas
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.addEventListener('click', this.handleTabChange);
        });

        // Formularios
        document.querySelectorAll('.admin-form').forEach(form => {
            form.addEventListener('submit', this.handleFormSubmit);
        });

        // Upload de archivos
        document.querySelectorAll('.admin-file-input').forEach(input => {
            input.addEventListener('change', this.handleFileUpload.bind(this));
        });

        // Selector de temas - ELIMINADO (temas manejados por themeManager.js)
        /* document.querySelectorAll('.admin-theme-card').forEach(card => {
            card.addEventListener('click', this.handleThemeSelect.bind(this));
        }); */

        // Switches y toggles
        document.querySelectorAll('.admin-switch input').forEach(toggle => {
            toggle.addEventListener('change', this.handleToggleChange.bind(this));
        });

        // Inputs con vista previa
        document.querySelectorAll('.admin-input[data-preview]').forEach(input => {
            input.addEventListener('input', this.handleInputPreview.bind(this));
        });

        // Botones de acción específicos
        this.setupActionButtons();

        // Gestión de usuarios
        this.setupUserManagement();

        // Configuración de base de datos
        this.setupDatabaseConfig();
    }

    setupActionButtons() {
        // Botón de guardar configuración general
        const saveGeneralBtn = document.getElementById('saveGeneralConfig');
        if (saveGeneralBtn) {
            saveGeneralBtn.addEventListener('click', () => this.saveGeneralConfig());
        }

        // Botón de crear usuario
        const createUserBtn = document.getElementById('createUserBtn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => this.showCreateUserModal());
        }

        // Botón de aplicar tema - DESHABILITADO (temas manejados por panelAdmin.js)
        /* const applyThemeBtn = document.getElementById('applyThemeBtn');
        if (applyThemeBtn) {
            applyThemeBtn.addEventListener('click', () => this.applySelectedTheme());
        } */

        // Botón de guardar configuración PDF
        const savePdfBtn = document.getElementById('savePdfConfig');
        if (savePdfBtn) {
            savePdfBtn.addEventListener('click', () => this.savePdfConfiguration());
        }

        // Botón de test de conexión DB
        const testDbBtn = document.getElementById('testDbConnection');
        if (testDbBtn) {
            testDbBtn.addEventListener('click', () => this.testDatabaseConnection());
        }

        // Botón de backup
        const backupBtn = document.getElementById('createBackup');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.createSystemBackup());
        }
    }

    /* ========================================
       GESTIÓN DE PESTAÑAS
       ======================================== */
    handleTabChange(event) {
        event.preventDefault();
        const tabId = event.currentTarget.dataset.tab;
        if (tabId) {
            this.switchTab(tabId);
            this.closeMobileSidebar(); // Cerrar sidebar en móvil
        }
    }

    switchTab(tabId) {

        // Actualizar navegación activa
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tab === tabId) {
                item.classList.add('active');
            }
        });

        // Mostrar contenido de pestaña
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === `tab-${tabId}`) {
                content.classList.add('active');
            }
        });

        this.currentTab = tabId;

        // Cargar datos específicos de la pestaña
        this.loadTabData(tabId);
    }

    /* ========================================
       GESTIÓN DE SIDEBAR MÓVIL
       ======================================== */
    closeMobileSidebar() {
        const sidebar = document.querySelector('.admin-sidebar');
        const mobileToggle = document.getElementById('mobileToggleBtn');

        if (sidebar && mobileToggle) {
            // Remover clase de sidebar abierto
            sidebar.classList.remove('mobile-open');

            // Resetear el botón hamburguesa
            mobileToggle.setAttribute('aria-label', 'Abrir menú');
            mobileToggle.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M3 12h18M3 6h18M3 18h18"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                </svg>
            `;
        }
    }

    async loadTabData(tabId) {
        switch (tabId) {
            case 'configuracion-general':
                await this.loadConfiguration();
                break;
            case 'gestion-usuarios':
                await this.loadUsers();
                break;
            case 'personalizacion':
                // Cargar configuración inicial - temas manejados por themeManager.js
                // await this.loadThemes(); // ELIMINADO - Sistema de temas ahora es unificado
                break;
            case 'configuracion-pdf':
                await this.loadPdfConfiguration();
                break;
            case 'base-datos':
                await this.loadDatabaseStatus();
                break;
            case 'sistema-avanzado':
                await this.loadSystemInfo();
                break;
        }
    }

    /* ========================================
       CONFIGURACIÓN GENERAL
       ======================================== */
    async loadConfiguration() {
        try {
            this.showLoading('Cargando configuración...');

            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBase}/config`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.config = await response.json();
                this.populateConfigurationForm();
            } else {
                console.error('Error en la respuesta:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
            this.showNotification('Error al cargar la configuración', 'error');
        } finally {
            this.hideLoading();
        }
    }

    populateConfigurationForm() {
        // Llenar campos del formulario con la configuración actual
        const fields = {
            'siteTitle': this.config.siteTitle || 'Firmas Digitales FD',
            'headerTitle': this.config.headerTitle || 'Firmas Digitales FD',
            'footerText': this.config.footerText || '© 2024 Firmas Digitales FD',
            'contactEmail': this.config.contactEmail || '',
            'contactPhone': this.config.contactPhone || '',
            'maintenanceMode': this.config.maintenanceMode || false
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }

                // Activar vista previa si está disponible
                if (element.hasAttribute('data-preview')) {
                    this.updatePreview(element);
                }
            }
        });
    }

    async saveGeneralConfig() {
        try {
            this.showLoading('Guardando configuración...');

            const formData = new FormData(document.getElementById('generalConfigForm'));
            const config = Object.fromEntries(formData.entries());

            // Convertir checkboxes
            config.maintenanceMode = document.getElementById('maintenanceMode').checked;

            const response = await fetch(`${this.apiBase}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.config = { ...this.config, ...config };
                this.showNotification('Configuración guardada correctamente', 'success');

                // Actualizar título en tiempo real
                this.updateLivePreview();
            } else {
                throw new Error('Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error guardando configuración:', error);
            this.showNotification('Error al guardar la configuración', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /* ========================================
       GESTIÓN DE USUARIOS
       ======================================== */
    setupUserManagement() {
        // Event listeners específicos para usuarios
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('user-action-btn')) {
                const action = e.target.dataset.action;
                const userId = e.target.dataset.userId;

                switch (action) {
                    case 'edit':
                        this.editUser(userId);
                        break;
                    case 'delete':
                        this.deleteUser(userId);
                        break;
                    case 'toggle-status':
                        this.toggleUserStatus(userId);
                        break;
                }
            }
        });
    }

    async loadUsers() {
        try {
            const response = await fetch(`${this.apiBase}/users`);
            if (response.ok) {
                this.users = await response.json();
                this.renderUsersList();
            }
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            this.showNotification('Error al cargar usuarios', 'error');
        }
    }

    renderUsersList() {
        const container = document.getElementById('usersList');
        if (!container) return;

        if (this.users.length === 0) {
            container.innerHTML = `
                <div class="admin-alert info">
                    <div class="admin-alert-content">
                        <h4>No hay usuarios registrados</h4>
                        <p>Crea el primer usuario para comenzar a usar el sistema.</p>
                    </div>
                </div>
            `;
            return;
        }

        const usersHTML = this.users.map(user => `
            <div class="admin-user-row">
                <div class="user-info">
                    <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <h4>${user.name}</h4>
                        <span>${user.email}</span>
                    </div>
                </div>
                <div class="user-role ${user.role}">${this.translateRole(user.role)}</div>
                <div class="user-status ${user.status}">${this.translateStatus(user.status)}</div>
                <div class="user-actions">
                    <button class="user-action-btn edit" data-action="edit" data-user-id="${user.id}" title="Editar">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button class="user-action-btn delete" data-action="delete" data-user-id="${user.id}" title="Eliminar">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="admin-user-header">
                <span>Usuario</span>
                <span>Rol</span>
                <span>Estado</span>
                <span>Acciones</span>
            </div>
            ${usersHTML}
        `;
    }

    showCreateUserModal() {
        const modalHTML = `
            <div class="admin-modal" id="createUserModal">
                <div class="admin-modal-content">
                    <div class="admin-modal-header">
                        <h3>Crear Nuevo Usuario</h3>
                        <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">×</button>
                    </div>
                    <div class="admin-modal-body">
                        <form id="createUserForm" class="admin-form">
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label for="newUserName">Nombre Completo</label>
                                    <input type="text" id="newUserName" name="name" class="admin-input" required>
                                </div>
                                <div class="admin-form-group">
                                    <label for="newUserEmail">Correo Electrónico</label>
                                    <input type="email" id="newUserEmail" name="email" class="admin-input" required>
                                </div>
                                <div class="admin-form-group">
                                    <label for="newUserPassword">Contraseña</label>
                                    <input type="password" id="newUserPassword" name="password" class="admin-input" required>
                                </div>
                                <div class="admin-form-group">
                                    <label for="newUserRole">Rol</label>
                                    <select id="newUserRole" name="role" class="admin-select" required>
                                        <option value="user">Usuario</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="admin-modal-footer">
                        <button type="button" class="admin-btn secondary" onclick="this.closest('.admin-modal').remove()">Cancelar</button>
                        <button type="button" class="admin-btn primary" onclick="adminPanel.createUser()">Crear Usuario</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async createUser() {
        try {
            const form = document.getElementById('createUserForm');
            const formData = new FormData(form);
            const userData = Object.fromEntries(formData.entries());

            const response = await fetch(`${this.apiBase}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const newUser = await response.json();
                this.users.push(newUser);
                this.renderUsersList();
                this.updateMetrics();

                document.getElementById('createUserModal').remove();
                this.showNotification('Usuario creado correctamente', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error al crear usuario');
            }
        } catch (error) {
            console.error('Error creando usuario:', error);
            this.showNotification(error.message || 'Error al crear usuario', 'error');
        }
    }

    /* ========================================
       UTILIDADES Y HELPERS
       ======================================== */
    translateRole(role) {
        const roles = {
            'owner': 'Propietario',
            'admin': 'Administrador',
            'user': 'Usuario'
        };
        return roles[role] || role;
    }

    translateStatus(status) {
        const statuses = {
            'active': 'Activo',
            'inactive': 'Inactivo'
        };
        return statuses[status] || status;
    }

    handleInputPreview(event) {
        this.updatePreview(event.target);
    }

    updatePreview(input) {
        const previewId = input.getAttribute('data-preview');
        const preview = document.getElementById(previewId);

        if (preview) {
            preview.textContent = input.value || input.placeholder;
        }
    }

    updateLivePreview() {
        // Actualizar título del header si está visible
        const headerTitle = document.getElementById('tituloWeb');
        if (headerTitle && this.config.headerTitle) {
            headerTitle.textContent = this.config.headerTitle;
        }

        // Actualizar título de la página
        if (this.config.siteTitle) {
            document.title = `Admin - ${this.config.siteTitle}`;
        }
    }

    async updateMetrics() {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/metrics`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const metrics = await response.json();
                this.renderMetrics(metrics);
            }
        } catch (error) {
            console.error('Error actualizando métricas:', error);
        }
    }

    renderMetrics(metrics) {
        const elements = {
            'totalUsers': metrics.totalUsers || 0,
            'activeUsers': metrics.activeUsers || 0,
            'totalSignatures': metrics.totalSignatures || 0,
            'systemStatus': metrics.systemStatus || 'Online'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.querySelector(`[data-metric="${id}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }

    async loadSystemStatus() {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const status = await response.json();
                this.updateSystemStatus(status);
            }
        } catch (error) {
            console.error('Error cargando estado del sistema:', error);
        }
    }

    updateSystemStatus(status) {
        const indicator = document.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = `status-indicator ${status.online ? 'online' : 'offline'}`;
        }

        const statusText = document.querySelector('.system-status span');
        if (statusText) {
            statusText.textContent = status.online ? 'Sistema Online' : 'Sistema Offline';
        }
    }

    setupAutoSave() {
        // Auto guardado cada 30 segundos para campos importantes
        setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.autoSave();
            }
        }, 30000);
    }

    hasUnsavedChanges() {
        // Implementar lógica para detectar cambios no guardados
        return false; // Placeholder
    }

    async autoSave() {
        // Implementar auto guardado silencioso
    }

    /* ========================================
       UI Y NOTIFICACIONES
       ======================================== */
    showLoading(message = 'Cargando...') {
        if (document.querySelector('.admin-loading')) return;

        const loadingHTML = `
            <div class="admin-loading">
                <div class="admin-loading-content">
                    <div class="admin-spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        this.isLoading = true;
    }

    hideLoading() {
        const loading = document.querySelector('.admin-loading');
        if (loading) {
            loading.remove();
        }
        this.isLoading = false;
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

        // Posicionar notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 16px;
            border-left: 4px solid var(--admin-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'});
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Auto cerrar
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);

        // Cerrar manual
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
    }

    handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formId = form.id;


        // Aquí se puede agregar lógica específica por formulario
        switch (formId) {
            case 'generalConfigForm':
                this.saveGeneralConfig();
                break;
            case 'createUserForm':
                this.createUser();
                break;
            // Agregar más casos según sea necesario
        }
    }

    handleToggleChange(event) {
        const toggle = event.target;
        const action = toggle.dataset.action;


        // Ejecutar acción específica del toggle
        if (action === 'maintenanceMode') {
            this.toggleMaintenanceMode(toggle.checked);
        }
    }

    async toggleMaintenanceMode(enabled) {
        try {
            const response = await fetch(`${this.apiBase}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ enabled })
            });

            if (response.ok) {
                this.showNotification(
                    `Modo mantenimiento ${enabled ? 'activado' : 'desactivado'}`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Error cambiando modo mantenimiento:', error);
            this.showNotification('Error al cambiar modo mantenimiento', 'error');
        }
    }

    handleFileUpload(event) {
        const input = event.target;
        const file = input.files[0];

        if (!file) return;

        // Vista previa para favicon
        if (input.id === 'faviconUpload') {
            this.previewFavicon(file);
        }

        // Subir archivo
        this.uploadFile(input, file);
    }

    previewFavicon(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('faviconPreview');
            if (preview) {
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Favicon Preview">
                    <span>Nuevo favicon seleccionado</span>
                `;
                preview.style.display = 'flex';
            }
        };
        reader.readAsDataURL(file);
    }

    async uploadFile(input, file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', input.dataset.type || 'general');

            this.showLoading('Subiendo archivo...');

            const response = await fetch(`${this.apiBase}/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Archivo subido correctamente', 'success');

                // Actualizar configuración si es necesario
                if (input.dataset.configKey) {
                    this.config[input.dataset.configKey] = result.url;
                }
            } else {
                throw new Error('Error al subir archivo');
            }
        } catch (error) {
            console.error('Error subiendo archivo:', error);
            this.showNotification('Error al subir archivo', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /* ========================================
       CONFIGURACIÓN DE BASE DE DATOS
       ======================================== */
    setupDatabaseConfig() {
        // Event listeners para la pestaña de base de datos
        const testConnectionBtn = document.getElementById('testDatabaseConnection');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testDatabaseConnection());
        }

        const backupBtn = document.getElementById('backupDatabase');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.backupDatabase());
        }

        const optimizeBtn = document.getElementById('optimizeDatabase');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => this.optimizeDatabase());
        }
    }

    async testDatabaseConnection() {
        try {
            this.showLoading('Probando conexión...');

            const response = await fetch(`${this.apiBase}/status`);
            const status = await response.json();

            if (status.online) {
                showNotification('Conexión a la base de datos exitosa', 'success');
            } else {
                showNotification('No se pudo conectar a la base de datos', 'error');
            }
        } catch (error) {
            console.error('Error probando conexión:', error);
            showNotification('Error al probar conexión a la base de datos', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async backupDatabase() {
        try {
            this.showLoading('Creando respaldo...');
            showNotification('Función de respaldo en desarrollo', 'info');
        } catch (error) {
            console.error('Error creando respaldo:', error);
            showNotification('Error al crear respaldo de la base de datos', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async optimizeDatabase() {
        try {
            this.showLoading('Optimizando base de datos...');
            showNotification('Función de optimización en desarrollo', 'info');
        } catch (error) {
            console.error('Error optimizando BD:', error);
            showNotification('Error al optimizar la base de datos', 'error');
        } finally {
            this.hideLoading();
        }
    }
}

/* ========================================
   INICIALIZACIÓN GLOBAL
   ======================================== */

// Variable global para acceso desde HTML
let adminPanel;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

// Agregar estilos CSS para las animaciones de notificaciones
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .admin-notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #64748b;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .notification-close:hover {
        color: #374151;
    }
`;

document.head.appendChild(notificationStyles);

/* ========================================
   EXPORTAR PARA OTROS MÓDULOS
   ======================================== */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPanel;
}
