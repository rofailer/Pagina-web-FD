// Sistema de Personalización Visual
// Maneja fondos dinámicos, favicon, elementos de texto y configuración del login

class VisualCustomizationManager {
    constructor() {
        this.currentBackground = 'default';
        this.currentFavicon = '../../favicon.ico';
        this.init();
    }

    async init() {
        await this.loadSavedConfig();
        this.bindEvents();
        this.updateUI();

        // Marcar que la configuración visual se ha cargado
        window.visualConfigLoaded = true;

        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('visualConfigLoaded'));
    }

    async loadSavedConfig() {
        try {
            const token = localStorage.getItem('token');
            const hasToken = token && token.trim() !== '';

            let apiUrl = '/api/visual-config/public';
            if (hasToken) {
                apiUrl = '/api/visual-config';
            }

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': hasToken ? `Bearer ${token}` : ''
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const config = data.config;
                    this.currentBackground = config.background || 'fondo1';
                    this.currentFavicon = config.favicon || '../../favicon.ico';

                    this.applyBackground(this.currentBackground);
                    this.applyFavicon(this.currentFavicon);

                    if (config.institution_name) this.updateInstitutionName(config.institution_name);

                    console.log('Configuración cargada desde base de datos');
                    return;
                }
            } else if (response.status === 401 && hasToken) {
                console.warn('Token inválido, intentando con configuración pública');
                return this.loadPublicConfig();
            }
        } catch (error) {
            console.warn('Error al cargar configuración desde BD, usando localStorage:', error);
        }

        this.loadFromLocalStorage();
    }

    async loadPublicConfig() {
        try {
            const response = await fetch('/api/visual-config/public', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const config = data.config;
                    this.currentBackground = config.background || 'fondo1';
                    this.currentFavicon = config.favicon || '../../favicon.ico';

                    this.applyBackground(this.currentBackground);
                    this.applyFavicon(this.currentFavicon);

                    if (config.institution_name) this.updateInstitutionName(config.institution_name);

                    console.log('Configuración pública cargada');
                    return;
                }
            }
        } catch (error) {
            console.warn('Error al cargar configuración pública:', error);
        }

        this.loadFromLocalStorage();
    }

    loadFromLocalStorage() {
        const savedConfig = localStorage.getItem('visualConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            this.currentBackground = config.background || 'fondo1';
            this.currentFavicon = config.favicon || '../../favicon.ico';

            this.applyBackground(this.currentBackground);
            this.applyFavicon(this.currentFavicon);

            if (config.siteTitle) this.updateSiteTitle(config.siteTitle);
            if (config.headerTitle) this.updateHeaderTitle(config.headerTitle);
            if (config.footerText) this.updateFooterText(config.footerText);
            if (config.adminHeaderTitle) this.updateAdminHeaderTitle(config.adminHeaderTitle);
            if (config.institution_name) this.updateAdminHeaderTitle(config.institution_name);
        } else {
            this.currentBackground = 'fondo1';
            this.applyBackground('fondo1');
        }
    }

    bindEvents() {
        // Bind events for both regular page and admin panel backgrounds
        document.querySelectorAll('.background-option, .background-option-card').forEach(option => {
            option.addEventListener('click', (e) => {
                const bgType = e.currentTarget.dataset.bg;
                this.selectBackground(bgType);
            });
        });

        const faviconInput = document.getElementById('faviconUpload');
        if (faviconInput) {
            faviconInput.addEventListener('change', (e) => {
                this.handleFaviconUpload(e.target.files[0]);
            });
        }

        // Bind admin panel specific events
        this.bindAdminPanelEvents();
    }

    bindAdminPanelEvents() {
        const resetBackgroundBtn = document.getElementById('resetBackgroundBtn');
        const saveGlobalBackground = document.getElementById('saveGlobalBackground');

        if (resetBackgroundBtn) {
            resetBackgroundBtn.addEventListener('click', () => {
                this.resetToDefaultBackground();
            });
        }

        if (saveGlobalBackground) {
            saveGlobalBackground.addEventListener('click', () => {
                this.saveGlobalBackgroundConfig();
            });
        }
    }

    resetToDefaultBackground() {
        this.selectBackground('fondo1');
        this.showNotification('Background restaurado por defecto', 'success');
    }

    async saveGlobalBackgroundConfig() {
        const config = {
            background: this.currentBackground,
            favicon: this.currentFavicon,
            institution_name: document.getElementById('tituloWeb')?.textContent || 'Firmas Digitales FD'
        };

        const savedToDB = await this.saveConfigToDatabase(config);

        if (savedToDB) {
            this.showNotification('Configuración global de background guardada correctamente', 'success');
        } else {
            this.showNotification('Error al guardar configuración global', 'error');
        }
    }

    selectBackground(bgType) {
        // Remove selected class from all background options (both regular and admin panel)
        document.querySelectorAll('.background-option, .background-option-card').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Add selected class to the clicked option
        const selectedOption = document.querySelector(`[data-bg="${bgType}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        const customUpload = document.getElementById('customBgUpload');
        if (customUpload) {
            customUpload.style.display = bgType === 'custom' ? 'block' : 'none';
        }

        this.currentBackground = bgType;
        this.applyBackground(bgType);
        this.saveCurrentConfig();
    }

    async saveCurrentConfig() {
        const config = {
            background: this.currentBackground,
            favicon: this.currentFavicon,
            institution_name: document.getElementById('tituloWeb')?.textContent || 'Firmas Digitales FD'
        };

        const savedToDB = await this.saveConfigToDatabase(config);

        if (savedToDB) {
            this.showNotification('Configuración guardada correctamente', 'success');
        } else {
            this.showNotification('Configuración guardada localmente', 'info');
        }
    }

    applyBackground(bgType) {
        this.setGlobalBackground(bgType);
        document.body.setAttribute('data-bg', bgType);
    }

    setGlobalBackground(bgType) {
        localStorage.setItem('globalBackground', bgType);
        this.clearInlineBackgroundStyles();

        if (bgType === 'fondo1') {
            this.applyImageBackground('../../../recursos/Fondo.jpg');
        } else if (bgType === 'fondo2') {
            this.applyImageBackground('../../../recursos/Fondo2.jpg');
        }
    }

    applyImageBackground(imagePath) {
        if (document.body.style.background) {
            document.body.style.background = '';
        }
        if (document.body.style.backgroundImage) {
            document.body.style.backgroundImage = '';
        }
        if (document.body.style.backgroundAttachment) {
            document.body.style.backgroundAttachment = '';
        }

        console.log('Background image configured:', imagePath);
    }

    clearInlineBackgroundStyles() {
        const stylesToClear = ['background', 'backgroundImage', 'backgroundAttachment', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'];

        stylesToClear.forEach(style => {
            if (document.body.style[style]) {
                document.body.style[style] = '';
            }
        });

        console.log('Inline background styles cleared');
    }

    handleFaviconUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const faviconData = e.target.result;
            this.applyFavicon(faviconData);

            const preview = document.getElementById('currentFavicon');
            if (preview) {
                preview.src = faviconData;
            }
        };
        reader.readAsDataURL(file);
    }

    applyFavicon(faviconSrc) {
        const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
        if (favicon) {
            favicon.href = faviconSrc;
        } else {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = faviconSrc;
            document.head.appendChild(newFavicon);
        }

        this.currentFavicon = faviconSrc;
    }

    updateSiteTitle(title) {
        const titleElement = document.getElementById('pageTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }
        document.title = title;
    }

    updateHeaderTitle(title) {
        const headerElement = document.getElementById('tituloWeb');
        if (headerElement) {
            headerElement.textContent = title;
        }
    }

    updateFooterText(text) {
        const footerElement = document.getElementById('footerCompanyName');
        if (footerElement) {
            footerElement.textContent = text;
        }
    }

    updateAdminHeaderTitle(title) {
        const adminElement = document.getElementById('adminHeaderSubtitle');
        if (adminElement) {
            adminElement.textContent = title;
        }
    }

    saveConfig() {
        const config = {
            background: this.currentBackground,
            favicon: this.currentFavicon,
            siteTitle: document.getElementById('siteTitle')?.value || 'Firmas Digitales FD',
            headerTitle: document.getElementById('headerTitle')?.value || 'Firmas Digitales FD',
            footerText: document.getElementById('footerText')?.value || 'Firmas Digitales FD',
            adminHeaderTitle: document.getElementById('adminHeaderTitle')?.value || 'Sistema de Firmas Digitales',
            loginStyle: document.querySelector('.style-option.selected')?.dataset.style || 'solid'
        };

        localStorage.setItem('visualConfig', JSON.stringify(config));
        this.showNotification('Configuración guardada exitosamente', 'success');
    }

    resetConfig() {
        localStorage.removeItem('visualConfig');
        localStorage.removeItem('customBackground');

        this.currentBackground = 'default';
        this.currentFavicon = '../../favicon.ico';

        this.applyBackground('default');
        this.applyFavicon('../../favicon.ico');

        this.updateSiteTitle('Firmas Digitales FD');
        this.updateHeaderTitle('Firmas Digitales FD');
        this.updateFooterText('Firmas Digitales FD');
        this.updateAdminHeaderTitle('Firmas Digitales FD');

        this.updateUI();
        this.showNotification('Configuración restablecida', 'info');
    }

    updateUI() {
        const siteTitleInput = document.getElementById('siteTitle');
        const headerTitleInput = document.getElementById('headerTitle');
        const footerTextInput = document.getElementById('footerText');
        const adminHeaderInput = document.getElementById('adminHeaderTitle');

        if (siteTitleInput) siteTitleInput.value = document.title;
        if (headerTitleInput) headerTitleInput.value = document.getElementById('tituloWeb')?.textContent || 'Firmas Digitales FD';
        if (footerTextInput) footerTextInput.value = document.getElementById('footerCompanyName')?.textContent || 'Firmas Digitales FD';
        if (adminHeaderInput) adminHeaderInput.value = document.getElementById('adminHeaderSubtitle')?.textContent || 'Sistema de Firmas Digitales';
    }

    async saveConfigToDatabase(config) {
        try {
            const response = await fetch('/api/visual-config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('Configuración guardada en base de datos');
                    return true;
                }
            } else if (response.status === 401) {
                console.warn('No autorizado para guardar configuración');
                return false;
            }
        } catch (error) {
            console.error('Error al guardar configuración en BD:', error);
        }

        this.saveConfigToLocalStorage(config);
        return false;
    }

    saveConfigToLocalStorage(config) {
        try {
            localStorage.setItem('visualConfig', JSON.stringify(config));
            console.log('Configuración guardada en localStorage');
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
        }
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    updateInstitutionName(name) {
        // Actualizar título de la página
        document.title = name;

        // Actualizar elementos del header si existen
        const headerTitles = document.querySelectorAll('.site-title, .header-title, [data-institution-name]');
        headerTitles.forEach(element => {
            element.textContent = name;
        });

        // Actualizar elementos del footer si existen
        const footerElements = document.querySelectorAll('.footer-institution, [data-footer-institution]');
        footerElements.forEach(element => {
            element.textContent = name;
        });

        // Actualizar título específico de la página si existe
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = name;
        }

        // Para compatibilidad con código anterior
        const tituloWeb = document.getElementById('tituloWeb');
        if (tituloWeb) {
            tituloWeb.textContent = name;
        }
    }

    updateAdminHeaderTitle(title) {
        const adminTitleElement = document.getElementById('adminHeaderSubtitle');
        if (adminTitleElement) {
            adminTitleElement.textContent = title;
        }
    }
}

// Funciones globales para usar desde HTML
function saveVisualConfig() {
    if (window.visualManager) {
        window.visualManager.saveConfig();
    }
}

function previewVisualChanges() {
    if (window.visualManager) {
        const institutionName = document.getElementById('siteTitle')?.value || document.getElementById('headerTitle')?.value;

        if (institutionName) window.visualManager.updateInstitutionName(institutionName);
        if (institutionName) window.visualManager.updateAdminHeaderTitle(institutionName);

        window.visualManager.showNotification('Vista previa aplicada. Los cambios no se guardarán hasta que hagas clic en "Aplicar Cambios Visuales"', 'info');
    }
}

function resetVisualConfig() {
    if (window.visualManager && confirm('¿Estás seguro de que quieres restablecer toda la configuración visual?')) {
        window.visualManager.resetConfig();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.visualManager = new VisualCustomizationManager();
});