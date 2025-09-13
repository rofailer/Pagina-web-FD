// Sistema de Personalización Visual
// Maneja fondos dinámicos, favicon, elementos de texto y configuración del login

class VisualCustomizationManager {
    constructor() {
        this.currentBackground = 'default';
        this.currentFavicon = '../../favicon.ico';
        this.init();
    }

    init() {
        this.loadSavedConfig();
        this.bindEvents();
        this.updateUI();
    }

    async loadSavedConfig() {
        try {
            // Verificar si hay un token válido
            const token = localStorage.getItem('token');
            const hasToken = token && token.trim() !== '';

            let apiUrl = '/api/visual-config/public'; // Ruta pública por defecto

            // Si hay token, intentar usar la ruta protegida para obtener más datos
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

                    // Aplicar configuración desde BD
                    this.applyBackground(this.currentBackground);
                    this.applyFavicon(this.currentFavicon);

                    // Aplicar textos dinámicos
                    if (config.site_title) this.updateSiteTitle(config.site_title);
                    if (config.header_title) this.updateHeaderTitle(config.header_title);
                    if (config.footer_text) this.updateFooterText(config.footer_text);
                    if (config.admin_header_title) this.updateAdminHeaderTitle(config.admin_header_title);

                    console.log('Configuración cargada desde base de datos');
                    return;
                }
            } else if (response.status === 401 && hasToken) {
                // Si falla con token, intentar con ruta pública
                console.warn('Token inválido, intentando con configuración pública');
                return this.loadPublicConfig();
            }
        } catch (error) {
            console.warn('Error al cargar configuración desde BD, usando localStorage:', error);
        }

        // Fallback a localStorage
        this.loadFromLocalStorage();
    }

    // Método para cargar configuración pública
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

                    if (config.site_title) this.updateSiteTitle(config.site_title);
                    if (config.header_title) this.updateHeaderTitle(config.header_title);
                    if (config.footer_text) this.updateFooterText(config.footer_text);

                    console.log('Configuración pública cargada');
                    return;
                }
            }
        } catch (error) {
            console.warn('Error al cargar configuración pública:', error);
        }

        this.loadFromLocalStorage();
    }

    // Método para cargar desde localStorage
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
        } else {
            this.currentBackground = 'fondo1';
            this.applyBackground('fondo1');
        }
    } bindEvents() {
        // Eventos para selección de fondos
        document.querySelectorAll('.background-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const bgType = e.currentTarget.dataset.bg;
                this.selectBackground(bgType);
            });
        });

        // Evento para subir fondo personalizado
        const customBgInput = document.getElementById('customBackground');
        if (customBgInput) {
            customBgInput.addEventListener('change', (e) => {
                this.handleCustomBackgroundUpload(e.target.files[0]);
            });
        }

        // Evento para cambiar favicon
        const faviconInput = document.getElementById('faviconUpload');
        if (faviconInput) {
            faviconInput.addEventListener('change', (e) => {
                this.handleFaviconUpload(e.target.files[0]);
            });
        }

        // Eventos para estilos del modal de login
        document.querySelectorAll('.style-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const style = e.currentTarget.dataset.style;
                this.selectLoginStyle(style);
            });
        });
    }

    selectBackground(bgType) {
        // Remover selección anterior
        document.querySelectorAll('.background-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Agregar selección nueva
        document.querySelector(`[data-bg="${bgType}"]`).classList.add('selected');

        // Mostrar/ocultar input de fondo personalizado
        const customUpload = document.getElementById('customBgUpload');
        if (customUpload) {
            customUpload.style.display = bgType === 'custom' ? 'block' : 'none';
        }

        this.currentBackground = bgType;
        this.applyBackground(bgType);

        // Guardar configuración automáticamente
        this.saveCurrentConfig();
    }

    // Guardar configuración actual
    async saveCurrentConfig() {
        const config = {
            background: this.currentBackground,
            favicon: this.currentFavicon,
            site_title: document.title,
            header_title: document.getElementById('tituloWeb')?.textContent || 'Firmas Digitales FD',
            footer_text: document.getElementById('footerCompanyName')?.textContent || '© 2024 Firmas Digitales FD. Todos los derechos reservados.',
            admin_header_title: document.getElementById('adminHeaderSubtitle')?.textContent || 'Panel Administrativo'
        };

        // Intentar guardar en base de datos primero
        const savedToDB = await this.saveConfigToDatabase(config);

        if (savedToDB) {
            this.showNotification('Configuración guardada correctamente', 'success');
        } else {
            this.showNotification('Configuración guardada localmente', 'info');
        }
    }

    applyBackground(bgType) {
        // Aplicar fondo global a todas las páginas
        this.setGlobalBackground(bgType);

        // Para páginas admin, aplicar atributo data-bg
        if (document.body.classList.contains('admin-body')) {
            document.body.setAttribute('data-bg', bgType);
        }
    }

    setGlobalBackground(bgType) {
        // Guardar configuración global en localStorage (temporal hasta que se implemente BD)
        localStorage.setItem('globalBackground', bgType);

        // Aplicar fondo según el tipo
        if (bgType === 'fondo1') {
            this.applyImageBackground('../../../recursos/Fondo.jpg');
        } else if (bgType === 'fondo2') {
            this.applyImageBackground('../../../recursos/Fondo2.jpg');
        }
    }

    applyImageBackground(imagePath) {
        // Aplicar fondo con gradiente sutil para mejor legibilidad
        const backgroundStyle = `
      background: linear-gradient(rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%),
                  url('${imagePath}') center/cover no-repeat fixed;
      background-attachment: fixed;
    `;

        // Aplicar a body si no es página admin
        if (!document.body.classList.contains('admin-body') && !document.body.classList.contains('admin-access-page')) {
            document.body.style.cssText += backgroundStyle;
        }
    }

    handleCustomBackgroundUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            localStorage.setItem('customBackground', imageData);
            this.applyBackground('custom');
        };
        reader.readAsDataURL(file);
    }

    handleFaviconUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const faviconData = e.target.result;
            this.applyFavicon(faviconData);

            // Actualizar preview
            const preview = document.getElementById('currentFavicon');
            if (preview) {
                preview.src = faviconData;
            }
        };
        reader.readAsDataURL(file);
    }

    applyFavicon(faviconSrc) {
        // Cambiar favicon dinámicamente
        const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
        if (favicon) {
            favicon.href = faviconSrc;
        } else {
            // Crear elemento favicon si no existe
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

        // También actualizar el título del documento
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

    selectLoginStyle(style) {
        // Remover selección anterior
        document.querySelectorAll('.style-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Agregar selección nueva
        document.querySelector(`[data-style="${style}"]`).classList.add('selected');

        // Aplicar estilo al modal de login
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.className = `auth-modal login-style-${style}`;
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

        // Mostrar mensaje de éxito
        this.showNotification('Configuración guardada exitosamente', 'success');
    }

    resetConfig() {
        localStorage.removeItem('visualConfig');
        localStorage.removeItem('customBackground');

        // Resetear a valores por defecto
        this.currentBackground = 'default';
        this.currentFavicon = '../../favicon.ico';

        this.applyBackground('default');
        this.applyFavicon('../../favicon.ico');

        this.updateSiteTitle('Firmas Digitales FD');
        this.updateHeaderTitle('Firmas Digitales FD');
        this.updateFooterText('Firmas Digitales FD');
        this.updateAdminHeaderTitle('Sistema de Firmas Digitales');

        this.updateUI();
        this.showNotification('Configuración restablecida', 'info');
    }

    updateUI() {
        // Actualizar inputs con valores actuales
        const siteTitleInput = document.getElementById('siteTitle');
        const headerTitleInput = document.getElementById('headerTitle');
        const footerTextInput = document.getElementById('footerText');
        const adminHeaderInput = document.getElementById('adminHeaderTitle');
        const opacityInput = document.getElementById('loginOpacity');

        if (siteTitleInput) siteTitleInput.value = document.title;
        if (headerTitleInput) headerTitleInput.value = document.getElementById('tituloWeb')?.textContent || 'Firmas Digitales FD';
        if (footerTextInput) footerTextInput.value = document.getElementById('footerCompanyName')?.textContent || 'Firmas Digitales FD';
        if (adminHeaderInput) adminHeaderInput.value = document.getElementById('adminHeaderSubtitle')?.textContent || 'Sistema de Firmas Digitales';
        if (opacityInput) {
            const currentOpacity = opacityInput.value;
            this.updateOpacityValue(currentOpacity);
        }
    }

    // Guardar configuración en base de datos
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

        // Si falla la BD, guardar en localStorage como fallback
        this.saveConfigToLocalStorage(config);
        return false;
    }

    // Guardar configuración en localStorage (fallback)
    saveConfigToLocalStorage(config) {
        try {
            localStorage.setItem('visualConfig', JSON.stringify(config));
            console.log('Configuración guardada en localStorage');
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Usar el sistema de notificaciones existente
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
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
        // Aplicar cambios temporales para preview
        const siteTitle = document.getElementById('siteTitle')?.value;
        const headerTitle = document.getElementById('headerTitle')?.value;
        const footerText = document.getElementById('footerText')?.value;
        const adminHeaderTitle = document.getElementById('adminHeaderTitle')?.value;

        if (siteTitle) window.visualManager.updateSiteTitle(siteTitle);
        if (headerTitle) window.visualManager.updateHeaderTitle(headerTitle);
        if (footerText) window.visualManager.updateFooterText(footerText);
        if (adminHeaderTitle) window.visualManager.updateAdminHeaderTitle(adminHeaderTitle);

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