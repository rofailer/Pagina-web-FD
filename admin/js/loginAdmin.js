/**
 * Clase para manejar la autenticación del panel administrativo
 * Soporta dos modos: login completo y confirmación de contraseña
 */
class AdminAccess {
    constructor() {
        this.form = document.getElementById("adminAccessForm");
        this.loginBtn = document.getElementById("loginBtn");
        this.changeUserBtn = document.getElementById("changeUserBtn");
        this.alertContainer = document.getElementById("alertContainer");
        this.emailGroup = document.getElementById("emailGroup");
        this.emailInput = document.getElementById("email"); // Nota: mantiene ID 'email' pero es campo usuario
        this.passwordInput = document.getElementById("password");
        this.secondaryButtons = document.getElementById("secondaryButtons");

        this.isPasswordOnlyMode = false;
        this.currentUserEmail = null; // Nota: almacena nombre de usuario, no email

        this.init();
    }

    init() {
        this.form.addEventListener("submit", this.handleLogin.bind(this));
        this.changeUserBtn.addEventListener("click", this.switchToFullLogin.bind(this));

        // Verificar si ya está autenticado
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                // Verificar si el token es válido y obtener datos del usuario
                const response = await fetch("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const userData = await response.json();

                    // Verificar si es admin/owner
                    if (userData.rol === "owner" || userData.rol === "admin") {
                        // Configurar modo solo contraseña (usar 'usuario' no 'email')
                        this.setupPasswordOnlyMode(userData.usuario);
                    } else {
                        // No es admin, eliminar token y mostrar login completo
                        localStorage.removeItem("token");
                        this.setupFullLoginMode();
                    }
                } else {
                    // Token inválido, eliminar y mostrar login completo
                    localStorage.removeItem("token");
                    this.setupFullLoginMode();
                }
            } catch (error) {
                // Error de red o token inválido
                localStorage.removeItem("token");
                this.setupFullLoginMode();
            }
        } else {
            // No hay token, mostrar login completo
            this.setupFullLoginMode();
        }
    }

    setupPasswordOnlyMode(usuario) {
        this.isPasswordOnlyMode = true;
        this.currentUserEmail = usuario;

        // Ocultar campo de email
        this.emailGroup.style.display = 'none';
        this.emailInput.required = false;

        // Mostrar información del usuario actual
        this.showCurrentUserInfo(usuario);

        // Mostrar botones secundarios con animación
        const secondaryButtons = document.getElementById('secondaryButtons');
        secondaryButtons.style.display = 'block';
        setTimeout(() => secondaryButtons.classList.add('show'), 50);

        // Cambiar textos
        document.querySelector('.access-title').textContent = 'Confirmar Acceso';
        document.querySelector('.access-subtitle').innerHTML = 'Ingresa tu contraseña para acceder al panel administrativo.';
        document.querySelector('.access-subtitle').classList.add('password-only-mode');
        this.loginBtn.querySelector('.btn-text').textContent = 'Confirmar Acceso';

        // Enfocar el campo de contraseña
        setTimeout(() => this.passwordInput.focus(), 100);
    }

    setupFullLoginMode() {
        this.isPasswordOnlyMode = false;
        this.currentUserEmail = null;

        // Mostrar campo de email
        this.emailGroup.style.display = 'block';
        this.emailInput.required = true;

        // Ocultar información de usuario actual
        this.removeCurrentUserInfo();

        // Ocultar botones secundarios con animación
        const secondaryButtons = document.getElementById('secondaryButtons');
        secondaryButtons.classList.remove('show');
        setTimeout(() => secondaryButtons.style.display = 'none', 300);

        // Restaurar textos originales
        document.querySelector('.access-title').textContent = 'Panel Administrativo';
        document.querySelector('.access-subtitle').innerHTML = 'Accede al sistema de administración para gestionar usuarios, configuraciones y monitorear el sistema.';
        document.querySelector('.access-subtitle').classList.remove('password-only-mode');
        this.loginBtn.querySelector('.btn-text').textContent = 'Acceder al Panel';

        // Enfocar el campo de email
        setTimeout(() => this.emailInput.focus(), 100);
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
        event.preventDefault();

        this.setLoading(true);
        this.clearAlerts();

        try {
            if (this.isPasswordOnlyMode) {
                // Modo solo contraseña - verificar contraseña con el token existente
                await this.handlePasswordConfirmation();
            } else {
                // Modo login completo
                await this.handleFullLogin();
            }
        } catch (error) {
            console.error("Error de autenticación:", error);
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
        const formData = new FormData(this.form);
        const credentials = {
            usuario: formData.get("email"), // El backend espera 'usuario'
            password: formData.get("password"),
        };

        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
        });

        const result = await response.json();

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
                window.location.href = `/admin/html/panelAdmin.html?tid=${data.tokenId}`;
            } else {
                window.location.href = "/admin/html/panelAdmin.html";
            }
        } catch (error) {
            // Fallback: ir directamente a panelAdmin.html
            window.location.href = "/admin/html/panelAdmin.html";
        }
    }

    setLoading(loading) {
        if (loading) {
            this.loginBtn.classList.add("btn-loading");
            this.loginBtn.disabled = true;
            this.changeUserBtn.disabled = true;
            this.loginBtn.querySelector(".btn-text").textContent = "Verificando...";
        } else {
            this.loginBtn.classList.remove("btn-loading");
            this.loginBtn.disabled = false;
            this.changeUserBtn.disabled = false;

            // Restaurar texto apropiado según el modo
            const btnText = this.isPasswordOnlyMode ? "Confirmar Acceso" : "Acceder al Panel";
            this.loginBtn.querySelector(".btn-text").textContent = btnText;
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

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    new AdminAccess();
});
