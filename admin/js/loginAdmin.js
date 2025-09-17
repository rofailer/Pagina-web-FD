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
        this.emailInput = document.getElementById("email");
        this.passwordInput = document.getElementById("password");
        this.secondaryButtons = document.getElementById("secondaryButtons");

        this.isPasswordOnlyMode = false;
        this.currentUserEmail = null;

        this.init();
    }

    init() {
        if (!this.form) {
            console.error("No se encontró el formulario adminAccessForm");
            return;
        }

        this.form.addEventListener("submit", (event) => {
            this.handleLogin(event);
        });

        if (this.loginBtn) {
            this.loginBtn.addEventListener("click", (event) => {
                if (this.loginBtn.disabled) {
                    event.preventDefault();
                    return;
                }
                event.preventDefault();
                this.handleLogin(event);
            });
        }

        if (this.changeUserBtn) {
            this.changeUserBtn.addEventListener("click", this.switchToFullLogin.bind(this));
        }

        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        const token = localStorage.getItem("token");

        if (token) {
            try {
                const response = await fetch("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const userData = await response.json();

                    if (userData.rol === "owner" || userData.rol === "admin") {
                        // Usuario ya autenticado como admin, mostrar confirmación de contraseña por seguridad
                        this.setupPasswordOnlyMode(userData.usuario);
                        return;
                    } else {
                        localStorage.removeItem("token");
                        this.setupFullLoginMode();
                    }
                } else {
                    localStorage.removeItem("token");
                    this.setupFullLoginMode();
                }
            } catch (error) {
                localStorage.removeItem("token");
                this.setupFullLoginMode();
            }
        } else {
            this.setupFullLoginMode();
        }
    }

    setupPasswordOnlyMode(usuario) {
        this.isPasswordOnlyMode = true;
        this.currentUserEmail = usuario;

        this.emailGroup.style.display = 'none';
        this.emailInput.required = false;

        this.showCurrentUserInfo(usuario);

        if (this.loginBtn) {
            this.loginBtn.style.display = 'block';
            this.loginBtn.disabled = false;
            this.loginBtn.classList.remove('btn-loading');
            this.loginBtn.style.pointerEvents = 'auto';
            this.loginBtn.style.cursor = 'pointer';
            this.loginBtn.querySelector('.btn-text').textContent = 'Confirmar Acceso';
        }

        const secondaryButtons = document.getElementById('secondaryButtons');
        if (secondaryButtons) {
            secondaryButtons.style.display = 'block';
            setTimeout(() => secondaryButtons.classList.add('show'), 50);
        }

        const titleElement = document.querySelector('.access-title');
        const subtitleElement = document.querySelector('.access-subtitle');

        if (titleElement) {
            titleElement.textContent = 'Confirmar Acceso';
        }
        if (subtitleElement) {
            subtitleElement.innerHTML = 'Ingresa tu contraseña para acceder al panel administrativo.';
            subtitleElement.classList.add('password-only-mode');
        }

        setTimeout(() => {
            if (this.passwordInput) {
                this.passwordInput.focus();
            }
        }, 100);
    }

    setupFullLoginMode() {
        this.isPasswordOnlyMode = false;
        this.currentUserEmail = null;

        this.emailGroup.style.display = 'block';
        this.emailInput.required = true;

        this.removeCurrentUserInfo();

        if (this.loginBtn) {
            this.loginBtn.style.display = 'block';
            this.loginBtn.querySelector('.btn-text').textContent = 'Acceder al Panel';
        }

        const secondaryButtons = document.getElementById('secondaryButtons');
        if (secondaryButtons) {
            secondaryButtons.classList.remove('show');
            setTimeout(() => secondaryButtons.style.display = 'none', 300);
        }

        const titleElement = document.querySelector('.access-title');
        const subtitleElement = document.querySelector('.access-subtitle');

        if (titleElement) {
            titleElement.textContent = 'Panel Administrativo';
        }
        if (subtitleElement) {
            subtitleElement.innerHTML = 'Accede al sistema de administración para gestionar usuarios, configuraciones y monitorear el sistema.';
            subtitleElement.classList.remove('password-only-mode');
        }

        setTimeout(() => {
            if (this.emailInput) {
                this.emailInput.focus();
            }
        }, 100);
    }

    showCurrentUserInfo(usuario) {
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
        localStorage.removeItem("token");
        this.setupFullLoginMode();
        this.clearAlerts();
        this.emailInput.value = '';
        this.passwordInput.value = '';
    }

    async handleLogin(event) {
        if (event && event.preventDefault) {
            event.preventDefault();
        }

        this.setLoading(true);
        this.clearAlerts();

        try {
            if (this.isPasswordOnlyMode) {
                await this.handlePasswordConfirmation();
            } else {
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

        if (!password.trim()) {
            this.showAlert("Por favor ingresa tu contraseña.", "error");
            return;
        }

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
            localStorage.setItem("token", result.token);
            this.showAlert("Acceso confirmado. Redirigiendo...", "success");

            setTimeout(() => {
                this.redirectToAdminPanel(result.token);
            }, 1000);
        } else {
            this.showAlert("Contraseña incorrecta.", "error");
        }
    }

    async handleFullLogin() {
        const formData = new FormData(this.form);
        const credentials = {
            usuario: formData.get("email"),
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
            const userResponse = await fetch("/api/auth/me", {
                headers: {
                    Authorization: `Bearer ${result.token}`,
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();

                if (userData.rol === "owner" || userData.rol === "admin") {
                    localStorage.setItem("token", result.token);
                    this.showAlert("Autenticación exitosa. Redirigiendo...", "success");

                    setTimeout(() => {
                        this.redirectToAdminPanel(result.token);
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

    async redirectToAdminPanel(userToken) {
        try {
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
                // Fallback: redirigir sin token especial
                window.location.href = "/panelAdmin";
            }
        } catch (error) {
            // Fallback: redirigir sin token especial
            window.location.href = "/panelAdmin";
        }
    }

    setLoading(loading) {
        if (loading) {
            this.loginBtn.classList.add("btn-loading");
            this.loginBtn.disabled = true;
            this.loginBtn.style.pointerEvents = 'none';
            this.loginBtn.style.cursor = 'not-allowed';
            if (this.changeUserBtn) this.changeUserBtn.disabled = true;
            this.loginBtn.querySelector(".btn-text").textContent = "Verificando...";
        } else {
            this.loginBtn.classList.remove("btn-loading");
            this.loginBtn.disabled = false;
            this.loginBtn.style.pointerEvents = 'auto';
            this.loginBtn.style.cursor = 'pointer';
            if (this.changeUserBtn) this.changeUserBtn.disabled = false;

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
    try {
        const adminAccess = new AdminAccess();
        window.adminAccessInstance = adminAccess;
    } catch (error) {
        console.error("Error al inicializar AdminAccess:", error);
    }
});
