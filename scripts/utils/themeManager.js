/**
 * ============================================
 * SISTEMA DE TEMAS DINÁMICOS
 * ============================================
 * 
 * Permite cambiar el color principal de toda la aplicación
 * de forma dinámica y persistente.
 * 
 * Características:
 * - 6 temas predefinidos
 * - Colores personalizados
 * - Persistencia en localStorage
 * - API para control programático
 * - Eventos personalizados
 * 
 * @author Tu Nombre
 * @version 1.0.0
 */

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('selectedTheme') || 'orange';
        this.customColor = localStorage.getItem('customColor') || null;
        this.init();
    }

    /**
     * Inicializa el sistema de temas
     */
    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.updateActiveOption();
        this.loadCustomColor();
    }

    /**
     * Configura los event listeners para el selector de temas
     */
    setupEventListeners() {
        const themeBtn = document.getElementById('themeBtn');
        const themeDropdown = document.getElementById('themeDropdown');
        const themeOptions = document.querySelectorAll('.theme-option');

        if (!themeBtn || !themeDropdown) {
            console.warn('🎨 ThemeManager: Elementos del selector de temas no encontrados');
            return;
        }

        // Toggle dropdown y decidir dirección (arriba/abajo)
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Calcular espacio disponible por debajo del botón
            const rect = themeBtn.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const estimatedHeight = 200; // altura aproximada del dropdown
            if (spaceBelow < estimatedHeight) {
                themeDropdown.classList.add('open-up');
            } else {
                themeDropdown.classList.remove('open-up');
            }
            themeDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            themeDropdown.classList.remove('active');
        });

        // Prevent dropdown from closing when clicking inside
        themeDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Theme selection
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const theme = option.dataset.theme;
                this.changeTheme(theme);
                themeDropdown.classList.remove('active');
            });
        });
    }

    /**
     * Cambia el tema actual
     * @param {string} themeName - Nombre del tema a aplicar
     */
    changeTheme(themeName) {
        this.currentTheme = themeName;
        this.applyTheme(themeName);
        this.updateActiveOption();
        this.saveTheme(themeName);

        // Disparar evento personalizado
        this.dispatchThemeEvent(themeName);

        console.log(`🎨 Tema cambiado a: ${themeName}`);
    }

    /**
     * Aplica un tema específico
     * @param {string} themeName - Nombre del tema
     */
    applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);

        // Si es un tema personalizado, aplicar el color guardado
        if (themeName === 'custom' && this.customColor) {
            this.applyCustomColor(this.customColor);
        }
    }

    /**
     * Actualiza la opción activa en el dropdown
     */
    updateActiveOption() {
        const options = document.querySelectorAll('.theme-option');
        options.forEach(option => {
            const isActive = option.dataset.theme === this.currentTheme;
            option.classList.toggle('active', isActive);
        });
    }

    /**
     * Guarda el tema en localStorage
     * @param {string} themeName - Nombre del tema
     */
    saveTheme(themeName) {
        localStorage.setItem('selectedTheme', themeName);
    }

    /**
     * Carga un color personalizado si existe
     */
    loadCustomColor() {
        if (this.currentTheme === 'custom' && this.customColor) {
            this.applyCustomColor(this.customColor);
        }
    }

    /**
     * Establece un color personalizado
     * @param {string} hexColor - Color en formato hex (#rrggbb)
     * @returns {boolean} - true si se aplicó correctamente
     */
    setCustomColor(hexColor) {
        // Validar formato hex
        if (!this.isValidHex(hexColor)) {
            console.error('🎨 Color hex inválido:', hexColor);
            return false;
        }

        this.customColor = hexColor;
        this.currentTheme = 'custom';

        this.applyCustomColor(hexColor);
        this.saveCustomColor(hexColor);
        this.dispatchThemeEvent('custom', hexColor);

        console.log(`🎨 Color personalizado aplicado: ${hexColor}`);
        return true;
    }

    /**
     * Aplica un color personalizado
     * @param {string} hexColor - Color en formato hex
     */
    applyCustomColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return;

        const root = document.documentElement;
        root.style.setProperty('--primary-color', hexColor);
        root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

        // Generar colores secundarios automáticamente
        const secondary = this.adjustBrightness(hexColor, -15);
        const accent = this.adjustBrightness(hexColor, -8);

        root.style.setProperty('--secondary-color', secondary);
        root.style.setProperty('--accent-color', accent);
    }

    /**
     * Guarda el color personalizado
     * @param {string} hexColor - Color a guardar
     */
    saveCustomColor(hexColor) {
        localStorage.setItem('customColor', hexColor);
        localStorage.setItem('selectedTheme', 'custom');
    }

    /**
     * Dispara un evento personalizado de cambio de tema
     * @param {string} themeName - Nombre del tema
     * @param {string} customColor - Color personalizado (opcional)
     */
    dispatchThemeEvent(themeName, customColor = null) {
        const eventDetail = {
            theme: themeName,
            timestamp: Date.now()
        };

        if (customColor) {
            eventDetail.customColor = customColor;
        }

        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: eventDetail
        }));
    }

    /**
     * Obtiene el tema actual
     * @returns {string} - Nombre del tema actual
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Obtiene el color personalizado actual
     * @returns {string|null} - Color hex o null
     */
    getCustomColor() {
        return this.customColor;
    }

    /**
     * Obtiene todos los temas disponibles
     * @returns {Array} - Lista de temas disponibles
     */
    getAvailableThemes() {
        return ['orange', 'blue', 'green', 'purple', 'red', 'teal'];
    }

    /**
     * Resetea al tema por defecto
     */
    resetToDefault() {
        this.changeTheme('orange');
        localStorage.removeItem('customColor');
        this.customColor = null;
    }

    // =========================
    // UTILIDADES
    // =========================

    /**
     * Valida si un string es un color hex válido
     * @param {string} hex - String a validar
     * @returns {boolean}
     */
    isValidHex(hex) {
        return /^#[0-9A-F]{6}$/i.test(hex);
    }

    /**
     * Convierte hex a RGB
     * @param {string} hex - Color hex
     * @returns {Object|null} - {r, g, b} o null
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Ajusta el brillo de un color hex
     * @param {string} hex - Color hex base
     * @param {number} percent - Porcentaje de ajuste (-100 a 100)
     * @returns {string} - Color hex ajustado
     */
    adjustBrightness(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));

        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B)
            .toString(16).slice(1).toUpperCase();
    }
}

// =========================
// INICIALIZACIÓN Y API GLOBAL
// =========================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();

    // Log de inicialización
    console.log('🎨 Sistema de temas inicializado');

    // Ejemplo de listener para cambios de tema
    window.addEventListener('themeChanged', (e) => {
        console.log('🎨 Evento de cambio de tema:', e.detail);
    });
});

// =========================
// API GLOBAL
// =========================

/**
 * Cambia el tema actual
 * @param {string} theme - Nombre del tema
 */
window.changeTheme = (theme) => {
    if (window.themeManager) {
        return window.themeManager.changeTheme(theme);
    }
    console.warn('🎨 ThemeManager no está inicializado');
};

/**
 * Establece un color personalizado
 * @param {string} color - Color hex
 */
window.setCustomColor = (color) => {
    if (window.themeManager) {
        return window.themeManager.setCustomColor(color);
    }
    console.warn('🎨 ThemeManager no está inicializado');
};

/**
 * Obtiene el tema actual
 * @returns {string}
 */
window.getCurrentTheme = () => {
    if (window.themeManager) {
        return window.themeManager.getCurrentTheme();
    }
    return 'orange';
};

/**
 * Resetea al tema por defecto
 */
window.resetTheme = () => {
    if (window.themeManager) {
        return window.themeManager.resetToDefault();
    }
    console.warn('🎨 ThemeManager no está inicializado');
};

// =========================
// EJEMPLOS DE USO
// =========================

/*
// Cambiar a un tema predefinido
window.changeTheme('blue');

// Establecer un color personalizado
window.setCustomColor('#ff6b9d');

// Escuchar cambios de tema
window.addEventListener('themeChanged', (e) => {
  console.log('Nuevo tema:', e.detail.theme);
  if (e.detail.customColor) {
    console.log('Color personalizado:', e.detail.customColor);
  }
});

// Obtener el tema actual
console.log('Tema actual:', window.getCurrentTheme());

// Resetear al tema por defecto
window.resetTheme();
*/
