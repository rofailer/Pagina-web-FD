document.addEventListener("DOMContentLoaded", () => {
    // Sistema anterior (compatibilidad)
    const select = document.getElementById("encryptionTypeSelect");
    const btn = document.getElementById("confirmEncryptionTypeBtn");
    const msg = document.getElementById("encryptionTypeMsg");

    // Nuevo sistema de opciones de cifrado
    const encryptionOptions = document.querySelectorAll('.encryption-option');
    const currentEncryptionDisplay = document.getElementById('currentEncryption');

    // Cargar selección previa
    const savedType = localStorage.getItem("encryptionType") || "aes-256-cbc";

    // Configurar sistema anterior si existe
    if (select) {
        select.value = savedType;
    }

    // Configurar nuevo sistema
    if (encryptionOptions.length > 0) {
        encryptionOptions.forEach(option => {
            if (option.dataset.encryption === savedType) {
                encryptionOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }

            // Agregar event listener para selección
            option.addEventListener('click', () => {
                encryptionOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        if (currentEncryptionDisplay) {
            currentEncryptionDisplay.textContent = savedType.toUpperCase();
        }
    }

    // Event listener para sistema anterior
    if (btn) {
        btn.addEventListener("click", () => {
            // Obtener tipo seleccionado del nuevo sistema o del anterior
            let selectedType = savedType;

            if (encryptionOptions.length > 0) {
                const selectedOption = document.querySelector('.encryption-option.selected');
                if (selectedOption) {
                    selectedType = selectedOption.dataset.encryption;
                }
            } else if (select) {
                selectedType = select.value;
            }

            localStorage.setItem("encryptionType", selectedType);

            if (msg) {
                msg.textContent = "Configuración guardada correctamente";
                msg.classList.add("show");

                // Ocultar el mensaje después de 3 segundos
                setTimeout(() => {
                    msg.classList.remove("show");
                }, 3000);
            }

            // Actualizar display del nuevo sistema si existe
            if (currentEncryptionDisplay) {
                currentEncryptionDisplay.textContent = selectedType.toUpperCase();
            }

            // Mostrar notificación
            if (typeof showNotification === 'function') {
                showNotification('Configuración de cifrado actualizada', 'success');
            }
        });
    }
});