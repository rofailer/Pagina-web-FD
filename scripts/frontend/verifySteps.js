document.addEventListener("DOMContentLoaded", () => {
    // --- Variables de estado ---
    let currentStep = 1;
    let selectedProfesorId = null;
    let allProfessors = []; // Lista completa de profesores
    let filteredProfessors = []; // Lista filtrada
    let autoDetectedSigner = null; // Información del firmante detectado automáticamente

    // --- Función para crear mensajes estandarizados ---
    function createStandardAlert(type, title, content, details = null, suggestion = null) {
        const alertClass = `alert-message ${type}`;

        let detailsHtml = '';
        if (details && details.length > 0) {
            detailsHtml = `
                <div class="alert-details">
                    <ul>
                        ${details.map(detail => `<li>${detail}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        let suggestionHtml = '';
        if (suggestion) {
            suggestionHtml = `
                <div class="alert-suggestion">
                    <strong>💡 Sugerencia:</strong> ${suggestion}
                </div>
            `;
        }

        return `
            <div class="${alertClass}">
                <div class="alert-title">
                    <span class="alert-icon"></span>
                    ${title}
                </div>
                <div class="alert-content">${content}</div>
                ${detailsHtml}
                ${suggestionHtml}
            </div>
        `;
    }

    // --- Función para detección automática del firmante ---
    async function detectSignerFromDocument(file) {
        // Solo notificaciones, no mostrar modal ni contenido

        try {
            const formData = new FormData();
            formData.append('signedFile', file);

            const response = await fetch('/extract-signer-info', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Detección exitosa
                autoDetectedSigner = result.signer;


                // Guardar archivo para uso en paso 2
                window.autoDetectedFile = file;

                // Seleccionar automáticamente al profesor en la lista
                selectProfessorAutomatically(result.signer.id);

                // Habilitar el botón continuar
                const acceptBtn = document.getElementById("acceptProfesorBtn");
                if (acceptBtn) {
                    acceptBtn.disabled = false;
                }

                // Mostrar notificación de éxito
                if (window.showNotification) {
                    window.showNotification(`Firmante detectado automáticamente: ${result.signer.nombre}`, "success");
                }

            } else {
                // Error en la detección
                autoDetectedSigner = null;
                window.autoDetectedFile = null;


                // Mostrar notificación de error
                if (window.showNotification) {
                    window.showNotification(result.message, "warning");
                }
            }

        } catch (error) {
            console.error("Error en detección automática:", error);
            autoDetectedSigner = null;
            window.autoDetectedFile = null;


            if (window.showNotification) {
                window.showNotification("Error al procesar el documento", "error");
            }
        }
    }

    // --- Función para seleccionar profesor automáticamente ---
    function selectProfessorAutomatically(professorId) {
        // Buscar al profesor en la lista
        const professorElement = document.querySelector(`[data-professor-id="${professorId}"]`);

        if (professorElement) {
            // Limpiar selecciones previas
            document.querySelectorAll('.professor-item').forEach(item => {
                item.classList.remove('selected');
            });

            // Seleccionar el profesor detectado
            professorElement.classList.add('selected');
            selectedProfesorId = professorId;

            // Actualizar la información del profesor seleccionado
            const selectedProfessor = document.getElementById("selectedProfessor");
            const selectedProfessorName = document.getElementById("selectedProfessorName");

            if (selectedProfessor && selectedProfessorName) {
                selectedProfessorName.textContent = autoDetectedSigner.nombre;
                selectedProfessor.style.display = "block";
            }

            // Ocultar la lista de profesores
            const professorsList = document.getElementById("professorsList");
            if (professorsList) {
                professorsList.style.display = "none";
            }

            console.log(`✅ Profesor seleccionado automáticamente: ${autoDetectedSigner.nombre} (ID: ${professorId})`);
        } else {
            console.warn(`⚠️ No se encontró elemento de profesor con ID: ${professorId}`);
        }
    }

    // --- Elementos de pasos y barra de progreso ---
    const steps = [
        document.getElementById("verifyStep1"),
        document.getElementById("verifyStep2"),
        document.getElementById("verifyStep3"),
        document.getElementById("verifyStep4"),
    ];
    const indicatorSteps = document.querySelectorAll("#verifyStepIndicator .step");

    // --- Utilidad para mostrar el paso current ---
    function showStep(step) {
        steps.forEach((div, i) => div.style.display = (i === step - 1) ? "" : "none");
        indicatorSteps.forEach((el, i) => el.classList.toggle("active", i === step - 1));
        currentStep = step;

        // Si estamos en el paso 2 y hay un archivo auto-detectado, pre-llenarlo
        if (step === 2 && window.autoDetectedFile) {
            const signedFileInput = document.getElementById("signedFile");
            const signedFileLabel = document.querySelector('label[for="signedFile"]');
            const signedFileText = document.querySelector('label[for="signedFile"] .file-input-text');

            if (signedFileInput && signedFileLabel && signedFileText) {
                // Crear un nuevo FileList con el archivo auto-detectado
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(window.autoDetectedFile);
                signedFileInput.files = dataTransfer.files;

                // Actualizar la etiqueta visual
                signedFileText.textContent = `${window.autoDetectedFile.name} (auto-detectado)`;

                // Agregar clase especial para el estilo
                signedFileLabel.classList.add('auto-detected');

                // Habilitar el botón de continuar
                const acceptAvalBtn = document.getElementById("acceptAvalBtn");
                if (acceptAvalBtn) {
                    acceptAvalBtn.disabled = false;
                }

                // Mostrar información adicional
                if (window.showNotification) {
                    window.showNotification("Archivo firmado cargado automáticamente", "info");
                }

                console.log(`✅ Archivo auto-detectado cargado en paso 2: ${window.autoDetectedFile.name}`);
            }
        }
    }

    // --- Cargar profesores y mostrar paso 1 ---
    function cargarProfesoresYMostrarPaso1() {
        console.log("🚀 INICIO: cargarProfesoresYMostrarPaso1()");

        // Verificar que existe el elemento professorsList
        const professorsList = document.getElementById("professorsList");
        console.log("📋 Elemento professorsList encontrado:", !!professorsList);

        if (!professorsList) {
            console.error("❌ No se encontró el elemento professorsList");
            return;
        }

        // Mostrar loading
        professorsList.innerHTML = `
            <div class="loading-professors">
                <span class="loader-small"></span>
                <span>Cargando profesores...</span>
            </div>
        `;
        console.log("⏳ Loading mostrado en professorsList");

        console.log("🔍 Iniciando fetch a /api/profesores...");

        // Crear headers - con token si existe, sin token si no existe
        const token = localStorage.getItem("token");
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log("🔑 Headers con token a enviar:", { Authorization: `Bearer ${token.substring(0, 20)}...` });
        } else {
            console.log("🔑 Headers sin token (acceso público)");
        }

        fetch("/api/profesores", {
            headers: headers
        })
            .then(async res => {
                console.log("📡 Respuesta recibida del servidor:");
                console.log("   - Status:", res.status);
                console.log("   - StatusText:", res.statusText);
                console.log("   - Headers:", res.headers);

                if (!res.ok) {
                    console.log("❌ Respuesta no exitosa, procesando error...");
                    let errorData;
                    try {
                        errorData = await res.json();
                        console.log("   - Error data:", errorData);
                    } catch (parseError) {
                        console.log("   - Error parseando JSON del error:", parseError);
                        errorData = { error: "Error de comunicación con el servidor" };
                    }

                    // Solo mostrar modal de login si tenemos token (sesión expirada) 
                    // No mostrar si no hay token (acceso público)
                    if (token) {
                        if (window.showLoginModal) window.showLoginModal();
                        else showNotification(errorData.error || "Sesión expirada. Por favor, inicia sesión de nuevo.", "error");
                        localStorage.removeItem("token");
                    } else {
                        // Error en acceso público, mostrar mensaje sin modal de login
                        showNotification("Error al cargar la lista de profesores. Por favor, intenta de nuevo.", "error");
                    }
                    return [];
                }

                console.log("✅ Respuesta exitosa, parseando JSON...");
                return res.json();
            })
            .then(data => {
                console.log("� Datos finales recibidos:");
                console.log("   - Tipo:", typeof data);
                console.log("   - Es array:", Array.isArray(data));
                console.log("   - Longitud:", data?.length);
                console.log("   - Contenido:", data);

                if (!Array.isArray(data)) {
                    console.error("❌ Los datos no son un array:", data);
                    showNotification("Error al cargar la lista de profesores", "error");
                    professorsList.innerHTML = `
                        <div class="no-professors">
                            <p>Error: Los datos recibidos no son válidos.</p>
                        </div>
                    `;
                    return;
                }

                if (data.length === 0) {
                    console.log("⚠️ No se encontraron profesores en la base de datos");
                    professorsList.innerHTML = `
                        <div class="no-professors">
                            <p>No hay profesores registrados en el sistema.</p>
                        </div>
                    `;
                    return;
                }

                console.log("✅ Profesores válidos recibidos, actualizando variables globales...");
                allProfessors = data;
                filteredProfessors = [...data];

                console.log("🎨 Llamando a displayProfessors...");
                displayProfessors(filteredProfessors);

                console.log("🔧 Configurando search listeners...");
                setupSearchListeners();

                // Solo mostrar paso 1 si no estamos ya en él
                if (currentStep !== 1) {
                    console.log("📄 Mostrando paso 1...");
                    showStep(1);
                } else {
                    console.log("📄 Ya estamos en el paso 1, no es necesario cambiar");
                }

                console.log("🎉 cargarProfesoresYMostrarPaso1() completado exitosamente");
            })
            .catch(error => {
                console.error("💥 ERROR EN FETCH:");
                console.error("   - Error object:", error);
                console.error("   - Error message:", error.message);
                console.error("   - Error stack:", error.stack);

                showNotification("Error de conexión al cargar profesores", "error");
                professorsList.innerHTML = `
                    <div class="no-professors">
                        <p>Error de conexión. No se pudo conectar con el servidor.</p>
                        <p>Verifica que el servidor esté funcionando e intenta de nuevo.</p>
                    </div>
                `;
            });
    }

    // --- Función para mostrar la lista de profesores ---
    function displayProfessors(professors) {
        const professorsList = document.getElementById("professorsList");

        if (!professors || professors.length === 0) {
            professorsList.innerHTML = `
                <div class="no-professors">
                    <p>No se encontraron profesores.</p>
                </div>
            `;
            return;
        }

        const professorsHTML = professors.map(prof => `
            <div class="professor-item" data-professor-id="${prof.id}" data-professor-name="${prof.nombre}">
                <span class="professor-name">${prof.nombre}</span>
                <span class="professor-id">ID: ${prof.id}</span>
            </div>
        `).join('');

        professorsList.innerHTML = professorsHTML;

        // Agregar event listeners a los items
        const professorItems = professorsList.querySelectorAll('.professor-item');
        professorItems.forEach(item => {
            item.addEventListener('click', () => {
                selectProfessor(
                    item.dataset.professorId,
                    item.dataset.professorName
                );
            });
        });
    }

    // --- Función para seleccionar un profesor ---
    function selectProfessor(professorId, professorName) {
        selectedProfesorId = professorId;

        // Actualizar selección visual
        const allItems = document.querySelectorAll('.professor-item');
        allItems.forEach(item => item.classList.remove('selected'));

        const selectedItem = document.querySelector(`[data-professor-id="${professorId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Mostrar profesor seleccionado de forma compacta
        const selectedProfessorDiv = document.getElementById('selectedProfessor');
        const selectedProfessorName = document.getElementById('selectedProfessorName');

        selectedProfessorName.textContent = professorName;
        selectedProfessorDiv.style.display = 'block';

        // Habilitar botón continuar
        const acceptBtn = document.getElementById('acceptProfesorBtn');
        acceptBtn.disabled = false;

        // Marcar proceso en curso
        window.verificacionEnCurso = true;

        showNotification(`Profesor "${professorName}" seleccionado`, "success");
    }

    // --- Función para filtrar y ordenar profesores ---
    function filterAndSortProfessors() {
        const searchInput = document.getElementById('professorSearchInput');
        const sortOrder = document.getElementById('sortOrder');

        const searchTerm = searchInput.value.toLowerCase().trim();
        const order = sortOrder.value;

        // Filtrar por término de búsqueda
        let filtered = allProfessors.filter(prof =>
            prof.nombre.toLowerCase().includes(searchTerm)
        );

        // Ordenar
        filtered.sort((a, b) => {
            if (order === 'asc') {
                return a.nombre.localeCompare(b.nombre);
            } else {
                return b.nombre.localeCompare(a.nombre);
            }
        });

        filteredProfessors = filtered;
        displayProfessors(filteredProfessors);
    }

    // --- Event listeners para búsqueda y filtrado ---
    function setupSearchListeners() {
        const searchInput = document.getElementById('professorSearchInput');
        const sortOrder = document.getElementById('sortOrder');
        const clearSearch = document.getElementById('clearSearch');
        const changeProfessor = document.getElementById('changeProfessor');

        if (searchInput) {
            searchInput.addEventListener('input', filterAndSortProfessors);
        }

        if (sortOrder) {
            sortOrder.addEventListener('change', filterAndSortProfessors);
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (sortOrder) sortOrder.value = 'asc';
                filterAndSortProfessors();
            });
        }

        if (changeProfessor) {
            changeProfessor.addEventListener('click', () => {
                // Resetear selección
                selectedProfesorId = null;
                const selectedProfDiv = document.getElementById('selectedProfessor');
                const acceptBtn = document.getElementById('acceptProfesorBtn');

                if (selectedProfDiv) selectedProfDiv.style.display = 'none';
                if (acceptBtn) acceptBtn.disabled = true;

                // Limpiar selección visual
                const allItems = document.querySelectorAll('.professor-item');
                allItems.forEach(item => item.classList.remove('selected'));
            });
        }
    }

    // Las notificaciones ahora se manejan con el sistema global de notifications.js

    // --- Paso 1: Seleccionar profesor ---
    document.getElementById("acceptProfesorBtn").onclick = () => {
        if (!selectedProfesorId) {
            showNotification("Selecciona un profesor o tutor.", "warning");
            return;
        }
        window.verificacionEnCurso = true; // Asegurar que está marcado
        showStep(2);
    };

    // --- Paso 2: Seleccionar aval firmado ---
    document.getElementById("acceptAvalBtn").onclick = () => {
        const signedFile = document.getElementById("signedFile").files[0];
        if (!signedFile) {
            alert("Selecciona el archivo avalado (PDF firmado).");
            return;
        }
        window.verificacionEnCurso = true; // Asegurar que está marcado
        showStep(3);
    };

    // --- Paso 3: Seleccionar original y verificar ---
    document.getElementById("acceptOriginalBtn").onclick = () => {
        const originalFile = document.getElementById("originalFile").files[0];
        if (!originalFile) {
            alert("Selecciona el archivo original (PDF).");
            return;
        }

        window.verificacionEnCurso = true;

        // Mostrar loader y texto "Verificando..." antes de hacer la petición
        showStep(4);
        const resultElem = document.getElementById("verificationResult");
        const continueBtn = document.getElementById("continueVerifyBtn");
        const retryKeyBtn = document.getElementById("retryKeyBtn");

        resultElem.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; flex-direction: column; height: 100%; width: 100%;">
                <span class="loader" style="margin-bottom: 16px;"></span>
                <span style="font-size: 1.0em; color: var(--primary-color); font-weight: 500;">Verificando...</span>
            </div>
        `;
        continueBtn.style.display = "none";
        retryKeyBtn.style.display = "none";
        document.getElementById("restartVerifyProcessBtn").style.display = "none"; // Oculta siempre al entrar

        // --- Procesar verificación ---
        const signedFile = document.getElementById("signedFile").files[0];
        const formData = new FormData();

        // Debug logs
        console.log("=== FRONTEND DEBUG ===");
        console.log("selectedProfesorId:", selectedProfesorId);
        console.log("signedFile:", signedFile);
        console.log("originalFile:", originalFile);
        console.log("signedFile name:", signedFile?.name);
        console.log("originalFile name:", originalFile?.name);

        formData.append("signedFile", signedFile);
        formData.append("originalFile", originalFile);

        // Solo agregar profesorId (siempre requerido)
        formData.append("profesorId", selectedProfesorId);

        fetch("/verify-document", {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: formData,
        })
            .then(async (response) => {
                setTimeout(async () => {
                    continueBtn.style.display = "none";
                    retryKeyBtn.style.display = "none";
                    document.getElementById("restartVerifyProcessBtn").style.display = "none";

                    if (response.ok) {
                        const data = await response.json();
                        if (data.reason === "key_mismatch") {
                            resultElem.innerHTML = createStandardAlert(
                                'warning',
                                'Profesor incorrecto',
                                'El profesor/tutor seleccionado NO avaló este documento.',
                                [
                                    'La llave pública del profesor no coincide con la firma digital.',
                                    'No se puede verificar la autenticidad del aval.',
                                    'Es necesario seleccionar el profesor correcto.'
                                ],
                                'Intenta seleccionar otro profesor que pueda haber avalado este documento.'
                            );
                            retryKeyBtn.style.display = "inline-block";
                            showNotification("El profesor seleccionado no avaló este documento", "warning");
                        }
                        else if (data.reason === "invalid_signature") {
                            resultElem.innerHTML = createStandardAlert(
                                'error',
                                'Documento modificado',
                                'El profesor/tutor sí avaló el documento, pero el archivo original NO coincide.',
                                [
                                    'La llave pública coincide con la firma digital.',
                                    'El documento original ha sido modificado después del aval.',
                                    'La integridad del documento está comprometida.'
                                ],
                                'Verifica que el archivo original sea exactamente el mismo que se firmó inicialmente.'
                            );
                            continueBtn.style.display = "inline-block";
                            showNotification("El archivo original no coincide con el documento avalado", "error");
                        }
                        else if (data.valid && data.professorMatch && data.signatureMatch) {
                            resultElem.innerHTML = createStandardAlert(
                                'success',
                                'Verificación exitosa',
                                'El profesor/tutor avaló el documento y la firma digital es válida.',
                                [
                                    'La llave pública coincide con la firma digital.',
                                    'El documento original no ha sido modificado.',
                                    'La integridad y autenticidad están garantizadas.'
                                ]
                            );
                            document.getElementById("restartVerifyProcessBtn").style.display = "inline-block";
                            showNotification("Verificación exitosa: El documento es auténtico", "success");
                        }
                        else {
                            resultElem.innerHTML = `<div style="color: red;">${data.message || "Error al verificar el documento."}</div>`;
                            continueBtn.style.display = "inline-block";
                            showNotification("Error en la verificación del documento", "error");
                        }
                        window.verificacionEnCurso = false; // Proceso terminado
                    } else {
                        // Manejo mejorado de errores específicos
                        let errorMsg = "Error al verificar el documento.";
                        let notificationMsg = "Error en la verificación";
                        let notificationType = "error";

                        try {
                            const errorData = await response.json();
                            if (errorData.error) {
                                const errorText = errorData.error.toLowerCase();

                                if (errorText.includes("no se encontró la llave pública")) {
                                    errorMsg = createStandardAlert(
                                        'warning',
                                        'Profesor sin llaves',
                                        'No se encontró la llave pública del profesor/tutor seleccionado.',
                                        [
                                            'El profesor no ha generado sus llaves digitales.',
                                            'Es necesario que el profesor cree sus llaves primero.',
                                            'Contacta al profesor para que genere sus llaves.'
                                        ],
                                        'Solicita al profesor que acceda a su perfil y genere sus llaves digitales.'
                                    );
                                    notificationMsg = "El profesor seleccionado no tiene llaves generadas";
                                } else if (errorText.includes("mismo archivo") ||
                                    errorText.includes("archivos idénticos") ||
                                    errorText.includes("duplicado")) {
                                    errorMsg = createStandardAlert(
                                        'warning',
                                        'Archivos idénticos detectados',
                                        'Has subido el mismo archivo como "avalado" y "original".',
                                        [
                                            'El archivo avalado debe ser el documento firmado digitalmente.',
                                            'El archivo original debe ser el documento sin firmar.',
                                            'Ambos archivos deben ser diferentes.'
                                        ],
                                        'Asegúrate de seleccionar el archivo avalado (que descargaste después de firmarlo) y el archivo original (antes de firmarlo).'
                                    );
                                    notificationMsg = "Los archivos subidos son idénticos";
                                    notificationType = "warning";
                                } else if (errorText.includes("archivo no válido") ||
                                    errorText.includes("pdf") ||
                                    errorText.includes("formato")) {
                                    errorMsg = createStandardAlert(
                                        'error',
                                        'Archivos PDF inválidos',
                                        'Uno o ambos archivos no son PDFs válidos o están corruptos.',
                                        [
                                            'Los archivos deben ser PDFs válidos y completos.',
                                            'Verifica que los archivos no estén dañados.',
                                            'Intenta descargar los archivos nuevamente.'
                                        ]
                                    );
                                    notificationMsg = "Archivos PDF inválidos";
                                } else if (errorText.includes("avalado") ||
                                    errorText.includes("firmado")) {
                                    errorMsg = createStandardAlert(
                                        'error',
                                        'Archivo avalado inválido',
                                        'El archivo avalado no contiene una firma digital válida.',
                                        [
                                            'El archivo debe contener metadatos de firma digital.',
                                            'Asegúrate de subir el archivo que descargaste después de firmarlo.',
                                            'El archivo debe tener la extensión .pdf y estar completo.'
                                        ]
                                    );
                                    notificationMsg = "El archivo avalado no es válido";
                                } else if (errorText.includes("original")) {
                                    errorMsg = createStandardAlert(
                                        'error',
                                        'Archivo original inválido',
                                        'El archivo original no es un PDF válido.',
                                        [
                                            'El archivo debe ser el documento antes de ser firmado.',
                                            'Verifica que sea un PDF válido y completo.',
                                            'El archivo no debe contener firmas digitales previas.'
                                        ]
                                    );
                                    notificationMsg = "El archivo original no es válido";
                                } else if (errorText.includes("profesor") ||
                                    errorText.includes("tutor")) {
                                    errorMsg = createStandardAlert(
                                        'warning',
                                        'Error con el profesor seleccionado',
                                        'Hubo un problema relacionado con el profesor/tutor seleccionado.',
                                        [
                                            'El profesor puede no tener llaves generadas.',
                                            'Verifica que el profesor esté activo en el sistema.',
                                            'Intenta seleccionar otro profesor.'
                                        ]
                                    );
                                    notificationMsg = "Error con el profesor seleccionado";
                                    notificationType = "warning";
                                } else {
                                    errorMsg = createStandardAlert(
                                        'error',
                                        'Error en la verificación',
                                        errorData.error || 'Error desconocido al verificar el documento.',
                                        [
                                            'Verifica que todos los archivos sean correctos.',
                                            'Intenta realizar la verificación nuevamente.',
                                            'Si el problema persiste, contacta al administrador.'
                                        ]
                                    );
                                    notificationMsg = "Error en la verificación";
                                }
                            }
                        } catch (e) {
                            // Si no es JSON, usar mensaje genérico
                            if (response.status === 400) {
                                errorMsg = createStandardAlert(
                                    'error',
                                    '❌',
                                    'Datos inválidos',
                                    'Los archivos enviados no son válidos o están corruptos.',
                                    [
                                        'Verifica que ambos archivos sean PDFs válidos.',
                                        'Los archivos no deben estar dañados o incompletos.',
                                        'Intenta descargar y subir los archivos nuevamente.'
                                    ]
                                );
                                notificationMsg = "Archivos no válidos";
                            } else if (response.status === 404) {
                                errorMsg = createStandardAlert(
                                    'error',
                                    'Servicio no disponible',
                                    'No se encontró el servicio de verificación.',
                                    [
                                        'El servidor puede estar en mantenimiento.',
                                        'Verifica tu conexión a internet.',
                                        'Intenta nuevamente en unos momentos.'
                                    ]
                                );
                                notificationMsg = "Servicio no disponible";
                            } else {
                                errorMsg = createStandardAlert(
                                    'error',
                                    'Error del servidor',
                                    `Error del servidor (${response.status}).`,
                                    [
                                        'Hubo un problema en el servidor.',
                                        'Este error es temporal.',
                                        'Intenta realizar la verificación nuevamente.'
                                    ]
                                );
                                notificationMsg = "Error del servidor";
                            }
                        }

                        resultElem.innerHTML = errorMsg;
                        continueBtn.style.display = "inline-block";
                        showNotification(notificationMsg, notificationType);
                        window.verificacionEnCurso = false;
                    }
                }, 1200);
            })
            .catch((error) => {
                setTimeout(() => {
                    resultElem.innerHTML = createStandardAlert(
                        'error',
                        'Error de conexión',
                        'No se pudo conectar con el servidor para verificar el documento.',
                        [
                            'Verifica tu conexión a internet.',
                            'El servidor puede estar temporalmente no disponible.',
                            'Intenta realizar la verificación nuevamente en unos momentos.'
                        ]
                    );
                    continueBtn.style.display = "inline-block";
                    retryKeyBtn.style.display = "none";
                    showNotification("Error de conexión durante la verificación", "error");
                    window.verificacionEnCurso = false;
                }, 1200);
            });
    };

    // --- Acciones finales ---
    function limpiarFormulariosVerificar(showNotificationFlag = false) {
        document.getElementById("verifyAvalForm").reset();
        document.getElementById("verifyOriginalForm").reset();

        // Limpiar file inputs modernos
        const signedFile = document.getElementById("signedFile");
        if (signedFile) {
            signedFile.value = "";
            updateVerifyFileInputDisplay(signedFile);
            // Remover clase auto-detected
            const signedFileLabel = document.querySelector('label[for="signedFile"]');
            if (signedFileLabel) {
                signedFileLabel.classList.remove('auto-detected');
            }
        }

        const originalFile = document.getElementById("originalFile");
        if (originalFile) {
            originalFile.value = "";
            updateVerifyFileInputDisplay(originalFile);
        }

        // Limpiar detección automática
        const autoDetectFile = document.getElementById("autoDetectFile");
        if (autoDetectFile) {
            autoDetectFile.value = "";
        }

        const autoDetectResult = document.getElementById("autoDetectResult");
        if (autoDetectResult) {
            autoDetectResult.style.display = "none";
            autoDetectResult.className = "auto-detect-result";
            autoDetectResult.innerHTML = "";
        }

        // Resetear variables de estado de detección automática
        autoDetectedSigner = null;
        window.autoDetectedFile = null;

        // Limpiar búsqueda y selección de profesor
        const searchInput = document.getElementById("professorSearchInput");
        if (searchInput) {
            searchInput.value = "";
        }

        const sortOrder = document.getElementById("sortOrder");
        if (sortOrder) {
            sortOrder.value = "asc";
        }

        // Ocultar profesor seleccionado
        const selectedProfessor = document.getElementById("selectedProfessor");
        if (selectedProfessor) {
            selectedProfessor.style.display = "none";
        }

        // Resetear botón continuar
        const acceptBtn = document.getElementById("acceptProfesorBtn");
        if (acceptBtn) {
            acceptBtn.disabled = true;
        }

        // Limpiar selección visual
        const allItems = document.querySelectorAll('.professor-item');
        allItems.forEach(item => item.classList.remove('selected'));

        document.getElementById("verificationResult").textContent = "";
        document.getElementById("continueVerifyBtn").style.display = "none";
        document.getElementById("retryKeyBtn").style.display = "none";
        document.getElementById("restartVerifyProcessBtn").style.display = "none";

        // Resetear variables de estado
        selectedProfesorId = null;
        window.verificacionEnCurso = false;

        // Solo mostrar notificación si se especifica explícitamente
        if (showNotificationFlag) {
            showNotification("Proceso reiniciado", "info");
        }

        // Recargar y mostrar todos los profesores
        if (allProfessors.length > 0) {
            filteredProfessors = [...allProfessors];
            displayProfessors(filteredProfessors);
        }
    }

    // --- Función para actualizar la visualización del file input en verificar ---
    function updateVerifyFileInputDisplay(input) {
        const label = input.nextElementSibling;
        const textSpan = label.querySelector('.file-input-text');
        const iconSpan = label.querySelector('.file-input-icon');

        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            textSpan.textContent = file.name;
            label.classList.add('has-file');
            label.classList.remove('error');
            window.verificacionEnCurso = true; // Marcar proceso en curso cuando se selecciona archivo
        } else {
            textSpan.textContent = 'Ningún archivo seleccionado';
            label.classList.remove('has-file', 'error');

            // Solo limpiar estado si no hay otros elementos que indiquen proceso en curso
            const hasProfesor = document.getElementById("profesorSelect")?.value;
            const hasSignedFile = document.getElementById("signedFile")?.files?.length > 0;
            const hasOriginalFile = document.getElementById("originalFile")?.files?.length > 0;

            if (!hasProfesor && !hasSignedFile && !hasOriginalFile) {
                window.verificacionEnCurso = false;
            }
        }
    }

    document.getElementById("continueVerifyBtn").onclick = () => {
        limpiarFormulariosVerificar(true); // true = mostrar notificación
        showStep(1);
    };
    document.getElementById("retryKeyBtn").onclick = () => {
        limpiarFormulariosVerificar(true); // true = mostrar notificación
        showStep(1);
    };
    document.getElementById("restartVerifyProcessBtn").onclick = () => {
        limpiarFormulariosVerificar(true); // true = mostrar notificación
        showStep(1);
    };

    // --- Estado inicial ---
    document.getElementById("continueVerifyBtn").style.display = "none";
    document.getElementById("retryKeyBtn").style.display = "none";
    showStep(1);

    // --- Event listeners para file inputs ---
    const signedFileInput = document.getElementById("signedFile");
    const originalFileInput = document.getElementById("originalFile");

    if (signedFileInput) {
        signedFileInput.addEventListener('change', function () {
            updateVerifyFileInputDisplay(this);
        });
    }

    if (originalFileInput) {
        originalFileInput.addEventListener('change', function () {
            updateVerifyFileInputDisplay(this);
        });
    }

    // --- Event listeners para botones de modo ---
    const quickModeBtn = document.getElementById('quickVerifyModeBtn');
    const professorModeBtn = document.getElementById('professorVerifyModeBtn');

    if (quickModeBtn) {
        quickModeBtn.addEventListener('click', () => {
            // Activar modo rápido
            quickModeBtn.classList.add('active');
            professorModeBtn.classList.remove('active');

            // Iniciar verificación sin profesor
            startVerificationWithoutProfessor();
        });
    }

    if (professorModeBtn) {
        professorModeBtn.addEventListener('click', () => {
            // Activar modo con profesor
            professorModeBtn.classList.add('active');
            quickModeBtn.classList.remove('active');

            // Resetear y cargar profesores
            selectedProfesorId = null;

            // Restaurar paso de profesor
            const professorStep = document.querySelector('#verifyStepIndicator .step[data-step="1"]');
            if (professorStep) {
                professorStep.style.display = 'block';
            }

            // Restaurar numeración original
            const steps = document.querySelectorAll('#verifyStepIndicator .step');
            steps.forEach((stepEl) => {
                const originalStep = stepEl.getAttribute('data-original-step') || stepEl.getAttribute('data-step');
                const originalLabel = stepEl.getAttribute('data-original-label') || stepEl.getAttribute('data-label');
                stepEl.setAttribute('data-step', originalStep);
                stepEl.setAttribute('data-label', originalLabel);
            });

            cargarProfesoresYMostrarPaso1();
        });
    }

    // --- Hacer la función global para frontend.js ---
    window.cargarProfesoresYMostrarPaso1 = cargarProfesoresYMostrarPaso1;
    window.limpiarFormulariosVerificar = limpiarFormulariosVerificar;
    window.updateVerifyFileInputDisplay = updateVerifyFileInputDisplay;
    window.verificacionEnCurso = false;
    window.firmaEnCurso = false;

    // --- Event listener para detección automática ---
    const autoDetectFile = document.getElementById("autoDetectFile");
    if (autoDetectFile) {
        autoDetectFile.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                // Validar que sea un PDF
                if (file.type !== 'application/pdf') {
                    if (window.showNotification) {
                        window.showNotification("Por favor, selecciona un archivo PDF válido", "error");
                    }
                    return;
                }

                // Validar tamaño del archivo (máximo 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    if (window.showNotification) {
                        window.showNotification("El archivo es demasiado grande. Máximo 10MB permitido", "error");
                    }
                    return;
                }

                console.log(`🔍 Iniciando detección automática para: ${file.name}`);
                detectSignerFromDocument(file);
            }
        });
    }

    // --- Verificar si ya estamos en la sección verificar al cargar la página ---
    function checkInitialSection() {
        const currentHash = window.location.hash.replace("#", "");
        const verifySection = document.getElementById("verifySection");

        if (currentHash === "verificar" && verifySection && verifySection.style.display !== "none") {
            console.log("🔄 Página cargada ya en sección verificar, cargando profesores...");
            cargarProfesoresYMostrarPaso1();
        }
    }

    // Verificar la sección inicial cuando el DOM esté listo
    setTimeout(checkInitialSection, 100);
});