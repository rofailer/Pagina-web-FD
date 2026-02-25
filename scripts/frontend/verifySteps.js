document.addEventListener("DOMContentLoaded", () => {
    // --- Variables de estado ---
    let currentStep = 1;
    let selectedProfesorId = null;
    let isManualMode = false;
    let allProfessors = [];
    let filteredProfessors = [];
    let autoDetectedSigner = null;

    // --- Gestión de ANEXOS para Verificación ---
    let verifyAttachmentFiles = [];
    const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

    function setupVerifyAttachmentsInput() {
        const attachmentsInput = document.getElementById('verifyAttachmentsInput');
        if (!attachmentsInput) return;
        attachmentsInput.addEventListener('change', handleVerifyAttachmentsSelection);
    }

    function handleVerifyAttachmentsSelection(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const currentSize = verifyAttachmentFiles.reduce((sum, f) => sum + f.size, 0);
        const newFilesSize = files.reduce((sum, f) => sum + f.size, 0);
        const totalSize = currentSize + newFilesSize;

        if (totalSize > MAX_TOTAL_SIZE) {
            showNotification(
                `❌ El tamaño total de anexos no puede exceder ${formatFileSize(MAX_TOTAL_SIZE)}`,
                'error'
            );
            e.target.value = '';
            return;
        }

        let addedCount = 0;
        let duplicateCount = 0;

        files.forEach(file => {
            const isDuplicate = verifyAttachmentFiles.some(f => f.name === file.name && f.size === file.size);
            if (!isDuplicate) {
                verifyAttachmentFiles.push(file);
                addedCount++;
            } else {
                duplicateCount++;
            }
        });

        e.target.value = '';

        if (addedCount > 0) {
            showNotification(
                `${addedCount} anexo${addedCount !== 1 ? 's' : ''} agregado${addedCount !== 1 ? 's' : ''}${duplicateCount > 0 ? ` (${duplicateCount} duplicado${duplicateCount !== 1 ? 's' : ''} omitido${duplicateCount !== 1 ? 's' : ''})` : ''}`,
                'success'
            );
        } else if (duplicateCount > 0) {
            showNotification(
                `${duplicateCount} archivo${duplicateCount !== 1 ? 's' : ''} ya ${duplicateCount !== 1 ? 'están' : 'está'} agregado${duplicateCount !== 1 ? 's' : ''}`,
                'warning'
            );
        }

        displayVerifyAttachmentsList();
    }

    function displayVerifyAttachmentsList() {
        const listContainer = document.getElementById('verifyAttachmentsList');
        const itemsContainer = document.getElementById('verifyAttachmentsItems');
        const countElement = document.getElementById('verifyAttachmentsCount');
        const sizeElement = document.getElementById('verifyAttachmentsTotalSize');

        if (!listContainer || !itemsContainer) return;

        if (verifyAttachmentFiles.length === 0) {
            listContainer.style.display = 'none';
            return;
        }

        listContainer.style.display = 'block';

        const totalSize = verifyAttachmentFiles.reduce((sum, file) => sum + file.size, 0);

        if (countElement) {
            countElement.textContent = `${verifyAttachmentFiles.length} archivo${verifyAttachmentFiles.length !== 1 ? 's' : ''}`;
        }
        if (sizeElement) {
            sizeElement.textContent = formatFileSize(totalSize);
        }

        itemsContainer.innerHTML = '';
        verifyAttachmentFiles.forEach((file, index) => {
            const item = createVerifyAttachmentItem(file, index);
            itemsContainer.appendChild(item);
        });
    }

    function createVerifyAttachmentItem(file, index) {
        const div = document.createElement('div');
        div.className = 'attachment-item';

        const ext = file.name.split('.').pop().slice(0, 3).toUpperCase();

        div.innerHTML = `
            <div class="attachment-icon">${ext}</div>
            <div class="attachment-details">
                <span class="attachment-name" title="${file.name}">${file.name}</span>
                <span class="attachment-size">${formatFileSize(file.size)}</span>
            </div>
            <button type="button" class="attachment-remove-btn" data-index="${index}" title="Eliminar anexo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;

        const removeBtn = div.querySelector('.attachment-remove-btn');
        removeBtn.addEventListener('click', () => removeVerifyAttachment(index));

        return div;
    }

    function removeVerifyAttachment(index) {
        const removedFile = verifyAttachmentFiles[index];
        verifyAttachmentFiles.splice(index, 1);
        displayVerifyAttachmentsList();

        if (removedFile) {
            showNotification(`Anexo eliminado: ${removedFile.name}`, 'info');
        }
    }

    const verifyModeSwitch = document.getElementById("verifyModeSwitch");
    const continueBtn = document.getElementById("continueVerifyStep1Btn");

    function updateContinueBtnState() {
        if (!continueBtn) return;

        const autoDetectFileInput = document.getElementById("autoDetectFile");
        const hasAutoFile = autoDetectFileInput && autoDetectFileInput.files && autoDetectFileInput.files.length > 0;
        const canContinue = isManualMode ? !!selectedProfesorId : !!autoDetectedSigner && hasAutoFile;

        continueBtn.disabled = !canContinue;
        continueBtn.innerHTML = `Continuar <svg class="btn-icon-right" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12M14 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    setupVerifyAttachmentsInput();

    // Referencias globales
    window.selectedProfesorId = null;
    window.verificacionEnCurso = false;

    // Cambiar modo y actualizar botón
    const manualOption = document.getElementById("manualVerifyOption");
    const autoOption = document.getElementById("autoVerifyOption");
    const manualLabel = document.getElementById("manualLabel");
    const autoLabel = document.getElementById("autoLabel");

    if (verifyModeSwitch && manualOption && autoOption && manualLabel && autoLabel) {
        verifyModeSwitch.addEventListener("change", function () {
            const acceptProfesorBtn = document.getElementById("acceptProfesorBtn");

            if (this.checked) {
                // Cambiar a automatico
                manualOption.style.display = "none";
                autoOption.style.display = "";
                manualLabel.classList.remove("switch-label-active");
                autoLabel.classList.add("switch-label-active");
                isManualMode = false;

                // Mostrar/ocultar botones
                if (acceptProfesorBtn) acceptProfesorBtn.style.display = "none";
                if (continueBtn) continueBtn.style.display = "flex"; // O "block" según el CSS

                // Limpiar datos del modo manual al cambiar a automatico
                selectedProfesorId = null;
                window.selectedProfesorId = null;
                const selectedProfessor = document.getElementById("selectedProfessor");
                if (selectedProfessor) {
                    selectedProfessor.style.display = "none";
                }
                // Limpiar seleccion visual de profesores
                document.querySelectorAll('.professor-item').forEach(item => {
                    item.classList.remove('selected');
                });
            } else {
                // Cambiar a manual
                manualOption.style.display = "";
                autoOption.style.display = "none";
                manualLabel.classList.add("switch-label-active");
                autoLabel.classList.remove("switch-label-active");
                isManualMode = true;

                // Mostrar/ocultar botones
                if (acceptProfesorBtn) acceptProfesorBtn.style.display = "flex"; // O "block" según el CSS
                if (continueBtn) continueBtn.style.display = "none";

                // Limpiar datos del modo automatico al cambiar a manual
                autoDetectedSigner = null;
                window.autoDetectedFile = null;
                const autoDetectFile = document.getElementById("autoDetectFile");
                if (autoDetectFile) {
                    autoDetectFile.value = "";
                    const autoDetectLabel = document.querySelector('label[for="autoDetectFile"]');
                    if (autoDetectLabel) {
                        const textSpan = autoDetectLabel.querySelector('.file-input-text');
                        if (textSpan) textSpan.textContent = 'Subir documento firmado';
                        autoDetectLabel.classList.remove('has-file', 'auto-detected', 'error');
                    }
                }
                const autoDetectResult = document.getElementById("autoDetectResult");
                if (autoDetectResult) {
                    autoDetectResult.style.display = "none";
                    autoDetectResult.innerHTML = "";
                }

                // Restaurar la lista de profesores si estaba oculta
                const professorsList = document.getElementById("professorsList");
                if (professorsList && professorsList.style.display === "none") {
                    professorsList.style.display = "";
                }
            }
            updateContinueBtnState();
        });
        // Estado inicial: automatico (coincide con checkbox checked)
        manualOption.style.display = "none";
        autoOption.style.display = "";
        manualLabel.classList.remove("switch-label-active");
        autoLabel.classList.add("switch-label-active");
        isManualMode = false;

        // Mostrar botón automático inicialmente y ocultar manual
        const acceptProfesorBtn = document.getElementById("acceptProfesorBtn");
        if (acceptProfesorBtn) acceptProfesorBtn.style.display = "none";
        if (continueBtn) continueBtn.style.display = "flex";

        // Asegurar que el boton este visible y el estado sea correcto
        updateContinueBtnState();
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
            window.selectedProfesorId = professorId;

            // Actualizar la información del profesor seleccionado
            const selectedProfessor = document.getElementById("selectedProfessor");
            const selectedProfessorName = document.getElementById("selectedProfessorName");

            if (selectedProfessor && selectedProfessorName) {
                selectedProfessorName.textContent = autoDetectedSigner.nombre;
                selectedProfessor.style.display = "block";
            }

            // Solo ocultar la lista de profesores en modo automático
            if (!isManualMode) {
                const professorsList = document.getElementById("professorsList");
                if (professorsList) {
                    professorsList.style.display = "none";
                }
            }

        } else {
            // log eliminado
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
        // Ocultar todos los pasos de forma explícita
        steps.forEach((div, i) => {
            if (div) {
                if (i === step - 1) {
                    // Mostrar el paso actual
                    div.style.display = "flex";
                    div.style.visibility = "visible";
                    div.style.opacity = "1";
                } else {
                    // Ocultar los demás pasos
                    div.style.display = "none";
                    div.style.visibility = "hidden";
                    div.style.opacity = "0";
                }
            }
        });

        // Actualizar indicador de pasos
        const stepIndicator = document.getElementById("verifyStepIndicator");
        if (stepIndicator) {
            // Remover todas las clases de paso
            stepIndicator.classList.remove("step-1", "step-2", "step-3", "step-4");
            // Agregar la clase del paso actual
            stepIndicator.classList.add(`step-${step}`);
        }

        // Actualizar estado visual de los pasos
        indicatorSteps.forEach((el, i) => {
            el.classList.remove("active", "completed");
            if (i === step - 1) {
                el.classList.add("active");
            } else if (i < step - 1) {
                el.classList.add("completed");
            }
        });

        currentStep = step;

        // Manejar elementos específicos que deben ocultarse en ciertos pasos
        const selectedProfessor = document.getElementById("selectedProfessor");
        const continueVerifyStep1Btn = document.getElementById("continueVerifyStep1Btn");
        const manualVerifyOption = document.getElementById("manualVerifyOption");
        const autoVerifyOption = document.getElementById("autoVerifyOption");
        const verifySwitchContainer = document.querySelector(".verify-switch-container");

        if (step === 1) {
            // En el paso 1, mostrar los elementos si están disponibles
            if (selectedProfessor && selectedProfessor.style.display !== "none") {
                selectedProfessor.style.display = "block";
            }
            if (continueVerifyStep1Btn) {
                continueVerifyStep1Btn.style.display = "flex";
            }
            if (verifySwitchContainer) {
                verifySwitchContainer.style.display = "flex";
            }
            if (manualVerifyOption) {
                manualVerifyOption.style.display = isManualMode ? "block" : "none";
            }
            if (autoVerifyOption) {
                autoVerifyOption.style.display = isManualMode ? "none" : "block";
            }
        } else {
            // En otros pasos, ocultar estos elementos específicos del paso 1
            if (selectedProfessor) {
                selectedProfessor.style.display = "none";
            }
            if (continueVerifyStep1Btn) {
                continueVerifyStep1Btn.style.display = "none";
            }
            if (verifySwitchContainer) {
                verifySwitchContainer.style.display = "none";
            }
            if (manualVerifyOption) {
                manualVerifyOption.style.display = "none";
            }
            if (autoVerifyOption) {
                autoVerifyOption.style.display = "none";
            }
        }

        // Si estamos en el paso 2 y hay un archivo auto-detectado, pre-llenarlo
        if (step === 2 && window.autoDetectedFile) {
            const signedFileInput = document.getElementById("signedFile");

            if (signedFileInput) {
                // Crear un nuevo FileList con el archivo auto-detectado
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(window.autoDetectedFile);
                signedFileInput.files = dataTransfer.files;

                // Actualizar la UI del nuevo diseño
                handleSignedFileInput(signedFileInput);

                // Mostrar información adicional
                if (window.showNotification) {
                    window.showNotification("Archivo firmado cargado automáticamente", "info");
                }
            }
        }

        // Scroll suave al inicio de la sección
        const verifySection = document.getElementById('verifySection');
        if (verifySection) {
            verifySection.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        }
    }

    // --- Cargar profesores y mostrar paso 1 ---
    function cargarProfesoresYMostrarPaso1() {
        // Verificar que existe el elemento professorsList
        const professorsList = document.getElementById("professorsList");

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

        // Crear headers - con token si existe, sin token si no existe
        const token = localStorage.getItem("token");
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        fetch("/api/profesores", {
            headers: headers
        })
            .then(async res => {
                if (!res.ok) {
                    let errorData;
                    try {
                        errorData = await res.json();
                    } catch (parseError) {
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

                return res.json();
            })
            .then(data => {

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
                    professorsList.innerHTML = `
                        <div class="no-professors">
                            <p>No hay profesores registrados en el sistema.</p>
                        </div>
                    `;
                    return;
                }

                allProfessors = data;
                filteredProfessors = [...data];

                displayProfessors(filteredProfessors);

                setupSearchListeners();

                // Solo mostrar paso 1 si no estamos ya en él
                if (currentStep !== 1) {
                    showStep(1);
                }
            })
            .catch(error => {
                console.error("💥 ERROR EN FETCH:", error);

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
        window.selectedProfesorId = professorId;

        // Marcar proceso en curso cuando se selecciona un profesor
        window.verificacionEnCurso = true;

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

        // Marcar proceso en curso
        window.verificacionEnCurso = true;

        showNotification(`Profesor "${professorName}" seleccionado`, "success");
        updateContinueBtnState();
    }

    // Hacer disponible globalmente
    window.selectProfessor = selectProfessor;

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

    // --- Función para crear alerta estándar ---
    function createStandardAlert(type, title, message, details = [], additionalMsg = '') {
        const iconMap = {
            'success': '✓',
            'error': '✕',
            'warning': '⚠',
            'info': 'ℹ'
        };

        const detailsList = details.length > 0 ? `
            <div class="alert-details">
                <ul>
                    ${details.map(detail => `<li>${detail}</li>`).join('')}
                </ul>
            </div>
        ` : '';

        const additionalSection = additionalMsg ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 0.95em;">
                ${additionalMsg}
            </div>
        ` : '';

        return `
            <div class="alert-message ${type}">
                <div style="display: flex; gap: 12px;">
                    <div class="alert-icon" style="font-size: 1.2em; font-weight: bold; flex-shrink: 0;">
                        ${iconMap[type] || '•'}
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0; font-size: 1.05em;">${title}</h4>
                        <div class="alert-content">
                            ${message}
                            ${detailsList}
                            ${additionalSection}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Paso 1: Seleccionar profesor ---
    const acceptProfesorBtn = document.getElementById("acceptProfesorBtn");
    if (acceptProfesorBtn) {
        acceptProfesorBtn.onclick = () => {
            if (!selectedProfesorId) {
                showNotification("Selecciona un profesor o tutor.", "warning");
                return;
            }
            window.verificacionEnCurso = true; // Asegurar que está marcado
            showStep(2);
        };
    }

    // --- Botón continuar para modo automático (continueVerifyStep1Btn) ---
    const continueVerifyStep1BtnElement = document.getElementById("continueVerifyStep1Btn");
    if (continueVerifyStep1BtnElement) {
        continueVerifyStep1BtnElement.onclick = () => {
            if (!autoDetectedSigner) {
                showNotification("Detecta un firmante primero.", "warning");
                return;
            }
            window.verificacionEnCurso = true;
            showStep(2);
        };
    }

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
        const signedFile = document.getElementById("signedFile").files[0];
        const profesorId = window.selectedProfesorId || selectedProfesorId;

        if (!originalFile) {
            alert("Selecciona el archivo original (PDF).");
            return;
        }

        if (!signedFile) {
            alert("Falta el archivo firmado. Vuelve al paso 2.");
            return;
        }

        if (!profesorId) {
            alert("Falta el profesor seleccionado. Vuelve al paso 1.");
            return;
        }

        window.verificacionEnCurso = true;
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
        document.getElementById("restartVerifyProcessBtn").style.display = "none";

        // Preparar FormData para documento
        const docFormData = new FormData();
        docFormData.append("signedFile", signedFile);
        docFormData.append("originalFile", originalFile);
        docFormData.append("profesorId", profesorId);

        // Preparar FormData para anexos
        const attachmentsFormData = new FormData();
        attachmentsFormData.append("signedPdf", signedFile);
        attachmentsFormData.append("pdfFileName", signedFile.name);

        verifyAttachmentFiles.forEach((file) => {
            attachmentsFormData.append("attachments", file);
        });

        // Hacer ambas peticiones en paralelo
        Promise.allSettled([
            fetch("/verify-document", {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: docFormData
            }),
            fetch("/verify-attachments", {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: attachmentsFormData
            })
        ]).then(async (results) => {
            setTimeout(async () => {
                try {
                    // Procesar resultado del documento
                    let documentResult = null;
                    let docData = null;
                    let docError = null;

                    if (results[0].status === 'fulfilled') {
                        const docResponse = results[0].value;
                        if (docResponse.ok) {
                            docData = await docResponse.json();
                        } else {
                            try {
                                docError = await docResponse.json();
                            } catch (e) {
                                docError = { error: 'Error al verificar documento' };
                            }
                        }
                    } else {
                        docError = { error: 'No se pudo conectar con el servidor' };
                    }

                    documentResult = buildDocumentResult(docData, docError);

                    // Procesar resultado de anexos
                    let attachmentResult = null;
                    let attachmentsData = null;
                    let attachmentsError = null;

                    if (results[1].status === 'fulfilled') {
                        const attachResponse = results[1].value;
                        if (attachResponse.ok) {
                            attachmentsData = await attachResponse.json();
                        } else {
                            try {
                                attachmentsError = await attachResponse.json();
                            } catch (e) {
                                attachmentsError = { error: 'Error al verificar anexos' };
                            }
                        }
                    } else {
                        attachmentsError = { error: 'No se pudo conectar con el servidor' };
                    }

                    attachmentResult = buildAttachmentResult(attachmentsData, attachmentsError);

                    // Mostrar ambos resultados
                    resultElem.innerHTML = createCombinedVerificationResult(documentResult, attachmentResult);

                    // Mostrar botones según el resultado
                    if (docData && docData.valid && docData.professorMatch && docData.signatureMatch) {
                        document.getElementById("restartVerifyProcessBtn").style.display = "inline-block";
                        showNotification("Verificacion completada correctamente", "success");
                    } else {
                        continueBtn.style.display = "inline-block";
                        showNotification("Verifique los resultados de la verificacion", "warning");
                    }

                    window.verificacionEnCurso = false;

                } catch (error) {
                    console.error("Error procesando resultados:", error);
                    resultElem.innerHTML = createStandardAlert(
                        'error',
                        'Error al procesar resultados',
                        'No se pudieron procesar los resultados de la verificacion.',
                        ['Intenta nuevamente']
                    );
                    continueBtn.style.display = "inline-block";
                    showNotification("Error al procesar verificacion", "error");
                    window.verificacionEnCurso = false;
                }
            }, 1200);
        });
    };

    // --- Función para detectar firmante automáticamente desde documento ---
    async function detectSignerFromDocument(file) {
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                autoDetectedSigner = null;
                window.autoDetectedFile = null;

                if (window.showNotification) {
                    window.showNotification(
                        errorData.error || 'No se pudo detectar el firmante. Selecciona manualmente al profesor.',
                        'warning'
                    );
                }
                return;
            }

            const result = await response.json();

            // Simular tiempo mínimo de procesamiento (2.5 segundos total)
            const minProcessingTime = 2500;
            const startTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, minProcessingTime));

            if (result.success) {
                // Detección exitosa
                autoDetectedSigner = result.signer;
                window.autoDetectedFile = file;

                // Seleccionar automáticamente al profesor en la lista
                selectProfessorAutomatically(result.signer.id);

                // Marcar archivo como detectado
                const autoDetectLabel = document.querySelector('label[for="autoDetectFile"]');
                if (autoDetectLabel) {
                    autoDetectLabel.classList.add('has-file', 'auto-detected');
                    const textSpan = autoDetectLabel.querySelector('.file-input-text');
                    if (textSpan) textSpan.textContent = '✓ ' + file.name;
                }

                // Mostrar resultado en selected-professor
                const selectedProfessor = document.getElementById("selectedProfessor");
                const selectedProfessorName = document.getElementById("selectedProfessorName");
                if (selectedProfessor && selectedProfessorName) {
                    selectedProfessor.style.display = 'block';
                    selectedProfessorName.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m9 12 2 2 4-4"/>
                                <circle cx="12" cy="12" r="10"/>
                            </svg>
                            <span>${result.signer.nombre || result.signer.name || 'Profesor detectado'}</span>
                            <small style="color: #28a745; font-weight: 500;">(Auto-detectado)</small>
                        </div>
                    `;
                }

                if (window.showNotification) {
                    window.showNotification(
                        `Firmante detectado: ${result.signer.nombre || result.signer.name}`,
                        'success'
                    );
                }
            } else {
                // Error en la detección
                autoDetectedSigner = null;
                window.autoDetectedFile = null;

                // Marcar como error
                const autoDetectLabel = document.querySelector('label[for="autoDetectFile"]');
                if (autoDetectLabel) {
                    autoDetectLabel.classList.add('error');
                }

                const selectedProfessor = document.getElementById("selectedProfessor");
                if (selectedProfessor) {
                    selectedProfessor.style.display = "none";
                }

                if (window.showNotification) {
                    window.showNotification(
                        result.message || 'No se pudo detectar el firmante. Selecciona manualmente al profesor.',
                        'warning'
                    );
                }
            }
        } catch (error) {
            console.error("Error en detección automática:", error);
            autoDetectedSigner = null;
            window.autoDetectedFile = null;

            const selectedProfessor = document.getElementById("selectedProfessor");
            if (selectedProfessor) {
                selectedProfessor.style.display = "none";
            }

            if (window.showNotification) {
                window.showNotification(
                    "Error al procesar el documento",
                    'error'
                );
            }
        }
    }

    // --- Acciones finales ---
    function limpiarFormulariosVerificar(showNotificationFlag = false) {
        // Realizar reset de formularios
        const verifyAvalForm = document.getElementById("verifyAvalForm");
        const verifyOriginalForm = document.getElementById("verifyOriginalForm");
        if (verifyAvalForm) verifyAvalForm.reset();
        if (verifyOriginalForm) verifyOriginalForm.reset();

        // ========== LIMPIEZA COMPLETA DE ARCHIVO DETECTADO AUTOMÁTICAMENTE (Paso 1) ==========
        const autoDetectFile = document.getElementById("autoDetectFile");
        const autoDetectResult = document.getElementById("autoDetectResult");

        if (autoDetectFile) {
            autoDetectFile.value = "";
        }
        if (autoDetectResult) {
            autoDetectResult.style.display = "none";
            autoDetectResult.innerHTML = "";
            autoDetectResult.className = "auto-detect-result";
        }

        // Limpiar label visual del autoDetectFile
        const autoDetectLabel = document.querySelector('label[for="autoDetectFile"]');
        if (autoDetectLabel) {
            const textSpan = autoDetectLabel.querySelector('.file-input-text');
            if (textSpan) textSpan.textContent = 'Subir documento firmado';
            autoDetectLabel.classList.remove('has-file', 'auto-detected', 'error');
        }

        // ========== LIMPIEZA COMPLETA DE ARCHIVO FIRMADO (Paso 2) ==========
        const signedFile = document.getElementById("signedFile");
        const signedFileInfo = document.getElementById("signedFileInfo");
        const signedFileContainer = signedFile ? signedFile.closest('.modern-file-input-container') : null;
        const acceptAvalBtn = document.getElementById("acceptAvalBtn");

        if (signedFile) {
            signedFile.value = "";
        }
        if (signedFileInfo) {
            signedFileInfo.style.display = "none";
        }
        if (signedFileContainer) {
            signedFileContainer.style.display = "block";
        }
        if (acceptAvalBtn) {
            acceptAvalBtn.disabled = true;
        }

        // ========== LIMPIEZA COMPLETA DE ARCHIVO ORIGINAL (Paso 3) ==========
        const originalFile = document.getElementById("originalFile");
        const originalFileInfo = document.getElementById("originalFileInfo");
        const originalFileContainer = originalFile ? originalFile.closest('.modern-file-input-container') : null;
        const acceptOriginalBtn = document.getElementById("acceptOriginalBtn");

        if (originalFile) {
            originalFile.value = "";
        }
        if (originalFileInfo) {
            originalFileInfo.style.display = "none";
        }
        if (originalFileContainer) {
            originalFileContainer.style.display = "block";
        }
        if (acceptOriginalBtn) {
            acceptOriginalBtn.disabled = true;
        }

        // ========== LIMPIEZA COMPLETA DE ANEXOS (Paso 2/3) ==========
        verifyAttachmentFiles = [];
        const verifyAttachmentsList = document.getElementById('verifyAttachmentsList');
        const verifyAttachmentsItems = document.getElementById('verifyAttachmentsItems');
        const verifyAttachmentsInput = document.getElementById('verifyAttachmentsInput');

        if (verifyAttachmentsList) {
            verifyAttachmentsList.style.display = 'none';
        }
        if (verifyAttachmentsItems) {
            verifyAttachmentsItems.innerHTML = '';
        }
        if (verifyAttachmentsInput) {
            verifyAttachmentsInput.value = '';
        }

        // ========== LIMPIEZA DE ESTADO Y VARIABLES GLOBALES ==========
        // Limpiar variables de detección automática
        autoDetectedSigner = null;
        window.autoDetectedFile = null;

        // Limpiar variables de professor seleccionado
        selectedProfesorId = null;
        window.selectedProfesorId = null;

        // Limpiar UI de professor seleccionado
        const selectedProfessor = document.getElementById("selectedProfessor");
        if (selectedProfessor) {
            selectedProfessor.style.display = "none";
        }

        // Limpiar búsqueda de professor
        const searchInput = document.getElementById("professorSearchInput");
        if (searchInput) {
            searchInput.value = "";
        }
        const sortOrder = document.getElementById("sortOrder");
        if (sortOrder) {
            sortOrder.value = "asc";
        }

        // Reload la lista de profesores
        if (window.loadProfessors) {
            window.loadProfessors().catch(console.error);
        }

        // ========== LIMPIEZA DE BOTONES Y RESULTADOS ==========
        const resultElem = document.getElementById("verificationResult");
        if (resultElem) {
            resultElem.innerHTML = "";
        }

        const continueBtn = document.getElementById("continueVerifyBtn");
        const retryKeyBtn = document.getElementById("retryKeyBtn");
        const restartBtn = document.getElementById("restartVerifyProcessBtn");

        if (continueBtn) continueBtn.style.display = "none";
        if (retryKeyBtn) retryKeyBtn.style.display = "none";
        if (restartBtn) restartBtn.style.display = "none";

        // ========== RESETEAR ESTADO DEL PROCESO ==========
        window.verificacionEnCurso = false;

        // ========== NOTIFICACIÓN Y NAVEGACIÓN ==========
        if (showNotificationFlag) {
            showNotification("Proceso de verificación reiniciado", "info");
        }

        // Volver al paso 1
        currentStep = 1;
        showStep(1);
    }

    // --- Función para actualizar la visualización del file input en verificar (DESACTIVADA) ---
    function updateVerifyFileInputDisplay(input) {
        // Esta función ya no se usa con el nuevo diseño moderno
        // Los nuevos inputs usan las funciones handleSignedFileInput y handleOriginalFileInput
        return;
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
                    updateContinueBtnState();
                    return;
                }

                // Validar tamaño del archivo (máximo 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    if (window.showNotification) {
                        window.showNotification("El archivo es demasiado grande. Máximo 10MB permitido", "error");
                    }
                    updateContinueBtnState();
                    return;
                }

                // Marcar proceso en curso cuando se selecciona archivo para detección automática
                window.verificacionEnCurso = true;

                detectSignerFromDocument(file).then(() => {
                    updateContinueBtnState();
                });
            } else {
                // Si se borra el archivo, limpiar estado y botón
                autoDetectedSigner = null;
                window.autoDetectedFile = null;
                const autoDetectedProfessorDiv = document.getElementById("autoDetectedProfessor");
                if (autoDetectedProfessorDiv) {
                    autoDetectedProfessorDiv.style.display = "none";
                    autoDetectedProfessorDiv.innerHTML = "";
                }
                updateContinueBtnState();
            }
        });
    }

    // --- Verificar si ya estamos en la sección verificar al cargar la página ---
    function checkInitialSection() {
        const currentHash = window.location.hash.replace("#", "");
        const verifySection = document.getElementById("verifySection");

        if (currentHash === "verificar" && verifySection && verifySection.style.display !== "none") {
            cargarProfesoresYMostrarPaso1();
        }
    }

    // Verificar la sección inicial cuando el DOM esté listo
    setTimeout(checkInitialSection, 100);

    // --- Event listener para botón cambiar profesor ---
    const changeProfessorBtn = document.getElementById("changeProfessor");
    if (changeProfessorBtn) {
        changeProfessorBtn.addEventListener('click', function () {
            // Limpiar completamente todos los formularios y campos
            limpiarFormulariosVerificar(false); // false = no mostrar notificación automáticamente

            // Mostrar notificación específica para cambio de profesor
            if (window.showNotification) {
                window.showNotification("Selección de avalador reiniciada", "info");
            }

            // Asegurar que la lista de profesores esté visible (tanto en manual como en automático)
            const professorsList = document.getElementById("professorsList");
            if (professorsList) {
                professorsList.style.display = "";
            }

            // Volver al paso 1 si estamos en otro paso
            if (currentStep !== 1) {
                showStep(1);
            }

            // Actualizar estado del botón continuar
            updateContinueBtnState();
        });
    }

    // === FUNCIONES PARA EL NUEVO DISEÑO DE PASOS 2 Y 3 ===

    function createVerificationCard(result) {
        const detailsList = (result.details || [])
            .map(item => `<li>${item}</li>`)
            .join('');

        const metaList = (result.meta || [])
            .map(item => `
                <div class="verification-meta-item">
                    <span class="verification-meta-label">${item.label}</span>
                    <span class="verification-meta-value">${item.value}</span>
                </div>
            `)
            .join('');

        return `
            <div class="verification-card ${result.status}">
                <div class="verification-card-header">
                    <div class="verification-card-title-group">
                        <h4 class="verification-card-title">${result.title}</h4>
                        <span class="status-badge ${result.status}">${result.statusLabel}</span>
                    </div>
                    <div class="verification-card-icon ${result.status}">
                        ${result.icon}
                    </div>
                </div>
                <p class="verification-card-summary">${result.summary}</p>
                ${metaList ? `<div class="verification-meta">${metaList}</div>` : ''}
                ${detailsList ? `<ul class="verification-list">${detailsList}</ul>` : ''}
            </div>
        `;
    }

    function createCombinedVerificationResult(documentResult, attachmentResult) {
        return `
            <div class="verification-summary">
                <div class="verification-summary-header">
                    <div class="verification-summary-text">
                        <h3>Resumen de verificacion</h3>
                        <p>Se muestran los resultados del documento original y de los anexos.</p>
                    </div>
                    <div class="verification-summary-meta">
                        <span>${new Date().toLocaleString('es-ES')}</span>
                        <span>RSA-4096 + SHA-256</span>
                    </div>
                </div>
                <div class="verification-grid">
                    ${createVerificationCard(documentResult)}
                    ${createVerificationCard(attachmentResult)}
                </div>
            </div>
        `;
    }

    function buildDocumentResult(docData, docError) {
        const base = {
            title: 'Documento original',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/><polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/></svg>'
        };

        if (docData) {
            if (docData.reason === "key_mismatch") {
                return {
                    ...base,
                    status: 'warning',
                    statusLabel: 'Profesor incorrecto',
                    summary: 'La llave del profesor no coincide con la firma digital del documento.',
                    details: [
                        'Selecciona el profesor correcto para continuar.',
                        'La autenticidad del aval no puede confirmarse.'
                    ]
                };
            }

            if (docData.reason === "invalid_signature") {
                return {
                    ...base,
                    status: 'error',
                    statusLabel: 'Documento alterado',
                    summary: 'El documento original no coincide con el documento avalado.',
                    details: [
                        'La llave publica coincide con la firma.',
                        'El archivo original fue modificado despues del aval.'
                    ]
                };
            }

            if (docData.valid && docData.professorMatch && docData.signatureMatch) {
                return {
                    ...base,
                    status: 'success',
                    statusLabel: 'Valido',
                    summary: 'El documento original es autentico y no ha sido modificado.',
                    details: [
                        'La firma digital es valida.',
                        'La integridad del documento esta garantizada.'
                    ]
                };
            }

            return {
                ...base,
                status: 'error',
                statusLabel: 'Error',
                summary: docData.message || 'No fue posible verificar el documento.',
                details: ['Revisa los archivos y vuelve a intentarlo.']
            };
        }

        const errorText = docError && (docError.error || docError.message);
        return {
            ...base,
            status: 'error',
            statusLabel: 'Error',
            summary: errorText || 'Error al verificar el documento.',
            details: ['Verifica que los archivos sean PDFs validos.']
        };
    }

    function buildAttachmentResult(attachmentsData, attachmentsError) {
        const base = {
            title: 'Anexos',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        };

        if (attachmentsData) {
            // Caso: Documento tiene anexos pero no se subió ninguno para verificar
            if (attachmentsData.statusCode === 'no-attachments-provided') {
                return {
                    ...base,
                    status: 'info',
                    statusLabel: 'Anexos no verificados',
                    summary: 'El documento tiene anexos registrados en sus metadatos.',
                    meta: [
                        { label: 'Anexos en documento', value: attachmentsData.expectedFileCount },
                        { label: 'Verificados', value: 0 }
                    ],
                    details: [
                        'Para verificar la integridad de los anexos, puedes recargarlos en el formulario de verificación.'
                    ]
                };
            }

            // Nuevo caso: Archivos subidos para documento que NO tiene manifest
            if (attachmentsData.statusCode === 'no-manifest-available') {
                const filesList = attachmentsData.filesExtra && attachmentsData.filesExtra.length > 0
                    ? attachmentsData.filesExtra.map(name => `• ${name}`)
                    : [];

                return {
                    ...base,
                    status: 'info',
                    statusLabel: 'Anexos sin verificar',
                    summary: attachmentsData.message || 'Los archivos subidos no pueden ser verificados contra una firma original.',
                    meta: [
                        { label: 'Esperados en documento', value: 0 },
                        { label: 'Subidos para verificar', value: attachmentsData.uploadedFileCount || 0 }
                    ],
                    details: filesList.length > 0 ? ['Archivos subidos:', ...filesList] : ['No hay archivos en el manifest del documento.']
                };
            }

            if (attachmentsData.hasAttachments === false) {
                return {
                    ...base,
                    status: 'info',
                    statusLabel: 'Sin anexos',
                    summary: attachmentsData.message || 'Este documento no incluye anexos.',
                    details: []
                };
            }

            if (attachmentsData.success && attachmentsData.statusCode !== 'no-attachments-provided') {
                return {
                    ...base,
                    status: 'success',
                    statusLabel: 'Anexos validos',
                    summary: attachmentsData.message || 'Los anexos coinciden con el manifest.',
                    meta: [
                        { label: 'Esperados', value: attachmentsData.expectedFileCount },
                        { label: 'Subidos', value: attachmentsData.uploadedFileCount }
                    ],
                    details: []
                };
            }

            const issues = [];
            if (attachmentsData.filesModified && attachmentsData.filesModified.length > 0) {
                issues.push(`Modificados: ${attachmentsData.filesModified.length}`);
            }
            if (attachmentsData.filesMissing && attachmentsData.filesMissing.length > 0) {
                issues.push(`Faltantes: ${attachmentsData.filesMissing.length}`);
            }
            if (attachmentsData.filesExtra && attachmentsData.filesExtra.length > 0) {
                issues.push(`Extra: ${attachmentsData.filesExtra.length}`);
            }

            return {
                ...base,
                status: attachmentsData.error ? 'error' : 'warning',
                statusLabel: attachmentsData.error ? 'Error' : 'Inconsistencias',
                summary: attachmentsData.error || attachmentsData.message || 'Se detectaron diferencias en los anexos.',
                meta: [
                    { label: 'Esperados', value: attachmentsData.expectedFileCount !== undefined ? attachmentsData.expectedFileCount : '-' },
                    { label: 'Subidos', value: attachmentsData.uploadedFileCount || 0 }
                ],
                details: issues
            };
        }

        const errorText = attachmentsError && (attachmentsError.error || attachmentsError.message);
        return {
            ...base,
            status: 'error',
            statusLabel: 'Error',
            summary: errorText || 'Error al verificar anexos.',
            details: ['Revisa los anexos y vuelve a intentarlo.']
        };
    }

    // Función para formatear el tamaño del archivo
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Función para manejar el archivo firmado (Paso 2)
    function handleSignedFileInput(input) {
        const file = input.files[0];
        const fileInfo = document.getElementById('signedFileInfo');
        const fileName = document.getElementById('signedFileName');
        const fileSize = document.getElementById('signedFileSize');
        const acceptBtn = document.getElementById('acceptAvalBtn');
        const fileInputContainer = input.closest('.modern-file-input-container');

        if (file) {
            // Validar que sea PDF
            if (file.type !== 'application/pdf') {
                if (window.showNotification) {
                    window.showNotification('Por favor, selecciona un archivo PDF válido', 'error');
                }
                input.value = '';
                return;
            }

            // Validar tamaño (máximo 10MB)
            if (file.size > 10 * 1024 * 1024) {
                if (window.showNotification) {
                    window.showNotification('El archivo es demasiado grande. Máximo 10MB permitido', 'error');
                }
                input.value = '';
                return;
            }

            // Marcar proceso en curso cuando se selecciona archivo importante
            window.verificacionEnCurso = true;

            // Ocultar el input y mostrar información del archivo
            if (fileInputContainer) {
                fileInputContainer.style.display = 'none';
            }
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileInfo.style.display = 'block';

            // Habilitar botón
            acceptBtn.disabled = false;

            if (window.showNotification) {
                window.showNotification('Archivo firmado cargado correctamente', 'success');
            }
        } else {
            // Mostrar el input y ocultar información del archivo
            if (fileInputContainer) {
                fileInputContainer.style.display = 'block';
            }
            fileInfo.style.display = 'none';
            acceptBtn.disabled = true;
        }
    }

    // Función para manejar el archivo original (Paso 3)
    function handleOriginalFileInput(input) {
        const file = input.files[0];
        const fileInfo = document.getElementById('originalFileInfo');
        const fileName = document.getElementById('originalFileName');
        const fileSize = document.getElementById('originalFileSize');
        const acceptBtn = document.getElementById('acceptOriginalBtn');
        const fileInputContainer = input.closest('.modern-file-input-container');

        if (file) {
            // Validar que sea PDF
            if (file.type !== 'application/pdf') {
                if (window.showNotification) {
                    window.showNotification('Por favor, selecciona un archivo PDF válido', 'error');
                }
                input.value = '';
                return;
            }

            // Validar tamaño (máximo 10MB)
            if (file.size > 10 * 1024 * 1024) {
                if (window.showNotification) {
                    window.showNotification('El archivo es demasiado grande. Máximo 10MB permitido', 'error');
                }
                input.value = '';
                return;
            }

            // Marcar proceso en curso cuando se selecciona archivo importante
            window.verificacionEnCurso = true;

            // Ocultar el input y mostrar información del archivo
            if (fileInputContainer) {
                fileInputContainer.style.display = 'none';
            }
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileInfo.style.display = 'block';

            // Habilitar botón
            acceptBtn.disabled = false;

            if (window.showNotification) {
                window.showNotification('Archivo original cargado correctamente', 'success');
            }
        } else {
            // Mostrar el input y ocultar información del archivo
            if (fileInputContainer) {
                fileInputContainer.style.display = 'block';
            }
            fileInfo.style.display = 'none';
            acceptBtn.disabled = true;
        }
    }

    // Funciones para limpiar archivos
    window.clearSignedFile = function () {
        const input = document.getElementById('signedFile');
        const fileInfo = document.getElementById('signedFileInfo');
        const acceptBtn = document.getElementById('acceptAvalBtn');
        const fileInputContainer = input.closest('.modern-file-input-container');

        input.value = '';
        fileInfo.style.display = 'none';
        acceptBtn.disabled = true;

        // Mostrar de nuevo el input
        if (fileInputContainer) {
            fileInputContainer.style.display = 'block';
        }

        if (window.showNotification) {
            window.showNotification('Archivo eliminado', 'info');
        }
    };

    window.clearOriginalFile = function () {
        const input = document.getElementById('originalFile');
        const fileInfo = document.getElementById('originalFileInfo');
        const acceptBtn = document.getElementById('acceptOriginalBtn');
        const fileInputContainer = input.closest('.modern-file-input-container');

        input.value = '';
        fileInfo.style.display = 'none';
        acceptBtn.disabled = true;

        // Mostrar de nuevo el input
        if (fileInputContainer) {
            fileInputContainer.style.display = 'block';
        }

        if (window.showNotification) {
            window.showNotification('Archivo eliminado', 'info');
        }
    };

    // Event listeners para los nuevos inputs
    const modernSignedFileInput = document.getElementById('signedFile');
    if (modernSignedFileInput) {
        modernSignedFileInput.addEventListener('change', function () {
            handleSignedFileInput(this);
        });
    }

    const modernOriginalFileInput = document.getElementById('originalFile');
    if (modernOriginalFileInput) {
        modernOriginalFileInput.addEventListener('change', function () {
            handleOriginalFileInput(this);
        });
    }

    // Inicialización final: asegurar que el botón continuar esté visible y en estado correcto
    setTimeout(() => {
        updateContinueBtnState();
        // Asegurar que el botón sea visible inicialmente
        const continueBtn = document.getElementById('continueVerifyStep1Btn');
        if (continueBtn) {
            continueBtn.style.display = 'flex';
        }
    }, 100);
});

// Función global para limpiar todos los anexos de verificación
window.clearAllVerifyAttachments = function () {
    if (typeof verifyAttachmentFiles !== 'undefined') {
        verifyAttachmentFiles.length = 0;
        const listContainer = document.getElementById('verifyAttachmentsList');
        if (listContainer) {
            listContainer.style.display = 'none';
        }
        const itemsContainer = document.getElementById('verifyAttachmentsItems');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
        }
        const inputElement = document.getElementById('verifyAttachmentsInput');
        if (inputElement) {
            inputElement.value = '';
        }
    }
};

// Función global para limpiar formularios cuando se hace logout
window.cleanVerifyFormsOnLogout = function () {

    // Limpiar anexos de verificación
    if (window.clearAllVerifyAttachments) {
        window.clearAllVerifyAttachments();
    }

    // Limpiar variables de estado
    currentStep = 1;
    verificationResult = null;
    window.verificacionEnCurso = false;

    // Limpiar archivos subidos
    const signedFileInput = document.getElementById('signedFile');
    if (signedFileInput) {
        signedFileInput.value = '';
        // Limpiar display del archivo
        const fileDisplay = signedFileInput.closest('.file-input-container')?.querySelector('.file-input-display');
        if (fileDisplay) {
            fileDisplay.innerHTML = '<span class="placeholder">Seleccionar archivo firmado...</span>';
        }
    }

    const originalFileInput = document.getElementById('originalFile');
    if (originalFileInput) {
        originalFileInput.value = '';
        // Limpiar display del archivo
        const fileDisplay = originalFileInput.closest('.file-input-container')?.querySelector('.file-input-display');
        if (fileDisplay) {
            fileDisplay.innerHTML = '<span class="placeholder">Seleccionar archivo original...</span>';
        }
    }

    // Limpiar selector de profesor
    const profesorSelect = document.getElementById('profesorSelect');
    if (profesorSelect) {
        profesorSelect.value = '';
    }

    // Limpiar resultados de verificación
    const resultContainer = document.getElementById('verificationResult');
    if (resultContainer) {
        resultContainer.innerHTML = '';
        resultContainer.style.display = 'none';
    }

    // Resetear pasos
    showStep(1);
};