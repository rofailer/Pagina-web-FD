document.addEventListener("DOMContentLoaded", async () => {
    // --- Variables de estado ---
    let currentStep = 1;
    let downloadUrl = null;
    let selectedKeyId = null;
    let userKeys = [];

    // --- Variables para firma electrónica ---
    let signatureCanvas = null;
    let signatureCtx = null;
    let isDrawing = false;
    let hasSignature = false;
    let signatureData = null;
    let signatureMethod = 'draw'; // 'draw' o 'upload'

    // --- Variables para gestión de autores ---
    let documentAuthors = [''];
    const maxAuthors = 3;

    // --- Cargar configuración global ---
    try {
        const configResponse = await fetch('/api/global-template-config');
        if (configResponse.ok) {
            window.globalTemplateConfig = await configResponse.json();
        }
    } catch (error) {
        console.warn('Warning: No se pudo cargar la configuración global:', error);
    }

    // --- Elementos de pasos y barra de progreso ---
    const steps = [
        document.getElementById("signStep1"),
        document.getElementById("signStep2"),
        document.getElementById("signStep3"),
        document.getElementById("signStep4"),
    ];
    const indicatorSteps = document.querySelectorAll("#signStepIndicator .step");

    // --- FUNCIONES PARA FILE INPUTS MODERNOS ---
    function setupFileInput(inputId, fileInfoId) {
        const fileInput = document.getElementById(inputId);
        if (!fileInput) return;

        const fileInputContainer = fileInput.closest('.file-input-container');
        if (!fileInputContainer) return;

        const fileDisplay = fileInputContainer.querySelector('.file-input-display');
        const fileInfo = document.getElementById(fileInfoId);

        if (!fileDisplay || !fileInfo) return;

        // Eventos de drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDisplay.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            fileDisplay.addEventListener(eventName, () => {
                fileDisplay.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileDisplay.addEventListener(eventName, () => {
                fileDisplay.classList.remove('dragover');
            }, false);
        });

        fileDisplay.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelection(fileInput, fileInfo);
            }
        });

        // Evento de selección de archivo
        fileInput.addEventListener('change', () => {
            handleFileSelection(fileInput, fileInfo);
        });

        // Configurar botón de remover archivo
        const removeBtn = fileInfo.querySelector('.file-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                clearFileSelection(fileInput, fileInfo);
            });
        }
    }

    function handleFileSelection(fileInput, fileInfo) {
        const file = fileInput.files[0];
        if (!file) {
            clearFileSelection(fileInput, fileInfo);
            validateSignForm(); // Validar después de limpiar
            validateDocumentStep(); // Validar después de limpiar
            return;
        }

        // Validar tipo de archivo
        if (file.type !== 'application/pdf') {
            showNotification("El archivo debe ser un PDF.", "error");
            clearFileSelection(fileInput, fileInfo);
            validateSignForm(); // Validar después de limpiar
            validateDocumentStep(); // Validar después de limpiar
            return;
        }

        // Mostrar información del archivo
        const fileName = fileInfo.querySelector('.file-name');
        const fileSize = fileInfo.querySelector('.file-size');

        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);

        fileInfo.classList.add('show');
        fileInfo.style.display = 'flex';

        // Validar formulario después de seleccionar archivo
        validateSignForm();
        validateDocumentStep();
    }

    function clearFileSelection(fileInput, fileInfo) {
        fileInput.value = '';
        fileInfo.classList.remove('show');
        fileInfo.style.display = 'none';

        // Validar formulario después de limpiar archivo
        validateSignForm();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Inicializar file inputs
    setupFileInput('fileInput', 'signFileInfo');

    // --- FUNCIONES DE GESTIÓN DE AUTORES ---
    function initializeDocumentAuthors() {
        updateDocumentAuthorsDisplay();
        setupAuthorEvents();
    }

    function updateDocumentAuthorsDisplay() {
        const container = document.getElementById('documentAuthorsContainer');
        if (!container) return;

        container.innerHTML = '';

        documentAuthors.forEach((author, index) => {
            const authorGroup = document.createElement('div');
            authorGroup.className = 'author-field-group';

            const isFirst = index === 0;
            const containerClass = isFirst ? 'author-input-container-with-add' : 'author-input-container';

            authorGroup.innerHTML = `
                <div class="author-field-header">
                    <span class="author-number">Autor ${index + 1}</span>
                    <span class="${index === 0 ? 'author-required' : 'author-optional'}">
                        ${index === 0 ? 'Obligatorio' : 'Opcional'}
                    </span>
                </div>
                <div class="${containerClass}">
                    <input 
                        type="text" 
                        class="author-input" 
                        data-index="${index}"
                        placeholder="Nombre completo del autor"
                        value="${author}"
                        required="${index === 0 ? 'true' : 'false'}"
                    >
                    ${isFirst ? `
                        <button type="button" class="add-author-btn-inline" id="addDocumentAuthorBtn" onclick="addDocumentAuthor()" ${documentAuthors.length >= maxAuthors ? 'disabled' : ''}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                        <span class="authors-count-text">${documentAuthors.length}/${maxAuthors}</span>
                    ` : `
                        <button type="button" class="remove-author-btn" onclick="removeDocumentAuthor(${index})">
                            ×
                        </button>
                    `}
                </div>
            `;

            container.appendChild(authorGroup);

            // Agregar event listener al input para validación
            const input = authorGroup.querySelector('.author-input');
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                documentAuthors[idx] = e.target.value;
                validateSignForm();
            });
        });

        updateDocumentAuthorsCount();
        updateAddDocumentAuthorButton();
    }

    function addDocumentAuthor() {
        if (documentAuthors.length < maxAuthors) {
            documentAuthors.push('');
            updateDocumentAuthorsDisplay();
            validateSignForm();
        }
    }

    function removeDocumentAuthor(index) {
        if (documentAuthors.length > 1) {
            documentAuthors.splice(index, 1);
            updateDocumentAuthorsDisplay();
            validateSignForm();
        }
    }

    function updateDocumentAuthorsCount() {
        const countElement = document.getElementById('documentAuthorsCount');
        if (countElement) {
            countElement.textContent = `${documentAuthors.length}/${maxAuthors} autores`;
        }
    }

    function updateAddDocumentAuthorButton() {
        const addBtn = document.getElementById('addDocumentAuthorBtn');
        const countText = document.querySelector('.authors-count-text');

        if (addBtn) {
            addBtn.disabled = documentAuthors.length >= maxAuthors;
            addBtn.style.display = documentAuthors.length >= maxAuthors ? 'none' : 'flex';
        }

        if (countText) {
            countText.textContent = `${documentAuthors.length}/${maxAuthors}`;
        }
    }

    function setupAuthorEvents() {
        // Los event listeners se configuran dinámicamente en updateDocumentAuthorsDisplay()
        // Solo necesitamos validar el estado inicial
        setTimeout(() => {
            validateDocumentStep();
        }, 100);
    }

    // Funciones globales para ser llamadas desde HTML
    window.removeDocumentAuthor = removeDocumentAuthor;

    // Función global para limpiar archivo
    window.clearSignFile = function () {
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('signFileInfo');

        if (fileInput) {
            fileInput.value = '';
        }

        if (fileInfo) {
            fileInfo.style.display = 'none';
        }

        validateSignForm();
    };

    // --- FUNCIONES DE VALIDACIÓN ---
    function validateSignForm() {
        // Usar la nueva función de validación unificada
        validateDocumentStep();
    }

    function validateSignButtonState() {
        const signButton = document.getElementById("signDocumentButton");
        if (!signButton) return;

        const hasSelectedKey = selectedKeyId !== null && selectedKeyId !== undefined;

        if (hasSelectedKey) {
            signButton.disabled = false;
            signButton.classList.remove('disabled');
            signButton.style.display = "";
        } else {
            signButton.disabled = true;
            signButton.classList.add('disabled');
            signButton.style.display = "none";
        }
    }

    function validateDocumentStep() {
        const acceptBtn = document.getElementById('acceptDocumentBtn');
        if (!acceptBtn) return;

        // Verificar que hay un archivo PDF
        const fileInput = document.getElementById('fileInput');
        const hasFile = fileInput && fileInput.files.length > 0 && fileInput.files[0].type === 'application/pdf';

        // Verificar que el título esté lleno
        const docTitle = document.getElementById('docTitle');
        const hasTitle = docTitle && docTitle.value.trim() !== '';

        // Verificar que al menos el primer autor esté lleno (usando el sistema de documentAuthors)
        const hasAuthor = documentAuthors && documentAuthors.length > 0 && documentAuthors[0].trim() !== '';

        // El botón se habilita solo si hay archivo PDF Y título Y autor
        const isValid = hasFile && hasTitle && hasAuthor;

        acceptBtn.disabled = !isValid;
    }

    // --- EVENTOS DE VALIDACIÓN ---
    function setupFormValidation() {
        const fileInput = document.getElementById("fileInput");
        const docTitle = document.getElementById("docTitle");
        const docAuthors = document.getElementById("docAuthors");

        if (fileInput) {
            fileInput.addEventListener('change', validateSignForm);
        }
        if (docTitle) {
            docTitle.addEventListener('input', validateSignForm);
        }
        if (docAuthors) {
            docAuthors.addEventListener('input', validateSignForm);
        }

        // Validación inicial
        setTimeout(validateSignForm, 100);
    }

    // Configurar validación del formulario
    setupFormValidation();

    // Inicializar gestión de autores
    initializeDocumentAuthors();

    // --- Variables globales ---
    window.firmaEnCurso = false;
    window.verificacionEnCurso = false;

    // --- Utilidad para mostrar el paso actual ---
    function showStep(step) {
        // Actualizar contenido de pasos
        steps.forEach((div, i) => {
            if (i === step - 1) {
                div.style.display = "";
                // Para el paso 4, forzar display flex
                if (step === 4) {
                    div.style.display = "flex";
                }
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

        // Configurar elementos específicos del paso 4
        if (step === 4) {
            // Asegurar que el paso 4 sea visible
            const step4Element = document.getElementById("signStep4");
            if (step4Element) {
                step4Element.style.display = "flex";
            }
        }

        // Configurar elementos específicos del paso 2
        if (step === 2) {
            document.getElementById("signDocumentButton").style.display = "none";
            document.getElementById("signLoading").style.display = "none";
            // Cargar llaves del usuario
            loadUserKeys();
            // Validar estado del botón después de cargar llaves
            setTimeout(validateSignButtonState, 500);
        }

        // Configurar elementos específicos del paso 1
        if (step === 1) {
            // Inicializar gestión de autores al mostrar paso 1
            setTimeout(() => {
                initializeDocumentAuthors();
            }, 100);
        }

        // Configurar elementos específicos del paso 3 (Firma Electrónica)
        if (step === 3) {
            setupSignatureStepEvents();
            validateSignatureStep();
        }

        // Configurar elementos específicos del paso 4 (antes paso 3)
        if (step === 4) {
            // Configurar el botón de descarga correctamente
            setupDownloadButton();

            // Configurar otros botones del paso 4
            const goToVerifyBtn = document.getElementById('goToVerifyBtn');
            const restartBtn = document.getElementById('restartSignProcessBtn');

            if (goToVerifyBtn) {
                goToVerifyBtn.onclick = () => {
                    if (window.showSection) {
                        window.showSection('verificar');
                    } else {
                        // Fallback si showSection no está disponible
                        window.location.href = '#verificar';
                    }
                };
            }

            if (restartBtn) {
                restartBtn.onclick = () => {
                    limpiarFormulariosFirmar();
                    showStep(1);
                };
            }
        }
    }

    // --- Función para actualizar la línea de progreso ---
    function updateProgressLine(step) {
        const stepIndicator = document.getElementById("signStepIndicator");

        if (stepIndicator) {
            // Remover clases anteriores
            stepIndicator.classList.remove('step-1', 'step-2', 'step-3', 'step-4');

            // Agregar clase correspondiente al paso actual
            stepIndicator.classList.add(`step-${step}`);
        }
    }    // --- Paso 1: Seleccionar y aceptar documento ---
    document.getElementById("acceptDocumentBtn").onclick = () => {
        const fileInput = document.getElementById("fileInput");
        const fileInfo = document.getElementById("fileInfo");

        if (!fileInput.files.length) {
            showNotification("Selecciona un archivo PDF primero.", "warning");
            return;
        }

        const file = fileInput.files[0];
        if (file.type !== 'application/pdf') {
            showNotification("El archivo debe ser un PDF.", "error");
            return;
        }

        // Verificar que al menos el primer autor esté lleno
        if (!documentAuthors || documentAuthors.length === 0 || !documentAuthors[0].trim()) {
            showNotification("Debes especificar al menos un autor.", "warning");
            return;
        }

        // Marcar proceso en curso
        window.firmaEnCurso = true;

        // Mostrar notificación de éxito
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

    // --- Paso 2: Preparar documento para firma ---
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

        // Validar archivo antes de proceder
        const fileInput = document.getElementById("fileInput");
        const file = fileInput.files[0];
        if (!validateFileForUpload(file)) {
            return;
        }

        // Verificar si el archivo cambió desde la selección inicial
        if (hasFileChanged(file)) {
            showNotification("El archivo ha sido modificado. Por favor, selecciona nuevamente el archivo.", "error");
            const fileInfo = document.getElementById("fileInfo");
            if (fileInput && fileInfo) {
                clearFileSelection(fileInput, fileInfo);
            }
            showStep(1);
            return;
        }

        // Pedir contraseña de la llave antes de proceder
        if (typeof window.showKeyPasswordModal === 'function') {
            window.showKeyPasswordModal((keyPassword) => {
                // Preparar datos del documento con la contraseña
                const docTitle = document.getElementById('docTitle');
                const documentTitle = docTitle && docTitle.value.trim() ? docTitle.value.trim() : 'Documento';

                // Guardar datos temporalmente para uso posterior
                window.tempDocumentData = {
                    file: file,
                    titulo: documentTitle,
                    autores: documentAuthors.filter(author => author.trim()).join(', '),
                    keyId: selectedKeyId,
                    keyPassword: keyPassword, // ¡IMPORTANTE! Ahora incluimos la contraseña
                    template: window.getSelectedTemplate ? window.getSelectedTemplate() : 'clasico', // ✅ MODERNIZADO
                    institucion: window.globalTemplateConfig?.institutionName // Usar directamente la configuración global
                };

                showNotification("Documento preparado. Ahora agrega tu firma electrónica.", "info");
                showStep(3); // Ir directamente al paso de firma electrónica
            });
        } else {
            showNotification("Error: Sistema de contraseñas no disponible.", "error");
        }
    };

    // --- Paso 3: Descargar documento firmado y volver a empezar ---
    function setupDownloadButton() {
        const downloadBtn = document.getElementById("downloadSignedBtn");
        if (!downloadBtn) {
            return;
        }

        // Crear nueva función de descarga cada vez
        downloadBtn.onclick = async function () {
            if (!downloadUrl) {
                showNotification("No hay documento para descargar. Por favor, completa el proceso de firma primero.", "error");
                return;
            }

            // Cambiar texto del botón durante la descarga
            const originalText = this.innerHTML;
            this.innerHTML = 'Descargando...';
            this.disabled = true;

            try {
                // Construir URL completa si es necesario
                let fullUrl = downloadUrl;
                if (downloadUrl.startsWith('/')) {
                    fullUrl = window.location.origin + downloadUrl;
                }

                // Método alternativo: Usar fetch para descargar
                try {
                    const response = await fetch(fullUrl);

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const blob = await response.blob();

                    // Crear enlace para descarga
                    const link = document.createElement('a');
                    const url = window.URL.createObjectURL(blob);
                    link.href = url;

                    // Obtener el título del documento para el nombre del archivo
                    const docTitle = document.getElementById('docTitle');
                    const fileName = docTitle && docTitle.value.trim()
                        ? `${docTitle.value.trim()}_avalado.pdf`
                        : `documento_avalado_${Date.now()}.pdf`;

                    link.download = fileName;

                    // Ejecutar descarga
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Limpiar URL del blob
                    window.URL.revokeObjectURL(url);

                } catch (fetchError) {
                    // Fallback: método directo
                    const link = document.createElement('a');
                    link.href = fullUrl;

                    const docTitle = document.getElementById('docTitle');
                    const fileName = docTitle && docTitle.value.trim()
                        ? `${docTitle.value.trim()}_avalado.pdf`
                        : `documento_avalado_${Date.now()}.pdf`;

                    link.download = fileName;

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }

                showNotification("¡Descarga iniciada! Revisa tu carpeta de descargas.", "success");

                // Habilitar botón "Volver a intentarlo" después de descarga exitosa
                const restartBtn = document.getElementById("restartSignProcessBtn");
                if (restartBtn) {
                    restartBtn.style.display = "inline-block";
                }

            } catch (err) {
                showNotification(`Error al descargar el documento: ${err.message}`, "error");
            } finally {
                // Restaurar botón para permitir múltiples descargas
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 1500);
            }
        };
    }

    // Configurar el botón inmediatamente
    setupDownloadButton();

    // --- Función para limpiar formularios ---
    function limpiarFormulariosFirmar(showNotificationFlag = true, resetDownloadUrl = true) {
        // Limpiar formularios sin intentar descargar
        const signForm = document.getElementById("signForm");
        if (signForm) {
            signForm.reset();
        }

        const fileInput = document.getElementById("fileInput");
        const fileInfo = document.getElementById("signFileInfo");
        if (fileInput && fileInfo) {
            clearFileSelection(fileInput, fileInfo);
        }

        const signButton = document.getElementById("signDocumentButton");
        if (signButton) {
            signButton.style.display = "none";
            signButton.disabled = true;
            signButton.classList.add('disabled');
        }

        const signLoading = document.getElementById("signLoading");
        if (signLoading) {
            signLoading.style.display = "none";
        }

        // Limpiar datos de firma electrónica
        hasSignature = false;
        signatureData = null;
        signatureMethod = 'draw';

        // Limpiar canvas si existe
        if (signatureCtx && signatureCanvas) {
            signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
            showCanvasPlaceholder();
        }

        // Limpiar imagen de firma
        clearSignatureImage();

        // Reset variables
        if (resetDownloadUrl) {
            downloadUrl = null;
        }
        selectedKeyId = null;
        userKeys = [];

        // Reinicializar sistema de autores
        documentAuthors = [''];
        updateDocumentAuthorsDisplay();

        // Marcar proceso como no en curso
        window.firmaEnCurso = false;

        // Mostrar botón de "volver a intentar" solo al limpiar/resetear
        const restartBtn = document.getElementById("restartSignProcessBtn");
        if (restartBtn) {
            restartBtn.style.display = "inline-block";
        }

        // Solo mostrar notificación si se especifica explícitamente
        if (showNotificationFlag) {
            showNotification("Proceso reiniciado", "info");
        }

        setTimeout(() => {
            showStep(1);
        }, 300);
    }

    // --- Función para cargar llaves del usuario ---
    async function loadUserKeys() {
        try {
            // Método 1: Descarga directa (más simple)

            showNotification("¡Documento descargado correctamente!", "success");

            // Marcar proceso como completado - no mostrar más advertencias
            window.firmaEnCurso = false;

            setTimeout(() => {
                document.getElementById("restartSignProcessBtn").style.display = "inline-block";
            }, 1000);
        } catch (err) {
            showNotification(`Error al descargar el documento: ${err.message}`, "error");
        }

        // Aquí va el código real de limpiar formularios
        document.getElementById("signForm").reset();
        const fileInput = document.getElementById("fileInput");
        const fileInfo = document.getElementById("fileInfo");
        if (fileInput && fileInfo) {
            clearFileSelection(fileInput, fileInfo);
        }
        document.getElementById("signDocumentButton").style.display = "none";
        document.getElementById("signDocumentButton").disabled = true;
        document.getElementById("signDocumentButton").classList.add('disabled');
        document.getElementById("signLoading").style.display = "none";

        // Limpiar datos de firma electrónica
        hasSignature = false;
        signatureData = null;
        signatureMethod = 'draw';

        // Limpiar canvas si existe
        if (signatureCtx && signatureCanvas) {
            signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
            showCanvasPlaceholder();
        }

        // Limpiar imagen de firma
        clearSignatureImage();

        // Reset variables
        if (resetDownloadUrl) {
            downloadUrl = null;
        }
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

    // --- Función para cargar llaves del usuario ---
    async function loadUserKeys() {
        const keysListContainer = document.getElementById("keysList");

        if (!keysListContainer) {
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
                // Si hay error 401/403, limpiar token y mostrar mensaje
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("token");
                    keysListContainer.innerHTML = `
                        <div class="no-keys-message">
                            <p>Tu sesión ha expirado. Por favor, inicia sesión nuevamente.</p>
                        </div>
                    `;
                } else {
                    throw new Error('Error al cargar las llaves');
                }
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

            // Deshabilitar botón de firmar si no hay llaves
            const signButton = document.getElementById("signDocumentButton");
            if (signButton) {
                signButton.style.display = "none";
                signButton.disabled = true;
                signButton.classList.add('disabled');
            }

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
                    signButton.disabled = false;
                    signButton.classList.remove('disabled');
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
                if (keyId) {
                    selectKey(parseInt(keyId));
                }
            });

            // Agregar cursor pointer para mejor UX
            item.style.cursor = 'pointer';
        });

    }

    // --- Función CENTRALIZADA para seleccionar una llave ---
    window.selectKey = async function (keyId) {

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

                // Validar estado del botón de firmar
                validateSignButtonState();

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
                    signButton.disabled = false;
                    signButton.classList.remove('disabled');
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
        if (currentStep === 2) {
            loadUserKeys();
        }
    };

    // --- Función para actualizar la selección visual ---
    function updateKeySelection(keyId) {

        // Remover selección anterior de todos los elementos
        const allKeyItems = document.querySelectorAll('.key-item');
        allKeyItems.forEach(item => {
            item.classList.remove('selected');
        });

        // Seleccionar nueva llave
        const selectedItem = document.querySelector(`[data-key-id="${keyId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');

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

    // --- FUNCIONES DE NAVEGACIÓN CON CONFIRMACIÓN ---
    function shouldShowNavigationWarning() {
        // Mostrar advertencia si:
        // 1. El proceso de firma está en curso
        // 2. Estamos en pasos intermedios (paso 2 o 3) 
        // 3. NO mostrar si ya estamos en el paso 4 (descarga) para permitir múltiples descargas
        return window.firmaEnCurso && currentStep >= 2 && currentStep < 4;
    }

    function showNavigationConfirmModal(targetSection, callback) {
        if (!shouldShowNavigationWarning()) {
            callback();
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'navigation-confirm-modal';
        modal.innerHTML = `
            <div class="navigation-confirm-backdrop"></div>
            <div class="navigation-confirm-content">
                <div class="navigation-confirm-header">
                    <div class="navigation-confirm-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="m12 16.5.01 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h3>¿Abandonar proceso de firma?</h3>
                </div>
                <div class="navigation-confirm-body">
                    <p>Estás en proceso de firmar un documento. Si navegas a otra sección, perderás el progreso actual y tendrás que empezar de nuevo.</p>
                </div>
                <div class="navigation-confirm-actions">
                    <button class="btn-secondary cancel-navigation">Continuar firmando</button>
                    <button class="btn-primary confirm-navigation">Abandonar proceso</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        modal.querySelector('.cancel-navigation').onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        };

        modal.querySelector('.confirm-navigation').onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
            limpiarFormulariosFirmar();
            callback();
        };

        modal.onclick = (e) => {
            if (e.target === modal || e.target.classList.contains('navigation-confirm-backdrop')) {
                modal.querySelector('.cancel-navigation').click();
            }
        };
    }

    // =========================
    // FUNCIONES PARA FIRMA ELECTRÓNICA
    // =========================

    function initializeSignatureCanvas() {
        signatureCanvas = document.getElementById('signatureCanvas');
        if (!signatureCanvas) return;

        signatureCtx = signatureCanvas.getContext('2d');

        // Configurar canvas
        const rect = signatureCanvas.getBoundingClientRect();
        signatureCanvas.width = rect.width * 2; // Para mejor resolución
        signatureCanvas.height = rect.height * 2;
        signatureCtx.scale(2, 2);

        signatureCtx.strokeStyle = '#2563eb';
        signatureCtx.lineWidth = 2;
        signatureCtx.lineCap = 'round';
        signatureCtx.lineJoin = 'round';

        // Eventos de dibujo
        signatureCanvas.addEventListener('mousedown', startDrawing);
        signatureCanvas.addEventListener('mousemove', draw);
        signatureCanvas.addEventListener('mouseup', stopDrawing);
        signatureCanvas.addEventListener('mouseout', stopDrawing);

        // Eventos táctiles
        signatureCanvas.addEventListener('touchstart', handleTouch);
        signatureCanvas.addEventListener('touchmove', handleTouch);
        signatureCanvas.addEventListener('touchend', stopDrawing);

        function startDrawing(e) {
            isDrawing = true;
            const rect = signatureCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            signatureCtx.beginPath();
            signatureCtx.moveTo(x, y);
            hideCanvasPlaceholder();
        }

        function draw(e) {
            if (!isDrawing) return;

            const rect = signatureCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            signatureCtx.lineTo(x, y);
            signatureCtx.stroke();
            hasSignature = true;
            // Pequeño delay para asegurar que la validación se ejecute correctamente
            setTimeout(() => {
                validateSignatureStep();
            }, 10);
        }

        function stopDrawing() {
            if (isDrawing) {
                isDrawing = false;
                signatureCtx.beginPath();
                if (hasSignature) {
                    signatureData = signatureCanvas.toDataURL();
                    // Validar inmediatamente al terminar de dibujar
                    setTimeout(() => {
                        validateSignatureStep();
                    }, 50);
                }
            }
        }

        function handleTouch(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' :
                e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            signatureCanvas.dispatchEvent(mouseEvent);
        }
    }

    function hideCanvasPlaceholder() {
        const placeholder = document.getElementById('canvasPlaceholder');
        if (placeholder) {
            placeholder.style.opacity = '0';
        }
    }

    function showCanvasPlaceholder() {
        const placeholder = document.getElementById('canvasPlaceholder');
        if (placeholder) {
            placeholder.style.opacity = '1';
        }
    }

    function clearSignature() {
        if (!signatureCtx) return;

        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        hasSignature = false;
        signatureData = null;
        showCanvasPlaceholder();
        validateSignatureStep();
    }

    function setupSignatureMethodSelector() {
        const methodOptions = document.querySelectorAll('.method-option');
        const drawArea = document.getElementById('drawSignatureArea');
        const uploadArea = document.getElementById('uploadSignatureArea');

        methodOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remover clase active de todas las opciones
                methodOptions.forEach(opt => opt.classList.remove('active'));

                // Agregar clase active a la opción seleccionada
                option.classList.add('active');

                // Obtener método seleccionado
                signatureMethod = option.dataset.method;

                // Mostrar/ocultar áreas correspondientes
                if (signatureMethod === 'draw') {
                    drawArea.style.display = 'block';
                    uploadArea.style.display = 'none';
                    // Inicializar canvas si no está inicializado
                    if (!signatureCanvas) {
                        setTimeout(initializeSignatureCanvas, 100);
                    }
                } else {
                    drawArea.style.display = 'none';
                    uploadArea.style.display = 'block';
                }

                validateSignatureStep();
            });
        });
    }

    function setupSignatureImageUpload() {
        const imageInput = document.getElementById('signatureImageInput');
        const imageInfo = document.getElementById('signatureImageInfo');
        const imagePreview = document.getElementById('signatureImagePreview');

        if (!imageInput) return;

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validar que sea una imagen
            if (!file.type.startsWith('image/')) {
                showNotification('Por favor selecciona un archivo de imagen válido.', 'error');
                return;
            }

            // Mostrar preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                signatureData = e.target.result;
                hasSignature = true;
                imageInfo.style.display = 'block';
                // Pequeño delay para asegurar que la imagen se cargue correctamente
                setTimeout(() => {
                    validateSignatureStep();
                }, 100);
            };
            reader.readAsDataURL(file);
        });
    }

    function clearSignatureImage() {
        const imageInput = document.getElementById('signatureImageInput');
        const imageInfo = document.getElementById('signatureImageInfo');
        const imagePreview = document.getElementById('signatureImagePreview');

        if (imageInput) imageInput.value = '';
        if (imageInfo) imageInfo.style.display = 'none';
        if (imagePreview) imagePreview.src = '';

        hasSignature = false;
        signatureData = null;
        validateSignatureStep();
    }

    function validateSignatureStep() {
        const acceptBtn = document.getElementById('acceptSignatureBtn');

        if (!acceptBtn) return;

        const hasValidSignature = hasSignature && signatureData;

        acceptBtn.disabled = !hasValidSignature;
    }

    function setupSignatureStepEvents() {
        // Configurar selector de método
        setupSignatureMethodSelector();

        // Configurar subida de imagen
        setupSignatureImageUpload();

        // Configurar botón de limpiar
        const clearBtn = document.getElementById('clearSignature');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearSignature);
        }

        // Configurar botón de aceptar
        const acceptBtn = document.getElementById('acceptSignatureBtn');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', async () => {
                if (hasSignature && signatureData) {
                    // Procesar la firma electrónica
                    await processElectronicSignature();
                }
            });
        }

        // Inicializar canvas por defecto
        setTimeout(initializeSignatureCanvas, 100);
    }

    async function processElectronicSignature() {
        try {
            const acceptBtn = document.getElementById('acceptSignatureBtn');

            // Deshabilitar botón
            acceptBtn.disabled = true;
            acceptBtn.innerHTML = 'Procesando...';

            // Verificar que tenemos los datos necesarios del paso 2
            if (!tempDocumentData) {
                throw new Error('No se encontraron los datos del documento preparados. Por favor, vuelve al paso anterior.');
            }

            // Preparar FormData para envío al servidor
            const formData = new FormData();

            // Añadir archivo (necesario recrear el file desde tempDocumentData)
            formData.append('document', tempDocumentData.file);

            // Añadir contraseña de la llave
            formData.append('keyPassword', tempDocumentData.keyPassword);

            // Añadir datos del documento
            formData.append('titulo', tempDocumentData.titulo);
            formData.append('autores', tempDocumentData.autores);
            formData.append('institucion', tempDocumentData.institucion);

            // Añadir datos de la firma electrónica
            formData.append('signatureData', signatureData);
            formData.append('signatureMethod', signatureMethod);

            // Realizar petición al servidor para generar PDF final con firma
            const token = localStorage.getItem("token");
            const response = await fetch('/sign-document', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}` // Agregar token de autorización
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error en el servidor');
            }

            if (result.success && result.downloadUrl) {
                // Actualizar downloadUrl con el PDF que incluye la firma electrónica
                downloadUrl = result.downloadUrl;

                showNotification('¡Documento firmado digitalmente generado exitosamente!', 'success');

                setTimeout(() => {
                    showStep(4); // Ir al paso final de descarga
                }, 300);
            } else {
                throw new Error('No se recibió URL de descarga del servidor');
            }

        } catch (error) {
            console.error('Error al procesar firma electrónica:', error);
            showNotification(`Error al procesar la firma electrónica: ${error.message}`, 'error');

            // Restaurar botón
            const acceptBtn = document.getElementById('acceptSignatureBtn');
            acceptBtn.disabled = false;
            acceptBtn.innerHTML = `
                Continuar con firma
                <svg class="btn-icon-right" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 12h12M14 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        }
    }

    // Hacer funciones globales para acceso desde HTML
    window.clearSignatureImage = clearSignatureImage;

    // Hacer funciones globales para frontend.js
    window.shouldShowNavigationWarning = shouldShowNavigationWarning;
    window.showNavigationConfirmModal = showNavigationConfirmModal;

    // Función global para limpiar formularios cuando se sale de la sección firmar
    window.cleanSignFormsOnSectionExit = function (targetSection) {
        if (targetSection !== 'firmar' && window.firmaEnCurso && currentStep < 4) {
            window.firmaEnCurso = false;
            limpiarFormulariosFirmar(false, true); // Sin notificación, resetear downloadUrl
        } else if (targetSection !== 'firmar' && currentStep === 4) {
            window.firmaEnCurso = false;

        }
    };

    // --- Estado inicial ---
    showStep(1);

    // Cargar llaves al inicializar
    loadUserKeys();

    // Inicializar gestión de autores
    initializeDocumentAuthors();

    // Agregar event listener para el título del documento
    const docTitle = document.getElementById('docTitle');
    if (docTitle) {
        docTitle.addEventListener('input', () => {
            validateDocumentStep();
        });
    }

    // Hacer funciones globales
    window.limpiarFormulariosFirmar = limpiarFormulariosFirmar;
    window.loadUserKeys = loadUserKeys;
    window.addDocumentAuthor = addDocumentAuthor;
    window.validateDocumentStep = validateDocumentStep;
    window.removeDocumentAuthor = removeDocumentAuthor;

    // Variables globales
    window.firmaEnCurso = false;
});

// --- SISTEMA DE PLANTILLAS ---
document.addEventListener('DOMContentLoaded', function () {
    // Inicializar sistema de plantillas
    initTemplateSystem();

    function initTemplateSystem() {
        const templateCards = document.querySelectorAll('.template-card');
        let selectedTemplate = 'clasico'; // ✅ MODERNIZADO - Usar nombre directo

        templateCards.forEach(card => {
            card.addEventListener('click', function () {
                // Remover selección anterior
                templateCards.forEach(c => c.classList.remove('selected'));

                // Seleccionar nueva plantilla
                this.classList.add('selected');

                // ✅ MODERNIZADO - Usar directamente el nombre de la plantilla
                selectedTemplate = this.getAttribute('data-template');

                // Plantilla seleccionada: ${selectedTemplate}

                // Guardar selección
                localStorage.setItem('selectedTemplate', selectedTemplate);

                // Actualizar preview si existe
                updateTemplatePreview(selectedTemplate);
            });
        });

        // Seleccionar primera plantilla por defecto
        if (templateCards.length > 0) {
            templateCards[0].click();
        }
    }

    function updateTemplatePreview(templateId) {
        // Actualizar preview visual si existe
        const previewContainer = document.querySelector('.template-preview-container');
        if (previewContainer) {
            previewContainer.setAttribute('data-template', templateId);
        }
    }

    // Función para obtener plantilla seleccionada
    window.getSelectedTemplate = function () {
        return localStorage.getItem('selectedTemplate') || 'clasico'; // ✅ MODERNIZADO
    };
});

// --- MEJORAS DE DESCARGA ---
document.addEventListener('DOMContentLoaded', function () {
    improveDownloadExperience();
});

function improveDownloadExperience() {
    // Permitir múltiples descargas
    window.allowMultipleDownloads = true;

    // Función para mostrar selector de ubicación
    window.showDownloadLocationPicker = function (blob, filename) {
        // Crear enlace de descarga
        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = filename;

        // Mostrar modal de confirmación
        if (confirm(`¿Descargar ${filename}?`)) {
            downloadLink.click();

            // Limpiar URL después de un tiempo
            setTimeout(() => {
                URL.revokeObjectURL(downloadUrl);
            }, 1000);
        }
    };
}

// Función global para limpiar formularios cuando se hace logout
window.cleanSignFormsOnLogout = function () {

    // Limpiar variables de estado
    currentStep = 1;
    downloadUrl = null;
    selectedKeyId = null;
    userKeys = [];
    signatureData = null;
    hasSignature = false;
    documentAuthors = [''];
    window.firmaEnCurso = false;

    // Limpiar formularios
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
        // Limpiar display del archivo
        const fileDisplay = fileInput.closest('.file-input-container')?.querySelector('.file-input-display');
        if (fileDisplay) {
            fileDisplay.innerHTML = '<span class="placeholder">Seleccionar archivo PDF...</span>';
        }
    }

    // Limpiar otros elementos del formulario
    const authorInputs = document.querySelectorAll('.author-input');
    authorInputs.forEach(input => {
        if (input) input.value = '';
    });

    // Limpiar canvas de firma si existe
    if (signatureCanvas && signatureCtx) {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    }

    // Resetear pasos
    showStep(1);

};