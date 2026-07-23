/**
 * Gestor global de temas.
 *
 * La base de datos sigue siendo la fuente de verdad. Una copia mínima en
 * localStorage permite pintar el último tema conocido antes de que responda
 * el servidor y evita el destello del tema naranja al cargar una página.
 */
class ThemeManager {
    static THEME_KEY = 'selectedTheme';
    static CUSTOM_COLOR_KEY = 'customColor';

    constructor() {
        this.availableThemes = ['orange', 'blue', 'green', 'purple', 'red', 'teal', 'dark'];
        this.currentTheme = 'orange';
        this.customColor = null;
        this.syncInterval = null;
        this.hasCachedTheme = false;

        this.applyCachedTheme();
        this.ready = this.init();
    }

    async init() {
        await this.loadThemeFromServer();
        this.startSync();
        this.setupEventListeners();

        window.themeManagerReady = true;
        window.dispatchEvent(new CustomEvent('themeReady', {
            detail: this.getThemeSnapshot()
        }));
    }

    applyCachedTheme() {
        try {
            const storedTheme = localStorage.getItem(ThemeManager.THEME_KEY);
            const storedCustomColor = localStorage.getItem(ThemeManager.CUSTOM_COLOR_KEY);

            if (storedTheme === 'custom' && this.isValidHex(storedCustomColor)) {
                this.currentTheme = 'custom';
                this.customColor = storedCustomColor;
                this.applyCustomColor(storedCustomColor);
                this.hasCachedTheme = true;
                return;
            }

            if (this.availableThemes.includes(storedTheme)) {
                this.currentTheme = storedTheme;
                this.customColor = null;
                this.applyTheme(storedTheme);
                this.hasCachedTheme = true;
            }
        } catch (_error) {
            // localStorage puede estar deshabilitado; el tema del servidor basta.
        }
    }

    async loadThemeFromServer() {
        try {
            const response = await fetch('/api/global-theme-config', {
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                if (!this.hasCachedTheme) this.applyDefaultTheme();
                return;
            }

            const data = await response.json();
            if (data.success && data.theme) {
                this.applyServerTheme(data.theme);
            } else if (!this.hasCachedTheme) {
                this.applyDefaultTheme();
            }
        } catch (_error) {
            if (!this.hasCachedTheme) this.applyDefaultTheme();
        }
    }

    applyServerTheme(themeConfig) {
        if (themeConfig.selectedTheme === 'custom' && this.isValidHex(themeConfig.customColor)) {
            this.setCustomColor(themeConfig.customColor, false);
            return;
        }

        if (this.availableThemes.includes(themeConfig.selectedTheme)) {
            this.changeTheme(themeConfig.selectedTheme, false);
            return;
        }

        if (!this.hasCachedTheme) this.applyDefaultTheme();
    }

    applyDefaultTheme() {
        this.changeTheme('orange', false);
    }

    changeTheme(themeName, syncToServer = true) {
        if (!this.availableThemes.includes(themeName)) return false;

        this.currentTheme = themeName;
        this.customColor = null;
        this.applyTheme(themeName);
        this.cacheTheme();

        if (syncToServer) void this.saveToServer();

        this.dispatchThemeEvent(themeName);
        return true;
    }

    setCustomColor(hexColor, syncToServer = true) {
        if (!this.isValidHex(hexColor)) return false;

        const normalizedColor = hexColor.toUpperCase();
        this.currentTheme = 'custom';
        this.customColor = normalizedColor;
        this.applyCustomColor(normalizedColor);
        this.cacheTheme();

        if (syncToServer) void this.saveToServer();

        this.dispatchThemeEvent('custom', normalizedColor);
        return true;
    }

    applyTheme(themeName) {
        const root = document.documentElement;
        root.style.removeProperty('--primary-color');
        root.style.removeProperty('--primary-rgb');
        root.style.removeProperty('--secondary-color');
        root.style.removeProperty('--accent-color');
        root.setAttribute('data-theme', themeName);
        root.style.colorScheme = themeName === 'dark' ? 'dark' : 'light';
    }

    applyCustomColor(hexColor) {
        const root = document.documentElement;
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return;

        root.setAttribute('data-theme', 'custom');
        root.style.colorScheme = 'light';
        root.style.setProperty('--primary-color', hexColor);
        root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        root.style.setProperty('--secondary-color', this.adjustBrightness(hexColor, -15));
        root.style.setProperty('--accent-color', this.adjustBrightness(hexColor, -8));
    }

    cacheTheme() {
        try {
            localStorage.setItem(ThemeManager.THEME_KEY, this.currentTheme);
            if (this.currentTheme === 'custom' && this.customColor) {
                localStorage.setItem(ThemeManager.CUSTOM_COLOR_KEY, this.customColor);
            } else {
                localStorage.removeItem(ThemeManager.CUSTOM_COLOR_KEY);
            }
            this.hasCachedTheme = true;
        } catch (_error) {
            // La persistencia principal permanece en el servidor.
        }
    }

    async saveToServer() {
        const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('token');
        if (!adminToken) return false;

        try {
            const response = await fetch('/api/admin/save-theme-configuration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    selectedTheme: this.currentTheme,
                    customColor: this.customColor,
                    timestamp: Date.now()
                })
            });
            return response.ok;
        } catch (_error) {
            return false;
        }
    }

    startSync() {
        this.syncInterval = window.setInterval(() => {
            void this.checkForUpdates();
        }, 30000);
    }

    async checkForUpdates() {
        if (document.visibilityState === 'hidden') return;
        await this.loadThemeFromServer();
    }

    setupEventListeners() {
        window.addEventListener('focus', () => void this.checkForUpdates());

        window.addEventListener('storage', (event) => {
            if (event.key !== ThemeManager.THEME_KEY && event.key !== ThemeManager.CUSTOM_COLOR_KEY) return;
            this.applyCachedTheme();
            this.dispatchThemeEvent(this.currentTheme, this.customColor);
        });

        window.addEventListener('beforeunload', () => {
            if (this.syncInterval) window.clearInterval(this.syncInterval);
        }, { once: true });
    }

    dispatchThemeEvent(themeName, customColor = null) {
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: themeName, customColor }
        }));
    }

    resetToDefault() {
        return this.changeTheme('orange', true);
    }

    previewTheme(themeName) {
        if (!this.availableThemes.includes(themeName)) return false;
        this.applyTheme(themeName);
        return true;
    }

    previewCustomColor(hexColor) {
        if (!this.isValidHex(hexColor)) return false;
        this.applyCustomColor(hexColor);
        return true;
    }

    restoreCurrentTheme() {
        if (this.currentTheme === 'custom' && this.customColor) {
            this.applyCustomColor(this.customColor);
        } else {
            this.applyTheme(this.currentTheme);
        }
    }

    isValidHex(hex) {
        return typeof hex === 'string' && /^#[0-9A-F]{6}$/i.test(hex);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16)
        } : null;
    }

    adjustBrightness(hex, percent) {
        const number = Number.parseInt(hex.replace('#', ''), 16);
        const amount = Math.round(2.55 * percent);
        const red = Math.min(255, Math.max(0, (number >> 16) + amount));
        const green = Math.min(255, Math.max(0, ((number >> 8) & 0x00FF) + amount));
        const blue = Math.min(255, Math.max(0, (number & 0x0000FF) + amount));

        return `#${(0x1000000 + red * 0x10000 + green * 0x100 + blue)
            .toString(16)
            .slice(1)
            .toUpperCase()}`;
    }

    getThemeSnapshot() {
        return { theme: this.currentTheme, customColor: this.customColor };
    }

    getCurrentTheme() { return this.currentTheme; }
    getCustomColor() { return this.customColor; }
    getAvailableThemes() { return [...this.availableThemes]; }
}

let themeManager;

function initializeThemeManager() {
    if (themeManager) return themeManager;
    themeManager = new ThemeManager();
    window.themeManager = themeManager;
    return themeManager;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeThemeManager, { once: true });
} else {
    initializeThemeManager();
}

window.changeTheme = (theme) => initializeThemeManager().changeTheme(theme);
window.setCustomColor = (color) => initializeThemeManager().setCustomColor(color);
window.getCurrentTheme = () => initializeThemeManager().getCurrentTheme();
window.getCustomColor = () => initializeThemeManager().getCustomColor();
window.resetTheme = () => initializeThemeManager().resetToDefault();
window.previewTheme = (theme) => initializeThemeManager().previewTheme(theme);
window.previewCustomColor = (color) => initializeThemeManager().previewCustomColor(color);
window.restoreCurrentTheme = () => initializeThemeManager().restoreCurrentTheme();
