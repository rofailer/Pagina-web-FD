/**
 * Acceso al panel administrativo.
 * Admite autenticación completa y confirmación de contraseña cuando ya existe
 * una sesión normal autorizada.
 */
class AdminAccess {
    constructor() {
        this.form = document.getElementById('adminAccessForm');
        this.loginBtn = document.getElementById('loginBtn');
        this.changeUserBtn = null;
        this.alertContainer = document.getElementById('alertContainer');
        this.emailGroup = document.getElementById('emailGroup');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');

        this.isPasswordOnlyMode = false;
        this.currentUser = null;
        this.isSubmitting = false;

        this.init();
    }

    init() {
        if (!this.form || !this.loginBtn || !this.emailInput || !this.passwordInput) return;

        this.form.addEventListener('submit', (event) => void this.handleLogin(event));
        void this.checkAuthStatus();
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.setupFullLoginMode();
            return;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const user = response.ok ? await this.readJson(response) : null;

            if (user && this.isAdministrativeRole(user.rol)) {
                this.setupPasswordOnlyMode(user.usuario);
                return;
            }
        } catch (_error) {
            // Una sesión no verificable se trata como cerrada.
        }

        localStorage.removeItem('token');
        localStorage.removeItem('admin_token');
        this.setupFullLoginMode();
    }

    setupPasswordOnlyMode(usuario) {
        this.isPasswordOnlyMode = true;
        this.currentUser = usuario;
        this.emailGroup.hidden = true;
        this.emailInput.required = false;
        this.showCurrentUserInfo(usuario);

        this.setButtonText('Confirmar acceso');

        this.updateHeader(
            'Confirmar acceso',
            'Ingresa nuevamente tu contraseña para abrir el panel administrativo.'
        );
        window.setTimeout(() => this.passwordInput.focus(), 80);
    }

    setupFullLoginMode() {
        this.isPasswordOnlyMode = false;
        this.currentUser = null;
        this.emailGroup.hidden = false;
        this.emailInput.required = true;
        this.removeCurrentUserInfo();

        this.setButtonText('Acceder al panel');

        this.updateHeader(
            'Panel Administrativo',
            'Ingresa con una cuenta autorizada para continuar.'
        );
        window.setTimeout(() => this.emailInput.focus(), 80);
    }

    updateHeader(title, subtitle) {
        const titleElement = document.querySelector('.access-title');
        const subtitleElement = document.querySelector('.access-subtitle');
        if (titleElement) titleElement.textContent = title;
        if (subtitleElement) subtitleElement.textContent = subtitle;
    }

    showCurrentUserInfo(usuario) {
        this.removeCurrentUserInfo();

        const userInfo = document.createElement('div');
        const userCopy = document.createElement('div');
        const label = document.createElement('div');
        const value = document.createElement('div');
        const changeButton = document.createElement('button');
        const changeIcon = document.createElement('span');

        userInfo.className = 'current-user-info';
        userInfo.id = 'currentUserInfo';
        userCopy.className = 'current-user-copy';
        label.className = 'user-label';
        label.textContent = 'Usuario actual';
        value.className = 'user-email';
        value.textContent = usuario || '';
        changeButton.type = 'button';
        changeButton.className = 'current-user-switch';
        changeButton.setAttribute('aria-label', 'Cambiar usuario');
        changeButton.title = 'Cambiar usuario';
        changeIcon.className = 'current-user-switch-icon';
        changeIcon.setAttribute('aria-hidden', 'true');
        changeIcon.textContent = '↻';
        changeButton.append(changeIcon);
        changeButton.addEventListener('click', () => this.switchToFullLogin());
        userCopy.append(label, value);
        userInfo.append(userCopy, changeButton);
        this.changeUserBtn = changeButton;
        this.form.prepend(userInfo);
    }

    removeCurrentUserInfo() {
        document.getElementById('currentUserInfo')?.remove();
        this.changeUserBtn = null;
    }

    switchToFullLogin() {
        localStorage.removeItem('token');
        localStorage.removeItem('admin_token');
        this.clearAlerts();
        this.emailInput.value = '';
        this.passwordInput.value = '';
        this.setupFullLoginMode();
    }

    async handleLogin(event) {
        event.preventDefault();
        if (this.isSubmitting) return;

        this.isSubmitting = true;
        this.setLoading(true);
        this.clearAlerts();

        try {
            if (this.isPasswordOnlyMode) {
                await this.handlePasswordConfirmation();
            } else {
                await this.handleFullLogin();
            }
        } catch (_error) {
            this.showAlert('No fue posible conectar con el servidor. Intenta nuevamente.', 'error');
        } finally {
            this.isSubmitting = false;
            this.setLoading(false);
        }
    }

    async handlePasswordConfirmation() {
        const password = this.passwordInput.value;
        if (!password.trim() || !this.currentUser) {
            this.showAlert('Ingresa tu contraseña para continuar.', 'error');
            return;
        }

        const response = await this.requestLogin({
            usuario: this.currentUser,
            password
        });

        if (!response.ok || !response.data.token) {
            this.passwordInput.value = '';
            this.passwordInput.focus();
            this.showAlert('La contraseña no es correcta.', 'error');
            return;
        }

        localStorage.setItem('token', response.data.token);
        this.showAlert('Acceso confirmado. Preparando el panel…', 'success');
        await this.redirectToAdminPanel(response.data.token);
    }

    async handleFullLogin() {
        const usuario = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        if (!usuario || !password.trim()) {
            this.showAlert('Completa el usuario y la contraseña.', 'error');
            return;
        }

        const login = await this.requestLogin({ usuario, password });
        if (!login.ok || !login.data.token) {
            this.showAlert(login.data.message || 'Las credenciales no son válidas.', 'error');
            return;
        }

        const userResponse = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${login.data.token}` }
        });
        const user = userResponse.ok ? await this.readJson(userResponse) : null;

        if (!user || !this.isAdministrativeRole(user.rol)) {
            this.passwordInput.value = '';
            this.showAlert('Esta cuenta no tiene permisos de administración.', 'error');
            return;
        }

        localStorage.setItem('token', login.data.token);
        this.showAlert('Autenticación correcta. Preparando el panel…', 'success');
        await this.redirectToAdminPanel(login.data.token);
    }

    async requestLogin(credentials) {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        return { ok: response.ok, data: await this.readJson(response) };
    }

    async redirectToAdminPanel(userToken) {
        try {
            const response = await fetch('/api/admin/generate-admin-token', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await this.readJson(response);

            if (!response.ok || !data.tokenId) {
                throw new Error('admin_token_not_available');
            }

            window.location.assign(`/panelAdmin?tid=${encodeURIComponent(data.tokenId)}`);
        } catch (_error) {
            this.passwordInput.value = '';
            this.showAlert('No fue posible preparar el acceso administrativo. Intenta nuevamente.', 'error');
        }
    }

    async readJson(response) {
        try {
            return await response.json();
        } catch (_error) {
            return {};
        }
    }

    isAdministrativeRole(role) {
        return role === 'owner' || role === 'admin';
    }

    setLoading(loading) {
        this.loginBtn.classList.toggle('btn-loading', loading);
        this.loginBtn.disabled = loading;
        if (this.changeUserBtn) this.changeUserBtn.disabled = loading;
        this.setButtonText(loading
            ? 'Verificando…'
            : (this.isPasswordOnlyMode ? 'Confirmar acceso' : 'Acceder al panel'));
    }

    setButtonText(text) {
        const label = this.loginBtn?.querySelector('.btn-text');
        if (label) label.textContent = text;
    }

    showAlert(message, type) {
        if (!this.alertContainer) return;
        const alert = document.createElement('div');
        alert.className = `access-alert ${type}`;
        alert.textContent = message;
        this.alertContainer.replaceChildren(alert);
    }

    clearAlerts() {
        this.alertContainer?.replaceChildren();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.adminAccessInstance) {
        window.adminAccessInstance = new AdminAccess();
    }
}, { once: true });
