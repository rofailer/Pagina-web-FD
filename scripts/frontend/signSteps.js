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

    // --- Utilidad para mostrar el paso actual con// Variables globales
    window.firmaEnCurso = false;
    window.verificacionEnCurso = false; function showStep(step) {
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

    // --- Función para validar archivo antes de envío ---
    function validateFileForUpload(file) {
        if (!file) {
            showNotification("No se ha seleccionado ningún archivo.", "error");
            return false;
        }

        if (file.type !== 'application/pdf') {
            showNotification("El archivo debe ser un PDF.", "error");
            return false;
        }

        // Verificar si el archivo ha sido modificado
        const lastModified = file.lastModified;
        const fileSize = file.size;

        // Almacenar información del archivo para verificación posterior
        window.currentFileInfo = {
            lastModified,
            size: fileSize,
            name: file.name
        };

        return true;
    }

    // --- Función para verificar si el archivo cambió ---
    function hasFileChanged(file) {
        if (!window.currentFileInfo || !file) return true;

        return file.lastModified !== window.currentFileInfo.lastModified ||
            file.size !== window.currentFileInfo.size ||
            file.name !== window.currentFileInfo.name;
    }

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
            const fileInput = document.getElementById("fileInput");
            const file = fileInput.files[0];

            // Validar archivo antes de proceder
            if (!validateFileForUpload(file)) {
                return;
            }

            // Verificar si el archivo cambió desde la selección inicial
            if (hasFileChanged(file)) {
                showNotification("El archivo ha sido modificado. Por favor, selecciona nuevamente el archivo.", "error");
                // Limpiar el input y volver al paso 1
                fileInput.value = "";
                updateFileInputDisplay(fileInput);
                showStep(1);
                return;
            }

            // Mostrar loading con animación
            document.getElementById("signDocumentButton").style.display = "none";
            const loadingEl = document.getElementById("signLoading");
            loadingEl.style.display = "";
            loadingEl.style.animation = "fadeInDown 0.3s ease";

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
    function limpiarFormulariosFirmar(showNotificationFlag = true) {
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

        // Solo mostrar notificación si se especifica explícitamente
        if (showNotificationFlag) {
            showNotification("Proceso reiniciado", "info");
        }
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

        if (!keysListContainer) {
            console.error("❌ No se encontró el contenedor keysList");
            return;
        }

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
            const response = await fetch('/list-keys', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const keys = await response.json();
                userKeys = keys || [];
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

        if (!keysListContainer) {
            console.error("❌ No se encontró el contenedor keysList");
            return;
        }

        if (!keys || keys.length === 0) {
            keysListContainer.innerHTML = `
                <div class="no-keys-message">
                    <p>No tienes llaves de firma disponibles.</p>
                    <p><a href="#perfil" onclick="navigateToProfile()">Ir al perfil</a> para crear llaves.</p>
                </div>
            `;
            return;
        }

        // Obtener la llave activa actual
        let activeKeyId = null;
        fetch('/active-key', {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then(response => response.json())
            .then(data => {
                if (data.activeKey) {
                    // Buscar el ID de la llave activa por nombre
                    const activeKey = keys.find(key => key.key_name === data.activeKey);
                    if (activeKey) {
                        activeKeyId = activeKey.id;
                        selectedKeyId = activeKeyId; // Establecer automáticamente
                    }
                }

                renderKeysList();
            })
            .catch(() => renderKeysList());

        function renderKeysList() {
            const keysHTML = keys.map(key => {
                const expDate = new Date(key.expiration_date);
                const isExpired = expDate <= new Date();
                const expStatus = isExpired ? 'Expirada' : `Expira: ${expDate.toLocaleDateString()}`;
                const expClass = isExpired ? 'expired' : 'valid';
                const isSelected = activeKeyId === key.id;

                return `
                    <div class="key-item ${isExpired ? 'disabled' : ''} ${isSelected ? 'selected' : ''}" data-key-id="${key.id}">
                        <div class="key-info">
                            <div class="key-name">${key.key_name || `Llave ${key.id}`} ${isSelected ? '<span class="key-active-label">ACTIVA</span>' : ''}</div>
                            <div class="key-algorithm">Cifrado: ${key.encryption_type || 'aes-256-cbc'}</div>
                            <div class="key-expiration ${expClass}">${expStatus}</div>
                        </div>
                    </div>
                `;
            }).join('');

            keysListContainer.innerHTML = keysHTML;

            // Agregar event listeners después de crear el HTML
            attachKeyClickListeners();

            // Si hay una llave activa, mostrar el botón de firmar
            if (activeKeyId) {
                const signButton = document.getElementById("signDocumentButton");
                if (signButton) {
                    signButton.style.display = "";
                }
            }
        }
    }

    // --- Función para agregar event listeners a las llaves ---
    function attachKeyClickListeners() {
        const keyItems = document.querySelectorAll('.key-item:not(.disabled)');

        keyItems.forEach(item => {
            const keyId = item.getAttribute('data-key-id');

            item.addEventListener('click', function (e) {
                e.preventDefault();
                console.log("🖱️ Click en llave:", keyId);
                if (keyId) {
                    selectKey(parseInt(keyId));
                }
            });

            // Agregar cursor pointer para mejor UX
            item.style.cursor = 'pointer';
        });

        console.log("🔗 Event listeners agregados a", keyItems.length, "llaves");
    }

    // --- Función CENTRALIZADA para seleccionar una llave ---
    window.selectKey = async function (keyId) {
        console.log("🔑 Seleccionando llave ID:", keyId);

        try {
            // Llamar al backend para establecer la llave activa
            const response = await fetch('/select-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ keyId })
            });

            const data = await response.json();
            if (data.success) {
                // Actualizar la selección visual en la sección de firmar
                updateKeySelection(keyId);

                // Establecer la llave seleccionada
                selectedKeyId = keyId;

                // Solo marcar proceso en curso si estamos en la sección de firmar
                const currentSection = window.location.hash.replace("#", "") || "inicio";
                if (currentSection === "firmar") {
                    // Marcar proceso más avanzado en curso
                    window.firmaEnCurso = true;
                }

                // Mostrar botón de firmar
                const signButton = document.getElementById("signDocumentButton");
                if (signButton) {
                    signButton.style.display = "";
                }

                showNotification(`Llave "${data.activeKeyName}" seleccionada correctamente`, "success");

                // También actualizar la sección de perfil si las funciones existen
                if (window.loadKeys) {
                    setTimeout(() => window.loadKeys(), 100);
                }
                if (window.loadActiveKey) {
                    setTimeout(() => window.loadActiveKey(), 100);
                }
            } else {
                showNotification(data.error || "Error al seleccionar la llave", "error");
            }
        } catch (err) {
            console.error('Error al seleccionar la llave:', err);
            showNotification("Error al seleccionar la llave", "error");
        }
    };

    // --- Función para refrescar llaves desde otras secciones ---
    window.refreshSignKeys = function () {
        console.log("🔄 Refrescando llaves en sección de firmar...");
        if (currentStep === 2) {
            loadUserKeys();
        }
    };

    // --- Función para actualizar la selección visual ---
    function updateKeySelection(keyId) {
        console.log("🎨 Actualizando selección visual para llave:", keyId);

        // Remover selección anterior de todos los elementos
        const allKeyItems = document.querySelectorAll('.key-item');
        allKeyItems.forEach(item => {
            item.classList.remove('selected');
            console.log("Removiendo 'selected' de:", item.getAttribute('data-key-id'));
        });

        // Seleccionar nueva llave
        const selectedItem = document.querySelector(`[data-key-id="${keyId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            console.log("✅ Agregando 'selected' a llave:", keyId);

            // Agregar efecto visual adicional
            selectedItem.style.transform = 'scale(1.02)';
            setTimeout(() => {
                selectedItem.style.transform = '';
            }, 200);
        } else {
            console.error("❌ No se encontró el elemento con data-key-id:", keyId);
        }
    }

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

    // --- Botón para ir a verificar después de firmar ---
    document.getElementById("goToVerifyBtn").onclick = () => {
        if (window.showSection) {
            window.showSection('verificar');
        } else {
            // Fallback si showSection no está disponible
            window.location.href = '#verificar';
        }
    };

    // File input listener
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            updateFileInputDisplay(this);
        });
    }

    // --- Estado inicial ---
    showStep(1);

    // Cargar llaves al inicializar
    loadUserKeys();    // --- Función para actualizar la visualización del file input ---
    function updateFileInputDisplay(input) {
        const label = input.nextElementSibling;
        const textSpan = label.querySelector('.file-input-text');
        const iconSpan = label.querySelector('.file-input-icon');

        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            // Validar y almacenar información del archivo
            if (validateFileForUpload(file)) {
                textSpan.textContent = file.name;
                iconSpan.textContent = '✓';
                label.classList.add('has-file');
                label.classList.remove('error');

                // Marcar proceso en curso tan pronto como se selecciona un archivo válido
                window.firmaEnCurso = true;
            } else {
                // Archivo inválido, limpiar
                input.value = "";
                textSpan.textContent = 'Archivo inválido seleccionado';
                iconSpan.textContent = '❌';
                label.classList.add('error');
                label.classList.remove('has-file');
                window.firmaEnCurso = false;
            }
        } else {
            textSpan.textContent = 'Ningún archivo seleccionado';
            iconSpan.textContent = '📄';
            label.classList.remove('has-file', 'error');

            // Si no hay archivo, verificar si debemos limpiar el estado
            // Solo limpiamos si estamos en el paso 1 y no hay archivos
            if (currentStep === 1) {
                window.firmaEnCurso = false;
                window.currentFileInfo = null; // Limpiar información del archivo
            }
        }
    }

    // Hacer la función global para frontend.js
    window.limpiarFormulariosFirmar = limpiarFormulariosFirmar;
    window.updateFileInputDisplay = updateFileInputDisplay;
    window.loadUserKeys = loadUserKeys;
});

// Variables globales
window.firmaEnCurso = false;
window.verificacionEnCurso = false;    // --- Botón para ir a verificar después de firmar ---
document.getElementById("goToVerifyBtn").onclick = () => {
    if (window.showSection) {
        window.showSection('verificar');
        // Iniciar verificación directa sin seleccionar profesor
        setTimeout(() => {
            if (window.startVerificationWithoutProfessor) {
                window.startVerificationWithoutProfessor();
                showNotification("� Listo para verificar tu documento", "success");
            }
        }, 200);
    } else {
        // Fallback si showSection no está disponible
        window.location.href = '#verificar';
    }
};