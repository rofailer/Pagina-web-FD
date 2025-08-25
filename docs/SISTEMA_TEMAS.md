# 🎨 Sistema de Temas Dinámicos

Sistema completo para cambiar el color principal de toda la aplicación web de forma dinámica y persistente.

## 📁 Estructura de Archivos

```
├── css/
│   └── themeSelector.css           # Estilos del selector y variables de temas
├── scripts/utils/
│   └── themeManager.js             # Lógica del sistema de temas
└── html/components/
    └── themeSelector.html          # Componente HTML del selector
```

## 🚀 Instalación Rápida

### 1. Incluir archivos CSS y JS

```html
<!-- En el <head> -->
<link rel="stylesheet" href="/css/themeSelector.css" />

<!-- Antes del </body> -->
<script src="/scripts/utils/themeManager.js"></script>
```

### 2. Agregar el selector al HTML

Copia el contenido de `html/components/themeSelector.html` donde quieras que aparezca el selector.

**Ejemplo en el header:**

```html
<ul id="authMenu">
  <!-- ... otros elementos ... -->

  <!-- SELECTOR DE TEMAS -->
  <li class="theme-selector-container">
    <button id="themeBtn" class="theme-btn" title="Cambiar tema">
      <!-- ... contenido del selector ... -->
    </button>
    <div id="themeDropdown" class="theme-dropdown">
      <!-- ... opciones de temas ... -->
    </div>
  </li>
</ul>
```

## 🎯 Características

- ✅ **6 temas predefinidos**: Naranja, Azul, Verde, Morado, Rojo, Teal
- ✅ **Colores personalizados**: Permite establecer cualquier color hex
- ✅ **Persistencia**: Guarda la selección en localStorage
- ✅ **API JavaScript**: Control programático completo
- ✅ **Eventos personalizados**: Notificaciones de cambios
- ✅ **Responsive**: Se adapta a dispositivos móviles
- ✅ **Generación automática**: Crea colores secundarios automáticamente

## 🔧 API JavaScript

### Funciones Globales

```javascript
// Cambiar tema predefinido
window.changeTheme("blue");

// Establecer color personalizado
window.setCustomColor("#ff6b9d");

// Obtener tema actual
const theme = window.getCurrentTheme();

// Resetear al tema por defecto
window.resetTheme();
```

### Eventos

```javascript
// Escuchar cambios de tema
window.addEventListener("themeChanged", (e) => {
  console.log("Nuevo tema:", e.detail.theme);
  console.log("Timestamp:", e.detail.timestamp);

  if (e.detail.customColor) {
    console.log("Color personalizado:", e.detail.customColor);
  }
});
```

### API Avanzada

```javascript
// Acceso directo al ThemeManager
const themeManager = window.themeManager;

// Obtener temas disponibles
const themes = themeManager.getAvailableThemes();
// ['orange', 'blue', 'green', 'purple', 'red', 'teal']

// Obtener color personalizado actual
const customColor = themeManager.getCustomColor();

// Validar color hex
const isValid = themeManager.isValidHex("#ff6b9d"); // true
```

## 🎨 Variables CSS

El sistema usa estas variables CSS que se actualizan automáticamente:

```css
:root {
  --primary-color: #ff9545; /* Color principal */
  --primary-rgb: 255, 149, 69; /* RGB para transparencias */
  --secondary-color: #ff6b35; /* Color secundario (más oscuro) */
  --accent-color: #ff7b00; /* Color de acento */
}
```

### Uso en tu CSS

```css
/* Color sólido */
.mi-elemento {
  background: var(--primary-color);
  border: 2px solid var(--secondary-color);
}

/* Con transparencia usando color-mix() */
.mi-elemento-transparente {
  background: color-mix(in srgb, var(--primary-color) 20%, transparent);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--primary-color) 30%, transparent);
}

/* Con transparencia usando RGB */
.mi-elemento-rgba {
  background: rgba(var(--primary-rgb), 0.2);
}
```

## 🌈 Temas Predefinidos

| Tema     | Color Principal | Descripción           |
| -------- | --------------- | --------------------- |
| `orange` | `#ff9545`       | Naranja (por defecto) |
| `blue`   | `#3b82f6`       | Azul profesional      |
| `green`  | `#10b981`       | Verde esmeralda       |
| `purple` | `#8b5cf6`       | Morado vibrante       |
| `red`    | `#ef4444`       | Rojo energético       |
| `teal`   | `#14b8a6`       | Teal moderno          |

## 📱 Responsive

El sistema es completamente responsive:

- **Desktop**: Dropdown completo con nombres
- **Tablet**: Botón más pequeño, dropdown compacto
- **Mobile**: Versión optimizada para táctil

## 🔧 Personalización

### Agregar nuevos temas

1. **En CSS** (`themeSelector.css`):

```css
[data-theme="mi-tema"] {
  --primary-color: #your-color;
  --primary-rgb: r, g, b;
  --secondary-color: #darker-version;
  --accent-color: #accent-version;
}
```

2. **En HTML** (`themeSelector.html`):

```html
<div class="theme-option" data-theme="mi-tema">
  <div class="theme-color" style="background: #your-color;"></div>
  <span>Mi Tema</span>
</div>
```

3. **En JavaScript** (`themeManager.js`):

```javascript
getAvailableThemes() {
  return ['orange', 'blue', 'green', 'purple', 'red', 'teal', 'mi-tema'];
}
```

### Botón simple que cicla temas

Si prefieres un botón que simplemente cicle entre temas:

```html
<button id="cycleThemeBtn" class="cycle-theme-btn">🎨</button>
```

```javascript
document.getElementById("cycleThemeBtn")?.addEventListener("click", () => {
  const themes = ["orange", "blue", "green", "purple", "red", "teal"];
  const current = window.getCurrentTheme();
  const currentIndex = themes.indexOf(current);
  const nextIndex = (currentIndex + 1) % themes.length;
  window.changeTheme(themes[nextIndex]);
});
```

## 🛠️ Solución de Problemas

### El selector no aparece

- Verifica que incluiste `themeSelector.css`
- Asegúrate de que el HTML esté en el lugar correcto
- Revisa la consola por errores

### Los colores no cambian

- Confirma que incluiste `themeManager.js`
- Verifica que tu CSS use las variables `var(--primary-color)`
- Revisa que el archivo CSS se cargue después de `themeSelector.css`

### Los temas no persisten

- Verifica que localStorage esté habilitado
- Revisa la consola por errores de JavaScript

## 🎯 Ejemplos de Uso

### Cambio automático según la hora

```javascript
window.addEventListener("DOMContentLoaded", () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) {
    window.changeTheme("blue"); // Día
  } else {
    window.changeTheme("purple"); // Noche
  }
});
```

### Integración con preferencias de usuario

```javascript
// Guardar en base de datos cuando cambie el tema
window.addEventListener("themeChanged", async (e) => {
  try {
    await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: e.detail.theme }),
    });
  } catch (error) {
    console.error("Error guardando preferencias:", error);
  }
});
```

### Tema basado en la imagen de perfil

```javascript
function applyThemeFromImage(imageUrl) {
  // Usar una librería como ColorThief para extraer colores
  const colorThief = new ColorThief();
  const img = new Image();

  img.onload = () => {
    const dominantColor = colorThief.getColor(img);
    const hexColor = rgbToHex(
      dominantColor[0],
      dominantColor[1],
      dominantColor[2]
    );
    window.setCustomColor(hexColor);
  };

  img.src = imageUrl;
}
```

## 📝 Changelog

### v1.0.0

- ✅ Sistema base con 6 temas predefinidos
- ✅ Soporte para colores personalizados
- ✅ Persistencia en localStorage
- ✅ API JavaScript completa
- ✅ Responsive design
- ✅ Documentación completa

---

**¡Disfruta personalizando tu aplicación! 🎨✨**
