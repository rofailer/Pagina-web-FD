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

        // Instanciar UserManagement
        this.userManagement = new UserManagement(this);

        // Bindear métodos al contexto
        this.handleTabChange = this.handleTabChange.bind(this);
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        // Eliminado: this.handleMobileToggle = this.handleMobileToggle.bind(this);

        // Definir método updateInstitutionPreviews
        this.updateInstitutionPreviews = (institutionName) => {
            // Actualizar vista previa del header
            const headerPreview = document.getElementById('headerPreview');
            if (headerPreview) {
                headerPreview.textContent = institutionName;
            }

            // Actualizar vista previa del footer
            const footerPreview = document.getElementById('footerPreview');
            if (footerPreview) {
                footerPreview.textContent = institutionName;
            }

            // Actualizar vista previa del título
            const titlePreview = document.getElementById('titlePreview');
            if (titlePreview) {
                titlePreview.textContent = institutionName;
            }
        };

        // Definir método updateLiveInstitutionName
        this.updateLiveInstitutionName = (institutionName) => {
            // Actualizar título de la página
            document.title = institutionName;

            // Actualizar elementos del header si existen
            const headerTitles = document.querySelectorAll('.site-title, .header-title, [data-institution-name]');
            headerTitles.forEach(element => {
                element.textContent = institutionName;
            });

            // Actualizar elementos del footer si existen
            const footerElements = document.querySelectorAll('.footer-institution, [data-footer-institution]');
            footerElements.forEach(element => {
                element.textContent = institutionName;
            });

            // Actualizar elementos del panel de administración
            const adminHeaderSubtitle = document.getElementById('adminHeaderSubtitle');
            if (adminHeaderSubtitle) {
                adminHeaderSubtitle.textContent = institutionName;
            }

            // Actualizar campo de configuración de PDFs si existe
            const pdfInstitutionName = document.getElementById('pdfInstitutionName');
            if (pdfInstitutionName) {
                pdfInstitutionName.value = institutionName;
            }

            // Actualizar configuración de PDFs si existe
            const pdfInstitutionField = document.getElementById('institutionName');
            if (pdfInstitutionField) {
                pdfInstitutionField.value = institutionName;
            }
        };

        // Definir método saveInstitutionName
        this.saveInstitutionName = async () => {
            try {
                this.showLoading('Guardando nombre de institución...');

                const institutionName = document.getElementById('institutionName').value.trim();

                if (!institutionName) {
                    window.showNotification('El nombre de la institución no puede estar vacío', 'error');
                    return;
                }

                const response = await fetch('/api/config/institution', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ institution_name: institutionName })
                });

                if (response.ok) {
                    // Actualizar configuración local
                    this.config.institution_name = institutionName;

                    // Actualizar vistas previas en tiempo real
                    this.updateInstitutionPreviews(institutionName);

                    window.showNotification('Nombre de institución guardado correctamente', 'success');

                    // Actualizar elementos del sitio en tiempo real
                    this.updateLiveInstitutionName(institutionName);
                } else {
                    throw new Error('Error al guardar el nombre de la institución');
                }
            } catch (error) {
                console.error('Error al guardar nombre de institución:', error);
                window.showNotification('Error al guardar el nombre de la institución', 'error');
            } finally {
                this.hideLoading();
            }
        };

        // Hacer disponible globalmente
        window.adminPanel = this;

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

    // Helper para manejar respuestas de forma segura
    async safeJsonResponse(response) {
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                // Si no es JSON, devolver un objeto de error genérico
                return {
                    success: false,
                    error: 'Respuesta no válida del servidor',
                    message: `Tipo de contenido: ${contentType || 'desconocido'}`
                };
            }
        } catch (error) {
            console.error('Error parseando respuesta JSON:', error);
            return {
                success: false,
                error: 'Error de parsing JSON',
                message: error.message
            };
        }
    }

    // Método para hacer llamadas autenticadas
    async authenticatedFetch(url, options = {}) {
        const token = localStorage.getItem('token') || localStorage.getItem('admin_token');

        if (!token) {
            console.error('No hay token de autenticación disponible');
            return {
                success: false,
                error: 'No autenticado',
                message: 'Token de autenticación no encontrado'
            };
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);
            return await this.safeJsonResponse(response);
        } catch (error) {
            console.error('Error en llamada autenticada:', error);
            return {
                success: false,
                error: 'Error de red',
                message: error.message
            };
        }
    }

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
                // Cargar configuración de institución
                try {
                    const response = await fetch('/api/config/institution', {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const institutionName = data.institution_name || 'Firmas Digitales FD';

                        // Cargar en el input
                        const input = document.getElementById('institutionName');
                        if (input) {
                            input.value = institutionName;
                        }

                        // Actualizar vistas previas
                        this.updateInstitutionPreviews(institutionName);

                        // Actualizar elementos en vivo
                        this.updateLiveInstitutionName(institutionName);
                    }
                } catch (error) {
                    console.warn('Error cargando configuración de institución:', error);
                }
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
            window.showNotification('Error al cargar la configuración', 'error');
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
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.config = { ...this.config, ...config };
                window.showNotification('Configuración guardada correctamente', 'success');

                // Actualizar título en tiempo real
                this.updateLivePreview();
            } else {
                throw new Error('Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error guardando configuración:', error);
            window.showNotification('Error al guardar la configuración', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /* ========================================
       GESTIÓN DE USUARIOS
       ======================================== */
    setupUserManagement() {
        // Delegar a UserManagement class para manejo de eventos
        // Los eventos específicos se manejan en UserManagement.setupAdvancedEventListeners()
    }

    // Delegar métodos de usuario a UserManagement
    editUser(userId) {
        return this.userManagement.editUser(userId);
    }

    deleteUser(userId) {
        return this.userManagement.deleteUser(userId);
    }

    toggleUserStatus(userId) {
        // Este método necesita ser implementado en UserManagement o encontrar el usuario y su estado actual
        const user = this.users.find(u => u.id === userId);
        if (user) {
            const isActive = user.status === 'active';
            return this.userManagement.toggleUserStatus(userId, !isActive);
        }
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBase}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                this.users = await response.json();
                // Pasar usuarios a UserManagement y renderizar
                this.userManagement.users = this.users;
                this.userManagement.applyFilters();
            }
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            window.showNotification('Error al cargar usuarios', 'error');
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
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const newUser = await response.json();
                this.users.push(newUser);
                // Actualizar UserManagement y re-renderizar
                this.userManagement.users = this.users;
                this.userManagement.applyFilters();
                this.updateMetrics();

                document.getElementById('createUserModal').remove();
                window.showNotification('Usuario creado correctamente', 'success');
            } else {
                const errorData = await this.safeJsonResponse(response);
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error creando usuario:', error);
            window.showNotification(error.message || 'Error al crear usuario', 'error');
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

    // Función para refrescar la lista de tablas
    async refreshTables() {
        try {
            window.showNotification('Actualizando lista de tablas...', 'info');
            await this.loadDatabaseStatus();
            window.showNotification('Lista de tablas actualizada', 'success');
        } catch (error) {
            console.error('Error refrescando tablas:', error);
            window.showNotification('Error al actualizar tablas', 'error');
        }
    }

    // Función para cargar estado de base de datos
    async loadDatabaseStatus() {
        try {
            const response = await fetch(`${this.apiBase}/database/status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.displayDatabaseStatus(data.status);
            } else {
                this.displayDatabaseNotFound();
            }
        } catch (error) {
            console.error('Error cargando estado de BD:', error);
            this.displayDatabaseNotFound();
        }
    }

    // Función para mostrar estado de base de datos
    displayDatabaseStatus(dbStatus) {
        const statusCard = document.getElementById('dbStatusCard');
        const statusTitle = document.getElementById('dbStatusTitle');
        const statusDetails = document.getElementById('dbStatusDetails');
        const statusIndicator = document.getElementById('dbStatusIndicator');

        if (!statusCard || !statusTitle || !statusDetails || !statusIndicator) return;

        if (dbStatus.connected) {
            statusTitle.textContent = 'Conexión Establecida';
            statusDetails.textContent = `Base de datos: ${dbStatus.database || 'Desconocida'}`;
            statusIndicator.className = 'db-status-indicator online';
            statusCard.classList.remove('error');
        } else {
            statusTitle.textContent = 'Conexión Fallida';
            statusDetails.textContent = dbStatus.error || 'No se pudo conectar';
            statusIndicator.className = 'db-status-indicator offline';
            statusCard.classList.add('error');
        }
    }

    // Función para probar conexión a base de datos
    async testDatabaseConnection() {
        try {
            window.showNotification('Probando conexión a base de datos...', 'info');

            const response = await fetch(`${this.apiBase}/database/test-connection`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                window.showNotification('Conexión exitosa a la base de datos', 'success');
                await this.loadDatabaseStatus(); // Recargar estado
            } else {
                throw new Error(data.message || 'Error de conexión');
            }
        } catch (error) {
            console.error('Error probando conexión:', error);
            window.showNotification(`Error de conexión: ${error.message}`, 'error');
        }
    }

    // Función para crear respaldo de base de datos
    async backupDatabase() {
        try {
            window.showNotification('Creando respaldo de base de datos...', 'info');

            const response = await fetch(`${this.apiBase}/database/backup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                window.showNotification('Respaldo creado exitosamente', 'success');
            } else {
                throw new Error(data.message || 'Error al crear respaldo');
            }
        } catch (error) {
            console.error('Error creando respaldo:', error);
            window.showNotification(`Error al crear respaldo: ${error.message}`, 'error');
        }
    }

    // Función para limpiar resultados
    clearResults() {
        const resultsContent = document.getElementById('resultsContent');
        const dbResultsSection = document.getElementById('dbResultsSection');

        if (resultsContent) {
            resultsContent.innerHTML = `
                <div class="no-results">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2"/>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="currentColor" stroke-width="2"/>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <p>Selecciona una tabla para ver sus datos</p>
                </div>
            `;
        }

        if (dbResultsSection) {
            dbResultsSection.style.display = 'none';
        }

        window.showNotification('Resultados limpiados', 'info');
    }

    // Función para mostrar datos de tabla
    async showTableData(tableName, page = 1, limit = 10) {
        try {
            this.showResultsLoading('Cargando datos de tabla...');

            const response = await fetch(`${this.apiBase}/database/table-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ tableName, page, limit })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                const html = this.createDataTableHtml(data.data, data.columns, tableName, page, data.totalPages);
                document.getElementById('resultsContent').innerHTML = html;
            } else {
                throw new Error(data.message || 'Error al cargar datos de tabla');
            }
        } catch (error) {
            console.error('Error mostrando datos de tabla:', error);
            document.getElementById('resultsContent').innerHTML = `
                <div class="error-message">
                    <p>Error al cargar datos: ${error.message}</p>
                </div>
            `;
            window.showNotification('Error al cargar datos de tabla', 'error');
        } finally {
            this.hideResultsLoading();
        }
    }

    // Función para crear tabla HTML con datos
    createDataTableHtml(data, columns, tableName, currentPage, totalPages) {
        if (!data || data.length === 0) {
            return `
                <div class="no-data">
                    <p>No hay datos en esta tabla</p>
                </div>
            `;
        }

        const tableHtml = `
            <div class="table-data-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${columns.map(col => `<td>${row[col] || '—'}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${totalPages > 1 ? `
                    <div class="table-pagination">
                        <button onclick="adminPanel.showTableData('${tableName}', ${currentPage - 1}, 10)" ${currentPage <= 1 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Anterior
                        </button>
                        <span>Página ${currentPage} de ${totalPages}</span>
                        <button onclick="adminPanel.showTableData('${tableName}', ${currentPage + 1}, 10)" ${currentPage >= totalPages ? 'disabled' : ''}>
                            Siguiente
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        return tableHtml;
    }

    // Función auxiliar para mostrar loading en resultados
    showResultsLoading(message = 'Cargando...') {
        const resultsContent = document.getElementById('resultsContent');
        if (resultsContent) {
            resultsContent.innerHTML = `
                <div class="db-loading">
                    <div class="spinner"></div>
                    <span>${message}</span>
                </div>
            `;
        }
    }

    hideResultsLoading() {
        // El contenido se reemplaza cuando se cargan los datos
    }

    // Función para manejar click en tabla y mostrar detalles
    async handleTableClick(tableName) {
        try {
            this.showResultsLoading('Cargando detalles de tabla...');

            const response = await fetch(`${this.apiBase}/database/table-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ tableName })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                const detailsHtml = this.createTableDetailsHtml(data.details, tableName);
                document.getElementById('resultsContent').innerHTML = detailsHtml;
            } else {
                throw new Error(data.message || 'Error al cargar detalles de tabla');
            }
        } catch (error) {
            console.error('Error mostrando detalles de tabla:', error);
            document.getElementById('resultsContent').innerHTML = `
                <div class="error-message">
                    <p>Error al cargar detalles: ${error.message}</p>
                </div>
            `;
            window.showNotification('Error al cargar detalles de tabla', 'error');
        } finally {
            this.hideResultsLoading();
        }
    }

    // Función para crear HTML de detalles de tabla
    createTableDetailsHtml(details, tableName) {
        return `
            <div class="table-details-header">
                <h3>Detalles de Tabla: ${tableName}</h3>
                <div class="table-info">
                    <span class="info-item">Registros: ${details.rowCount || 'N/A'}</span>
                    <span class="info-item">Columnas: ${details.columns?.length || 0}</span>
                </div>
            </div>

            ${details.columns ? `
                <div class="table-structure">
                    <h4>Estructura de Columnas</h4>
                    <div class="columns-list">
                        ${details.columns.map(col => `
                            <div class="column-item">
                                <div class="column-name">${col.name}</div>
                                <div class="column-type">${col.type}</div>
                                <div class="${col.nullable ? 'column-nullable' : 'column-not-null'}">
                                    ${col.nullable ? 'Nullable' : 'Not Null'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="table-preview">
                <h4>Vista Previa de Datos</h4>
                <div class="preview-controls">
                    <button onclick="adminPanel.showTableData('${tableName}', 1, 10)" class="admin-btn primary">
                        Ver primeros 10 registros
                    </button>
                </div>
            </div>
        `;
    }

    // Función para ejecutar comandos de base de datos
    async runDbCommand(command) {
        try {
            this.showResultsLoading('Ejecutando comando...');

            const response = await fetch(`${this.apiBase}/database/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ command })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showCommandResult(data.message || 'Comando ejecutado correctamente', 'success');
            } else {
                throw new Error(data.message || 'Error al ejecutar comando');
            }
        } catch (error) {
            console.error('Error ejecutando comando:', error);
            this.showCommandResult(`Error: ${error.message}`, 'error');
        } finally {
            this.hideResultsLoading();
        }
    }

    // Función para mostrar resultados en el visor
    showCommandResult(message, type = 'info') {
        const dbResultsSection = document.getElementById('dbResultsSection');
        const dbResultsContent = document.getElementById('dbResultsContent');

        if (dbResultsSection && dbResultsContent) {
            dbResultsSection.style.display = 'block';
            dbResultsContent.innerHTML = `
                <div class="result-item ${type}">
                    ${message}
                </div>
            `;
        }
    }

    // Función para mostrar/ocultar loading en el visor de resultados
    showResultsLoading(message = 'Cargando...') {
        const resultsContent = document.getElementById('resultsContent');
        if (resultsContent) {
            resultsContent.innerHTML = `
                <div class="db-loading">
                    <div class="spinner"></div>
                    <span>${message}</span>
                </div>
            `;
        }
    }

    hideResultsLoading() {
        // El contenido se reemplaza cuando se cargan los datos
    }

    // Función para manejar click en tabla y mostrar detalles
    async handleTableClick(tableName) {
        try {
            this.showResultsLoading('Cargando detalles de tabla...');

            const response = await fetch(`${this.apiBase}/database/table-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ tableName })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                const detailsHtml = this.createTableDetailsHtml(data.details, tableName);
                document.getElementById('resultsContent').innerHTML = detailsHtml;
            } else {
                throw new Error(data.message || 'Error al cargar detalles de tabla');
            }
        } catch (error) {
            console.error('Error mostrando detalles de tabla:', error);
            document.getElementById('resultsContent').innerHTML = `
                <div class="error-message">
                    <p>Error al cargar detalles: ${error.message}</p>
                </div>
            `;
            window.showNotification('Error al cargar detalles de tabla', 'error');
        } finally {
            this.hideResultsLoading();
        }
    }

    // Función para crear HTML de detalles de tabla
    createTableDetailsHtml(details, tableName) {
        return `
            <div class="table-details-header">
                <h3>Detalles de Tabla: ${tableName}</h3>
                <div class="table-info">
                    <span class="info-item">Registros: ${details.rowCount || 'N/A'}</span>
                    <span class="info-item">Columnas: ${details.columns?.length || 0}</span>
                </div>
            </div>

            ${details.columns ? `
                <div class="table-structure">
                    <h4>Estructura de Columnas</h4>
                    <div class="columns-list">
                        ${details.columns.map(col => `
                            <div class="column-item">
                                <div class="column-name">${col.name}</div>
                                <div class="column-type">${col.type}</div>
                                <div class="${col.nullable ? 'column-nullable' : 'column-not-null'}">
                                    ${col.nullable ? 'Nullable' : 'Not Null'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="table-preview">
                <h4>Vista Previa de Datos</h4>
                <div class="preview-controls">
                    <button onclick="adminPanel.showTableData('${tableName}', 1, 10)" class="admin-btn primary">
                        Ver primeros 10 registros
                    </button>
                </div>
            </div>
        `;
    }

    // Función para ejecutar comandos de base de datos
    async runDbCommand(command) {
        try {
            this.showResultsLoading('Ejecutando comando...');

            const response = await fetch(`${this.apiBase}/database/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ command })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showCommandResult(data.message || 'Comando ejecutado correctamente', 'success');
            } else {
                throw new Error(data.message || 'Error al ejecutar comando');
            }
        } catch (error) {
            console.error('Error ejecutando comando:', error);
            this.showCommandResult(`Error: ${error.message}`, 'error');
        } finally {
            this.hideResultsLoading();
        }
    }

    // Función para mostrar resultados en el visor
    showCommandResult(message, type = 'info') {
        const dbResultsSection = document.getElementById('dbResultsSection');
        const dbResultsContent = document.getElementById('dbResultsContent');

        if (dbResultsSection && dbResultsContent) {
            dbResultsSection.style.display = 'block';
            dbResultsContent.innerHTML = `
                <div class="result-item ${type}">
                    ${message}
                </div>
            `;
        }
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
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ enabled })
            });

            if (response.ok) {
                window.showNotification(
                    `Modo mantenimiento ${enabled ? 'activado' : 'desactivado'}`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Error cambiando modo mantenimiento:', error);
            window.showNotification('Error al cambiar modo mantenimiento', 'error');
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
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                window.showNotification('Archivo subido correctamente', 'success');

                // Actualizar configuración si es necesario
                if (input.dataset.configKey) {
                    this.config[input.dataset.configKey] = result.url;
                }
            } else {
                throw new Error('Error al subir archivo');
            }
        } catch (error) {
            console.error('Error subiendo archivo:', error);
            window.showNotification('Error al subir archivo', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /* ========================================
       CONFIGURACIÓN DE BASE DE DATOS
       ======================================== */
    async loadDatabaseStatus() {
        try {
            this.showLoading('Cargando estado de la base de datos...');

            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBase}/database/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const dbStatus = await response.json();
                this.displayDatabaseStatus(dbStatus);

                // Cargar tablas automáticamente después del estado
                await this.refreshTables();
            } else {
                // Manejar diferentes tipos de error
                if (response.status === 404) {
                    this.displayDatabaseNotFound();
                } else if (response.status === 401) {
                    window.showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                } else if (response.status === 500) {
                    window.showNotification('Error interno del servidor', 'error');
                } else {
                    console.error('❌ Error desconocido:', response.status, response.statusText);
                    window.showNotification(`Error al cargar estado: ${response.status}`, 'error');
                }
            }
        } catch (error) {
            console.error('Error cargando estado de BD:', error);
            window.showNotification('Error al cargar estado de la base de datos', 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayDatabaseStatus(dbStatus) {
        const statusDetails = document.getElementById('dbStatusDetails');
        const statusIndicator = document.getElementById('dbStatusIndicator');
        const statusTitle = document.getElementById('dbStatusTitle');
        const installBtn = document.getElementById('installDbBtn');
        const backupBtn = document.getElementById('backupDbBtn');
        const optimizeBtn = document.getElementById('optimizeDbBtn');
        const testBtn = document.getElementById('testDbBtn');

        if (!statusDetails) return;

        // Actualizar información del sistema
        const mysqlVersion = document.getElementById('mysqlVersion');
        const dbName = document.getElementById('dbName');
        const tableCount = document.getElementById('tableCount');
        const dbSize = document.getElementById('dbSize');

        if (mysqlVersion) mysqlVersion.textContent = dbStatus.version || '--';
        if (dbName) dbName.textContent = dbStatus.database || '--';
        if (tableCount) tableCount.textContent = dbStatus.tableCount || 0;
        if (dbSize) dbSize.textContent = dbStatus.size || '--';

        const statusClass = dbStatus.online ? 'online' : 'offline';
        const statusText = dbStatus.online ? 'Conectado' : 'Desconectado';

        statusDetails.innerHTML = `
            <div class="db-metric">
                <span class="db-metric-label">Estado:</span>
                <span class="db-metric-value ${statusClass}">${statusText}</span>
            </div>
            <div class="db-metric">
                <span class="db-metric-label">Versión:</span>
                <span class="db-metric-value">${dbStatus.version || 'N/A'}</span>
            </div>
            <div class="db-metric">
                <span class="db-metric-label">Tablas:</span>
                <span class="db-metric-value">${dbStatus.tableCount || 0}</span>
            </div>
            <div class="db-metric">
                <span class="db-metric-label">Tamaño:</span>
                <span class="db-metric-value">${dbStatus.size || 'N/A'}</span>
            </div>
        `;

        // Actualizar indicador de estado
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${statusClass}`;
        }
        if (statusTitle) {
            statusTitle.textContent = dbStatus.online ? 'Conexión Establecida' : 'Sin Conexión';
        }

        // Mostrar/ocultar botones según estado
        if (installBtn) installBtn.style.display = dbStatus.online ? 'none' : 'inline-flex';
        if (backupBtn) backupBtn.style.display = dbStatus.online ? 'inline-flex' : 'none';
        if (optimizeBtn) optimizeBtn.style.display = dbStatus.online ? 'inline-flex' : 'none';
        if (testBtn) testBtn.style.display = 'inline-flex';
    }

    displayDatabaseNotFound() {
        const statusDetails = document.getElementById('dbStatusDetails');
        if (!statusDetails) return;

        statusDetails.innerHTML = `
            <div class="db-error-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2"/>
                </svg>
                <h4>Base de Datos No Encontrada</h4>
                <p>La base de datos no está instalada o no se puede conectar.</p>
                <button class="admin-btn primary" onclick="adminPanel.installDatabase()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Instalar Base de Datos
                </button>
            </div>
        `;

        // Actualizar indicador de estado
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator offline';
        }
    }

    async loadPdfConfiguration() {
        try {
            this.showLoading('Cargando configuración PDF...');

            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBase}/pdf/config`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const pdfConfig = await response.json();
                this.populatePdfConfiguration(pdfConfig);
            } else {
                console.error('Error en la respuesta:', response.status, response.statusText);
                window.showNotification('Error al cargar configuración PDF', 'error');
            }
        } catch (error) {
            console.error('Error cargando configuración PDF:', error);
            window.showNotification('Error al cargar configuración PDF', 'error');
        } finally {
            this.hideLoading();
        }
    }

    populatePdfConfiguration(pdfConfig) {
        // Llenar campos de configuración PDF
        const fields = {
            'institutionName': pdfConfig.institutionName || '',
            'pdfTemplate': pdfConfig.template || 'default',
            'fontSize': pdfConfig.fontSize || 12,
            'marginTop': pdfConfig.margins?.top || 20,
            'marginBottom': pdfConfig.margins?.bottom || 20,
            'marginLeft': pdfConfig.margins?.left || 15,
            'marginRight': pdfConfig.margins?.right || 15
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
    }

    async installDatabase() {
        try {
            const progressContainer = document.getElementById('dbInstallProgress');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            const progressStatus = document.getElementById('progressStatus');
            const installBtn = document.getElementById('installDbBtn');

            // Mostrar barra de progreso
            if (progressContainer) progressContainer.style.display = 'block';
            if (installBtn) installBtn.disabled = true;

            // Simular progreso
            this.updateInstallProgress(10, 'Preparando instalación...');

            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBase}/database/install`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            this.updateInstallProgress(50, 'Instalando estructura de base de datos...');

            if (response.ok) {
                this.updateInstallProgress(80, 'Configurando datos iniciales...');

                const result = await response.json();

                this.updateInstallProgress(100, 'Instalación completada');

                // Ocultar progreso después de un momento
                setTimeout(() => {
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (installBtn) installBtn.disabled = false;
                }, 2000);

                window.showNotification('Base de datos instalada correctamente', 'success');

                // Recargar estado de BD
                setTimeout(() => {
                    this.loadDatabaseStatus();
                }, 1000);

            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error al instalar base de datos');
            }
        } catch (error) {
            console.error('Error instalando BD:', error);

            // Ocultar progreso en caso de error
            const progressContainer = document.getElementById('dbInstallProgress');
            const installBtn = document.getElementById('installDbBtn');
            if (progressContainer) progressContainer.style.display = 'none';
            if (installBtn) installBtn.disabled = false;

            window.showNotification(`Error al instalar base de datos: ${error.message}`, 'error');
        }
    }

    updateInstallProgress(percentage, status) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressStatus = document.getElementById('progressStatus');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${percentage}%`;
        if (progressStatus) progressStatus.textContent = status;
    }

    displayDatabaseNotFound() {
        const statusDetails = document.getElementById('dbStatusDetails');
        const statusIndicator = document.getElementById('dbStatusIndicator');
        const statusTitle = document.getElementById('dbStatusTitle');
        const installBtn = document.getElementById('installDbBtn');
        const backupBtn = document.getElementById('backupDbBtn');
        const optimizeBtn = document.getElementById('optimizeDbBtn');

        if (!statusDetails) return;

        statusDetails.innerHTML = `
            <div class="db-error-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2"/>
                </svg>
                <h4>Base de Datos No Encontrada</h4>
                <p>La base de datos no está instalada o no se puede conectar.</p>
                <p class="db-error-hint">Haz clic en "Instalar Base de Datos" para configurar el sistema.</p>
            </div>
        `;

        // Actualizar indicador de estado
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator offline';
        }
        if (statusTitle) {
            statusTitle.textContent = 'Base de Datos No Disponible';
        }

        // Mostrar solo botón de instalación
        if (installBtn) installBtn.style.display = 'inline-flex';
        if (backupBtn) backupBtn.style.display = 'none';
        if (optimizeBtn) optimizeBtn.style.display = 'none';
    }

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

            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBase}/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const status = await response.json();

                if (status.online) {
                    window.showNotification('Conexión a la base de datos exitosa', 'success');
                } else {
                    window.showNotification('No se pudo conectar a la base de datos', 'error');
                }
            } else {
                // Manejar errores HTTP
                if (response.status === 404) {
                    window.showNotification('Ruta de estado no encontrada', 'error');
                } else if (response.status === 401) {
                    window.showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                } else {
                    window.showNotification(`Error al probar conexión: ${response.status}`, 'error');
                }
            }
        } catch (error) {
            console.error('Error probando conexión:', error);
            window.showNotification('Error al probar conexión a la base de datos', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async backupDatabase() {
        const backupBtn = document.getElementById('backupDbBtn');
        const originalText = backupBtn.innerHTML;

        try {
            // Cambiar el botón a estado de carga
            backupBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="spinning">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2"/>
                </svg>
                <div class="btn-content">
                    <span class="btn-title">Creando...</span>
                    <span class="btn-description">Procesando respaldo</span>
                </div>
            `;
            backupBtn.disabled = true;

            // Mostrar notificación de inicio
            window.showNotification('Iniciando creación de respaldo...', 'info');

            // Llamar a la API de respaldo
            const response = await fetch('/api/admin/database/backup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                // Éxito
                backupBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <div class="btn-content">
                        <span class="btn-title">Completado</span>
                        <span class="btn-description">Respaldo creado</span>
                    </div>
                `;

                window.showNotification(`✅ Respaldo creado correctamente: ${result.backupFile}`, 'success');

                // Restaurar el botón después de 3 segundos
                setTimeout(() => {
                    backupBtn.innerHTML = originalText;
                    backupBtn.disabled = false;
                }, 3000);

            } else {
                throw new Error(result.message || 'Error desconocido');
            }

        } catch (error) {
            console.error('Error creando respaldo:', error);

            // Mostrar error en el botón
            backupBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                </svg>
                <div class="btn-content">
                    <span class="btn-title">Error</span>
                    <span class="btn-description">Intente nuevamente</span>
                </div>
            `;

            window.showNotification('❌ Error al crear respaldo: ' + error.message, 'error');

            // Restaurar el botón después de 5 segundos
            setTimeout(() => {
                backupBtn.innerHTML = originalText;
                backupBtn.disabled = false;
            }, 5000);
        }
    }

    async restoreDatabase() {
        try {
            // Mostrar confirmación antes de proceder
            const confirmed = await this.showRestoreConfirmation();
            if (!confirmed) return;

            // Mostrar loading
            this.showResultsLoading('Restaurando base de datos desde backup...');
            window.showNotification('🔄 Iniciando restauración desde backup...', 'info');

            // Llamar a la API de restauración
            const response = await fetch('/api/admin/database/restore', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                // Éxito
                this.showCommandResult(`✅ Restauración completada exitosamente:\n${result.message}`, 'success');
                window.showNotification('✅ Base de datos restaurada correctamente desde backup', 'success');

                // Actualizar estado de la base de datos
                setTimeout(() => {
                    this.loadDatabaseStatus();
                    this.refreshTables();
                }, 2000);

            } else {
                throw new Error(result.message || 'Error desconocido en restauración');
            }

        } catch (error) {
            console.error('Error restaurando base de datos:', error);
            this.showCommandResult(`❌ Error en restauración:\n${error.message}`, 'error');
            window.showNotification('❌ Error al restaurar base de datos: ' + error.message, 'error');
        } finally {
            this.hideResultsLoading();
        }
    }

    async showRestoreConfirmation() {
        return new Promise((resolve) => {
            const modalHTML = `
                <div class="admin-modal show" id="restoreConfirmModal">
                    <div class="admin-modal-content">
                        <button class="admin-modal-close" data-action="cancel">×</button>

                        <div class="admin-modal-header">
                            <h3>
                                <svg class="warning-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Confirmar Restauración
                            </h3>
                        </div>

                        <div class="restore-confirm-warning">
                            <h3>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Advertencia Importante
                            </h3>
                            <p>
                                Está a punto de restaurar la base de datos desde un archivo de respaldo.
                                Esta operación sobrescribirá todos los datos actuales.
                            </p>
                            <p>Al confirmar la restauración:</p>
                            <ul>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                        <circle cx="12" cy="16" r="1" stroke="currentColor" stroke-width="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span>Se creará automáticamente un respaldo de seguridad de los datos actuales</span>
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                                        <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                                        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                                        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span>Los datos del archivo de respaldo reemplazarán completamente la base de datos</span>
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span>Esta operación puede tardar varios minutos dependiendo del tamaño del respaldo</span>
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span>Se recomienda hacer esta operación durante horas de bajo uso del sistema</span>
                                </li>
                            </ul>
                        </div>

                        <div class="admin-modal-footer">
                            <button type="button" class="admin-btn secondary" data-action="cancel">
                                Cancelar
                            </button>
                            <button type="button" class="admin-btn primary" data-action="confirm">
                                Confirmar Restauración
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Agregar event listeners después de insertar el HTML
            const modal = document.getElementById('restoreConfirmModal');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            const closeBtn = modal.querySelector('.admin-modal-close');

            const handleCancel = () => {
                modal.remove();
                resolve(false);
            };

            const handleConfirm = () => {
                modal.remove();
                resolve(true);
            };

            cancelBtn.addEventListener('click', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
            closeBtn.addEventListener('click', handleCancel);

            // Cerrar con Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    async optimizeDatabase() {
        try {
            this.showLoading('Optimizando base de datos...');
            window.showNotification('Función de optimización en desarrollo', 'info');
        } catch (error) {
            console.error('Error optimizando BD:', error);
            window.showNotification('Error al optimizar la base de datos', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /* ========================================
       FUNCIONES DE BASE DE DATOS PARA EL NUEVO LAYOUT
       ======================================== */

    // Función principal para ejecutar comandos de base de datos
    async runDbCommand(command) {
        try {
            this.showResultsLoading(`Ejecutando comando: ${command}...`);

            // Mostrar en el visor de resultados
            this.showCommandResult(`Ejecutando: npm run db:${command}`, 'info');

            // Usar GET para comandos de solo lectura, POST para comandos que modifican
            const isReadOnlyCommand = ['status', 'tables'].includes(command);
            const method = isReadOnlyCommand ? 'GET' : 'POST';

            const response = await fetch(`${this.apiBase}/database/${command}`, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success) {
                    this.showCommandResult(`✅ Comando ${command} ejecutado correctamente:\n${JSON.stringify(result, null, 2)}`, 'success');
                    window.showNotification(`Comando ${command} ejecutado correctamente`, 'success');

                    // Actualizar tablas si el comando fue exitoso
                    if (['create', 'migrate', 'seed', 'reset'].includes(command)) {
                        setTimeout(() => this.refreshTables(), 1000);
                    }
                } else {
                    this.showCommandResult(`❌ Error en comando ${command}:\n${result.error || 'Error desconocido'}`, 'error');
                    window.showNotification(`Error en comando ${command}`, 'error');
                }
            } else {
                // Manejar errores HTTP
                if (response.status === 404) {
                    this.showCommandResult(`❌ Error: Ruta no encontrada para comando ${command}`, 'error');
                    window.showNotification(`Comando ${command} no encontrado`, 'error');
                } else if (response.status === 401) {
                    this.showCommandResult(`❌ Error: Sesión expirada`, 'error');
                    window.showNotification(`Sesión expirada. Por favor, inicia sesión nuevamente.`, 'error');
                } else {
                    const errorData = await this.safeJsonResponse(response);
                    this.showCommandResult(`❌ Error ${response.status}: ${errorData.message || response.statusText}`, 'error');
                    window.showNotification(`Error en comando ${command}: ${response.status}`, 'error');
                }
            }
        } catch (error) {
            console.error(`Error ejecutando comando ${command}:`, error);
            this.showCommandResult(`❌ Error de conexión ejecutando ${command}:\n${error.message}`, 'error');
            window.showNotification(`Error ejecutando comando ${command}`, 'error');
        } finally {
            this.hideResultsLoading();
        }
    }

    // Función para mostrar resultados en el visor
    showCommandResult(message, type = 'info') {
        const resultsContent = document.getElementById('resultsContent');
        if (!resultsContent) return;

        const timestamp = new Date().toLocaleTimeString();
        const resultDiv = document.createElement('div');
        resultDiv.className = `command-result ${type}`;
        resultDiv.innerHTML = `
            <div class="result-header">
                <span class="result-time">${timestamp}</span>
                <span class="result-type ${type}">${type.toUpperCase()}</span>
            </div>
            <pre class="result-message">${message}</pre>
        `;

        // Limpiar mensaje de "no results" si existe
        const noResults = resultsContent.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }

        resultsContent.appendChild(resultDiv);
        resultsContent.scrollTop = resultsContent.scrollHeight;
    }

    // Función para refrescar la lista de tablas
    async refreshTables() {
        try {
            const tablesList = document.getElementById('tablesList');
            if (!tablesList) return;

            tablesList.innerHTML = `
                <div class="db-loading">
                    <div class="spinner"></div>
                    <span>Actualizando tablas...</span>
                </div>
            `;

            const response = await fetch(`${this.apiBase}/database/tables`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success && result.tables) {
                    tablesList.innerHTML = '';

                    if (result.tables.length === 0) {
                        tablesList.innerHTML = `
                            <div class="no-tables">
                                <p>No hay tablas en la base de datos</p>
                            </div>
                        `;
                    } else {
                        result.tables.forEach(table => {
                            const tableItem = document.createElement('div');
                            tableItem.className = 'table-item';
                            tableItem.innerHTML = `
                                <span class="table-name">${table.name}</span>
                                <span class="table-count">${table.rows || 0} registros</span>
                            `;

                            // Agregar event listener para click
                            tableItem.addEventListener('click', () => {
                                this.handleTableClick(table.name);
                            });

                            // Agregar clase para indicar que es clickeable
                            tableItem.style.cursor = 'pointer';
                            tableItem.title = `Click para ver detalles de ${table.name}`;

                            tablesList.appendChild(tableItem);
                        });
                    }

                    window.showNotification('Lista de tablas actualizada', 'success');
                } else {
                    tablesList.innerHTML = `
                        <div class="error-message">
                            <p>Error al cargar tablas</p>
                        </div>
                    `;
                    window.showNotification('Error al actualizar tablas', 'error');
                }
            } else {
                // Manejar errores HTTP
                if (response.status === 404) {
                    tablesList.innerHTML = `
                        <div class="error-message">
                            <p>Ruta no encontrada. Verifica la configuración del servidor.</p>
                        </div>
                    `;
                } else if (response.status === 401) {
                    tablesList.innerHTML = `
                        <div class="error-message">
                            <p>Sesión expirada. Por favor, inicia sesión nuevamente.</p>
                        </div>
                    `;
                } else {
                    tablesList.innerHTML = `
                        <div class="error-message">
                            <p>Error ${response.status}: ${response.statusText}</p>
                        </div>
                    `;
                }
                window.showNotification(`Error al cargar tablas: ${response.status}`, 'error');
            }
        } catch (error) {
            console.error('Error refrescando tablas:', error);
            const tablesList = document.getElementById('tablesList');
            if (tablesList) {
                tablesList.innerHTML = `
                    <div class="error-message">
                        <p>Error de conexión</p>
                    </div>
                `;
            }
            window.showNotification('Error al conectar con la base de datos', 'error');
        }
    }

    // Función para limpiar resultados
    clearResults() {
        const resultsContent = document.getElementById('resultsContent');
        if (!resultsContent) return;

        resultsContent.innerHTML = `
            <div class="no-results">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2"/>
                </svg>
                <p>Realiza una operación para ver los resultados aquí</p>
            </div>
        `;

        window.showNotification('Resultados limpiados', 'info');
    }

    // Función para mostrar/ocultar loading en el visor de resultados
    showResultsLoading(message = 'Cargando...') {
        const resultsContent = document.getElementById('resultsContent');
        if (!resultsContent) return;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'command-result loading';
        loadingDiv.id = 'loadingResult';
        loadingDiv.innerHTML = `
            <div class="db-loading">
                <div class="spinner"></div>
                <span>${message}</span>
            </div>
        `;

        resultsContent.appendChild(loadingDiv);
        resultsContent.scrollTop = resultsContent.scrollHeight;
    }

    hideResultsLoading() {
        const loadingResult = document.getElementById('loadingResult');
        if (loadingResult) {
            loadingResult.remove();
        }
    }

    // Función para manejar click en tabla y mostrar detalles
    async handleTableClick(tableName) {
        try {
            // Verificar estado de autenticación antes de proceder
            const isAuthenticated = await this.checkAuthStatus();
            if (!isAuthenticated) {
                return; // La función checkAuthStatus ya maneja la redirección
            }

            const resultsContent = document.getElementById('dbResultsContent');
            const resultsSection = document.getElementById('dbResultsSection');

            if (!resultsContent || !resultsSection) return;

            // Mostrar sección de resultados
            resultsSection.style.display = 'block';

            // Mostrar loading
            resultsContent.innerHTML = `
                <div class="db-loading">
                    <div class="spinner"></div>
                    <span>Cargando detalles de la tabla ${tableName}...</span>
                </div>
            `;

            // Verificar que tenemos un token válido
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('❌ No hay token de autenticación disponible');
                window.showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                // Redirigir al login después de un breve delay
                setTimeout(() => {
                    window.location.href = '/adminLogin';
                }, 2000);
                return;
            }

            // Hacer petición para obtener detalles de la tabla
            const response = await fetch(`${this.apiBase}/database/table-details`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tableName })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success) {
                    // Mostrar detalles de la tabla
                    resultsContent.innerHTML = `
                        <div class="table-details-header">
                            <h3>Detalles de la tabla: ${tableName}</h3>
                            <div class="table-info">
                                <span class="info-item">Registros: ${result.rowCount || 0}</span>
                                <span class="info-item">Columnas: ${result.columns?.length || 0}</span>
                            </div>
                        </div>

                        <div class="table-structure">
                            <h4>Estructura de la tabla</h4>
                            <div class="columns-list">
                                ${result.columns?.map(col => `
                                    <div class="column-item">
                                        <span class="column-name">${col.name}</span>
                                        <span class="column-type">${col.type}</span>
                                        ${col.nullable ? '<span class="column-nullable">NULL</span>' : '<span class="column-not-null">NOT NULL</span>'}
                                    </div>
                                `).join('') || '<p>No se pudo obtener la estructura</p>'}
                            </div>
                        </div>

                        <div class="table-preview">
                            <h4>Vista previa de datos</h4>
                            <div class="preview-controls">
                                <button class="admin-btn secondary" onclick="adminPanel.showTableData('${tableName}', 1)">
                                    Ver primeros 10 registros
                                </button>
                            </div>
                        </div>
                    `;

                    window.showNotification(`Detalles de ${tableName} cargados`, 'success');
                } else {
                    resultsContent.innerHTML = `
                        <div class="error-message">
                            <p>Error al cargar detalles: ${result.error || 'Error desconocido'}</p>
                        </div>
                    `;
                    window.showNotification('Error al cargar detalles de la tabla', 'error');
                }
            } else {
                // Manejar errores específicos
                if (response.status === 401) {
                    console.error('❌ Error 401: Token inválido o expirado');
                    window.showNotification('Sesión expirada. Redirigiendo al login...', 'error');
                    setTimeout(() => {
                        window.location.href = '/adminLogin';
                    }, 2000);
                } else if (response.status === 403) {
                    console.error('❌ Error 403: No tienes permisos para acceder a esta función');
                    window.showNotification('No tienes permisos para acceder a esta función', 'error');
                } else if (response.status === 404) {
                    console.error('❌ Error 404: Ruta no encontrada');
                    window.showNotification('Servicio no disponible. Contacta al administrador.', 'error');
                } else {
                    console.error(`❌ Error ${response.status}: ${response.statusText}`);
                    window.showNotification(`Error al cargar detalles: ${response.status}`, 'error');
                }

                resultsContent.innerHTML = `
                    <div class="error-message">
                        <p>Error ${response.status}: ${response.statusText}</p>
                        <p>Revisa la consola para más detalles.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error al manejar click en tabla:', error);
            const resultsContent = document.getElementById('dbResultsContent');
            if (resultsContent) {
                resultsContent.innerHTML = `
                    <div class="error-message">
                        <p>Error de conexión</p>
                    </div>
                `;
            }
            window.showNotification('Error al conectar con la base de datos', 'error');
        }
    }

    // Función para mostrar datos de tabla
    async showTableData(tableName, page = 1, limit = 10) {
        try {
            const resultsContent = document.getElementById('dbResultsContent');

            if (!resultsContent) return;

            // Mostrar loading
            resultsContent.innerHTML += `
                <div class="table-data-loading">
                    <div class="spinner"></div>
                    <span>Cargando datos...</span>
                </div>
            `;

            const response = await fetch(`${this.apiBase}/database/table-data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tableName, page, limit })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success && result.data) {
                    // Crear tabla HTML con los datos
                    const tableHtml = this.createDataTableHtml(result.data, result.columns, tableName, page, result.totalPages);
                    resultsContent.innerHTML = tableHtml;
                    window.showNotification(`Datos de ${tableName} cargados`, 'success');
                } else {
                    resultsContent.innerHTML += `
                        <div class="error-message">
                            <p>No se pudieron cargar los datos</p>
                        </div>
                    `;
                    window.showNotification('Error al cargar datos de la tabla', 'error');
                }
            } else {
                resultsContent.innerHTML += `
                    <div class="error-message">
                        <p>Error ${response.status}: ${response.statusText}</p>
                    </div>
                `;
                window.showNotification(`Error al cargar datos: ${response.status}`, 'error');
            }
        } catch (error) {
            console.error('Error al cargar datos de tabla:', error);
            const resultsContent = document.getElementById('dbResultsContent');
            if (resultsContent) {
                resultsContent.innerHTML += `
                    <div class="error-message">
                        <p>Error de conexión</p>
                    </div>
                `;
            }
            window.showNotification('Error al conectar con la base de datos', 'error');
        }
    }

    // Función para crear tabla HTML con datos
    createDataTableHtml(data, columns, tableName, currentPage, totalPages) {
        if (!data || data.length === 0) {
            return `
                <div class="table-details-header">
                    <h3>Datos de la tabla: ${tableName}</h3>
                </div>
                <div class="no-data">
                    <p>No hay datos en esta tabla</p>
                </div>
            `;
        }

        const headers = columns.map(col => `<th>${col.name}</th>`).join('');
        const rows = data.map(row => {
            const cells = columns.map(col => `<td>${row[col.name] || ''}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        const pagination = totalPages > 1 ? `
            <div class="table-pagination">
                <button class="admin-btn secondary" onclick="adminPanel.showTableData('${tableName}', ${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
                    Anterior
                </button>
                <span>Página ${currentPage} de ${totalPages}</span>
                <button class="admin-btn secondary" onclick="adminPanel.showTableData('${tableName}', ${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
                    Siguiente
                </button>
            </div>
        ` : '';

        return `
            <div class="table-details-header">
                <h3>Datos de la tabla: ${tableName}</h3>
                <div class="table-info">
                    <span class="info-item">Mostrando ${data.length} registros</span>
                </div>
            </div>

            <div class="table-data-container">
                <table class="data-table">
                    <thead>
                        <tr>${headers}</tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                ${pagination}
            </div>
        `;
    }

    // Función de diagnóstico para verificar estado de autenticación
    async checkAuthStatus() {
        try {
            // Mostrar resultados en el panel de base de datos
            const resultsContent = document.getElementById('dbResultsContent');
            const resultsSection = document.getElementById('dbResultsSection');

            if (resultsContent && resultsSection) {
                resultsSection.style.display = 'block';
                resultsContent.innerHTML = `
                    <div class="db-loading">
                        <div class="spinner"></div>
                        <span>Verificando estado de autenticación...</span>
                    </div>
                `;
            }

            const token = localStorage.getItem('token');
            const adminToken = localStorage.getItem('admin_token');

            let diagnosticResults = [];

            // Verificar tokens locales
            diagnosticResults.push({
                type: 'info',
                title: 'Tokens Locales',
                details: [
                    `Token normal: ${token ? '✅ Presente' : '❌ No encontrado'}`,
                    `Token admin: ${adminToken ? '✅ Presente' : '❌ No encontrado'}`
                ]
            });

            if (!token) {
                diagnosticResults.push({
                    type: 'error',
                    title: 'Error de Autenticación',
                    details: ['No hay token de autenticación disponible']
                });

                this.showDiagnosticResults(diagnosticResults);
                window.showNotification('No hay token de autenticación. Redirigiendo al login...', 'error');
                setTimeout(() => {
                    window.location.href = '/adminLogin';
                }, 2000);
                return false;
            }

            // Verificar token con el servidor
            diagnosticResults.push({
                type: 'info',
                title: 'Verificación con Servidor',
                details: ['Verificando token con el servidor...']
            });

            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                diagnosticResults.push({
                    type: 'success',
                    title: 'Autenticación Exitosa',
                    details: [
                        `Usuario: ${userData.usuario}`,
                        `Rol: ${userData.rol}`,
                        'Token válido y activo'
                    ]
                });

                this.showDiagnosticResults(diagnosticResults);
                return true;
            } else {
                diagnosticResults.push({
                    type: 'error',
                    title: 'Token Inválido',
                    details: [
                        `Código de respuesta: ${response.status}`,
                        'El token ha expirado o es inválido'
                    ]
                });

                console.error('❌ Token inválido o expirado');
                this.showDiagnosticResults(diagnosticResults);
                window.showNotification('Token expirado. Redirigiendo al login...', 'error');
                localStorage.removeItem('token');
                localStorage.removeItem('admin_token');
                setTimeout(() => {
                    window.location.href = '/adminLogin';
                }, 2000);
                return false;
            }
        } catch (error) {
            const diagnosticResults = [{
                type: 'error',
                title: 'Error de Conexión',
                details: [
                    'Error verificando autenticación',
                    `Detalles: ${error.message}`
                ]
            }];

            this.showDiagnosticResults(diagnosticResults);
            console.error('❌ Error verificando autenticación:', error);
            window.showNotification('Error de conexión. Verifica tu conexión a internet.', 'error');
            return false;
        }
    }

    // Función auxiliar para mostrar resultados del diagnóstico
    showDiagnosticResults(results) {
        const resultsContent = document.getElementById('dbResultsContent');
        const resultsSection = document.getElementById('dbResultsSection');

        if (!resultsContent || !resultsSection) return;

        resultsSection.style.display = 'block';

        const resultsHtml = results.map(result => {
            const iconClass = result.type === 'success' ? 'check-circle' :
                result.type === 'error' ? 'x-circle' : 'info';

            return `
                <div class="diagnostic-result ${result.type}">
                    <div class="diagnostic-header">
                        <svg class="diagnostic-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            ${result.type === 'success' ?
                    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2"/><polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2"/>' :
                    result.type === 'error' ?
                        '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>' :
                        '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4" stroke="currentColor" stroke-width="2"/><path d="M12 8h.01" stroke="currentColor" stroke-width="2"/>'}
                        </svg>
                        <span class="diagnostic-title">${result.title}</span>
                    </div>
                    <div class="diagnostic-details">
                        ${result.details.map(detail => `<div class="diagnostic-detail">${detail}</div>`).join('')}
                    </div>
                </div>
            `;
        }).join('');

        resultsContent.innerHTML = `
            <div class="diagnostic-summary">
                <h4>Resultado del Diagnóstico de Autenticación</h4>
                <div class="diagnostic-results">
                    ${resultsHtml}
                </div>
            </div>
        `;

        // Scroll to bottom
        resultsContent.scrollTop = resultsContent.scrollHeight;
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

/* ========================================
   SISTEMA DE NOTIFICACIONES APILADAS PARA ADMIN
   ======================================== */

class AdminNotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.maxNotifications = 5;
        this.init();
    }

    init() {
        // Crear contenedor si no existe
        if (!document.getElementById('admin-notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'admin-notification-container';
            this.container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10001; display: flex; flex-direction: column; gap: 10px; max-width: 450px; pointer-events: none;';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('admin-notification-container');
        }
    }

    show(message, type = 'info', duration = 3500) {
        // Crear notificación
        const notification = this.createNotification(message, type);

        // Agregar al contenedor
        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Gestionar límite de notificaciones
        if (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications.shift();
            this.removeNotification(oldest);
        }

        // Auto-remover
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        // Animar entrada
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });

        return notification;
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = 'admin-notification ' + type;

        // Aplicar estilos usando propiedades individuales
        Object.assign(notification.style, {
            background: this.getBackgroundColor(type),
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '16px 20px',
            borderLeft: '4px solid ' + this.getBorderColor(type),
            transform: 'translateX(100%)',
            opacity: '0',
            transition: 'all 0.3s ease',
            pointerEvents: 'auto',
            position: 'relative',
            overflow: 'hidden'
        });

        // Crear contenido HTML de forma segura
        const contentDiv = document.createElement('div');
        contentDiv.className = 'notification-content';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'notification-icon';
        iconDiv.innerHTML = this.getIcon(type);

        const textDiv = document.createElement('div');
        textDiv.className = 'notification-text';
        textDiv.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.setAttribute('aria-label', 'Cerrar notificaci\u00f3n');
        closeBtn.textContent = '\u00d7';

        const progressDiv = document.createElement('div');
        progressDiv.className = 'notification-progress';
        Object.assign(progressDiv.style, {
            position: 'absolute',
            bottom: '0',
            left: '0',
            height: '3px',
            background: this.getProgressColor(type),
            width: '100%',
            transformOrigin: 'left',
            animation: 'notificationProgress 3.5s linear forwards'
        });

        // Ensamblar elementos
        contentDiv.appendChild(iconDiv);
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(closeBtn);
        notification.appendChild(contentDiv);
        notification.appendChild(progressDiv);

        // Evento para cerrar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });

        return notification;
    }

    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;

        // Animar salida
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';

        // Remover del array
        const index = this.notifications.indexOf(notification);
        if (index > -1) {
            this.notifications.splice(index, 1);
        }

        // Remover del DOM después de la animación
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#f0fdf4',
            error: '#fef2f2',
            warning: '#fffbeb',
            info: '#eff6ff'
        };
        return colors[type] || colors.info;
    }

    getBorderColor(type) {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    getProgressColor(type) {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            success: '\u2713',
            error: '\u2717',
            warning: '\u26a0',
            info: '\u2139'
        };
        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '18px';
        iconSpan.style.color = this.getBorderColor(type);
        iconSpan.textContent = icons[type] || icons.info;
        return iconSpan.outerHTML;
    }

    /* ========================================
       FUNCIONES PARA CONFIGURACIÓN DE INSTITUCIÓN
       ======================================== */

    async resetInstitutionName() {
        try {
            const defaultName = 'Firmas Digitales FD';
            document.getElementById('institutionName').value = defaultName;

            // Actualizar vistas previas
            this.updateInstitutionPreviews(defaultName);

            window.showNotification('Nombre de institución restablecido', 'info');
        } catch (error) {
            console.error('Error restableciendo nombre:', error);
            window.showNotification('Error al restablecer el nombre', 'error');
        }
    }
}

// Agregar estilos CSS para las animaciones
const notificationStyles = `
@keyframes notificationProgress {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
}

@keyframes slideInRight {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes slideOutRight {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
}

.admin-notification {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
}

.notification-content {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.notification-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

.notification-text {
    flex: 1;
    color: #374151;
    font-weight: 500;
}

.notification-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #9ca3af;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.notification-close:hover {
    color: #374151;
    background: rgba(0, 0, 0, 0.05);
}

.notification-progress {
    border-radius: 0 0 8px 8px;
}

@media (prefers-color-scheme: dark) {
    .notification-text { color: #e5e7eb; }
    .notification-close:hover { background: rgba(255, 255, 255, 0.1); }
}
`;

// Inyectar estilos si no existen
if (!document.getElementById('admin-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'admin-notification-styles';
    style.textContent = notificationStyles;
    document.head.appendChild(style);
}

/* ========================================
   FUNCIONES PARA MANEJO DE FAVICON
   ======================================== */

// Función para seleccionar archivo de favicon
function selectFaviconFile() {
    const fileInput = document.getElementById('faviconUpload');
    if (fileInput) {
        fileInput.click();
    }
}

// Función para manejar cambio de archivo de favicon
function handleFaviconChange(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tipo de archivo
        const allowedTypes = ['image/x-icon', 'image/png', 'image/jpeg', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            showNotification('Tipo de archivo no válido. Use ICO, PNG, JPG o GIF.', 'error');
            return;
        }

        // Validar tamaño (máximo 1MB)
        if (file.size > 1024 * 1024) {
            showNotification('El archivo es demasiado grande. Máximo 1MB.', 'error');
            return;
        }

        // Mostrar vista previa
        const reader = new FileReader();
        reader.onload = function (e) {
            const faviconImg = document.getElementById('currentFavicon');
            if (faviconImg) {
                faviconImg.src = e.target.result;
                showNotification('Favicon seleccionado. Guarde la configuración para aplicar los cambios.', 'info');
            }
        };
        reader.readAsDataURL(file);

        // Subir archivo automáticamente
        uploadFavicon(file);
    }
}

// Función para subir favicon al servidor
async function uploadFavicon(file) {
    const formData = new FormData();
    formData.append('favicon', file);

    try {
        const response = await fetch('/api/admin/upload-favicon', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            showNotification('Favicon actualizado correctamente.', 'success');

            // Actualizar favicon en tiempo real
            updateFaviconInPage(result.faviconUrl);
        } else {
            throw new Error('Error al subir favicon');
        }
    } catch (error) {
        console.error('Error uploading favicon:', error);
        showNotification('Error al subir el favicon. Intente nuevamente.', 'error');
    }
}

// Función para actualizar favicon en la página
function updateFaviconInPage(faviconUrl) {
    // Actualizar favicon en el head
    let faviconLink = document.querySelector('link[rel="icon"]');
    if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
    }
    faviconLink.href = faviconUrl;

    // Actualizar shortcut icon también
    let shortcutIcon = document.querySelector('link[rel="shortcut icon"]');
    if (!shortcutIcon) {
        shortcutIcon = document.createElement('link');
        shortcutIcon.rel = 'shortcut icon';
        document.head.appendChild(shortcutIcon);
    }
    shortcutIcon.href = faviconUrl;
}

// Función para guardar configuración global (incluyendo favicon)
async function saveGlobalConfiguration() {
    // Llamar directamente a saveInstitutionName
    if (window.adminPanel) {
        try {
            await window.adminPanel.saveInstitutionName();
        } catch (error) {
            console.error('Error en saveInstitutionName:', error);
        }
    }

    // Aquí se pueden agregar más funciones de guardado en el futuro
    showNotification('Configuración guardada correctamente.', 'success');
}

/* ========================================
   EXPORTAR PARA OTROS MÓDULOS
   ======================================== */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPanel;
}
