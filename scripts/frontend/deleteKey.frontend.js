/**
 * Módulo para eliminar llaves digitales
 * Maneja la validación de contraseña y eliminación segura de llaves
 */

let currentKeyToDelete = null;

// Función para mostrar el modal de eliminación - disponible globalmente
window.showDeleteKeyModal = function (keyName) {
    currentKeyToDelete = keyName;

    const modal = document.getElementById('deleteKeyModal');
    const keyNameSpan = document.getElementById('deleteKeyName');
    const passwordInput = document.getElementById('deleteKeyPassword');
    const errorDiv = document.getElementById('deleteKeyError');

    if (!modal) {
        console.error('Modal de eliminación no encontrado');
        alert('Error: Modal de eliminación no encontrado en el DOM');
        return;
    }

    // Configurar el modal
    if (keyNameSpan) keyNameSpan.textContent = keyName;
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.classList.remove('error-input');
    }
    if (errorDiv) errorDiv.style.display = 'none';

    // Mostrar modal
    modal.classList.add('show');
    if (passwordInput) passwordInput.focus();

};

// Función global para eliminar llaves - disponible inmediatamente
window.deleteKey = function (keyName) {

    if (typeof showDeleteKeyModal === 'function') {
        showDeleteKeyModal(keyName);
    } else {
        console.error('showDeleteKeyModal no está disponible');
        alert('Error: Funcionalidad de eliminación no disponible');
    }
};

document.addEventListener("DOMContentLoaded", () => {

    // Función para cerrar el modal
    function closeDeleteModal() {
        const modal = document.getElementById('deleteKeyModal');
        const passwordInput = document.getElementById('deleteKeyPassword');
        const errorDiv = document.getElementById('deleteKeyError');
        const loadingDiv = document.getElementById('deleteKeyLoading');

        if (modal) {
            modal.classList.remove('show');
        }

        // Limpiar campos
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.classList.remove('error-input');
        }

        if (errorDiv) {
            errorDiv.style.display = 'none';
        }

        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }

        currentKeyToDelete = null;
    }

    // Función para mostrar error
    function showDeleteError(message) {
        const errorDiv = document.getElementById('deleteKeyError');
        const passwordInput = document.getElementById('deleteKeyPassword');

        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        if (passwordInput) {
            passwordInput.classList.add('error-input');
            passwordInput.focus();
        }
    }

    // Función para mostrar/ocultar loading
    function setDeleteLoading(show) {
        const loadingDiv = document.getElementById('deleteKeyLoading');
        const confirmBtn = document.getElementById('deleteConfirmBtn');
        const cancelBtn = document.getElementById('deleteCancelBtn');

        if (loadingDiv) {
            loadingDiv.style.display = show ? 'block' : 'none';
        }

        if (confirmBtn) {
            confirmBtn.disabled = show;
        }

        if (cancelBtn) {
            cancelBtn.disabled = show;
        }
    }

    // Función para confirmar eliminación
    async function confirmDeleteKey() {
        const passwordInput = document.getElementById('deleteKeyPassword');
        const errorDiv = document.getElementById('deleteKeyError');

        if (!currentKeyToDelete || !passwordInput) {
            console.error('Datos insuficientes para eliminar llave');
            return;
        }

        const password = passwordInput.value.trim();

        // Validaciones básicas
        if (!password) {
            showDeleteError('La contraseña es requerida');
            return;
        }

        if (password.length < 4) {
            showDeleteError('La contraseña debe tener al menos 4 caracteres');
            return;
        }

        // Limpiar errores previos
        errorDiv.style.display = 'none';
        passwordInput.classList.remove('error-input');

        // Mostrar loading
        setDeleteLoading(true);

        try {

            const response = await fetch('/delete-key', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    keyName: currentKeyToDelete,
                    password: password
                })
            });

            const data = await response.json();

            if (data.success) {

                // Guardar el nombre antes de cerrar el modal
                const deletedKeyName = currentKeyToDelete;

                // Cerrar modal
                closeDeleteModal();

                // Mostrar notificación de éxito
                if (typeof showNotification === 'function') {
                    showNotification(`Llave "${deletedKeyName}" eliminada correctamente`, 'success');
                } else {
                    alert(`Llave "${deletedKeyName}" eliminada correctamente`);
                }

                // Recargar listas de llaves
                try {
                    // Recargar llaves del perfil
                    if (typeof loadUserKeys === 'function') {
                        loadUserKeys();
                    }

                    // Recargar llaves globales
                    if (typeof window.loadKeys === 'function') {
                        window.loadKeys();
                    }

                    // Actualizar estadísticas de llaves
                    if (typeof updateKeysCount === 'function') {
                        updateKeysCount();
                    }
                } catch (reloadError) {
                    console.warn('Error al recargar listas:', reloadError);
                }

            } else {
                console.error('Error del servidor:', data.error);
                showDeleteError(data.error || 'Error al eliminar la llave');
            }

        } catch (error) {
            console.error('Error de red al eliminar llave:', error);
            showDeleteError('Error de conexión. Inténtalo nuevamente.');
        } finally {
            setDeleteLoading(false);
        }
    }

    // Event listeners para el modal

    // Cerrar modal con X
    const closeBtn = document.getElementById('deleteKeyClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDeleteModal);
    }

    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('deleteKeyModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDeleteModal();
            }
        });
    }

    // Botón cancelar
    const cancelBtn = document.getElementById('deleteCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeDeleteModal);
    }

    // Botón confirmar
    const confirmBtn = document.getElementById('deleteConfirmBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDeleteKey);
    }

    // Submit del formulario (Enter en el input)
    const form = document.getElementById('deleteKeyForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            confirmDeleteKey();
        });
    }

    // Escape para cerrar modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
            closeDeleteModal();
        }
    });

});

// Función global para eliminar llaves - disponible inmediatamente
window.deleteKey = function (keyName) {

    if (typeof showDeleteKeyModal === 'function') {
        showDeleteKeyModal(keyName);
    } else {
        console.error('showDeleteKeyModal no está disponible');
        alert('Error: Funcionalidad de eliminación no disponible');
    }
};
