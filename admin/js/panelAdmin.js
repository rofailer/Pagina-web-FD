// Sistema de autenticación de máxima seguridad para panel de administración
(function () {
  let authenticationComplete = false;

  // Obtener tokenId de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const tokenId = urlParams.get("tid");
  const existingToken = localStorage.getItem("token");

  // Limpiar URL inmediatamente por seguridad (solo si hay tokenId)
  if (tokenId) {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }

  // Lógica de autenticación mejorada
  if (!tokenId && !existingToken) {
    // No hay token de administración válido - redirigir a login
    console.error("❌ No se proporcionó token de administración válido");
    console.log("🔍 Estado de autenticación:", { tokenId, existingToken });
    window.location.href = "/adminLogin";
    return;
  }

  // Si hay existingToken pero no tokenId, verificar si es válido
  if (!tokenId && existingToken) {
    console.log("🔍 Verificando token existente en localStorage...");
    validateExistingToken(existingToken);
    return;
  }

  // Si hay tokenId, intercambiar por token real
  if (tokenId) {
    console.log("🔄 Intercambiando tokenId por token real:", tokenId);
    exchangeTokenAndAuthenticate(tokenId);
  }

  async function validateExistingToken(token) {
    try {
      console.log("🔍 Validando token existente...");

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("❌ Token existente inválido");
        localStorage.removeItem("token");
        localStorage.removeItem("admin_token");
        window.location.href = "/adminLogin?error=token_expired";
        return;
      }

      const user = await response.json();
      console.log("✅ Token válido para usuario:", user.usuario, "- Rol:", user.rol);

      if (user.rol !== "owner" && user.rol !== "admin") {
        console.error("❌ Usuario no tiene permisos de admin");
        window.location.href = "/acceso-denegado";
        return;
      }

      // Token válido - continuar con la inicialización
      console.log("✅ Autenticación exitosa con token existente");
      authenticationComplete = true;
      localStorage.setItem("admin_token", token);

      // Mostrar información del usuario en el indicador
      setTimeout(() => displayUserInfo(user), 100);

      // Sistema de renovación automática inteligente (cada 12 horas si hay actividad)
      startAdminTokenRenewal(token);

      // Ocultar loading y mostrar panel
      const loading = document.getElementById("admin-loading");
      if (loading) {
        loading.style.display = "none";
      }

      console.log("✅ Panel de administración inicializado correctamente");

    } catch (error) {
      console.error("❌ Error validando token existente:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("admin_token");
      window.location.href = "/adminLogin?error=connection_error";
    }
  }

  async function exchangeTokenAndAuthenticate(tid) {
    try {

      // Paso 1: Intercambiar tokenId por token real
      const response = await fetch("/api/admin/exchange-admin-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokenId: tid }),
      });

      if (!response.ok) {
        throw new Error("Token ID inválido o expirado");
      }

      const data = await response.json();
      const adminToken = data.token;

      // Paso 2: Validar el token con el servidor
      const userResponse = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Token inválido");
      }

      const user = await userResponse.json();

      if (user.rol !== "owner") {
        throw new Error(
          "Acceso denegado: se requiere rol de propietario"
        );
      }

      // Paso 3: Autenticación exitosa
      authenticationComplete = true;

      // Guardar token en localStorage para las peticiones del panel
      localStorage.setItem("token", adminToken);
      localStorage.setItem("admin_token", adminToken);

      // Mostrar información del usuario en el indicador
      setTimeout(() => displayUserInfo(user), 100);

      // Sistema de renovación automática inteligente (cada 12 horas si hay actividad)
      startAdminTokenRenewal(adminToken);

      // Ocultar loading y mostrar panel
      const loading = document.getElementById("admin-loading");
      if (loading) {
        loading.style.display = "none";
      }

      const container = document.querySelector(".admin-container");
      if (container) {
        container.style.display = "block";
      }
    } catch (error) {
      console.error("Error de autenticación:", error);
      // Mostrar error específico en consola para debugging
      console.error("Detalles del error:", error.message);
      //Redirigir a página 403
      window.location.href = "/acceso-denegado";
    }
  }

  // Función para validar token existente (con validación estricta del servidor)
  async function validateExistingToken(token) {
    try {
      console.log("🔄 Validando token existente con servidor...");

      // Validar el token con el servidor de manera estricta
      const userResponse = await fetch("/api/auth/me", {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(`Token inválido: ${errorData.message || userResponse.statusText}`);
      }

      const user = await userResponse.json();

      // Verificaciones adicionales de seguridad
      if (!user || !user.id) {
        throw new Error("Respuesta de usuario inválida del servidor");
      }

      if (user.rol !== "owner") {
        throw new Error("Acceso denegado: se requiere rol de propietario");
      }

      // Verificar que el usuario esté activo (si el campo existe)
      if (user.activo !== undefined && user.activo === false) {
        throw new Error("Cuenta de usuario inactiva");
      }

      // Token válido y usuario autorizado
      authenticationComplete = true;
      console.log("✅ Token existente válido - usuario autorizado:", user.nombre || user.username);

      // Mostrar información del usuario en el indicador
      setTimeout(() => displayUserInfo(user), 100);

      // Sistema de renovación automática inteligente
      startAdminTokenRenewal(token);

      // Ocultar loading y mostrar panel
      const loading = document.getElementById("admin-loading");
      if (loading) {
        loading.style.display = "none";
      }

      const container = document.querySelector(".admin-container");
      if (container) {
        container.style.display = "block";
      }

    } catch (error) {
      console.error("❌ Error validando token existente:", error);
      console.error("Detalles del error:", error.message);

      // Limpiar tokens inválidos
      localStorage.removeItem("token");
      localStorage.removeItem("admin_token");

      // Redirigir a login con mensaje de error
      console.log("🔐 Token inválido - redirigiendo a login");
      window.location.href = "/adminLogin?error=token_expired";
    }
  }

  // Sistema de renovación automática inteligente para admin
  function startAdminTokenRenewal(currentToken) {
    let lastActivityTime = Date.now();
    let renewalInterval = null;

    // Función para renovar token
    const renewToken = async () => {
      const timeSinceLastActivity = Date.now() - lastActivityTime;

      // Si ha pasado más de 1 hora sin actividad, no renovar
      if (timeSinceLastActivity > 60 * 60 * 1000) {
        console.log('⏰ Panel inactivo por más de 1 hora, deteniendo renovación automática');
        if (renewalInterval) {
          clearInterval(renewalInterval);
          renewalInterval = null;
        }
        return;
      }

      try {
        // Generar nuevo token administrativo
        const response = await fetch('/api/admin/generate-admin-token', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();

          // Intercambiar por token real
          const exchangeResponse = await fetch('/api/admin/exchange-admin-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tokenId: data.tokenId })
          });

          if (exchangeResponse.ok) {
            const exchangeData = await exchangeResponse.json();
            localStorage.setItem("token", exchangeData.token);
            localStorage.setItem("admin_token", exchangeData.token);
            console.log('🔄 Token administrativo renovado automáticamente');
          }
        }
      } catch (error) {
        console.log('Error renovando token administrativo:', error);
      }
    };

    // Renovar cada 12 horas
    renewalInterval = setInterval(renewToken, 12 * 60 * 60 * 1000);

    // Detectar actividad en el panel
    const adminContainer = document.querySelector('.admin-layout');
    if (adminContainer) {
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        adminContainer.addEventListener(event, () => {
          lastActivityTime = Date.now();
        }, { passive: true });
      });
    }

    console.log('🔄 Sistema de renovación automática de tokens administrativos iniciado');
  }

  // Timeout de seguridad extendido (20 segundos para dar más tiempo)
  setTimeout(() => {
    if (!authenticationComplete) {
      window.location.href = "/acceso-denegado";
    }
  }, 20000); // 20 segundos (extendido de 10)
})();

// Función para ir al sitio principal manteniendo la sesión
function goToMainSite() {
  // Mantener el token de sesión al volver al sitio principal
  const currentToken = localStorage.getItem("token");
  const currentAdminToken = localStorage.getItem("admin_token");

  if (currentToken) {
    // Guardar temporalmente los tokens para transferirlos a la página principal
    sessionStorage.setItem("preserve_token", currentToken);
    sessionStorage.setItem("preserve_admin_token", currentAdminToken);

    // Limpiar tokens del panel admin para evitar conflictos
    localStorage.removeItem("admin_token");

    console.log('🔄 Preservando sesión al volver al sitio principal');
  }

  window.location.href = "/";
}

// Inicialización de módulos avanzados
document.addEventListener("DOMContentLoaded", () => {
  // Esperar a que adminPanel esté disponible
  setTimeout(() => {
    if (window.adminPanel) {
      // Inicializar módulos avanzados
      adminPanel.userManagement = new UserManagement(adminPanel);
      adminPanel.advancedConfig = new AdvancedConfiguration(adminPanel);

      // Configurar eventos específicos
      adminPanel.setupAdvancedFeatures = function () {
        // Botón de guardar configuración PDF
        const savePdfBtn = document.getElementById("savePdfConfig");
        if (savePdfBtn) {
          savePdfBtn.addEventListener("click", () => {
            this.advancedConfig.savePdfConfiguration();
            showNotification('Configuración de PDF guardada correctamente', 'success', 3000);
          });
        }

        // Botón de guardar configuración DB
        const saveDbBtn = document.getElementById("saveDbConfig");
        if (saveDbBtn) {
          saveDbBtn.addEventListener("click", () => {
            this.advancedConfig.saveDatabaseConfiguration();
            showNotification('Configuración de base de datos guardada', 'success', 3000);
          });
        }
      };

      // Ejecutar configuración avanzada
      adminPanel.setupAdvancedFeatures();

      // Configurar formulario de creación de usuario
      const createUserForm = document.getElementById('createUserForm');
      if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await createUser();
        });
      }

      // Cargar automáticamente la lista de tablas al inicializar
      const tryRefreshTables = () => {
        if (window.adminPanel && window.adminPanel.refreshTables) {
          const token = localStorage.getItem('token');
          if (token) {
            console.log('🔄 Cargando tablas automáticamente...');
            window.adminPanel.refreshTables();
            return true;
          }
        }
        return false;
      };

      // Intentar cargar tablas inmediatamente
      if (!tryRefreshTables()) {
        // Si no se pudo cargar inmediatamente, intentar con delay
        setTimeout(() => {
          if (!tryRefreshTables()) {
            // Último intento con delay más largo
            setTimeout(tryRefreshTables, 1000);
          }
        }, 500);
      }
    }

    // El sistema de temas es manejado por themeManager.js
  }, 100);
});

// Función para manejar responsive del botón móvil
function handleMobileButtonResponsive() {
  const mainSiteBtn = document.getElementById('mainSiteBtn');
  const sidebarMobileActions = document.getElementById('sidebarMobileActions');

  if (!mainSiteBtn || !sidebarMobileActions) return;

  // Función para verificar si estamos en móvil
  const checkMobileView = () => {
    const isMobile = window.innerWidth <= 767;

    if (isMobile) {
      // En móvil, ocultar botón del header y mostrar en sidebar
      mainSiteBtn.style.display = 'none';
      sidebarMobileActions.style.display = 'block';
    } else {
      // En desktop/tablet, mostrar botón en header y ocultar en sidebar
      mainSiteBtn.style.display = 'flex';
      sidebarMobileActions.style.display = 'none';
    }
  };

  // Verificar inicialmente
  checkMobileView();

  // Escuchar cambios de tamaño de ventana
  window.addEventListener('resize', checkMobileView);

  // También verificar cuando cambie la orientación del dispositivo
  window.addEventListener('orientationchange', () => {
    setTimeout(checkMobileView, 100);
  });
}

// Inicializar manejo responsive del botón
document.addEventListener('DOMContentLoaded', function () {
  handleMobileButtonResponsive();
});

// El sistema de temas es manejado por themeManager.js - NO duplicar funcionalidad aquí

/* ========================================
   SISTEMA DE MÉTRICAS
   ======================================== */

// Mostrar efecto de carga en métricas - OPTIMIZADO
function showMetricsLoading() {
  const metricsElements = ["totalUsers", "totalDocs", "totalKeys"];

  metricsElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.className = "metric-value loading";
      element.textContent = "—";
    }
  });

  const systemStatusElement = document.querySelector(".metric-value.text");
  if (systemStatusElement) {
    systemStatusElement.className = "metric-value text loading";
    systemStatusElement.textContent = "Cargando...";
  }
}

// Cargar métricas del sistema - OPTIMIZADO
async function loadSystemMetrics() {
  try {
    // Verificar token de admin
    const token = localStorage.getItem("admin_token");
    if (!token) {
      console.error("❌ No hay token de administración para métricas");
      return;
    }

    // Mostrar efecto de carga solo si no hay datos previos
    const hasExistingData = document.getElementById("totalUsers")?.textContent !== "--";
    if (!hasExistingData) {
      showMetricsLoading();
    }

    // Crear AbortController para cancelar petición si es necesario
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout

    const response = await fetch("/api/admin/metrics", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      updateMetricsDisplay(data.metrics);
    } else {
      throw new Error(data.message || "Error al obtener métricas");
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn("⚠️ Petición de métricas cancelada por timeout");
      showMetricsError();
    } else {
      console.error("❌ Error cargando métricas:", error);
      showMetricsError();
    }
  }
}

// Actualizar la visualización de métricas
function updateMetricsDisplay(metrics) {
  // Actualizar usuarios totales
  const totalUsersElement = document.getElementById("totalUsers");
  if (totalUsersElement) {
    totalUsersElement.className = "metric-value";
    totalUsersElement.textContent = formatNumber(metrics.users.total);
  }

  // Actualizar cambio de usuarios
  const userChangeElement = totalUsersElement?.parentNode.querySelector(".metric-change");
  if (userChangeElement) {
    userChangeElement.textContent = metrics.users.changeText;
    userChangeElement.className = `metric-change ${metrics.users.change > 0 ? 'positive' : 'neutral'}`;
  }

  // Actualizar documentos totales
  const totalDocsElement = document.getElementById("totalDocs");
  if (totalDocsElement) {
    totalDocsElement.className = "metric-value";
    totalDocsElement.textContent = formatNumber(metrics.documents.total);
  }

  // Actualizar cambio de documentos
  const docsChangeElement = totalDocsElement?.parentNode.querySelector(".metric-change");
  if (docsChangeElement) {
    docsChangeElement.textContent = metrics.documents.changeText;
    docsChangeElement.className = `metric-change ${metrics.documents.change > 0 ? 'positive' : 'neutral'}`;
  }

  // Actualizar llaves totales
  const totalKeysElement = document.getElementById("totalKeys");
  if (totalKeysElement) {
    totalKeysElement.className = "metric-value";
    totalKeysElement.textContent = formatNumber(metrics.keys.total);
  }

  // Actualizar cambio de llaves
  const keysChangeElement = totalKeysElement?.parentNode.querySelector(".metric-change");
  if (keysChangeElement) {
    keysChangeElement.textContent = metrics.keys.changeText;
    keysChangeElement.className = `metric-change ${metrics.keys.change > 0 ? 'positive' : 'neutral'}`;
  }

  // Actualizar estado del sistema
  const systemStatusElement = document.querySelector(".metric-value.text");
  if (systemStatusElement) {
    systemStatusElement.className = "metric-value text";
    systemStatusElement.textContent = metrics.systemStatus.status;

    // Actualizar clase del icono de estado
    const statusIcon = document.querySelector(".metric-icon.status");
    if (statusIcon) {
      statusIcon.className = `metric-icon status ${metrics.systemStatus.class}`;
    }
  }

}

// Mostrar error en métricas - OPTIMIZADO
function showMetricsError() {
  const metricsElements = ["totalUsers", "totalDocs", "totalKeys"];

  metricsElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.className = "metric-value error";
      element.textContent = "Error";
    }
  });

  const systemStatusElement = document.querySelector(".metric-value.text");
  if (systemStatusElement) {
    systemStatusElement.className = "metric-value text error";
    systemStatusElement.textContent = "Error de conexión";
  }

  // Reintentar automáticamente en 10 segundos
  setTimeout(() => {
    loadSystemMetrics();
  }, 10000);
}

// Formatear números para mostrar
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Auto-actualizar métricas cada 45 segundos (antes 30)
function startMetricsAutoUpdate() {
  // Cargar métricas inmediatamente al iniciar
  loadSystemMetrics();

  // Actualizar cada 45 segundos para reducir carga en el servidor
  setInterval(() => {
    loadSystemMetrics();
  }, 45000);
}

// Inicializar métricas cuando el panel esté listo - OPTIMIZADO
document.addEventListener('DOMContentLoaded', function () {
  // Precargar datos críticos inmediatamente
  initializeCriticalData();

  // Cargar métricas con delay reducido
  setTimeout(() => {
    startMetricsAutoUpdate();
  }, 200); // Reducido de 1000ms a 200ms
});

// Precargar datos críticos para mejor UX
function initializeCriticalData() {
  // Mostrar placeholders mientras cargan los datos reales
  const placeholders = {
    totalUsers: "Cargando...",
    totalDocs: "Cargando...",
    totalKeys: "Cargando..."
  };

  Object.entries(placeholders).forEach(([id, text]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
      element.className = "metric-value";
    }
  });

  const systemStatusElement = document.querySelector(".metric-value.text");
  if (systemStatusElement) {
    systemStatusElement.textContent = "Inicializando...";
    systemStatusElement.className = "metric-value text";
  }
}


/* ========================================
   INTERFAZ ADMINISTRATIVA PARA TEMAS (USA THEMEMANAGER UNIFICADO)
   ======================================== */

/**
 * Interfaz simplificada que usa el sistema unificado de temas (themeManager.js)
 * No duplica funcionalidad, solo provee la UI específica del panel admin
 */
function initializeAdminThemes() {
  console.log('🎨 Inicializando interfaz de temas del panel admin...');

  // Elementos del DOM
  const themeCards = document.querySelectorAll('.theme-option-card[data-theme]');
  const customColorPicker = document.getElementById('customColorPicker');
  const hexColorInput = document.getElementById('hexColorInput');
  const applyCustomBtn = document.getElementById('applyCustomColor');
  const resetBtn = document.getElementById('resetThemeBtn');
  const saveGlobalBtn = document.getElementById('saveGlobalTheme');

  if (!themeCards.length) {
    console.warn('🎨 No se encontraron elementos de tema en el panel admin');
    return;
  }

  // Esperamos a que themeManager esté listo
  const waitForThemeManager = () => {
    if (!window.themeManager) {
      setTimeout(waitForThemeManager, 100);
      return;
    }

    setupAdminUI();
  };

  waitForThemeManager();

  function setupAdminUI() {
    // Estado inicial
    let currentCustomColor = window.themeManager.getCustomColor() || '#ff9545';
    let selectedTheme = window.getCurrentTheme(); // Tema actualmente aplicado
    let previewTheme = selectedTheme; // Tema seleccionado para preview

    updateThemeUI();
    updateCustomColorInputs();

    // Event listeners para tarjetas de temas predefinidos (con preview visual)
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        previewTheme = theme; // Actualizar tema en preview

        // Aplicar preview visualmente
        window.previewTheme(theme);

        updateThemeUI();
        showNotification(`Vista previa: ${theme}`, 'info', 2000);
      });
    });

    // Event listeners para color personalizado
    if (customColorPicker && hexColorInput && applyCustomBtn) {
      customColorPicker.addEventListener('change', (e) => {
        const color = e.target.value;
        hexColorInput.value = color.toUpperCase();
        currentCustomColor = color;
      });

      hexColorInput.addEventListener('input', (e) => {
        let value = e.target.value;
        if (!value.startsWith('#')) {
          value = '#' + value;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
          customColorPicker.value = value;
          currentCustomColor = value;
        }
      });

      applyCustomBtn.addEventListener('click', () => {
        if (isValidHex(currentCustomColor)) {
          previewTheme = 'custom'; // Actualizar preview

          // Aplicar preview visualmente
          window.previewCustomColor(currentCustomColor);

          updateThemeUI();
          showNotification(`Vista previa color: ${currentCustomColor}`, 'info', 2000);
        } else {
          showNotification('Color hex invalido (ej: #FF5722)', 'warning', 4000);
        }
      });
    }

    // Event listener para reset
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        previewTheme = 'orange'; // Actualizar preview

        // Aplicar preview visualmente
        window.previewTheme('orange');

        currentCustomColor = '#ff9545';
        updateThemeUI();
        updateCustomColorInputs();
        showNotification('Vista previa: Tema por defecto', 'info', 3000);
      });
    }

    // Event listener para guardar configuración global
    if (saveGlobalBtn) {
      saveGlobalBtn.addEventListener('click', () => {
        saveGlobalThemeConfiguration();
      });
    }

    // Escuchar cambios de tema globales para actualizar UI
    window.addEventListener('themeChanged', (e) => {
      selectedTheme = window.getCurrentTheme(); // Actualizar tema aplicado
      previewTheme = selectedTheme; // Reset preview al tema aplicado
      updateThemeUI();
      if (e.detail.customColor) {
        currentCustomColor = e.detail.customColor;
        updateCustomColorInputs();
      }
    });

    function updateThemeUI() {
      const currentTheme = window.getCurrentTheme();
      themeCards.forEach(card => {
        const cardTheme = card.dataset.theme;
        const isActive = cardTheme === currentTheme;
        const isPreview = cardTheme === previewTheme && previewTheme !== currentTheme;

        // Limpiar clases anteriores
        card.classList.remove('active', 'preview');

        // Aplicar clases según estado
        if (isActive) {
          card.classList.add('active');
        } else if (isPreview) {
          card.classList.add('preview');
        }
      });
    }

    function updateThemePreview() {
      // Esta función ahora es manejada por updateThemeUI()
      updateThemeUI();
    }

    function restoreTheme() {
      // Restaurar el tema actual aplicado
      window.restoreCurrentTheme();
      previewTheme = window.getCurrentTheme();
      updateThemeUI();
    }

    function updateCustomColorInputs() {
      if (customColorPicker) customColorPicker.value = currentCustomColor;
      if (hexColorInput) hexColorInput.value = currentCustomColor;
    }

    function isValidHex(hex) {
      return /^#[0-9A-F]{6}$/i.test(hex);
    }

    // Función para guardar configuración global
    async function saveGlobalThemeConfiguration() {
      try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          showNotification('Sin permisos para configuración global', 'error', 4000);
          return;
        }

        // Usar el tema seleccionado en preview
        const themeToApply = previewTheme;
        const customColor = (themeToApply === 'custom') ? currentCustomColor : null;

        const themeData = {
          selectedTheme: themeToApply,
          customColor: customColor,
          timestamp: Date.now()
        };

        const response = await fetch('/api/admin/save-theme-configuration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(themeData)
        });

        if (response.ok) {
          // Aplicar el tema después de guardarlo exitosamente
          if (themeToApply === 'custom' && customColor) {
            window.setCustomColor(customColor);
          } else {
            window.changeTheme(themeToApply);
          }

          selectedTheme = themeToApply; // Actualizar tema aplicado
          previewTheme = themeToApply; // Sincronizar preview con aplicado
          updateThemeUI();
          showNotification('Tema guardado globalmente - Todos los usuarios lo veran en tiempo real', 'success', 4000);
        } else {
          const errorData = await response.json();
          showNotification(`Error: ${errorData.message || 'Error desconocido'}`, 'error', 4000);
        }
      } catch (error) {
        console.error('Error guardando configuración global:', error);
        showNotification('❌ Error de conexión al guardar', 'error', 4000);
      }
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Esperar para asegurar que themeManager se haya cargado
  setTimeout(initializeAdminThemes, 800);

  // Inicializar funcionalidad del sidebar móvil
  initializeMobileSidebar();
});

// Función para manejar el sidebar móvil
function initializeMobileSidebar() {
  const mobileToggleBtn = document.getElementById('mobileToggleBtn');
  const sidebar = document.querySelector('.admin-sidebar');
  const overlay = document.querySelector('.admin-sidebar-overlay');

  if (!mobileToggleBtn || !sidebar) return;

  // Crear overlay si no existe
  if (!overlay) {
    const newOverlay = document.createElement('div');
    newOverlay.className = 'admin-sidebar-overlay';
    document.body.appendChild(newOverlay);
  }

  // Función para toggle del sidebar
  function toggleSidebar() {
    const isOpen = sidebar.style.left === '0px' || sidebar.style.left === '';

    if (isOpen) {
      // Cerrar sidebar
      sidebar.style.left = '-280px';
      document.querySelector('.admin-sidebar-overlay').classList.remove('active');
      document.body.style.overflow = '';
    } else {
      // Abrir sidebar
      sidebar.style.left = '0px';
      document.querySelector('.admin-sidebar-overlay').classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // Event listener para el botón
  mobileToggleBtn.addEventListener('click', toggleSidebar);

  // Cerrar sidebar al hacer click en el overlay
  document.querySelector('.admin-sidebar-overlay').addEventListener('click', toggleSidebar);

  // Cerrar sidebar al presionar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.style.left === '0px') {
      toggleSidebar();
    }
  });

  // Función para resetear sidebar en desktop
  function resetSidebarForDesktop() {
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      // Resetear estilos inline para que CSS tome control
      sidebar.style.left = '';
      sidebar.style.transition = '';
      document.querySelector('.admin-sidebar-overlay').classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Escuchar cambios de tamaño de ventana
  window.addEventListener('resize', resetSidebarForDesktop);

  // Ejecutar una vez al cargar para asegurar estado correcto
  resetSidebarForDesktop();
}

// Función para mostrar información del usuario en el indicador del header
/* ========================================
   FUNCIONES DE GESTIÓN DE USUARIOS
   ======================================== */

// Función para mostrar/ocultar el formulario de creación de usuario
function toggleUserForm() {
  const formContainer = document.getElementById('userFormContainer');
  if (formContainer) {
    const isVisible = formContainer.style.display !== 'none';
    formContainer.style.display = isVisible ? 'none' : 'block';

    // Si se muestra el formulario, hacer scroll hacia él
    if (!isVisible) {
      setTimeout(() => {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
}

// Función para cancelar el formulario de creación de usuario
function cancelUserForm() {
  const formContainer = document.getElementById('userFormContainer');
  const form = document.getElementById('createUserForm');

  if (formContainer) {
    formContainer.style.display = 'none';
  }

  if (form) {
    form.reset();
  }
}

// Función para mostrar/ocultar contraseña
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const button = input?.nextElementSibling;

  if (input && button) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    // Cambiar el icono del botón
    const svg = button.querySelector('svg');
    if (svg) {
      svg.innerHTML = isPassword ?
        `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><path d="m15 9-6 6m0-6 6 6"/>` :
        `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    }
  }
}

// Función para crear un nuevo usuario
async function createUser() {
  try {
    const form = document.getElementById('createUserForm');
    if (!form) {
      console.error('Formulario de creación de usuario no encontrado');
      return;
    }

    const formData = new FormData(form);
    const userData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role')
    };

    // Validaciones básicas
    if (!userData.name || !userData.email || !userData.password || !userData.role) {
      showNotification('Todos los campos son obligatorios', 'warning');
      return;
    }

    // Mostrar loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando...';

    const token = localStorage.getItem('token');
    if (!token) {
      showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
      return;
    }

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      const result = await response.json();

      // Limpiar formulario y ocultar
      form.reset();
      cancelUserForm();

      // Recargar lista de usuarios si existe
      if (typeof adminPanel !== 'undefined' && adminPanel.userManagement) {
        adminPanel.userManagement.loadUsers();
      }

      showNotification('Usuario creado correctamente', 'success');
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      showNotification(errorData.message || 'Error al crear usuario', 'error');
    }
  } catch (error) {
    console.error('Error creando usuario:', error);
    showNotification('Error al crear usuario', 'error');
  } finally {
    // Restaurar botón
    const submitBtn = document.querySelector('#createUserForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear Usuario';
    }
  }
}

// Función para mostrar información del usuario en el indicador del header
function displayUserInfo(user) {
  const userIndicator = document.getElementById('admin-user-indicator');

  if (!userIndicator || !user) {
    console.warn('Indicador de usuario o datos de usuario no disponibles');
    return;
  }

  // Obtener iniciales del nombre para el avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Obtener rol en español
  const getRoleInSpanish = (role) => {
    const roleMap = {
      'owner': 'Propietario',
      'admin': 'Administrador',
      'user': 'Usuario'
    };
    return roleMap[role] || role;
  };

  // Actualizar avatar
  const avatarElement = userIndicator.querySelector('.admin-user-avatar');
  if (avatarElement) {
    avatarElement.textContent = getInitials(user.nombre || user.username || 'Usuario');
  }

  // Actualizar nombre
  const nameElement = userIndicator.querySelector('.admin-user-name');
  if (nameElement) {
    nameElement.textContent = user.nombre || user.username || 'Usuario';
  }

  // Actualizar rol
  const roleElement = userIndicator.querySelector('.admin-user-role');
  if (roleElement) {
    roleElement.textContent = getRoleInSpanish(user.rol || 'user');
  }

  // Mostrar el indicador
  userIndicator.style.display = 'flex';

  console.log('👤 Información del usuario mostrada en el indicador:', {
    nombre: user.nombre || user.username,
    rol: user.rol,
    id: user.id
  });
}

// Función para ocultar el indicador de usuario (útil para logout)
function hideUserIndicator() {
  const userIndicator = document.getElementById('admin-user-indicator');
  if (userIndicator) {
    userIndicator.style.display = 'none';
  }
}

// Sistema de manejo de foco para campos de formulario
(function () {
  // Variable para controlar si ya se inicializó
  let isInitialized = false;

  // Función para manejar el foco de los campos de formulario
  function setupFormFieldFocus() {
    // Evitar inicialización múltiple
    if (isInitialized) {
      return;
    }
    isInitialized = true;

    // Limpiar event listeners previos para evitar duplicados
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('focusout', handleFocusOut);

    // Función para manejar focusin
    function handleFocusIn(e) {
      const target = e.target;
      if (target.matches('.admin-input, .admin-select, .admin-textarea')) {
        const formGroup = target.closest('.admin-form-group');
        if (formGroup) {
          formGroup.classList.add('focused');
        }
      }
    }

    // Función para manejar focusout
    function handleFocusOut(e) {
      const target = e.target;
      if (target.matches('.admin-input, .admin-select, .admin-textarea')) {
        const formGroup = target.closest('.admin-form-group');
        if (formGroup && !target.value.trim()) {
          formGroup.classList.remove('focused');
        }
      }
    }

    // Agregar event listeners
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // Inicializar estado de campos que ya tienen valor
    initializeFieldStates();
  }

  // Función para inicializar el estado de los campos
  function initializeFieldStates() {
    const formGroups = document.querySelectorAll('.admin-form-group');
    formGroups.forEach(group => {
      const input = group.querySelector('.admin-input, .admin-select, .admin-textarea');
      if (input && input.value.trim()) {
        group.classList.add('focused');
      }
    });
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFormFieldFocus);
  } else {
    setupFormFieldFocus();
  }

  // También inicializar cuando se cargue contenido dinámico (modales, etc.)
  document.addEventListener('DOMContentLoaded', function () {
    // Observer para detectar cuando se agregue contenido dinámico
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Verificar si se agregó algún formulario
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const formFields = node.querySelectorAll('.admin-input, .admin-select, .admin-textarea');
              if (formFields.length > 0) {
                // Inicializar estado de los nuevos campos
                formFields.forEach(field => {
                  const formGroup = field.closest('.admin-form-group');
                  if (formGroup && field.value.trim()) {
                    formGroup.classList.add('focused');
                  }
                });
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
})();
