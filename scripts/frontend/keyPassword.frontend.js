document.addEventListener("DOMContentLoaded", () => {
    // Referencias al modal y campos
    const keyPasswordModal = document.getElementById("keyPasswordModal");
    const keyPasswordInput = document.getElementById("keyPasswordInput");
    const keyPasswordForm = document.getElementById("keyPasswordForm");
    const keyPasswordError = document.getElementById("keyPasswordError");
    const closeKeyPasswordModal = document.getElementById("closeKeyPasswordModal");

    let onPasswordSubmit = null;

    // Mostrar modal y limpiar campos
    function showKeyPasswordModal(callback) {
        keyPasswordInput.value = "";
        keyPasswordError.style.display = "none";
        keyPasswordModal.style.display = "block";
        onPasswordSubmit = callback;
        keyPasswordInput.focus();
    }

    // Cerrar modal
    function closeModal() {
        keyPasswordModal.style.display = "none";
        onPasswordSubmit = null;
    }

    closeKeyPasswordModal.onclick = closeModal;

    // Enviar contraseña
    keyPasswordForm.onsubmit = (e) => {
        e.preventDefault();
        const password = keyPasswordInput.value;
        if (!password || password.length < 4) {
            keyPasswordError.textContent = "La contraseña debe tener al menos 4 caracteres.";
            keyPasswordError.style.display = "block";
            return;
        }
        keyPasswordError.style.display = "none";
        keyPasswordModal.style.display = "none";
        if (typeof onPasswordSubmit === "function") {
            onPasswordSubmit(password);
        }
    };

    // Exponer función global para usar desde otros scripts
    window.showKeyPasswordModal = showKeyPasswordModal;
});