document.addEventListener("DOMContentLoaded", () => {
    // Elementos del DOM
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginModal = document.getElementById("loginModal");
    const registerModal = document.getElementById("registerModal");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const profileMenuContainer = document.getElementById("profileMenuContainer");
    const profileName = document.getElementById("profileName");
    const adminMenuItem = document.getElementById("adminMenuItem");

    // Nuevos elementos para el modal de guía de llaves
    const createKeysGuideModal = document.getElementById("createKeysGuideModal");
    const goToCreateKeysBtn = document.getElementById("goToCreateKeysBtn");
    const skipCreateKeysBtn = document.getElementById("skipCreateKeysBtn");

    // Verificar autenticación al cargar
    checkAuthStatus();

    // Manejadores de eventos
    loginBtn.addEventListener("click", showLoginModal);
    registerBtn.addEventListener("click", showRegisterModal);
    document
        .getElementById("showRegister")
        .addEventListener("click", showRegisterModal);
    document
        .getElementById("showLogin")
        .addEventListener("click", showLoginModal);

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutUser);
    }

    // Event listeners para el modal de guía de llaves
    if (goToCreateKeysBtn) {
        goToCreateKeysBtn.addEventListener("click", () => {
            createKeysGuideModal.style.display = "none";
            // Navegar a la sección de perfil, tab de llaves
            navigateToKeysSection();
        });
    }

    if (skipCreateKeysBtn) {
        skipCreateKeysBtn.addEventListener("click", () => {
            createKeysGuideModal.style.display = "none";
            // Marcar que el usuario fue notificado para no mostrar el modal otra vez en esta sesión
            localStorage.setItem("keysGuideShown", "true");
        });
    }

    // Cerrar modales
    document.querySelectorAll(".close-modal").forEach((btn) => {
        btn.addEventListener("click", closeModals);
    });

    // Manejar envío de formularios
    loginForm.addEventListener("submit", handleLogin);
    registerForm.addEventListener("submit", handleRegister);

    // Funciones
    function showLoginModal(e) {
        if (e) e.preventDefault();
        if (isAuthenticated()) {
            logoutUser();
        } else {
            closeModals();
            loginModal.style.display = "block";
        }
    }

    function showRegisterModal(e) {
        if (e) e.preventDefault();
        closeModals();
        registerModal.style.display = "block";
    }

    function closeModals() {
        loginModal.style.display = "none";
        registerModal.style.display = "none";
    }

    async function handleLogin(e) {
        e.preventDefault();
        const errorElement = document.getElementById("loginError");
        errorElement.textContent = "";

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario: document.getElementById("loginUsuario").value,
                    password: document.getElementById("loginPassword").value,
                }),
            });

            // Siempre intenta parsear la respuesta como JSON
            let data = {};
            try {
                data = await response.json();
            } catch (e) {
                data = {};
            }

            if (!response.ok) {
                // Mostrar el mensaje de error devuelto por el backend
                errorElement.textContent = data.error || "Error en la autenticación";
                errorElement.style.display = "block";
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem(
                "user",
                JSON.stringify({ nombre: data.nombre, rol: data.rol }),
            );

            // PASO 1: Ocultar inmediatamente los botones de login/registro
            if (loginBtn) {
                loginBtn.style.visibility = "hidden";
                loginBtn.style.pointerEvents = "none";
            }
            if (registerBtn) {
                registerBtn.style.visibility = "hidden";
                registerBtn.style.pointerEvents = "none";
            }

            // PASO 2: Actualizar la UI inmediatamente después del login
            checkAuthStatus();

            // PASO 3: Cerrar el modal de login
            closeModals();

            // PASO 4: Disparar evento personalizado para el menú hamburguesa con un pequeño delay
            setTimeout(() => {
                window.dispatchEvent(
                    new CustomEvent("authStateChanged", {
                        detail: {
                            authenticated: true,
                            user: { nombre: data.nombre, rol: data.rol },
                        },
                    }),
                );
            }, 150);

            // PASO 5: Verificar si el usuario tiene llaves después del login
            checkUserKeysAfterLogin();
        } catch (err) {
            document.getElementById("loginError").textContent = "Error de conexión";
            console.error("Error en login:", err);
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const nombre = document.getElementById("registerNombre").value;
        const usuario = document.getElementById("registerUsuario").value;
        const password = document.getElementById("registerPassword").value;
        const errorElement = document.getElementById("registerError");
        errorElement.textContent = "";

        // Validación en frontend antes de enviar
        const regex =
            /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{4,}$/;
        if (!regex.test(password)) {
            errorElement.textContent =
                "La contraseña debe tener al menos 4 caracteres, una mayúscula, un número y un carácter especial.";
            return;
        }

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, usuario, password }),
            });

            const data = await response.json();

            if (response.ok) {
                errorElement.textContent = "";
                showSuccess("Registro exitoso. Por favor inicia sesión.");
                showLoginModal({ preventDefault: () => { } });
            } else {
                errorElement.textContent = data.error || "Error al registrar";
            }
        } catch (err) {
            errorElement.textContent = "Error de conexión";
        }
    }

    function checkAuthStatus() {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user")) || null;

        // Mostrar/ocultar el menú de perfil y nombre
        if (user && profileMenuContainer && profileName) {
            profileMenuContainer.style.display = "flex";
            profileName.textContent = user.nombre || "Usuario";
        } else if (profileMenuContainer) {
            profileMenuContainer.style.display = "none";
        }

        // Mostrar/ocultar botones de login/registro y logout
        if (token) {
            if (loginBtn) {
                loginBtn.style.visibility = "hidden";
                loginBtn.style.pointerEvents = "none";
            }
            if (registerBtn) {
                registerBtn.style.visibility = "hidden";
                registerBtn.style.pointerEvents = "none";
            }
            if (logoutBtn) logoutBtn.style.display = "inline";
        } else {
            if (loginBtn) {
                loginBtn.style.visibility = "visible";
                loginBtn.style.pointerEvents = "auto";
            }
            if (registerBtn) {
                registerBtn.style.visibility = "visible";
                registerBtn.style.pointerEvents = "auto";
            }
            if (logoutBtn) logoutBtn.style.display = "none";
        }

        // Mostrar/ocultar menú Admin solo para admin/owner
        if (user && adminMenuItem) {
            if (user.rol === "admin" || user.rol === "owner") {
                adminMenuItem.style.display = "flex"; // Usa "flex" por tu CSS
            } else {
                adminMenuItem.style.display = "none";
            }
        } else if (adminMenuItem) {
            adminMenuItem.style.display = "none";
        }
    }

    function logoutUser() {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userName");
        localStorage.removeItem("user");
        localStorage.removeItem("keysGuideShown"); // Limpiar la marca de guía mostrada

        // Limpiar estados de procesos en curso
        window.firmaEnCurso = false;
        window.verificacionEnCurso = false;

        // Navegar a inicio antes de recargar
        window.location.hash = "inicio";

        // Disparar evento personalizado para que otros scripts sepan del cambio de autenticación
        window.dispatchEvent(
            new CustomEvent("authStateChanged", {
                detail: { authenticated: false, user: null },
            }),
        );

        // Pequeño delay para que se aplique la navegación antes del reload
        setTimeout(() => {
            window.location.reload(); // Recargar la página para aplicar cambios
        }, 100);
    }

    function isAuthenticated() {
        return !!localStorage.getItem("token");
    }

    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = "block";
    }

    function showSuccess(message) {
        alert(message); // Puedes reemplazar con un toast más elegante
    }

    // Validación en tiempo real de la contraseña de registro
    const passwordInput = document.getElementById("registerPassword");
    const passwordError = document.getElementById("registerError");
    if (passwordInput) {
        passwordInput.addEventListener("input", () => {
            const value = passwordInput.value;
            const regex =
                /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{4,}$/;
            if (!regex.test(value)) {
                passwordError.textContent =
                    "La contraseña debe tener al menos 4 caracteres, una mayúscula, un número y un carácter especial.";
            } else {
                passwordError.textContent = "";
            }
        });
    }

    // =================== NUEVAS FUNCIONES PARA GUÍA DE LLAVES ===================

    async function checkUserKeysAfterLogin() {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch("/api/user-keys", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();

                // Si no tiene llaves y no se ha mostrado la guía en esta sesión
                if (
                    (!data.keys || data.keys.length === 0) &&
                    !localStorage.getItem("keysGuideShown")
                ) {
                    // Esperar un momento para que se complete la actualización de la UI
                    setTimeout(() => {
                        showCreateKeysGuide();
                    }, 800);
                }
                // Si tiene llaves o ya se mostró la guía, no hacer nada (el usuario ya está logueado en la página)
            } else {
                console.error("Error obteniendo llaves del usuario");
            }
        } catch (err) {
            console.error("Error verificando llaves del usuario:", err);
        }
    }

    function showCreateKeysGuide() {
        closeModals(); // Cerrar cualquier modal abierto
        createKeysGuideModal.style.display = "block";
    }

    function navigateToKeysSection() {
        // Navegar a la página principal y luego al perfil
        window.location.href = "/#perfil";

        // Después de cargar, activar la pestaña de llaves
        setTimeout(() => {
            // Hacer clic en la sección perfil del menú
            const perfilLink = document.querySelector('a[href="#perfil"]');
            if (perfilLink) {
                perfilLink.click();
            }

            // Activar la pestaña de llaves
            setTimeout(() => {
                const llavesTab = document.querySelector(
                    '.perfil-tab[data-tab="llaves"]',
                );
                if (llavesTab) {
                    llavesTab.click();
                }
            }, 500);
        }, 100);
    }

    // Exponer funciones globalmente para el menú hamburguesa
    window.showLoginModal = showLoginModal;
    window.showRegisterModal = showRegisterModal;

    // Función global para mostrar el modal de creación de llaves
    window.showCreateKeysGuide = function () {
        if (createKeysGuideModal) {
            createKeysGuideModal.style.display = "flex";
        }
    };

    // Función global para manejar el clic del botón "Crear Llaves"
    window.handleCreateKeysClick = function () {
        const token = localStorage.getItem("token");

        if (token) {
            // Si está autenticado, ir directamente a perfil
            navigateToKeysSection();
        } else {
            // Si no está autenticado, mostrar el modal de login
            showLoginModal();
        }
    };

    // Función global para manejar el clic del botón "Firmar Documento"
    window.handleSignDocumentClick = function () {
        const token = localStorage.getItem("token");

        if (token) {
            // Si está autenticado, ir directamente a la sección de firmar
            window.location.hash = 'firmar';
        } else {
            // Si no está autenticado, mostrar el modal de login
            showLoginModal();
        }
    };
});
