/**
 * Clase para manejar la autenticación del panel administrativo
 * Soporta dos modos: login completo y confirmación de contraseña
 */
console.log("📜 loginAdmin.js cargado correctamente");
class AdminAccess {
    constructor() {
        console.log("🔧 Inicializando AdminAccess...");

        this.form = document.getElementById("adminAccessForm");
        this.loginBtn = document.getElementById("loginBtn");
        this.changeUserBtn = document.getElementById("changeUserBtn");
        this.alertContainer = document.getElementById("alertContainer");
        this.emailGroup = document.getElementById("emailGroup");
        this.emailInput = document.getElementById("email"); // Nota: mantiene ID 'email' pero es campo usuario
        this.passwordInput = document.getElementById("password");
        this.secondaryButtons = document.getElementById("secondaryButtons");

        console.log("📋 Elementos encontrados:", {
            form: !!this.form,
            loginBtn: !!this.loginBtn,
            emailInput: !!this.emailInput,
            passwordInput: !!this.passwordInput
        });

        this.isPasswordOnlyMode = false;
        this.currentUserEmail = null; // Nota: almacena nombre de usuario, no email

        this.init();
    }

    init() {
        console.log("🚀 Iniciando AdminAccess...");

        if (!this.form) {
            console.error("❌ No se encontró el formulario adminAccessForm");
            return;
        }

        // Agregar event listener con más debug
        this.form.addEventListener("submit", (event) => {
            console.log("🎯 Formulario enviado");
            this.handleLogin(event);
        });
        console.log("✅ Event listener agregado al formulario");

        // Agregar event listener al botón como backup
        if (this.loginBtn) {
            this.loginBtn.addEventListener("click", (event) => {
                console.log("🔘 Botón login clickeado");
                console.log("🔘 Estado del botón:", {
                    disabled: this.loginBtn.disabled,
                    classList: this.loginBtn.classList.toString(),
                    textContent: this.loginBtn.querySelector('.btn-text').textContent
                });

                // Verificar si el botón está deshabilitado
                if (this.loginBtn.disabled) {
                    console.log("🚫 Botón está deshabilitado, ignorando click");
                    event.preventDefault();
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                console.log("✅ Procesando click del botón...");

                // Crear un evento submit simulado
                const fakeEvent = {
                    type: 'submit',
                    target: this.form,
                    currentTarget: this.form,
                    preventDefault: () => { }
                };

                this.handleLogin(fakeEvent);
            });
            console.log("✅ Event listener de respaldo agregado al botón login");
        }

        if (this.changeUserBtn) {
            this.changeUserBtn.addEventListener("click", this.switchToFullLogin.bind(this));
            console.log("✅ Event listener agregado al botón cambiar usuario");
        }

        // Verificar si ya está autenticado
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        console.log("🔍 Verificando estado de autenticación...");
        const token = localStorage.getItem("token");

        if (token) {
            console.log("📋 Token encontrado, verificando validez...");
            try {
                // Verificar si el token es válido y obtener datos del usuario
                const response = await fetch("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const userData = await response.json();
                    console.log("✅ Usuario autenticado:", userData.usuario, "- Rol:", userData.rol);

                    // Verificar si es admin/owner
                    if (userData.rol === "owner" || userData.rol === "admin") {
                        console.log("👑 Usuario es admin/owner, configurando modo solo contraseña");
                        // Configurar modo solo contraseña (usar 'usuario' no 'email')
                        this.setupPasswordOnlyMode(userData.usuario);
                    } else {
                        console.log("❌ Usuario no es admin/owner, eliminando token");
                        // No es admin, eliminar token y mostrar login completo
                        localStorage.removeItem("token");
                        this.setupFullLoginMode();
                    }
                } else {
                    console.log("❌ Token inválido, configurando modo login completo");
                    // Token inválido, eliminar y mostrar login completo
                    localStorage.removeItem("token");
                    this.setupFullLoginMode();
                }
            } catch (error) {
                console.error("❌ Error de red verificando token:", error);
                // Error de red o token inválido
                localStorage.removeItem("token");
                this.setupFullLoginMode();
            }
        } else {
            console.log("📋 No hay token, configurando modo login completo");
            // No hay token, mostrar login completo
            this.setupFullLoginMode();
        }

        // Debug: verificar estado final del botón
        setTimeout(() => {
            this.debugButtonVisibility();
        }, 100);
    }

    debugButtonVisibility() {
        console.log("🔧 Debug - Estado del botón:");
        if (this.loginBtn) {
            console.log("  - Display:", window.getComputedStyle(this.loginBtn).display);
            console.log("  - Visibility:", window.getComputedStyle(this.loginBtn).visibility);
            console.log("  - Opacity:", window.getComputedStyle(this.loginBtn).opacity);
            console.log("  - Disabled:", this.loginBtn.disabled);
            console.log("  - Cursor:", window.getComputedStyle(this.loginBtn).cursor);
            console.log("  - Pointer events:", window.getComputedStyle(this.loginBtn).pointerEvents);
            console.log("  - Text content:", this.loginBtn.querySelector('.btn-text').textContent);
            console.log("  - Classes:", this.loginBtn.classList.toString());

            // Si el botón está deshabilitado, intentar habilitarlo
            if (this.loginBtn.disabled) {
                console.log("⚠️ Botón está deshabilitado, intentando habilitarlo...");
                this.forceEnableButton();
            }
        } else {
            console.log("  - ❌ Botón loginBtn no encontrado");
        }

        const secondaryButtons = document.getElementById('secondaryButtons');
        if (secondaryButtons) {
            console.log("  - Secondary buttons display:", window.getComputedStyle(secondaryButtons).display);
            console.log("  - Secondary buttons visibility:", window.getComputedStyle(secondaryButtons).visibility);
        }
    }

    forceEnableButton() {
        console.log("🔧 Forzando habilitación del botón...");
        if (this.loginBtn) {
            this.loginBtn.disabled = false;
            this.loginBtn.classList.remove('btn-loading');
            this.loginBtn.style.pointerEvents = 'auto';
            this.loginBtn.style.cursor = 'pointer';

            // Restaurar texto apropiado
            const btnText = this.isPasswordOnlyMode ? "Confirmar Acceso" : "Acceder al Panel";
            this.loginBtn.querySelector('.btn-text').textContent = btnText;

            console.log("✅ Botón forzado a habilitado");
        }
    }

    setupPasswordOnlyMode(usuario) {
        console.log("🔑 Configurando modo solo contraseña para usuario:", usuario);
        this.isPasswordOnlyMode = true;
        this.currentUserEmail = usuario;

        // Ocultar campo de email
        this.emailGroup.style.display = 'none';
        this.emailInput.required = false;

        // Mostrar información del usuario actual
        this.showCurrentUserInfo(usuario);

        // Asegurar que el botón principal esté visible y habilitado
        if (this.loginBtn) {
            this.loginBtn.style.display = 'block';
            this.loginBtn.disabled = false; // Asegurar que esté habilitado
            this.loginBtn.classList.remove('btn-loading'); // Remover estado de carga
            this.loginBtn.style.pointerEvents = 'auto'; // Asegurar que reciba clicks
            this.loginBtn.style.cursor = 'pointer'; // Cursor de pointer
            this.loginBtn.querySelector('.btn-text').textContent = 'Confirmar Acceso';
            console.log("✅ Botón principal configurado y habilitado para modo solo contraseña");
        }

        // Mostrar botones secundarios con animación
        const secondaryButtons = document.getElementById('secondaryButtons');
        if (secondaryButtons) {
            secondaryButtons.style.display = 'block';
            setTimeout(() => secondaryButtons.classList.add('show'), 50);
        }

        // Cambiar textos del header
        const titleElement = document.querySelector('.access-title');
        const subtitleElement = document.querySelector('.access-subtitle');

        if (titleElement) {
            titleElement.textContent = 'Confirmar Acceso';
        }
        if (subtitleElement) {
            subtitleElement.innerHTML = 'Ingresa tu contraseña para acceder al panel administrativo.';
            subtitleElement.classList.add('password-only-mode');
        }

        // Enfocar el campo de contraseña
        setTimeout(() => {
            if (this.passwordInput) {
                this.passwordInput.focus();
            }
        }, 100);

        console.log("✅ Modo solo contraseña configurado correctamente");
    }

    setupFullLoginMode() {
        console.log("🔄 Configurando modo login completo");
        this.isPasswordOnlyMode = false;
        this.currentUserEmail = null;

        // Mostrar campo de email
        this.emailGroup.style.display = 'block';
        this.emailInput.required = true;

        // Ocultar información de usuario actual
        this.removeCurrentUserInfo();

        // Asegurar que el botón principal esté visible con el texto correcto
        if (this.loginBtn) {
            this.loginBtn.style.display = 'block';
            this.loginBtn.querySelector('.btn-text').textContent = 'Acceder al Panel';
            console.log("✅ Botón principal configurado para modo login completo");
        }

        // Ocultar botones secundarios con animación
        const secondaryButtons = document.getElementById('secondaryButtons');
        if (secondaryButtons) {
            secondaryButtons.classList.remove('show');
            setTimeout(() => secondaryButtons.style.display = 'none', 300);
        }

        // Restaurar textos originales
        const titleElement = document.querySelector('.access-title');
        const subtitleElement = document.querySelector('.access-subtitle');

        if (titleElement) {
            titleElement.textContent = 'Panel Administrativo';
        }
        if (subtitleElement) {
            subtitleElement.innerHTML = 'Accede al sistema de administración para gestionar usuarios, configuraciones y monitorear el sistema.';
            subtitleElement.classList.remove('password-only-mode');
        }

        // Enfocar el campo de email
        setTimeout(() => {
            if (this.emailInput) {
                this.emailInput.focus();
            }
        }, 100);

        console.log("✅ Modo login completo configurado correctamente");
    }

    showCurrentUserInfo(usuario) {
        // Eliminar info anterior si existe
        this.removeCurrentUserInfo();

        const userInfo = document.createElement('div');
        userInfo.className = 'current-user-info';
        userInfo.id = 'currentUserInfo';
        userInfo.innerHTML = `
      <div class="user-label">Usuario actual:</div>
      <div class="user-email">${usuario}</div>
    `;

        this.form.insertBefore(userInfo, this.form.firstChild);
    }

    removeCurrentUserInfo() {
        const existingInfo = document.getElementById('currentUserInfo');
        if (existingInfo) {
            existingInfo.remove();
        }
    }

    switchToFullLogin() {
        // Limpiar token y cambiar a modo login completo
        localStorage.removeItem("token");
        this.setupFullLoginMode();
        this.clearAlerts();
        this.emailInput.value = '';
        this.passwordInput.value = '';
    }

    async handleLogin(event) {
        console.log("🔐 handleLogin ejecutado");

        // Asegurar que preventDefault se ejecute
        if (event && event.preventDefault) {
            event.preventDefault();
        }

        this.setLoading(true);
        this.clearAlerts();

        try {
            if (this.isPasswordOnlyMode) {
                console.log("🔑 Modo solo contraseña");
                // Modo solo contraseña - verificar contraseña con el token existente
                await this.handlePasswordConfirmation();
            } else {
                console.log("👤 Modo login completo");
                // Modo login completo
                await this.handleFullLogin();
            }
        } catch (error) {
            console.error("❌ Error de autenticación:", error);
            this.showAlert("Error de conexión. Intenta nuevamente.", "error");
        } finally {
            this.setLoading(false);
        }
    }

    async handlePasswordConfirmation() {
        const password = this.passwordInput.value;
        const token = localStorage.getItem("token");

        // Solo verificar que la contraseña no esté vacía y proceder
        if (!password.trim()) {
            this.showAlert("Por favor ingresa tu contraseña.", "error");
            return;
        }

        // Verificar contraseña haciendo un login con el usuario almacenado
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                usuario: this.currentUserEmail,
                password: password
            }),
        });

        const result = await response.json();
        console.log("🔑 Respuesta de verificación:", response.status, result);

        if (response.ok && result.token) {
            // Contraseña correcta, actualizar token y redirigir
            localStorage.setItem("token", result.token);

            this.showAlert("Acceso confirmado. Redirigiendo...", "success");

            setTimeout(() => {
                this.generateAdminTokenAndRedirect(result.token);
            }, 1000);
        } else {
            this.showAlert("Contraseña incorrecta.", "error");
        }
    }

    async handleFullLogin() {
        console.log("🔐 handleFullLogin - Iniciando login completo");

        const formData = new FormData(this.form);
        const credentials = {
            usuario: formData.get("email"), // El backend espera 'usuario'
            password: formData.get("password"),
        };

        console.log("📝 Enviando credenciales de login");

        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
        });

        const result = await response.json();
        console.log("📡 Respuesta del servidor:", response.status, result);

        if (response.ok && result.token) {
            // Verificar permisos de administrador
            const userResponse = await fetch("/api/auth/me", {
                headers: {
                    Authorization: `Bearer ${result.token}`,
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();

                if (userData.rol === "owner" || userData.rol === "admin") {
                    // Usuario autorizado, guardar token y continuar
                    localStorage.setItem("token", result.token);

                    this.showAlert("Autenticación exitosa. Redirigiendo...", "success");

                    setTimeout(() => {
                        this.generateAdminTokenAndRedirect(result.token);
                    }, 1000);
                } else {
                    this.showAlert("No tienes permisos de administrador.", "error");
                }
            } else {
                this.showAlert("Error verificando permisos.", "error");
            }
        } else {
            this.showAlert(
                result.message || "Credenciales inválidas. Verifica tu usuario y contraseña.",
                "error"
            );
        }
    }

    async generateAdminTokenAndRedirect(userToken) {
        try {
            // Generar token de administración
            const response = await fetch('/api/admin/generate-admin-token', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                window.location.href = `/panelAdmin?tid=${data.tokenId}`;
            } else {
                window.location.href = "/panelAdmin";
            }
        } catch (error) {
            // Fallback: ir directamente a panelAdmin.html
            window.location.href = "/panelAdmin";
        }
    }

    setLoading(loading) {
        console.log("🔄 Cambiando estado de carga:", loading);
        if (loading) {
            this.loginBtn.classList.add("btn-loading");
            this.loginBtn.disabled = true;
            this.loginBtn.style.pointerEvents = 'none'; // Bloquear clicks durante carga
            this.loginBtn.style.cursor = 'not-allowed'; // Cursor de no permitido
            if (this.changeUserBtn) this.changeUserBtn.disabled = true;
            this.loginBtn.querySelector(".btn-text").textContent = "Verificando...";
            console.log("⏳ Botón en estado de carga");
        } else {
            this.loginBtn.classList.remove("btn-loading");
            this.loginBtn.disabled = false;
            this.loginBtn.style.pointerEvents = 'auto'; // Permitir clicks
            this.loginBtn.style.cursor = 'pointer'; // Cursor normal
            if (this.changeUserBtn) this.changeUserBtn.disabled = false;

            // Restaurar texto apropiado según el modo
            const btnText = this.isPasswordOnlyMode ? "Confirmar Acceso" : "Acceder al Panel";
            this.loginBtn.querySelector(".btn-text").textContent = btnText;
            console.log("✅ Botón habilitado, texto restaurado:", btnText);
        }
    }

    showAlert(message, type) {
        const alert = document.createElement("div");
        alert.className = `access-alert ${type}`;
        alert.textContent = message;

        this.alertContainer.innerHTML = "";
        this.alertContainer.appendChild(alert);

        if (type === "success") {
            setTimeout(() => {
                alert.style.transform = "translateY(-10px)";
            }, 3000);
        }
    }

    clearAlerts() {
        this.alertContainer.innerHTML = "";
    }
}

// Función de prueba para la consola del navegador
window.testLoginAdmin = function () {
    console.log("🧪 Test ejecutado");
    const adminAccess = window.adminAccessInstance;
    if (adminAccess) {
        console.log("✅ AdminAccess encontrado");
        adminAccess.handleLogin({ preventDefault: () => { } });
    } else {
        console.error("❌ AdminAccess no encontrado");
    }
};

// Función para verificar y arreglar el estado del botón
window.fixLoginButton = function () {
    console.log("🔧 Ejecutando fixLoginButton...");
    const adminAccess = window.adminAccessInstance;
    if (adminAccess) {
        console.log("✅ AdminAccess encontrado, verificando botón...");
        adminAccess.debugButtonVisibility();
        adminAccess.forceEnableButton();
        setTimeout(() => adminAccess.debugButtonVisibility(), 100);
    } else {
        console.error("❌ AdminAccess no encontrado");
        // Intentar encontrar el botón directamente
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            console.log("🔧 Arreglando botón directamente...");
            loginBtn.disabled = false;
            loginBtn.classList.remove('btn-loading');
            loginBtn.style.pointerEvents = 'auto';
            loginBtn.style.cursor = 'pointer';
            console.log("✅ Botón arreglado directamente");
        } else {
            console.error("❌ Botón loginBtn no encontrado");
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    console.log("📄 DOM cargado, inicializando AdminAccess...");
    try {
        const adminAccess = new AdminAccess();
        window.adminAccessInstance = adminAccess; // Guardar referencia global para testing
        console.log("✅ AdminAccess inicializado correctamente");
    } catch (error) {
        console.error("❌ Error al inicializar AdminAccess:", error);
    }
});
