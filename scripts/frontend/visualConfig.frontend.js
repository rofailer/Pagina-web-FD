// Sistema de Personalización Visual
// Maneja fondos dinámicos, favicon, elementos de texto y configuración del login

class VisualCustomizationManager {
    constructor() {
        if (window.visualManager instanceof VisualCustomizationManager) {
            return window.visualManager;
        }

        this.currentBackground = 'fondo1';
        this.currentFavicon = '../../favicon.ico';
        this.ready = this.init();
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
            const token = this.getAuthToken();
            const passwordChangePending = localStorage.getItem('forcePasswordChange') === 'true';
            const hasToken = token && token.trim() !== '' && !passwordChangePending;

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
                    this.currentBackground = this.normalizeBackground(config.background);
                    this.currentFavicon = config.favicon || '../../favicon.ico';

                    this.applyBackground(this.currentBackground);
                    this.applyFavicon(this.currentFavicon);
                    this.applyInstitutionalConfig(config);

                    // log eliminado
                    return;
                }
            } else if ([401, 403].includes(response.status) && hasToken) {
                // log eliminado
                return this.loadPublicConfig();
            }
        } catch (error) {
            // log eliminado
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
                    this.currentBackground = this.normalizeBackground(config.background);
                    this.currentFavicon = config.favicon || '../../favicon.ico';

                    this.applyBackground(this.currentBackground);
                    this.applyFavicon(this.currentFavicon);
                    this.applyInstitutionalConfig(config);

                    // log eliminado
                    return;
                }
            }
        } catch (error) {
            // log eliminado
        }

        this.loadFromLocalStorage();
    }

    loadFromLocalStorage() {
        const savedConfig = localStorage.getItem('visualConfig');
        if (savedConfig) {
            let config;
            try {
                config = JSON.parse(savedConfig);
            } catch (_error) {
                localStorage.removeItem('visualConfig');
                this.currentBackground = this.normalizeBackground(localStorage.getItem('globalBackground'));
                this.applyBackground(this.currentBackground);
                return;
            }

            this.currentBackground = this.normalizeBackground(config.background);
            this.currentFavicon = config.favicon || '../../favicon.ico';

            this.applyBackground(this.currentBackground);
            this.applyFavicon(this.currentFavicon);
            this.applyInstitutionalConfig(config);
        } else {
            this.currentBackground = this.normalizeBackground(localStorage.getItem('globalBackground'));
            this.applyBackground(this.currentBackground);
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
        this.showNotification('Fondo restaurado por defecto', 'success');
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
        bgType = this.normalizeBackground(bgType);
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
        const normalizedBackground = this.normalizeBackground(bgType);
        this.currentBackground = normalizedBackground;
        this.setGlobalBackground(normalizedBackground);
        document.body.setAttribute('data-bg', normalizedBackground);
    }

    setGlobalBackground(bgType) {
        localStorage.setItem('globalBackground', bgType);
        this.clearInlineBackgroundStyles();
    }

    normalizeBackground(bgType) {
        return ['fondo1', 'fondo2', 'fondoOscuro'].includes(bgType) ? bgType : 'fondo1';
    }

    getAuthToken() {
        // Las rutas /api/visual-config usan el JWT normal. El token
        // administrativo solo queda como respaldo para instalaciones que lo
        // acepten explícitamente.
        return localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
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

        // log eliminado
    }

    clearInlineBackgroundStyles() {
        const stylesToClear = ['background', 'backgroundImage', 'backgroundAttachment', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'];

        stylesToClear.forEach(style => {
            if (document.body.style[style]) {
                document.body.style[style] = '';
            }
        });

        // log eliminado
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

        const adminBrandLogo = document.querySelector('.admin-brand-logo');
        if (adminBrandLogo) {
            adminBrandLogo.style.backgroundImage = `url("${faviconSrc}")`;
        }
    }

    applyInstitutionalConfig(config = {}) {
        const institutionName = String(
            config.institution_name
            || config.institutionName
            || config.siteTitle
            || config.title
            || 'Firmas Digitales FD'
        ).trim();

        this.updateInstitutionName(institutionName || 'Firmas Digitales FD');
        this.updateContactDetails(
            config.contact_email ?? config.contactEmail ?? '',
            config.contact_phone ?? config.contactPhone ?? ''
        );
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
            contactEmail: document.getElementById('contactEmail')?.value || '',
            contactPhone: document.getElementById('contactPhone')?.value || '',
            adminHeaderTitle: document.getElementById('adminHeaderTitle')?.value || 'Sistema de Firmas Digitales',
            loginStyle: document.querySelector('.style-option.selected')?.dataset.style || 'solid'
        };

        localStorage.setItem('visualConfig', JSON.stringify(config));
        this.showNotification('Configuración guardada exitosamente', 'success');
    }

    resetConfig() {
        localStorage.removeItem('visualConfig');
        localStorage.removeItem('customBackground');

        this.currentBackground = 'fondo1';
        this.currentFavicon = '../../favicon.ico';

        this.applyBackground('fondo1');
        this.applyFavicon('../../favicon.ico');

        this.updateInstitutionName('Firmas Digitales FD');
        this.updateContactDetails('', '');

        this.updateUI();
        this.showNotification('Configuración restablecida', 'info');
    }

    updateUI() {
        const siteTitleInput = document.getElementById('siteTitle');
        const adminHeaderInput = document.getElementById('adminHeaderTitle');

        if (siteTitleInput) {
            siteTitleInput.value = document.querySelector('[data-institution-name]')?.textContent
                || 'Firmas Digitales FD';
        }
        if (adminHeaderInput) adminHeaderInput.value = document.getElementById('adminHeaderSubtitle')?.textContent || 'Sistema de Firmas Digitales';
    }

    async saveConfigToDatabase(config) {
        try {
            const response = await fetch('/api/visual-config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // log eliminado
                    return true;
                }
            } else if (response.status === 401) {
                // log eliminado
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
            // log eliminado
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
        const institutionName = String(name || '').trim() || 'Firmas Digitales FD';
        const pathname = window.location.pathname.toLowerCase();
        if (pathname.includes('loginadmin')) {
            document.title = `Acceso administrativo - ${institutionName}`;
        } else if (pathname.includes('paneladmin')) {
            document.title = `Administración | ${institutionName}`;
        } else {
            document.title = institutionName;
        }

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

        // Actualizar título específico de la página si existe
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = institutionName;
        }

        // Para compatibilidad con código anterior
        const tituloWeb = document.getElementById('tituloWeb');
        if (tituloWeb) {
            tituloWeb.textContent = institutionName;
        }

        this.updateFooterText(
            `© ${new Date().getFullYear()} ${institutionName}. Todos los derechos reservados.`
        );
    }

    updateContactDetails(emailValue, phoneValue) {
        const email = String(emailValue || '').trim();
        const phone = String(phoneValue || '').trim();

        document.querySelectorAll('[data-contact-email]').forEach(element => {
            element.textContent = email;
        });
        document.querySelectorAll('[data-contact-email-link]').forEach(link => {
            link.href = email ? `mailto:${email}` : '#contacto';
        });
        document.querySelectorAll('[data-contact-email-item]').forEach(item => {
            item.hidden = !email;
        });

        document.querySelectorAll('[data-contact-phone]').forEach(element => {
            element.textContent = phone;
        });
        document.querySelectorAll('[data-contact-phone-link]').forEach(link => {
            link.href = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '#contacto';
        });
        document.querySelectorAll('[data-contact-phone-item]').forEach(item => {
            item.hidden = !phone;
        });
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
        const institutionName = document.getElementById('siteTitle')?.value;

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
    if (!window.visualManager) {
        window.visualManager = new VisualCustomizationManager();
    }
});
