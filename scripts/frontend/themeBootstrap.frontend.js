'use strict';

(() => {
    const root = document.documentElement;
    const context = root.dataset.visualContext || '';
    const themes = new Set([
        'orange',
        'blue',
        'green',
        'purple',
        'red',
        'teal',
        'dark',
        'custom'
    ]);
    const backgrounds = new Set(['fondo1', 'fondo2', 'fondoOscuro']);
    const cachedTheme = localStorage.getItem('selectedTheme');
    const cachedColor = localStorage.getItem('customColor');
    const cachedBackground = localStorage.getItem('globalBackground');
    const initialBackground = backgrounds.has(cachedBackground)
        ? cachedBackground
        : 'fondo1';

    root.classList.add('visual-pending');
    if (themes.has(cachedTheme)) root.dataset.theme = cachedTheme;
    if (cachedTheme === 'custom' && /^#[0-9a-f]{6}$/i.test(cachedColor || '')) {
        root.style.setProperty('--primary-color', cachedColor);
    }

    const applyBodyBackground = () => {
        if (document.body) document.body.dataset.bg = initialBackground;
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyBodyBackground, { once: true });
    } else {
        applyBodyBackground();
    }

    if (context === 'admin-login') {
        const state = {
            theme: window.themeManagerReady === true,
            visual: window.visualConfigLoaded === true
        };
        const reveal = () => {
            if (!state.theme || !state.visual) return;
            root.classList.remove('visual-pending');
            root.classList.add('visual-ready');
        };

        window.addEventListener('themeReady', () => {
            state.theme = true;
            reveal();
        }, { once: true });
        window.addEventListener('visualConfigLoaded', () => {
            state.visual = true;
            reveal();
        }, { once: true });
        window.setTimeout(() => {
            state.theme = true;
            state.visual = true;
            reveal();
        }, 2500);
        reveal();
    } else if (context === 'tutorial') {
        window.setTimeout(() => root.classList.remove('visual-pending'), 2500);
    }
})();
