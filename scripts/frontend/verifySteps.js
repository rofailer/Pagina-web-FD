document.addEventListener("DOMContentLoaded", () => {
    // --- Variables de estado ---
    let currentStep = 1;
    let selectedProfesorId = null;
    let isManualMode = false; // Cambiar a false para iniciar en modo automático
    let allProfessors = []; // Lista completa de profesores
    let filteredProfessors = []; // Lista filtrada
    let autoDetectedSigner = null; // Información del firmante detectado automáticamente

    // Referencias globales
    window.selectedProfesorId = null;

    // --- Botón global de continuar paso 1 ---
    const continueBtn = document.getElementById("continueVerifyStep1Btn");
    const verifyModeSwitch = document.getElementById("verifyModeSwitch");

    function updateContinueBtnState() {
        if (!continueBtn) return;

        // El botón siempre debe estar visible
        continueBtn.style.display = "flex";
        continueBtn.style.visibility = "visible";

        if (isManualMode) {
            if (!selectedProfesorId) {
                continueBtn.disabled = true;
                continueBtn.innerHTML = `Selecciona un profesor <svg class="btn-icon-right" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12M14 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            } else {
                continueBtn.disabled = false;
                continueBtn.innerHTML = `Continuar <svg class="btn-icon-right" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12M14 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            }
        } else {
            const autoDetectFile = document.getElementById("autoDetectFile");
            const hasFile = autoDetectFile && autoDetectFile.files.length > 0;
            if (!hasFile) {
                continueBtn.disabled = true;
                continueBtn.innerHTML = `Sube un documento <svg class="btn-icon-right" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12M14 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            } else if (!autoDetectedSigner) {
                continueBtn.disabled = true;
                continueBtn.innerHTML = `Detectando... <svg class="btn-icon-right" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12M14 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            } else {
                continueBtn.disabled = false;
                continueBtn.innerHTML = `Continuar <svg class="btn-icon-right" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12M14 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            }
        }
    }

    if (continueBtn) {
        continueBtn.onclick = () => {
            if (isManualMode) {
                if (!selectedProfesorId) {
                    showNotification("Selecciona un profesor o tutor.", "warning");
                    return;
                }
                window.verificacionEnCurso = true;
                showStep(2);
            } else {
                if (!(autoDetectedSigner && document.getElementById("autoDetectFile").files.length > 0)) {
                    showNotification("Debes subir un PDF firmado válido.", "warning");
                    return;
                }
                // Simular selección automática y avanzar
                window.verificacionEnCurso = true;
                showStep(2);
            }
        };
    }

    // Cambiar modo y actualizar botón
    if (verifyModeSwitch) {
        verifyModeSwitch.addEventListener("change", function () {
            isManualMode = !this.checked;
            updateContinueBtnState();
        });
    }

    // Actualizar botón al seleccionar profesor
    function selectProfessor(professorId, professorName) {
        selectedProfesorId = professorId;
        // ...existing code...
        updateContinueBtnState();
    }

    // Actualizar botón al cambiar input de archivo automático
    const autoDetectFileInput = document.getElementById("autoDetectFile");
    if (autoDetectFileInput) {
        autoDetectFileInput.addEventListener('change', updateContinueBtnState);
    }

    // Actualizar botón al cargar profesores (por si ya hay selección)
    setTimeout(updateContinueBtnState, 300);
    // --- Switch de modo de verificación ---
    const manualOption = document.getElementById("manualVerifyOption");
    const autoOption = document.getElementById("autoVerifyOption");
    const manualLabel = document.getElementById("manualLabel");
    const autoLabel = document.getElementById("autoLabel");
    if (verifyModeSwitch && manualOption && autoOption && manualLabel && autoLabel) {
        verifyModeSwitch.addEventListener("change", function () {
            if (this.checked) {
                // Cambiar a automático
                manualOption.style.display = "none";
                autoOption.style.display = "";
                manualLabel.classList.remove("switch-label-active");
                autoLabel.classList.add("switch-label-active");
                isManualMode = false;

                // Limpiar datos del modo manual al cambiar a automático
                selectedProfesorId = null;
                window.selectedProfesorId = null;
                const selectedProfessor = document.getElementById("selectedProfessor");
                if (selectedProfessor) {
                    selectedProfessor.style.display = "none";
                }
                // Limpiar selección visual de profesores
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

                // Limpiar datos del modo automático al cambiar a manual
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
        // Estado inicial: automático (coincide con checkbox checked)
        manualOption.style.display = "none";
        autoOption.style.display = "";
        manualLabel.classList.remove("switch-label-active");
        autoLabel.classList.add("switch-label-active");
        isManualMode = false;

        // Asegurar que el botón esté visible y el estado sea correcto
        updateContinueBtnState();
    }

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
        // Mostrar estado de carga en selected-professor
        const selectedProfessorDiv = document.getElementById("selectedProfessor");
        const selectedProfessorName = document.getElementById("selectedProfessorName");
        const continueBtn = document.getElementById("acceptProfesorBtn");
        const fileInput = document.getElementById("autoDetectFile");

        // Deshabilitar controles durante el proceso
        if (continueBtn) continueBtn.disabled = true;
        if (fileInput) fileInput.disabled = true;

        // Mostrar mensaje de carga en selected-professor
        if (selectedProfessorDiv && selectedProfessorName) {
            selectedProfessorDiv.style.display = "block";
            selectedProfessorName.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; color: #007bff;">
                    <div style="width: 16px; height: 16px; border: 2px solid #007bff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>Analizando documento y detectando firmante...</span>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }

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

            // Simular tiempo adicional de procesamiento (mínimo 2.5 segundos total)
            const minProcessingTime = 2500; // 2.5 segundos
            const startTime = Date.now();
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, minProcessingTime - elapsedTime);

            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            } if (result.success) {
                // Detección exitosa
                autoDetectedSigner = result.signer;

                // Guardar archivo para uso en paso 2
                window.autoDetectedFile = file;

                // Seleccionar automáticamente al profesor en la lista
                selectProfessorAutomatically(result.signer.id);

                // Mostrar resultado exitoso en selected-professor
                if (selectedProfessorName) {
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

                // Habilitar el botón continuar
                const acceptBtn = document.getElementById("acceptProfesorBtn");
                if (acceptBtn) {
                    acceptBtn.disabled = false;
                }

                // Mostrar notificación de éxito
                if (window.showNotification) {
                    window.showNotification(`Firmante detectado automáticamente: ${result.signer.nombre}`, "success");
                }

                // En modo automático, avanzar automáticamente al paso 2
                if (!isManualMode) {
                    // Deshabilitar navegación manual durante proceso automático
                    const navButtons = document.querySelectorAll('.step-btn, .step-indicator');
                    navButtons.forEach(btn => btn.style.pointerEvents = 'none');

                    setTimeout(() => {
                        if (window.showNotification) {
                            window.showNotification("Avanzando automáticamente al paso 2...", "info");
                        }
                        showStep(2);

                        // Pre-llenar el archivo firmado en el paso 2
                        if (window.autoDetectedFile) {
                            const signedFileInput = document.getElementById("signedFile");
                            if (signedFileInput) {
                                // Crear un nuevo FileList con el archivo
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(window.autoDetectedFile);
                                signedFileInput.files = dataTransfer.files;

                                // Actualizar la UI del paso 2
                                handleSignedFileInput(signedFileInput);

                                // Automáticamente continuar al paso 3 después de 3 segundos
                                setTimeout(() => {
                                    if (window.showNotification) {
                                        window.showNotification("Avanzando automáticamente al paso 3...", "info");
                                    }
                                    showStep(3);
                                    if (window.showNotification) {
                                        window.showNotification("Archivo firmado cargado automáticamente. Sube el documento original para comparar.", "info");
                                    }

                                    // Rehabilitar navegación manual
                                    navButtons.forEach(btn => btn.style.pointerEvents = 'auto');
                                }, 3000);
                            }
                        }
                    }, 2000); // Esperar 2 segundos para que el usuario vea la notificación y resultado
                }

            } else {
                // Error en la detección
                autoDetectedSigner = null;
                window.autoDetectedFile = null;

                // Ocultar selected-professor en caso de error
                if (selectedProfessorDiv) {
                    selectedProfessorDiv.style.display = "none";
                }

                // Mostrar notificación de error
                if (window.showNotification) {
                    window.showNotification(result.message || 'No se pudo detectar el firmante. Selecciona manualmente al profesor.', "warning");
                }
            }

        } catch (error) {
            console.error("Error en detección automática:", error);
            autoDetectedSigner = null;
            window.autoDetectedFile = null;

            // Ocultar selected-professor en caso de error de conexión
            if (selectedProfessorDiv) {
                selectedProfessorDiv.style.display = "none";
            }

            if (window.showNotification) {
                window.showNotification("Error al procesar el documento", "error");
            }
        } finally {
            // Rehabilitar controles al finalizar
            if (continueBtn) continueBtn.disabled = false;
            if (fileInput) fileInput.disabled = false;
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

            // Solo ocultar la lista de profesores en modo automático
            if (!isManualMode) {
                const professorsList = document.getElementById("professorsList");
                if (professorsList) {
                    professorsList.style.display = "none";
                }
            }

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

    // Las notificaciones ahora se manejan con el sistema global de notifications.js

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
        // Resetear formularios básicos
        const verifyAvalForm = document.getElementById("verifyAvalForm");
        const verifyOriginalForm = document.getElementById("verifyOriginalForm");
        if (verifyAvalForm) verifyAvalForm.reset();
        if (verifyOriginalForm) verifyOriginalForm.reset();

        // Limpiar todos los file inputs y sus visualizaciones

        // 1. Archivo firmado (signedFile) - paso 2
        const signedFile = document.getElementById("signedFile");
        const signedFileInfo = document.getElementById("signedFileInfo");
        const acceptAvalBtn = document.getElementById("acceptAvalBtn");
        if (signedFile) {
            signedFile.value = "";
            if (signedFileInfo) signedFileInfo.style.display = "none";
            if (acceptAvalBtn) acceptAvalBtn.disabled = true;
        }

        // 2. Archivo original (originalFile) - paso 3
        const originalFile = document.getElementById("originalFile");
        const originalFileInfo = document.getElementById("originalFileInfo");
        const acceptOriginalBtn = document.getElementById("acceptOriginalBtn");
        if (originalFile) {
            originalFile.value = "";
            if (originalFileInfo) originalFileInfo.style.display = "none";
            if (acceptOriginalBtn) acceptOriginalBtn.disabled = true;
        }

        // 3. Archivo de detección automática (autoDetectFile) - paso 1 modo automático
        const autoDetectFile = document.getElementById("autoDetectFile");
        if (autoDetectFile) {
            autoDetectFile.value = "";
            // Limpiar el label visual
            const autoDetectLabel = document.querySelector('label[for="autoDetectFile"]');
            if (autoDetectLabel) {
                const textSpan = autoDetectLabel.querySelector('.file-input-text');
                if (textSpan) textSpan.textContent = 'Subir documento firmado';
                autoDetectLabel.classList.remove('has-file', 'auto-detected', 'error');
            }
        }

        // 4. Limpiar resultado de detección automática
        const autoDetectResult = document.getElementById("autoDetectResult");
        if (autoDetectResult) {
            autoDetectResult.style.display = "none";
            autoDetectResult.className = "auto-detect-result";
            autoDetectResult.innerHTML = "";
        }

        // Resetear variables de estado de detección automática
        autoDetectedSigner = null;
        window.autoDetectedFile = null;

        // 5. Limpiar búsqueda y selección de profesor (modo manual)
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

        // Limpiar selección visual de profesores
        const allItems = document.querySelectorAll('.professor-item');
        allItems.forEach(item => item.classList.remove('selected'));

        // 6. Resetear botones de pasos
        const continueVerifyStep1Btn = document.getElementById("continueVerifyStep1Btn");
        if (continueVerifyStep1Btn) {
            continueVerifyStep1Btn.disabled = true;
        }

        // 7. Limpiar resultado de verificación
        const verificationResult = document.getElementById("verificationResult");
        if (verificationResult) {
            verificationResult.textContent = "";
        }

        // 8. Ocultar botones de resultado
        document.getElementById("continueVerifyBtn").style.display = "none";
        document.getElementById("retryKeyBtn").style.display = "none";
        const restartBtn = document.getElementById("restartVerifyProcessBtn");
        if (restartBtn) restartBtn.style.display = "none";

        // 9. Resetear variables de estado globales
        selectedProfesorId = null;
        window.selectedProfesorId = null;
        window.verificacionEnCurso = false;

        // 10. Actualizar estado del botón continuar paso 1
        updateContinueBtnState();

        // Solo mostrar notificación si se especifica explícitamente
        if (showNotificationFlag) {
            if (window.showNotification) {
                window.showNotification("Proceso reiniciado", "info");
            }
        }

        // Recargar y mostrar todos los profesores si están disponibles
        if (allProfessors.length > 0) {
            filteredProfessors = [...allProfessors];
            displayProfessors(filteredProfessors);
        }
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

    // Función para crear resultado de verificación moderno
    function createModernVerificationResult(isValid, details = {}) {
        const resultHTML = `
            <div class="modern-verification-result ${isValid ? 'success' : 'error'}">
                <div class="result-header">
                    <div class="result-icon-container">
                        <div class="result-icon-wrapper ${isValid ? 'success' : 'error'}">
                            <svg class="result-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                ${isValid ?
                '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2"/>' :
                '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="m15 9-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>'
            }
                            </svg>
                        </div>
                    </div>
                    <div class="result-header-content">
                        <h3 class="result-title">${isValid ? 'Verificación Exitosa' : 'Verificación Fallida'}</h3>
                        <p class="result-subtitle">${isValid ?
                'El documento es auténtico y no ha sido alterado' :
                'El documento no pudo ser verificado correctamente'
            }</p>
                    </div>
                </div>
                
                <div class="result-details">
                    <div class="detail-item">
                        <div class="detail-label">Estado del documento:</div>
                        <div class="detail-value ${isValid ? 'success' : 'error'}">
                            <span class="detail-status-icon">
                                ${isValid ? '✓' : '✗'}
                            </span>
                            ${isValid ? 'Íntegro y auténtico' : 'Alterado o inválido'}
                        </div>
                    </div>
                    
                    ${details.professorName ? `
                    <div class="detail-item">
                        <div class="detail-label">Avalador:</div>
                        <div class="detail-value">${details.professorName}</div>
                    </div>
                    ` : ''}
                    
                    ${details.signatureDate ? `
                    <div class="detail-item">
                        <div class="detail-label">Fecha de firma:</div>
                        <div class="detail-value">${details.signatureDate}</div>
                    </div>
                    ` : ''}
                    
                    <div class="detail-item">
                        <div class="detail-label">Algoritmo de verificación:</div>
                        <div class="detail-value">RSA-4096 + SHA-256</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Tiempo de verificación:</div>
                        <div class="detail-value">${new Date().toLocaleString('es-ES')}</div>
                    </div>
                </div>
                
                ${isValid ? `
                <div class="verification-success-message">
                    <div class="success-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2"/>
                            <path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="success-content">
                        <h4>Documento verificado exitosamente</h4>
                        <p>Este documento mantiene su integridad original y la firma digital es válida. Puedes confiar en su autenticidad.</p>
                    </div>
                </div>
                ` : `
                <div class="verification-error-message">
                    <div class="error-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="error-content">
                        <h4>Verificación fallida</h4>
                        <p>El documento ha sido alterado después de la firma o la firma digital no es válida. No se puede garantizar su autenticidad.</p>
                        <div class="error-suggestions">
                            <h5>Posibles causas:</h5>
                            <ul>
                                <li>El documento fue modificado después de ser firmado</li>
                                <li>La firma no corresponde al avalador seleccionado</li>
                                <li>El archivo original no coincide con el firmado</li>
                                <li>Corrupción en los archivos</li>
                            </ul>
                        </div>
                    </div>
                </div>
                `}
            </div>
        `;

        return resultHTML;
    }

    // Función global para mostrar resultados de verificación modernos
    window.showModernVerificationResult = function (isValid, details = {}) {
        const resultContainer = document.getElementById('verificationResult');
        if (resultContainer) {
            resultContainer.innerHTML = createModernVerificationResult(isValid, details);

            // Mostrar botones apropiados según el resultado
            const continueBtn = document.getElementById('continueVerifyBtn');
            const retryBtn = document.getElementById('retryKeyBtn');
            const restartBtn = document.getElementById('restartVerifyProcessBtn');

            if (continueBtn) {
                continueBtn.style.display = isValid ? 'inline-flex' : 'none';
            }

            if (retryBtn) {
                retryBtn.style.display = !isValid ? 'inline-flex' : 'none';
            }

            if (restartBtn) {
                restartBtn.style.display = 'inline-flex';
            }
        }
    };

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

// Función global para limpiar formularios cuando se hace logout
window.cleanVerifyFormsOnLogout = function () {

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