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
        contacto: document.querySelector('a[href="#contacto"]')
    };

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
    }

    function showSectionFromHash() {
        const hash = window.location.hash.replace("#", "");
        const sectionKey = hash && sections[hash] ? hash : "inicio";
        showSection(sectionKey);
    }

    showSectionFromHash();
    window.addEventListener("hashchange", showSectionFromHash);

    Object.keys(links).forEach((key) => {
        if (links[key]) {
            links[key].addEventListener("click", (event) => {
                event.preventDefault();

                // Validación de sesión para secciones protegidas
                if ((key === "firmar" || key === "verificar") && !localStorage.getItem("token")) {
                    if (window.showLoginModal) window.showLoginModal();
                    else alert("Debes iniciar sesión para usar esta función.");
                    window.location.hash = "inicio";
                    // Opcional: fuerza visibilidad de inicio
                    if (document.getElementById("inicioSection")) document.getElementById("inicioSection").style.display = "";
                    if (document.getElementById("firmarSection")) document.getElementById("firmarSection").style.display = "none";
                    if (document.getElementById("verifySection")) document.getElementById("verifySection").style.display = "none";
                    return;
                }

                window.location.hash = key;
                // Si navega a verificar, carga profesores
                if (key === "verificar" && window.cargarProfesoresYMostrarPaso1) {
                    window.cargarProfesoresYMostrarPaso1();
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
    document.querySelectorAll(".select-key-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
            const keyId = event.target.dataset.keyId;
            if (!keyId) {
                console.error("El botón no tiene un atributo data-key-id");
                return;
            }
            selectKey(keyId);
        });
    });

    async function selectKey(keyId) {
        try {
            const response = await fetch("/select-key", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ keyId }),
            });

            const data = await response.json();
            if (data.success) {
                alert("Llave activa actualizada correctamente");
            } else {
                alert(data.error || "Error al seleccionar la llave");
            }
        } catch (err) {
            console.error("Error al seleccionar la llave:", err);
        }
    }

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

    // --- Mostrar/ocultar el botón hamburguesa según sesión ---
    function updateHamburgerVisibility() {
        const token = localStorage.getItem("token");
        const hamburgerBtn = document.getElementById("headerMenuBtn");
        if (hamburgerBtn) {
            if (token) {
                hamburgerBtn.classList.add("active-session");
            } else {
                hamburgerBtn.classList.remove("active-session");
            }
        }
    }
    updateHamburgerVisibility();
    window.addEventListener("storage", updateHamburgerVisibility);

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

    // --- Actualizar visibilidad de botones de autenticación ---
    function updateAuthButtonsVisibility() {
        const token = localStorage.getItem("token");
        const loginBtnLi = document.getElementById("loginBtnLi");
        const registerBtnLi = document.getElementById("registerBtnLi");

        if (token) {
            if (loginBtnLi) loginBtnLi.classList.add("header-disabled");
            if (registerBtnLi) registerBtnLi.classList.add("header-disabled");
        } else {
            if (loginBtnLi) loginBtnLi.classList.remove("header-disabled");
            if (registerBtnLi) registerBtnLi.classList.remove("header-disabled");
        }
    }

    updateAuthButtonsVisibility();
    window.addEventListener("storage", updateAuthButtonsVisibility);
});

// --- Scroll arriba al cambiar de sección (por si acaso) ---
window.addEventListener("hashchange", () => {
    window.scrollTo(0, 0);
});
