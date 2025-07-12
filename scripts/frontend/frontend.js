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

    function showSection(sectionKey) {
        hideAllSections();
        if (sections[sectionKey]) {
            sections[sectionKey].style.display = "block";
            sections[sectionKey].scrollIntoView({ behavior: "auto" });
        }
        setActiveLink(sectionKey);
        window.scrollTo(0, 0);

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
    }

    // --- Variables de estado global ---
    window.firmaEnCurso = false;
    window.verificacionEnCurso = false;

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

        // Personalizar mensaje según el tipo de proceso
        if (processType === 'firma') {
            title.textContent = '¿Abandonar el proceso de firma?';
            message.textContent = 'Tienes un documento seleccionado y/o una llave en proceso de firma. Si continúas, perderás todo el progreso.';
            icon.textContent = '📝';
        } else if (processType === 'verificacion') {
            title.textContent = '¿Abandonar la verificación?';
            message.textContent = 'Tienes archivos seleccionados en proceso de verificación. Si continúas, perderás todo el progreso.';
            icon.textContent = '🔍';
        } else {
            title.textContent = '¿Estás seguro?';
            message.textContent = 'Tienes un proceso en curso. Si continúas, perderás todos los cambios no guardados.';
            icon.textContent = '⚠️';
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
            // Limpiar procesos en curso
            if (window.limpiarFormulariosVerificar) window.limpiarFormulariosVerificar();
            if (window.limpiarFormulariosFirmar) window.limpiarFormulariosFirmar();
            window.verificacionEnCurso = false;
            window.firmaEnCurso = false;

            // Navegar a la sección destino
            const targetSection = pendingNavigation;
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

                // Validación de sesión para secciones protegidas
                if ((key === "firmar" || key === "verificar") && !localStorage.getItem("token")) {
                    if (window.showLoginModal) window.showLoginModal();
                    else alert("Debes iniciar sesión para usar esta función.");
                    window.location.hash = "inicio";
                    if (document.getElementById("inicioSection")) document.getElementById("inicioSection").style.display = "";
                    if (document.getElementById("firmarSection")) document.getElementById("firmarSection").style.display = "none";
                    if (document.getElementById("verifySection")) document.getElementById("verifySection").style.display = "none";
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
            window.location.reload();
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
});
