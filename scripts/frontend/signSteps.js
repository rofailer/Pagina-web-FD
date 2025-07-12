document.addEventListener("DOMContentLoaded", () => {
    // --- Variables de estado ---
    let currentStep = 1;
    let downloadUrl = null;
    let selectedKeyId = null;
    let userKeys = [];

    // --- Elementos de pasos y barra de progreso ---
    const steps = [
        document.getElementById("signStep1"),
        document.getElementById("signStep2"),
        document.getElementById("signStep3"),
    ];
    const indicatorSteps = document.querySelectorAll("#signStepIndicator .step");

    // --- Utilidad para mostrar el paso currente con animaciones ---
    function showStep(step) {
        // Actualizar contenido de pasos
        steps.forEach((div, i) => {
            if (i === step - 1) {
                div.style.display = "";
                // Agregar animación de entrada
                setTimeout(() => {
                    div.style.animation = "fadeInUp 0.5s ease";
                }, 50);
            } else {
                div.style.display = "none";
            }
        });

        // Actualizar indicadores de progreso
        indicatorSteps.forEach((el, i) => {
            el.classList.remove("active", "completed");
            if (i < step - 1) {
                el.classList.add("completed");
            } else if (i === step - 1) {
                el.classList.add("active");
            }
        });

        // Actualizar línea de progreso
        updateProgressLine(step);

        currentStep = step;

        // Configurar elementos específicos del paso 2
        if (step === 2) {
            document.getElementById("signDocumentButton").style.display = "none";
            document.getElementById("signLoading").style.display = "none";
            // Cargar llaves del usuario
            loadUserKeys();
        }
    }

    // --- Función para actualizar la línea de progreso ---
    function updateProgressLine(step) {
        const progressPercentage = ((step - 1) / 2) * 100;
        const stepIndicator = document.getElementById("signStepIndicator");

        if (stepIndicator) {
            stepIndicator.style.setProperty('--progress', `${progressPercentage}%`);
        }
    }    // --- Paso 1: Seleccionar y aceptar documento ---
    document.getElementById("acceptDocumentBtn").onclick = () => {
        const fileInput = document.getElementById("fileInput");
        const label = fileInput.nextElementSibling;

        if (!fileInput.files.length) {
            label.classList.add('error');
            label.classList.remove('has-file');
            showNotification("Selecciona un archivo PDF primero.", "warning");
            return;
        }

        const file = fileInput.files[0];
        if (file.type !== 'application/pdf') {
            label.classList.add('error');
            showNotification("El archivo debe ser un PDF.", "error");
            return;
        }

        // Marcar proceso en curso
        window.firmaEnCurso = true;

        // Animación de éxito en el paso 1
        label.classList.remove('error');
        showNotification("Documento aceptado correctamente", "success");

        setTimeout(() => {
            showStep(2);
        }, 300);
    };

    // --- Paso 2: Firmar documento ---
    document.getElementById("signDocumentButton").onclick = () => {
        const token = localStorage.getItem("token");
        if (!token) {
            if (window.showLoginModal) window.showLoginModal();
            else showNotification("Debes iniciar sesión para firmar documentos.", "error");
            return;
        }

        if (!selectedKeyId) {
            showNotification("Selecciona una llave para firmar el documento.", "warning");
            return;
        }

        window.showKeyPasswordModal(async (keyPassword) => {
            // Mostrar loading con animación
            document.getElementById("signDocumentButton").style.display = "none";
            const loadingEl = document.getElementById("signLoading");
            loadingEl.style.display = "";
            loadingEl.style.animation = "fadeInDown 0.3s ease";

            const fileInput = document.getElementById("fileInput");
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append("document", file);
            formData.append("keyPassword", keyPassword);
            formData.append("keyId", selectedKeyId); // Agregar ID de la llave seleccionada

            setTimeout(async () => {
                try {
                    const response = await fetch("/sign-document", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                        body: formData,
                    });

                    if (response.ok) {
                        const data = await response.json();
                        downloadUrl = data.downloadUrl;
                        document.getElementById("signLoading").style.display = "none";
                        showNotification("¡Documento firmado exitosamente!", "success");
                        setTimeout(() => {
                            showStep(3);
                            document.getElementById("restartSignProcessBtn").style.display = "none";
                        }, 500);
                        window.firmaEnCurso = false; // Proceso terminado
                    } else {
                        document.getElementById("signLoading").style.display = "none";
                        const error = await response.json();
                        showNotification(`${error.error || "Error al firmar el documento"}`, "error");
                        if (response.status === 401 || response.status === 403) {
                            if (window.showLoginModal) window.showLoginModal();
                            localStorage.removeItem("token");
                        }
                        setTimeout(() => {
                            showStep(1);
                        }, 2000);
                        window.firmaEnCurso = false;
                    }
                } catch (err) {
                    document.getElementById("signLoading").style.display = "none";
                    showNotification("Error al firmar el documento.", "error");
                    setTimeout(() => {
                        showStep(1);
                    }, 2000);
                    window.firmaEnCurso = false;
                }
            }, 1200);
        });
    };

    // --- Paso 3: Descargar documento firmado y volver a empezar ---
    document.getElementById("downloadSignedBtn").onclick = async () => {
        if (!downloadUrl) {
            showNotification("No hay documento para descargar.", "error");
            return;
        }

        try {
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "documento_avalado.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            showNotification("¡Documento descargado correctamente!", "success");
            setTimeout(() => {
                document.getElementById("restartSignProcessBtn").style.display = "inline-block";
            }, 1000);
        } catch (err) {
            showNotification("Error al descargar el documento.", "error");
        }
    };    // --- Función para limpiar formularios ---
    function limpiarFormulariosFirmar() {
        document.getElementById("signForm").reset();
        const fileInput = document.getElementById("fileInput");
        if (fileInput) {
            fileInput.value = "";
            updateFileInputDisplay(fileInput);
        }
        document.getElementById("signDocumentButton").style.display = "none";
        document.getElementById("signLoading").style.display = "none";

        // Reset variables
        downloadUrl = null;
        selectedKeyId = null;
        userKeys = [];
        window.firmaEnCurso = false;

        showNotification("Proceso reiniciado", "info");
        setTimeout(() => {
            showStep(1);
        }, 300);
    }

    // --- Función para mostrar notificaciones ---
    function showNotification(message, type = "info") {
        // Remover notificación anterior si existe
        const existingNotification = document.querySelector('.step-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `step-notification ${type}`;
        notification.textContent = message;

        // Estilos básicos para la notificación
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Colores según el tipo
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        notification.style.background = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }

    // --- Función para cargar llaves del usuario ---
    async function loadUserKeys() {
        const keysListContainer = document.getElementById("keysList");
        const token = localStorage.getItem("token");

        if (!token) {
            keysListContainer.innerHTML = `
                <div class="no-keys-message">
                    <p>Debes iniciar sesión para ver tus llaves.</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch('/api/user-keys', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                userKeys = data.keys || [];
                displayKeys(userKeys);
            } else {
                throw new Error('Error al cargar las llaves');
            }
        } catch (error) {
            console.error('Error cargando llaves:', error);
            keysListContainer.innerHTML = `
                <div class="no-keys-message">
                    <p>Error al cargar las llaves. <a href="#perfil" onclick="navigateToProfile()">Ir al perfil</a> para crear llaves.</p>
                </div>
            `;
        }
    }    // --- Función para mostrar las llaves ---
    function displayKeys(keys) {
        const keysListContainer = document.getElementById("keysList");

        if (!keys || keys.length === 0) {
            keysListContainer.innerHTML = `
                <div class="no-keys-message">
                    <p>No tienes llaves de firma disponibles.</p>
                    <p><a href="#perfil" onclick="navigateToProfile()">Ir al perfil</a> para crear llaves.</p>
                </div>
            `;
            return;
        }

        const keysHTML = keys.map(key => {
            const expDate = new Date(key.expiration_date);
            const isExpired = expDate <= new Date();
            const expStatus = isExpired ? 'Expirada' : `Expira: ${expDate.toLocaleDateString()}`;
            const expClass = isExpired ? 'expired' : 'valid';

            return `
                <div class="key-item ${isExpired ? 'disabled' : ''}" data-key-id="${key.id}" ${!isExpired ? `onclick="selectKey(${key.id})"` : ''}>
                    <div class="key-name">${key.key_name || `Llave ${key.id}`}</div>
                    <div class="key-algorithm">Cifrado: ${key.encryption_type || 'aes-256-cbc'}</div>
                    <div class="key-created">Creada: ${new Date(key.created_at).toLocaleDateString()}</div>
                    <div class="key-expiration ${expClass}">${expStatus}</div>
                    ${isExpired ? '<div class="key-expired-label">EXPIRADA</div>' : ''}
                </div>
            `;
        }).join('');

        keysListContainer.innerHTML = keysHTML;
    }

    // --- Función para seleccionar una llave ---
    window.selectKey = function (keyId) {
        // Remover selección anterior
        document.querySelectorAll('.key-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Seleccionar nueva llave
        const selectedItem = document.querySelector(`[data-key-id="${keyId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            selectedKeyId = keyId;

            // Marcar proceso más avanzado en curso
            window.firmaEnCurso = true;

            // Mostrar botón de firmar
            document.getElementById("signDocumentButton").style.display = "";
            showNotification("Llave seleccionada correctamente", "success");
        }
    };

    // --- Función para navegar al perfil ---
    window.navigateToProfile = function () {
        if (window.showSection) {
            window.showSection('perfil');
        } else {
            window.location.href = '#perfil';
        }
    };

    // --- Event listeners ---
    document.getElementById("restartSignProcessBtn").onclick = limpiarFormulariosFirmar;

    // File input listener
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            updateFileInputDisplay(this);
        });
    }

    // --- Estado inicial ---
    showStep(1);    // --- Función para actualizar la visualización del file input ---
    function updateFileInputDisplay(input) {
        const label = input.nextElementSibling;
        const textSpan = label.querySelector('.file-input-text');
        const iconSpan = label.querySelector('.file-input-icon');

        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            textSpan.textContent = file.name;
            iconSpan.textContent = '✓';
            label.classList.add('has-file');
            label.classList.remove('error');

            // Marcar proceso en curso tan pronto como se selecciona un archivo
            window.firmaEnCurso = true;
        } else {
            textSpan.textContent = 'Ningún archivo seleccionado';
            iconSpan.textContent = '📄';
            label.classList.remove('has-file', 'error');

            // Si no hay archivo, verificar si debemos limpiar el estado
            // Solo limpiamos si estamos en el paso 1 y no hay archivos
            if (currentStep === 1) {
                window.firmaEnCurso = false;
            }
        }
    }

    // Hacer la función global para frontend.js
    window.limpiarFormulariosFirmar = limpiarFormulariosFirmar;
    window.updateFileInputDisplay = updateFileInputDisplay;
});

// Variables globales
window.firmaEnCurso = false;
window.verificacionEnCurso = false;