/**
 * ============================================
 * SISTEMA UNIFICADO DE TEMAS
 * ============================================
 * 
 * Sistema centralizado para gestión de temas con:
 * - Sincronización en tiempo real cross-tab/cross-device
 * - Persistencia en servidor
 * - Aplicación inmediata sin recargar
 * 
 * @version 2.0.0
 */

class ThemeManager {
    constructor() {
        this.availableThemes = ['orange', 'blue', 'green', 'purple', 'red', 'teal', 'dark'];
        this.currentTheme = 'orange';
        this.customColor = null;
        this.syncInterval = null;

        this.init();
    }

    /**
     * Inicializa el sistema de temas
     */
    async init() {
        console.log('🎨 Inicializando sistema unificado de temas...');

        // Cargar tema actual del servidor
        await this.loadThemeFromServer();

        // Configurar sincronización automática
        this.startSync();

        // Configurar listeners para cambios
        this.setupEventListeners();

        console.log('🎨 Sistema de temas listo');
    }

    /**
     * Carga el tema actual desde el servidor
     */
    async loadThemeFromServer() {
        try {
            const response = await fetch('/api/global-theme-config');

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.theme) {
                    this.applyServerTheme(data.theme);
                } else {
                    this.applyDefaultTheme();
                }
            } else {
                this.applyDefaultTheme();
            }
        } catch (error) {
            console.warn('🎨 Error cargando tema del servidor, usando tema por defecto:', error);
            this.applyDefaultTheme();
        }
    }

    /**
     * Aplica un tema recibido del servidor
     */
    applyServerTheme(themeConfig) {
        if (themeConfig.selectedTheme === 'custom' && themeConfig.customColor) {
            this.setCustomColor(themeConfig.customColor, false); // false = no sincronizar
        } else if (this.availableThemes.includes(themeConfig.selectedTheme)) {
            this.changeTheme(themeConfig.selectedTheme, false); // false = no sincronizar
        } else {
            this.applyDefaultTheme();
        }
    }

    /**
     * Aplica el tema por defecto
     */
    applyDefaultTheme() {
        this.changeTheme('orange', false);
    }

    /**
     * Cambia el tema actual
     */
    changeTheme(themeName, syncToServer = true) {
        if (!this.availableThemes.includes(themeName)) {
            console.warn(`🎨 Tema inválido: ${themeName}`);
            return false;
        }

        this.currentTheme = themeName;
        this.customColor = null;
        this.applyTheme(themeName);

        if (syncToServer) {
            this.saveToServer();
        }

        this.dispatchThemeEvent(themeName);
        return true;
    }

    /**
     * Establece un color personalizado
     */
    setCustomColor(hexColor, syncToServer = true) {
        if (!this.isValidHex(hexColor)) {
            console.warn(`🎨 Color hex inválido: ${hexColor}`);
            return false;
        }

        this.currentTheme = 'custom';
        this.customColor = hexColor;
        this.applyCustomColor(hexColor);

        if (syncToServer) {
            this.saveToServer();
        }

        this.dispatchThemeEvent('custom', hexColor);
        return true;
    }

    /**
     * Aplica un tema predefinido
     */
    applyTheme(themeName) {
        const root = document.documentElement;

        // Limpiar estilos personalizados
        root.style.removeProperty('--primary-color');
        root.style.removeProperty('--primary-rgb');
        root.style.removeProperty('--secondary-color');
        root.style.removeProperty('--accent-color');

        // Aplicar tema
        root.setAttribute('data-theme', themeName);
    }

    /**
     * Aplica un color personalizado
     */
    applyCustomColor(hexColor) {
        const root = document.documentElement;
        const rgb = this.hexToRgb(hexColor);

        if (!rgb) return;

        root.setAttribute('data-theme', 'custom');
        root.style.setProperty('--primary-color', hexColor);
        root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

        // Generar colores derivados
        const secondary = this.adjustBrightness(hexColor, -15);
        const accent = this.adjustBrightness(hexColor, -8);

        root.style.setProperty('--secondary-color', secondary);
        root.style.setProperty('--accent-color', accent);
    }

    /**
     * Guarda la configuración actual en el servidor
     */
    async saveToServer() {
        try {
            // Solo intentar guardar si hay token de admin disponible
            const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('token');
            if (!adminToken) {
                console.log('🎨 No hay token de admin disponible, omitiendo guardado automático');
                return;
            }

            const themeData = {
                selectedTheme: this.currentTheme,
                customColor: this.customColor,
                timestamp: Date.now()
            };

            const response = await fetch('/api/admin/save-theme-configuration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(themeData)
            });

            if (response.ok) {
                console.log('🎨 Tema guardado en servidor');
            } else {
                console.warn('🎨 Error guardando tema en servidor:', response.status, response.statusText);
            }
        } catch (error) {
            console.warn('🎨 Error de conexión al guardar tema:', error);
        }
    }

    /**
     * Inicia la sincronización automática
     */
    startSync() {
        // Verificar cambios cada 30 segundos (reducido de 5 para menos ruido en logs)
        this.syncInterval = setInterval(() => {
            this.checkForUpdates();
        }, 30000);

        // También sincronizar cuando la ventana recibe foco
        window.addEventListener('focus', () => {
            this.checkForUpdates();
        });
    }

    /**
     * Verifica si hay actualizaciones del tema
     */
    async checkForUpdates() {
        try {
            const response = await fetch('/api/global-theme-config');

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.theme) {
                    const serverTheme = data.theme;

                    // Verificar si el tema del servidor es diferente al actual
                    if (this.isDifferentTheme(serverTheme)) {
                        console.log('🎨 Detectado cambio de tema, sincronizando...');
                        this.applyServerTheme(serverTheme);
                    }
                }
            }
        } catch (error) {
            // Silencioso - no llenar la consola de errores
        }
    }

    /**
     * Verifica si un tema del servidor es diferente al actual
     */
    isDifferentTheme(serverTheme) {
        if (serverTheme.selectedTheme !== this.currentTheme) {
            return true;
        }

        if (serverTheme.selectedTheme === 'custom') {
            return serverTheme.customColor !== this.customColor;
        }

        return false;
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Listener para cuando se cierra la ventana
        window.addEventListener('beforeunload', () => {
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }
        });
    }

    /**
     * Dispara un evento de cambio de tema
     */
    dispatchThemeEvent(themeName, customColor = null) {
        const eventDetail = { theme: themeName };
        if (customColor) {
            eventDetail.customColor = customColor;
        }

        window.dispatchEvent(new CustomEvent('themeChanged', { detail: eventDetail }));
    }

    /**
     * Resetea al tema por defecto
     */
    async resetToDefault() {
        await this.changeTheme('orange', true);
    }

    /**
     * Aplica un tema para preview (solo visual, no guarda ni sincroniza)
     */
    previewTheme(themeName) {
        if (!this.availableThemes.includes(themeName)) {
            console.warn(`🎨 Tema inválido para preview: ${themeName}`);
            return false;
        }

        this.applyTheme(themeName);
        console.log(`🎨 Preview aplicado: ${themeName}`);
        return true;
    }

    /**
     * Aplica un color personalizado para preview (solo visual, no guarda ni sincroniza)
     */
    previewCustomColor(hexColor) {
        if (!this.isValidHex(hexColor)) {
            console.warn(`🎨 Color hex inválido para preview: ${hexColor}`);
            return false;
        }

        this.applyCustomColor(hexColor);
        console.log(`🎨 Preview color aplicado: ${hexColor}`);
        return true;
    }

    /**
     * Restaura el tema actual aplicado (útil para salir del preview)
     */
    restoreCurrentTheme() {
        if (this.currentTheme === 'custom' && this.customColor) {
            this.applyCustomColor(this.customColor);
        } else {
            this.applyTheme(this.currentTheme);
        }
        console.log(`🎨 Tema restaurado: ${this.currentTheme}`);
    }

    // =========================
    // UTILIDADES
    // =========================

    isValidHex(hex) {
        return /^#[0-9A-F]{6}$/i.test(hex);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    adjustBrightness(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));

        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B)
            .toString(16).slice(1).toUpperCase();
    }

    // =========================
    // API PÚBLICA
    // =========================

    getCurrentTheme() { return this.currentTheme; }
    getCustomColor() { return this.customColor; }
    getAvailableThemes() { return this.availableThemes; }
}

// =========================
// INICIALIZACIÓN Y API GLOBAL
// =========================

// Inicializar automáticamente
let themeManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager = new ThemeManager();
        window.themeManager = themeManager;
    });
} else {
    themeManager = new ThemeManager();
    window.themeManager = themeManager;
}

// API global simplificada
window.changeTheme = (theme) => themeManager?.changeTheme(theme) || false;
window.setCustomColor = (color) => themeManager?.setCustomColor(color) || false;
window.getCurrentTheme = () => themeManager?.getCurrentTheme() || 'orange';
window.getCustomColor = () => themeManager?.getCustomColor() || null;
window.resetTheme = () => themeManager?.resetToDefault();

// Nuevas funciones de preview
window.previewTheme = (theme) => themeManager?.previewTheme(theme) || false;
window.previewCustomColor = (color) => themeManager?.previewCustomColor(color) || false;
window.restoreCurrentTheme = () => themeManager?.restoreCurrentTheme();
