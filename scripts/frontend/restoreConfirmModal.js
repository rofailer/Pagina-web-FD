/* ===========================================
   CONTROLADOR DEL MODAL DE CONFIRMACIÓN DE RESTAURACIÓN
   =========================================== */

class RestoreConfirmModal {
    constructor() {
        this.modal = document.getElementById('restoreConfirmModal');
        this.closeBtn = document.getElementById('restoreConfirmClose');
        this.confirmBtn = document.getElementById('restoreConfirmBtn');
        this.cancelBtn = document.getElementById('restoreCancelBtn');
        this.passwordInput = document.getElementById('restoreConfirmPassword');
        this.loadingDiv = document.getElementById('restoreConfirmLoading');
        this.errorDiv = document.getElementById('restoreConfirmError');
        this.form = document.getElementById('restoreConfirmForm');

        this.init();
    }

    init() {
        // Event listeners
        this.closeBtn.addEventListener('click', () => this.hide());
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.confirmBtn.addEventListener('click', (e) => this.handleConfirm(e));
        this.form.addEventListener('submit', (e) => this.handleConfirm(e));

        // Cerrar al hacer clic fuera del modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hide();
            }
        });
    }

    show() {
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevenir scroll
        this.passwordInput.focus();
        this.resetForm();
    }

    hide() {
        this.modal.classList.remove('show');
        document.body.style.overflow = ''; // Restaurar scroll
        this.resetForm();
    }

    isVisible() {
        return this.modal.classList.contains('show');
    }

    resetForm() {
        this.form.reset();
        this.hideLoading();
        this.hideError();
    }

    showLoading() {
        this.loadingDiv.style.display = 'block';
        this.confirmBtn.disabled = true;
        this.cancelBtn.disabled = true;
        this.passwordInput.disabled = true;
    }

    hideLoading() {
        this.loadingDiv.style.display = 'none';
        this.confirmBtn.disabled = false;
        this.cancelBtn.disabled = false;
        this.passwordInput.disabled = false;
    }

    showError(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
    }

    hideError() {
        this.errorDiv.style.display = 'none';
    }

    async handleConfirm(e) {
        e.preventDefault();

        const password = this.passwordInput.value.trim();

        if (!password) {
            this.showError('Por favor ingrese la contraseña del administrador.');
            this.passwordInput.focus();
            return;
        }

        if (password.length < 4) {
            this.showError('La contraseña debe tener al menos 4 caracteres.');
            this.passwordInput.focus();
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            // Aquí iría la llamada a la API para restaurar la base de datos
            const response = await this.performRestore(password);

            if (response.success) {
                // Mostrar mensaje de éxito
                showNotification('Base de datos restaurada exitosamente', 'success');

                // Cerrar modal
                this.hide();

                // Opcional: recargar la página o actualizar la interfaz
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } else {
                throw new Error(response.message || 'Error al restaurar la base de datos');
            }

        } catch (error) {
            console.error('Error en restauración:', error);
            this.showError(error.message || 'Error inesperado al restaurar la base de datos');
        } finally {
            this.hideLoading();
        }
    }

    async performRestore(password) {
        // Simulación de llamada a API
        // En un entorno real, esto sería una llamada fetch a tu endpoint de restauración

        const formData = new FormData();
        formData.append('adminPassword', password);
        // Agregar aquí el archivo de respaldo si es necesario
        // formData.append('backupFile', this.selectedBackupFile);

        const response = await fetch('/api/admin/restore-database', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error HTTP: ${response.status}`);
        }

        return await response.json();
    }

    getAuthToken() {
        // Obtener token de autenticación del localStorage o donde lo guardes
        return localStorage.getItem('adminToken') || '';
    }

    // Método para mostrar notificaciones (debe estar disponible globalmente)
    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback si no hay sistema de notificaciones
            alert(message);
        }
    }
}

// Inicializar el modal cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.restoreConfirmModal = new RestoreConfirmModal();
});

// Función global para mostrar el modal (puede ser llamada desde botones)
function showRestoreConfirmModal() {
    if (window.restoreConfirmModal) {
        window.restoreConfirmModal.show();
    }
}

// Exportar para uso en módulos ES6 si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RestoreConfirmModal;
}