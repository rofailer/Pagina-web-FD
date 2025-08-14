// import { firmarDocumento } from "./routes/firmar.js";
// import { verificarDocumento } from "./routes/verificar.js";

document.addEventListener("DOMContentLoaded", () => {
    // --- Navegación de secciones ---
    const sections = {
        inicio: document.getElementById("inicioSection"),
        firmar: document.getElementById("firmarSection"),
        verificar: document.getElementById("verifySection"),
        contacto: document.getElementById("contactoSection"),
        perfil: document.getElementById("perfilSection"),
        opciones: document.getElementById("opcionesSection"),
    };

    const links = {
        inicio: document.querySelector('a[href="#inicio"]'),
        firmar: document.querySelector('a[href="#firmar"]'),
        verificar: document.querySelector('a[href="#verificar"]'),
        contacto: document.querySelector('a[href="#contacto"]'),
        perfil: document.querySelector('a[href="#perfil"]'),
        opciones: document.querySelector('a[href="#opciones"]')
    };

    // También capturar otros enlaces que pueden navegar (logos, etc.)
    const additionalNavLinks = [
        ...document.querySelectorAll('a[href^="#"]'),
        ...document.querySelectorAll('[onclick*="showSection"]'),
        document.querySelector('.navbar-brand'), // logo principal
        document.querySelector('.logo') // cualquier otro logo
    ].filter(Boolean);

    function hideAllSections() {
        Object.values(sections).forEach(section => {
            if (section) section.style.display = "none";
        });
    }

    function setActiveLink(sectionKey) {
        Object.keys(links).forEach(key => {
            if (links[key]) {
                if (key === sectionKey) {
                    links[key].classList.add("active");
                } else {
                    links[key].classList.remove("active");
                }
            }
        });
    }

    // Función para verificar si un proceso ha terminado completamente
    function isProcessCompleted(processType) {
        if (processType === 'firma') {
            // El proceso de firma está completo si estamos en el paso 3 y hay URL de descarga
            const currentStep = getCurrentSignStep();
            return currentStep === 3 && window.downloadUrl;
        } else if (processType === 'verificacion') {
            // El proceso de verificación está completo si estamos en el paso 4 y se mostró un resultado
            const currentStep = getCurrentVerifyStep();
            const hasResult = document.getElementById('verificationResult')?.innerHTML?.includes('alert-message');
            return currentStep === 4 && hasResult;
        }
        return false;
    }

    // Función para obtener el paso actual de firma
    function getCurrentSignStep() {
        const steps = ['signStep1', 'signStep2', 'signStep3'];
        for (let i = 0; i < steps.length; i++) {
            const step = document.getElementById(steps[i]);
            if (step && step.style.display !== 'none') {
                return i + 1;
            }
        }
        return 1;
    }

    // Función para obtener el paso actual de verificación
    function getCurrentVerifyStep() {
        const steps = ['verifyStep1', 'verifyStep2', 'verifyStep3', 'verifyStep4'];
        for (let i = 0; i < steps.length; i++) {
            const step = document.getElementById(steps[i]);
            if (step && step.style.display !== 'none') {
                return i + 1;
            }
        }
        return 1;
    }

    // Función mejorada para limpiar formularios automáticamente
    function autoCleanFormsOnSectionChange(newSection) {
        console.log(`🔄 Evaluando limpieza automática al cambiar a sección: ${newSection}`);

        const currentProcesses = {
            firma: window.firmaEnCurso,
            verificacion: window.verificacionEnCurso
        };

        // Limpiar formularios de secciones inactivas SOLO si hay progreso real
        Object.keys(currentProcesses).forEach(processType => {
            const isProcessActive = currentProcesses[processType];
            const processCompleted = isProcessCompleted(processType);
            const hasProgress = hasRealProgress(processType);
            const isLeavingProcessSection =
                (processType === 'firma' && newSection !== 'firmar') ||
                (processType === 'verificacion' && newSection !== 'verificar');

            // CRITERIO ESTRICTO: Solo limpiar si HAY PROGRESO REAL y estamos saliendo de la sección
            // Y además el proceso está completo O no está activo
            const shouldCleanWithProgress = isLeavingProcessSection && hasProgress &&
                (processCompleted || !isProcessActive);

            if (shouldCleanWithProgress) {
                console.log(`🧹 Limpiando proceso de ${processType} con progreso real`);

                if (processType === 'firma') {
                    // Limpiar con notificación porque había progreso real
                    if (window.limpiarFormulariosFirmar) {
                        window.limpiarFormulariosFirmar(true); // true = mostrar notificación
                    }
                    window.firmaEnCurso = false;
                    window.selectedKeyId = null;

                    // Reset file input visual state
                    const fileInput = document.getElementById('fileInput');
                    if (fileInput) {
                        fileInput.value = '';
                        const label = fileInput.nextElementSibling;
                        if (label) {
                            const textSpan = label.querySelector('.file-input-text');
                            const iconSpan = label.querySelector('.file-input-icon');
                            if (textSpan) textSpan.textContent = 'Seleccionar archivo PDF';
                            if (iconSpan) iconSpan.textContent = '+';
                            label.classList.remove('has-file', 'error');
                        }
                    }
                } else if (processType === 'verificacion') {
                    // Limpiar con notificación porque había progreso real
                    if (window.limpiarFormulariosVerificar) {
                        window.limpiarFormulariosVerificar(true); // true = mostrar notificación
                    }
                    window.verificacionEnCurso = false;
                    window.selectedProfesorId = null;

                    // Reset file inputs visual state
                    const signedFileInput = document.getElementById('signedFileInput');
                    const originalFileInput = document.getElementById('originalFileInput');

                    [signedFileInput, originalFileInput].forEach(input => {
                        if (input) {
                            input.value = '';
                            const label = input.nextElementSibling;
                            if (label) {
                                const textSpan = label.querySelector('.file-input-text');
                                const iconSpan = label.querySelector('.file-input-icon');
                                if (textSpan) textSpan.textContent = 'Seleccionar archivo PDF';
                                if (iconSpan) iconSpan.textContent = '+';
                                label.classList.remove('has-file', 'error');
                            }
                        }
                    });
                }
            } else if (isLeavingProcessSection && !hasProgress) {
                console.log(`ℹ️ No se limpia ${processType} porque no hay progreso real que conservar`);
            } else if (isLeavingProcessSection && hasProgress) {
                console.log(`⚠️ No se limpia ${processType} porque tiene progreso real y está activo`);
            }
        });
    }

    function showSection(sectionKey) {
        // Ejecutar limpieza automática antes de cambiar de sección
        autoCleanFormsOnSectionChange(sectionKey);

        hideAllSections();
        if (sections[sectionKey]) {
            sections[sectionKey].style.display = "block";
            sections[sectionKey].scrollIntoView({ behavior: "auto" });
        }
        setActiveLink(sectionKey);
        window.scrollTo(0, 0);

        // Manejo especial de clases CSS para la sección de inicio
        if (sectionKey === 'inicio') {
            document.body.setAttribute('data-current-section', 'inicio');
            document.body.classList.add('home-section-active');
        } else {
            document.body.removeAttribute('data-current-section');
            document.body.classList.remove('home-section-active');
        }

        // Cargar datos específicos según la sección
        if (sectionKey === 'firmar') {
            // Cargar llaves para la sección de firmar
            if (window.loadUserKeys) {
                window.loadUserKeys();
            }
        } else if (sectionKey === 'verificar') {
            // Cargar profesores automáticamente para la sección de verificar
            if (window.cargarProfesoresYMostrarPaso1) {
                console.log("🔄 Sección verificar mostrada, cargando profesores automáticamente...");
                window.cargarProfesoresYMostrarPaso1();
            }
        } else if (sectionKey === 'perfil') {
            // Cargar llaves para la sección de perfil
            if (window.loadKeys) {
                window.loadKeys();
            }
            if (window.loadActiveKey) {
                window.loadActiveKey();
            }
        }
        return false;
    }

    // --- Variables de estado global ---
    window.firmaEnCurso = false;
    window.verificacionEnCurso = false;

    // Función mejorada para detectar progreso real en procesos
    function hasRealProgress(processType) {
        if (processType === 'firma') {
            const currentStep = getCurrentSignStep();
            const fileInput = document.getElementById('fileInput');
            const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
            const hasSelectedKey = window.selectedKeyId !== null;
            const isInProgress = window.firmaEnCurso;
            const isCompleted = isProcessCompleted('firma');

            // Hay progreso si:
            // 1. Está en proceso activo, O
            // 2. Tiene archivo y llave seleccionada (paso 2), O
            // 3. Está en paso 3 (resultado mostrado)
            return isInProgress || (hasFile && hasSelectedKey && currentStep >= 2) || currentStep === 3 || isCompleted;
        } else if (processType === 'verificacion') {
            const currentStep = getCurrentVerifyStep();
            const signedFileInput = document.getElementById('signedFileInput');
            const originalFileInput = document.getElementById('originalFileInput');
            const hasSignedFile = signedFileInput && signedFileInput.files && signedFileInput.files.length > 0;
            const hasOriginalFile = originalFileInput && originalFileInput.files && originalFileInput.files.length > 0;
            const hasSelectedProfesor = window.selectedProfesorId !== null;
            const isInProgress = window.verificacionEnCurso;
            const isCompleted = isProcessCompleted('verificacion');

            // Hay progreso si:
            // 1. Está en proceso activo, O
            // 2. Tiene ambos archivos y profesor (paso 3), O
            // 3. Está en paso 4 (resultado mostrado), O
            // 4. Tiene al menos un archivo subido
            return isInProgress || (hasSignedFile && hasOriginalFile && hasSelectedProfesor && currentStep >= 3) ||
                currentStep === 4 || isCompleted || hasSignedFile || hasOriginalFile;
        }
        return false;
    }

    // Función para obtener detalles específicos del progreso
    function getProgressDetails(processType) {
        if (processType === 'firma') {
            const currentStep = getCurrentSignStep();
            const fileInput = document.getElementById('fileInput');
            const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
            const hasSelectedKey = window.selectedKeyId !== null;
            const isCompleted = isProcessCompleted('firma');

            if (isCompleted) {
                return 'proceso de firma completado';
            } else if (currentStep === 3) {
                return 'resultado de firma generado';
            } else if (hasFile && hasSelectedKey) {
                return 'archivo y llave seleccionados';
            } else if (hasFile) {
                return 'archivo seleccionado para firmar';
            } else if (hasSelectedKey) {
                return 'llave digital seleccionada';
            }
            return 'configuración en progreso';
        } else if (processType === 'verificacion') {
            const currentStep = getCurrentVerifyStep();
            const signedFileInput = document.getElementById('signedFileInput');
            const originalFileInput = document.getElementById('originalFileInput');
            const hasSignedFile = signedFileInput && signedFileInput.files && signedFileInput.files.length > 0;
            const hasOriginalFile = originalFileInput && originalFileInput.files && originalFileInput.files.length > 0;
            const hasSelectedProfesor = window.selectedProfesorId !== null;
            const isCompleted = isProcessCompleted('verificacion');

            if (isCompleted) {
                return 'proceso de verificación completado';
            } else if (currentStep === 4) {
                return 'resultado de verificación generado';
            } else if (hasSignedFile && hasOriginalFile && hasSelectedProfesor) {
                return 'archivos y profesor seleccionados';
            } else {
                const progressParts = [];
                if (hasSignedFile) progressParts.push('documento firmado');
                if (hasOriginalFile) progressParts.push('documento original');
                if (hasSelectedProfesor) progressParts.push('profesor seleccionado');
                return progressParts.length > 0 ? progressParts.join(' y ') : 'configuración en progreso';
            }
        }
        return 'proceso en progreso';
    }

    // --- Sistema de confirmación de navegación ---
    let pendingNavigation = null;
    const confirmModal = document.getElementById('navigationConfirmModal');
    const confirmBtn = document.getElementById('confirmNavigationBtn');
    const cancelBtn = document.getElementById('cancelNavigationBtn');

    function showNavigationConfirmModal(targetSection, processType) {
        const modal = confirmModal;
        const title = modal.querySelector('.navigation-confirm-title');
        const message = modal.querySelector('.navigation-confirm-message');
        const icon = modal.querySelector('.navigation-confirm-icon');

        // Verificar si realmente hay progreso que perder
        const hasProgress = hasRealProgress(processType);
        const progressDetails = getProgressDetails(processType);

        if (processType === 'firma') {
            title.textContent = '¿Abandonar el proceso de firma?';
            message.textContent = hasProgress ?
                `Tienes ${progressDetails}. Si continúas, perderás todo el progreso.` :
                'No hay progreso que perder.';
            icon.textContent = '📝';
        } else if (processType === 'verificacion') {
            title.textContent = '¿Abandonar la verificación?';
            message.textContent = hasProgress ?
                `Tienes ${progressDetails}. Si continúas, perderás todo el progreso.` :
                'No hay progreso que perder.';
            icon.textContent = '🔍';
        }

        // Solo mostrar el modal si realmente hay progreso que perder
        if (!hasProgress) {
            // No hay progreso real, navegar directamente y limpiar
            autoCleanFormsOnSectionChange(targetSection);
            window.verificacionEnCurso = false;
            window.firmaEnCurso = false;
            showSection(targetSection);
            window.history.replaceState(null, null, `#${targetSection}`);
            return;
        }

        pendingNavigation = targetSection;
        modal.classList.add('show');

        // Focus en cancelar por defecto (más seguro)
        setTimeout(() => cancelBtn.focus(), 100);
    }

    function hideNavigationConfirmModal() {
        confirmModal.classList.remove('show');
        pendingNavigation = null;
    }

    // Event listeners para el modal
    confirmBtn.addEventListener('click', () => {
        if (pendingNavigation) {
            const targetSection = pendingNavigation;

            // Limpiar procesos según la sección que se está abandonando
            const currentSection = getCurrentSection();

            if (currentSection === 'firmar') {
                console.log('🧹 Limpiando proceso de firma por confirmación del usuario');
                if (window.limpiarFormulariosFirmar) {
                    window.limpiarFormulariosFirmar(true); // true = mostrar notificación porque el usuario confirmó
                }
                window.firmaEnCurso = false;
                window.selectedKeyId = null;

                // Limpiar file input
                const fileInput = document.getElementById('fileInput');
                if (fileInput) {
                    fileInput.value = '';
                    // Actualizar visualización del input
                    const label = fileInput.nextElementSibling;
                    if (label) {
                        const textSpan = label.querySelector('.file-input-text');
                        const iconSpan = label.querySelector('.file-input-icon');
                        if (textSpan) textSpan.textContent = 'Seleccionar archivo PDF';
                        if (iconSpan) iconSpan.textContent = '+';
                        label.classList.remove('has-file', 'error');
                    }
                }
            } else if (currentSection === 'verificar') {
                console.log('🧹 Limpiando proceso de verificación por confirmación del usuario');
                if (window.limpiarFormulariosVerificar) {
                    window.limpiarFormulariosVerificar(true); // true = mostrar notificación porque el usuario confirmó
                }
                window.verificacionEnCurso = false;
                window.selectedProfesorId = null;

                // Limpiar file inputs
                const signedFileInput = document.getElementById('signedFileInput');
                const originalFileInput = document.getElementById('originalFileInput');

                [signedFileInput, originalFileInput].forEach(input => {
                    if (input) {
                        input.value = '';
                        // Actualizar visualización del input
                        const label = input.nextElementSibling;
                        if (label) {
                            const textSpan = label.querySelector('.file-input-text');
                            const iconSpan = label.querySelector('.file-input-icon');
                            if (textSpan) textSpan.textContent = 'Seleccionar archivo PDF';
                            if (iconSpan) iconSpan.textContent = '+';
                            label.classList.remove('has-file', 'error');
                        }
                    }
                });
            }

            hideNavigationConfirmModal();

            // Navegar directamente sin disparar eventos adicionales
            showSection(targetSection);
            window.history.replaceState(null, null, `#${targetSection}`);
        }
    });

    cancelBtn.addEventListener('click', hideNavigationConfirmModal);

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && confirmModal.classList.contains('show')) {
            hideNavigationConfirmModal();
        }
    });

    // Cerrar modal clickeando fuera
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            hideNavigationConfirmModal();
        }
    });

    function showSectionFromHash() {
        const hash = window.location.hash.replace("#", "");
        const sectionKey = hash && sections[hash] ? hash : "inicio";

        // Verificar si hay procesos en curso antes de navegar
        const hasProcessInProgress = window.verificacionEnCurso || window.firmaEnCurso;
        const isLeavingCurrentProcess =
            (window.verificacionEnCurso && sectionKey !== "verificar") ||
            (window.firmaEnCurso && sectionKey !== "firmar");

        if (hasProcessInProgress && isLeavingCurrentProcess) {
            // Prevenir la navegación y mostrar modal
            const currentSection = Object.keys(sections).find(key =>
                sections[key] && sections[key].style.display !== "none"
            ) || "inicio";

            // Restaurar hash anterior temporalmente
            window.history.replaceState(null, null, `#${currentSection}`);

            // Mostrar modal de confirmación
            const processType = window.firmaEnCurso ? 'firma' : 'verificacion';
            showNavigationConfirmModal(sectionKey, processType);
            return;
        }

        // Navegación normal
        showSection(sectionKey);
    }

    showSectionFromHash();
    window.addEventListener("hashchange", showSectionFromHash);

    Object.keys(links).forEach((key) => {
        if (links[key]) {
            links[key].addEventListener("click", (event) => {
                event.preventDefault();

                // Verificar si hay procesos en curso
                const hasProcessInProgress = window.verificacionEnCurso || window.firmaEnCurso;
                const isLeavingCurrentProcess =
                    (window.verificacionEnCurso && key !== "verificar") ||
                    (window.firmaEnCurso && key !== "firmar");

                if (hasProcessInProgress && isLeavingCurrentProcess) {
                    // Mostrar modal de confirmación personalizado
                    const processType = window.firmaEnCurso ? 'firma' : 'verificacion';
                    showNavigationConfirmModal(key, processType);
                    return;
                }

                // Validación de sesión solo para la sección de firmar
                if (key === "firmar" && !localStorage.getItem("token")) {
                    if (window.showLoginModal) window.showLoginModal();
                    else alert("Debes iniciar sesión para firmar documentos.");
                    window.location.hash = "inicio";
                    if (document.getElementById("inicioSection")) document.getElementById("inicioSection").style.display = "";
                    if (document.getElementById("firmarSection")) document.getElementById("firmarSection").style.display = "none";
                    return;
                }

                // Navegación normal
                window.location.hash = key;
            });
        }
    });

    // Función universal para verificar navegación
    function checkNavigationConfirmation(targetSection, event) {
        // Verificar si hay procesos en curso
        const hasProcessInProgress = window.verificacionEnCurso || window.firmaEnCurso;
        const isLeavingCurrentProcess =
            (window.verificacionEnCurso && targetSection !== "verificar") ||
            (window.firmaEnCurso && targetSection !== "firmar");

        if (hasProcessInProgress && isLeavingCurrentProcess) {
            event.preventDefault();
            // Mostrar modal de confirmación personalizado
            const processType = window.firmaEnCurso ? 'firma' : 'verificacion';
            showNavigationConfirmModal(targetSection, processType);
            return false;
        }
        return true;
    }

    // Listeners para enlaces adicionales (logos, etc.)
    additionalNavLinks.forEach(link => {
        if (link) {
            link.addEventListener("click", (event) => {
                const href = link.getAttribute('href');
                const onclick = link.getAttribute('onclick');

                let targetSection = 'inicio'; // default

                if (href && href.startsWith('#')) {
                    targetSection = href.replace('#', '') || 'inicio';
                } else if (onclick && onclick.includes('showSection')) {
                    // Extraer sección del onclick
                    const match = onclick.match(/showSection\(['"]([^'"]+)['"]\)/);
                    if (match) targetSection = match[1];
                } else if (link.classList.contains('navbar-brand') || link.classList.contains('logo')) {
                    targetSection = 'inicio';
                }

                // Verificar confirmación de navegación
                if (!checkNavigationConfirmation(targetSection, event)) {
                    return; // Detener navegación si se necesita confirmación
                }

                // Si llega aquí, navegar normalmente
                if (targetSection && sections[targetSection]) {
                    window.location.hash = targetSection;
                }
            });
        }
    });

    // --- Logout ---
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userName");
            localStorage.removeItem("user");
            localStorage.removeItem("keysGuideShown");

            // Limpiar estados de procesos en curso
            window.firmaEnCurso = false;
            window.verificacionEnCurso = false;

            // Redirigir a inicio
            window.location.hash = "inicio";

            // Recargar después de un pequeño delay
            setTimeout(() => {
                window.location.reload();
            }, 100);
        });
    }

    // --- Inputs de archivo personalizados ---
    document.querySelectorAll('.custom-file-input').forEach(function (input) {
        input.addEventListener('change', function () {
            const fileName = this.files[0] ? this.files[0].name : 'Ningún archivo seleccionado';
            const label = this.closest('.file');
            if (label) {
                label.querySelector('.file-custom').textContent = fileName;
            }
        });
    });

    // Limpia los inputs de archivo y el nombre al cambiar de sección (hashchange)
    function resetFileInputs() {
        document.querySelectorAll('.custom-file-input').forEach(function (input) {
            input.value = "";
            const label = input.closest('.file');
            if (label) {
                label.querySelector('.file-custom').textContent = "Ningún archivo seleccionado";
            }
        });
    }
    window.addEventListener("hashchange", resetFileInputs);
    resetFileInputs();

    // --- Ejemplo: lógica de llaves (puedes modularizar esto si lo deseas) ---
    const keyDisplay = document.getElementById("keyDisplay");
    const privateKeyElement = document.getElementById("privateKey");
    const publicKeyElement = document.getElementById("publicKey");
    const expirationElement = document.getElementById("expirationTime");
    const registerButton = document.getElementById("register");
    if (registerButton && !registerButton.dataset.eventRegistered) {
        registerButton.addEventListener("click", async () => {
            try {
                const response = await fetch("/generate-keys", { method: "POST" });
                const { privateKey, publicKey, expirationTime } = await response.json();

                privateKeyElement.textContent = privateKey;
                publicKeyElement.textContent = publicKey;

                const updateExpiration = () => {
                    const currentTime = Date.now();
                    const timeLeft = Math.max(0, expirationTime - currentTime);

                    if (timeLeft === 0) {
                        expirationElement.textContent = "La llave ha expirado.";
                        clearInterval(intervalId);
                    } else {
                        const secondsLeft = Math.floor(timeLeft / 1000);
                        expirationElement.textContent = `Tiempo restante: ${secondsLeft} segundos.`;
                    }
                };

                updateExpiration();
                const intervalId = setInterval(updateExpiration, 1000);

                keyDisplay.style.display = "block";
            } catch (error) {
                console.error("Error al generar las llaves:", error);
                alert("Error al generar las llaves.");
            }
        });
        registerButton.dataset.eventRegistered = "true";
    }

    // --- Selección de llave activa ---
    // Esta funcionalidad ahora se maneja en keys.frontend.js y signSteps.js
    // para evitar conflictos entre archivos

    // --- Manejo de input de archivo para mostrar nombre y activar "X" (si usas este patrón) ---
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
        fileInput.addEventListener("change", function (event) {
            const file = event.target.files[0];
            const fileNameElement = document.getElementById("fileName");
            const deleteButton = document.getElementById("deleteButton");

            if (file) {
                const validExtensions = [".pdf", ".doc", ".docx"];
                const fileName = file.name.toLowerCase();
                const isValid = validExtensions.some(extension => fileName.endsWith(extension));

                if (isValid) {
                    if (fileNameElement) fileNameElement.textContent = `Archivo seleccionado: ${file.name}`;
                    if (deleteButton) deleteButton.classList.add("active");
                } else {
                    alert("El documento no es válido. Por favor, selecciona un archivo PDF, DOC o DOCX.");
                    event.target.value = "";
                    if (fileNameElement) fileNameElement.textContent = "Archivo seleccionado: Ninguno";
                    if (deleteButton) deleteButton.classList.remove("active");
                }
            }
        });
    }

    // --- Firmar documento (submit del formulario) ---
    const signForm = document.getElementById("signForm");
    if (signForm) {
        signForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            // await firmarDocumento(signForm);
        });
    }

    // --- Verificar documento ---
    const verifyForm = document.getElementById("verifyForm");
    if (verifyForm) {
        verifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            // await verificarDocumento(verifyForm);
        });
    }

    // --- Mostrar la página solo cuando todo está listo ---
    document.body.style.visibility = "visible";

    // --- Actualizar visibilidad de botones de autenticación ---
    function updateAuthButtonsVisibility() {
        const token = localStorage.getItem("token");
        const loginBtnLi = document.getElementById("loginBtnLi");
        const registerBtnLi = document.getElementById("registerBtnLi");

        // Los botones siempre están ocultos porque ahora están en el menú hamburguesa
        if (loginBtnLi) loginBtnLi.classList.add("header-disabled");
        if (registerBtnLi) registerBtnLi.classList.add("header-disabled");
    }

    updateAuthButtonsVisibility();
    window.addEventListener("storage", updateAuthButtonsVisibility);

    // --- Tabs animados en sección de perfil ---
    const perfilTabs = document.querySelectorAll(".perfil-tab");
    const perfilTabContents = document.querySelectorAll(".perfil-tab-content");

    perfilTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            perfilTabs.forEach(t => t.classList.remove("active"));
            perfilTabContents.forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            const tabId = tab.getAttribute("data-tab");
            const content = document.getElementById("perfilTab-" + tabId);
            if (content) content.classList.add("active");
        });
    });

    // Ejemplo de mensaje dinámico para el selector de cifrado
    const select = document.getElementById("encryptionTypeSelect");
    const btn = document.getElementById("confirmEncryptionTypeBtn");
    const msg = document.getElementById("encryptionTypeMsg");
    if (btn && select && msg) {
        btn.onclick = () => {
            msg.textContent = "Tipo de cifrado actualizado correctamente.";
            msg.style.color = "#2e7d32";
            setTimeout(() => { msg.textContent = ""; }, 2000);
        };
    }

    // =========================
    // FUNCIONES AUXILIARES
    // =========================

    // Función para obtener la sección actual
    function getCurrentSection() {
        const sections = ['inicio', 'firmar', 'verificar', 'perfil', 'opciones', 'contacto'];
        for (const section of sections) {
            const element = document.getElementById(`${section}Section`);
            if (element && element.style.display !== 'none') {
                return section;
            }
        }
        return 'inicio'; // default
    }

    // Aplicar clase inicial para la sección de inicio
    const initialHash = window.location.hash.replace("#", "") || "inicio";
    if (initialHash === "inicio") {
        document.body.setAttribute('data-current-section', 'inicio');
        document.body.classList.add('home-section-active');
    }
});
