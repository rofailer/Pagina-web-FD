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

    // Sistema de renovación automática de tokens
    let tokenRenewalInterval = null;
    let lastActivityTime = Date.now();

    // Verificar autenticación al cargar
    checkAuthStatus();

    // Recuperar tokens preservados del panel admin
    restorePreservedTokens();

    if (localStorage.getItem('token') && localStorage.getItem('forcePasswordChange') === 'true') {
        setTimeout(resumeForcedPasswordChange, 0);
    }

    // Iniciar sistema de renovación automática
    startTokenRenewalSystem();

    // Manejadores de eventos - verificar que los elementos existan
    if (loginBtn) {
        loginBtn.addEventListener("click", showLoginModal);
    }
    if (registerBtn) {
        registerBtn.addEventListener("click", showRegisterModal);
    }

    // Event listeners para elementos del modal que siempre deben existir
    // const showRegisterElement = document.getElementById("showRegister");
    const showLoginElement = document.getElementById("showLogin");

    // Registro deshabilitado - ya no hay enlace de registro en el modal
    // if (showRegisterElement) {
    //     showRegisterElement.addEventListener("click", showRegisterModal);
    // }
    if (showLoginElement) {
        showLoginElement.addEventListener("click", showLoginModal);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutUser);
    }

    // Event listeners para el modal de guía de llaves
    if (goToCreateKeysBtn) {
        goToCreateKeysBtn.addEventListener("click", () => {
            // Cerrar el modal de guía si está abierto
            createKeysGuideModal.style.display = "none";

            // Verificar si hay token de autenticación
            if (!localStorage.getItem("token")) {
                // Si no hay token, mostrar modal de autenticación requerida
                showKeysAuthRequiredModal();
            } else {
                // Si hay token, navegar a la sección de perfil
                navigateToKeysSection();
            }
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

    // Cerrar modales al hacer clic fuera del contenido
    if (loginModal) {
        loginModal.addEventListener("click", (e) => {
            if (e.target === loginModal) {
                closeModals();
            }
        });
    }

    if (registerModal) {
        registerModal.addEventListener("click", (e) => {
            if (e.target === registerModal) {
                closeModals();
            }
        });
    }

    // Manejar envío de formularios
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }

    // Funciones auxiliares para manejo de modales
    function closeModals() {
        const loginModal = document.getElementById("loginModal");
        const registerModal = document.getElementById("registerModal");
        if (loginModal) loginModal.style.display = "none";
        if (registerModal) registerModal.style.display = "none";
    }

    function showLoginModal(e) {
        if (e) e.preventDefault();
        if (isAuthenticated()) {
            logoutUser();
        } else {
            closeModals();
            const loginModal = document.getElementById("loginModal");
            if (loginModal) loginModal.style.display = "block";
        }
    }

    function showRegisterModal(e) {
        if (e) e.preventDefault();
        closeModals();
        const registerModal = document.getElementById("registerModal");
        if (registerModal) registerModal.style.display = "block";
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
                JSON.stringify({
                    nombre: data.nombre,
                    rol: data.rol,
                    presenceStatus: data.presenceStatus || "en_linea",
                    estado_presencia: data.presenceStatus || "en_linea",
                }),
            );
            if (data.forcePasswordChange) {
                localStorage.setItem("forcePasswordChange", "true");
            } else {
                localStorage.removeItem("forcePasswordChange");
            }

            // Mientras la contraseña sea temporal no deben ejecutarse rutas de
            // perfil: responden 403 de forma intencional hasta completar el cambio.
            if (!data.forcePasswordChange) {
                setTimeout(() => {
                    if (typeof loadUserData === 'function') {
                        loadUserData();
                    }

                    if (typeof checkOwnerAccess === 'function') {
                        checkOwnerAccess();
                    }
                }, 500);
            }

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

            // PASO 2.5: Cargar foto únicamente con la cuenta habilitada.
            if (!data.forcePasswordChange) {
                setTimeout(() => {
                    loadUserProfilePhoto();
                }, 100);
            }

            // PASO 3: Cerrar el modal de login
            closeModals();

            if (data.forcePasswordChange) {
                showForcedPasswordChangeDialog();
                return;
            }

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

            // PASO 5: Limpiar banderas de sesión anterior y verificar llaves
            localStorage.removeItem("keysGuideShown"); // Permitir mostrar el modal nuevamente
            checkUserKeysAfterLogin();
        } catch (err) {
            document.getElementById("loginError").textContent = "Error de conexión";
            console.error("Error en login:", err);
        }
    }

    function clearInvalidForcedPasswordSession() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('forcePasswordChange');
        checkAuthStatus();
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: false, user: null }
        }));
    }

    async function resumeForcedPasswordChange() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 401) {
                clearInvalidForcedPasswordSession();
                if (typeof showNotification === 'function') {
                    showNotification('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
                }
                return;
            }
        } catch (error) {
            // Si la validación no está disponible, el formulario conserva el
            // mensaje de error del servidor y permite reintentar.
        }

        showForcedPasswordChangeDialog();
    }

    function showForcedPasswordChangeDialog() {
        if (document.getElementById('forcedPasswordChangeModal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'forcedPasswordChangeModal';
        overlay.className = 'auth-modal forced-password-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'forcedPasswordChangeTitle');
        overlay.setAttribute('aria-describedby', 'forcedPasswordChangeDescription');

        const panel = document.createElement('div');
        panel.className = 'modal-content forced-password-panel';
        panel.innerHTML = `
            <div class="forced-password-heading">
                <h2 id="forcedPasswordChangeTitle">Cambiar Contraseña</h2>
                <p id="forcedPasswordChangeDescription">Configura una contraseña propia para habilitar todas las funciones de tu cuenta.</p>
            </div>
            <form id="forcedPasswordChangeForm" class="forced-password-form">
                <label>Contraseña temporal
                    <input name="currentPassword" type="password" autocomplete="current-password" required
                        placeholder="Ingresa la contraseña recibida">
                </label>
                <label>Nueva contraseña
                    <input name="newPassword" type="password" autocomplete="new-password" required
                        placeholder="Crea una contraseña segura">
                </label>
                <label>Confirma la nueva contraseña
                    <input name="confirmPassword" type="password" autocomplete="new-password" required
                        placeholder="Repite la nueva contraseña">
                </label>
                <p id="forcedPasswordChangeError" class="forced-password-error" role="alert" aria-live="polite"></p>
                <button type="submit">Guardar y continuar</button>
                <p class="forced-password-help">Usa mínimo 10 caracteres e incluye mayúscula, minúscula, número y símbolo.</p>
            </form>`;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        const form = panel.querySelector('#forcedPasswordChangeForm');
        const errorElement = panel.querySelector('#forcedPasswordChangeError');
        form.querySelector('input').focus();

        form.addEventListener('submit', async event => {
            event.preventDefault();
            errorElement.textContent = '';
            const formData = new FormData(form);
            const currentPassword = formData.get('currentPassword');
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');
            const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

            if (newPassword !== confirmPassword) {
                errorElement.textContent = 'Las contraseñas nuevas no coinciden.';
                return;
            }
            if (!passwordPattern.test(newPassword)) {
                errorElement.textContent = 'La nueva contraseña no cumple los requisitos de seguridad.';
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Guardando...';

            try {
                const response = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const result = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    clearInvalidForcedPasswordSession();
                    overlay.remove();
                    showLoginModal();
                    if (typeof showNotification === 'function') {
                        showNotification('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
                    }
                    return;
                }
                if (!response.ok) throw new Error(result.error || 'No fue posible cambiar la contraseña.');

                localStorage.setItem('token', result.token);
                localStorage.removeItem('forcePasswordChange');
                overlay.remove();
                if (typeof showNotification === 'function') {
                    showNotification('Contraseña actualizada correctamente.', 'success');
                } else {
                    showSuccess('Contraseña actualizada correctamente.');
                }
                window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { authenticated: true } }));
                checkAuthStatus();
                loadUserProfilePhoto();
                if (typeof loadUserData === 'function') loadUserData();
                if (typeof loadUserKeys === 'function') loadUserKeys();
                if (typeof window.loadKeys === 'function') window.loadKeys();
                if (typeof window.loadActiveKey === 'function') window.loadActiveKey();
                checkUserKeysAfterLogin();
            } catch (error) {
                errorElement.textContent = error.message;
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar y continuar';
            }
        });
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
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;
        if (!regex.test(password)) {
            errorElement.textContent =
                "La contraseña debe tener entre 10 y 128 caracteres, con mayúscula, minúscula, número y símbolo.";
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

            // Un 403 por contraseña temporal no significa que el token expiró.
            if (localStorage.getItem('forcePasswordChange') !== 'true') {
                loadUserProfilePhoto();
            }
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

        // Mostrar/ocultar pestaña de personalización PDF solo para owners
        const personalizacionTab = document.querySelector('[data-tab="personalizacion-pdf"]');
        if (user && personalizacionTab) {
            if (user.rol === "owner") {
                personalizacionTab.style.display = "flex";
            } else {
                personalizacionTab.style.display = "none";
            }
        } else if (personalizacionTab) {
            personalizacionTab.style.display = "none";
        }
    }

    // Función para recuperar tokens preservados del panel admin
    function restorePreservedTokens() {
        const preservedToken = sessionStorage.getItem("preserve_token");
        const preservedAdminToken = sessionStorage.getItem("preserve_admin_token");

        if (preservedToken) {
            // Restaurar el token principal
            localStorage.setItem("token", preservedToken);

            // Si hay un token admin, usarlo también
            if (preservedAdminToken) {
                localStorage.setItem("admin_token", preservedAdminToken);
            }

            // Limpiar los tokens preservados
            sessionStorage.removeItem("preserve_token");
            sessionStorage.removeItem("preserve_admin_token");

            console.log('🔄 Sesión restaurada desde el panel administrativo');

            // Verificar el estado de autenticación con el token restaurado
            checkAuthStatus();
        }
    }

    function logoutUser() {
        localStorage.removeItem("token");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userName");
        localStorage.removeItem("user");
        localStorage.removeItem("forcePasswordChange");
        localStorage.removeItem("keysGuideShown"); // Limpiar la marca de guía mostrada
        sessionStorage.removeItem("preserve_token");
        sessionStorage.removeItem("preserve_admin_token");

        // Detener sistema de renovación automática
        if (window.stopTokenRenewalSystem) {
            window.stopTokenRenewalSystem();
        }

        // Limpiar estados de procesos en curso INMEDIATAMENTE
        window.firmaEnCurso = false;
        window.verificacionEnCurso = false;

        // Cerrar cualquier modal de advertencia si está abierto
        const confirmModal = document.getElementById('navigationConfirmModal');
        if (confirmModal && confirmModal.classList.contains('show')) {
            confirmModal.classList.remove('show');
        }

        // Forzar limpieza de procesos y formularios
        if (window.cleanSignFormsOnLogout) {
            window.cleanSignFormsOnLogout();
        }
        if (window.cleanVerifyFormsOnLogout) {
            window.cleanVerifyFormsOnLogout();
        }

        // Navegar a inicio INMEDIATAMENTE sin verificaciones
        window.location.hash = "inicio";

        // Disparar evento personalizado para que otros scripts sepan del cambio de autenticación
        window.dispatchEvent(
            new CustomEvent("authStateChanged", {
                detail: { authenticated: false, user: null },
            }),
        );

        // Forzar mostrar sección de inicio sin verificaciones
        if (window.forceShowSection) {
            window.forceShowSection('inicio');
        }

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
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;
            if (!regex.test(value)) {
                passwordError.textContent =
                    "La contraseña debe tener entre 10 y 128 caracteres, con mayúscula, minúscula, número y símbolo.";
            } else {
                passwordError.textContent = "";
            }
        });
    }

    // =================== NUEVAS FUNCIONES PARA GUÍA DE LLAVES ===================

    async function checkUserKeysAfterLogin() {
        try {
            const token = localStorage.getItem("token");
            if (!token || localStorage.getItem('forcePasswordChange') === 'true') return;

            // Verificando llaves del usuario después del login

            const response = await fetch("/user-keys", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Llaves del usuario obtenidas

                // Si no tiene llaves, mostrar el modal
                if (!data.keys || data.keys.length === 0) {
                    // Usuario sin llaves - mostrando modal de guía
                    // Esperar un momento para que se complete la actualización de la UI
                    setTimeout(() => {
                        showCreateKeysGuide();
                    }, 800);
                } else {
                }
            } else {
                console.error("Error obteniendo llaves del usuario:", response.status);
            }
        } catch (err) {
            console.error("Error verificando llaves del usuario:", err);
        }
    }

    function showCreateKeysGuide() {
        closeModals(); // Cerrar cualquier modal abierto
        createKeysGuideModal.style.display = "flex";
    }

    function navigateToKeysSection() {

        // Cerrar modal si está abierto
        if (createKeysGuideModal) {
            createKeysGuideModal.style.display = "none";
        }

        // Si ya estamos en la página de perfil, activar directamente la pestaña
        const currentHash = window.location.hash;
        if (currentHash === '#perfil') {
            activateKeysTab();
        } else {
            // Navegar a perfil y luego activar pestaña
            window.location.href = "/#perfil";

            // Esperar a que cargue y activar pestaña
            setTimeout(() => {
                activateKeysTab();
            }, 300);
        }
    }

    function activateKeysTab() {

        const llavesTab = document.querySelector('.perfil-tab-btn[data-tab="gestion-llaves"]');
        if (llavesTab) {
            llavesTab.click();
        } else {
            // Intentar con selector alternativo
            const llavesTabAlt = document.querySelector('[data-tab="gestion-llaves"]');
            if (llavesTabAlt) {
                llavesTabAlt.click();
            } else {
            }
        }
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

    // Función global para mostrar el modal de autenticación requerida para llaves
    window.showKeysAuthRequiredModal = showKeysAuthRequiredModal;

    // Función global para manejar el clic del botón "Crear Llaves"
    window.handleCreateKeysClick = function () {
        // Verificar si hay token de autenticación
        if (!localStorage.getItem("token")) {
            // Si no hay token, mostrar modal de autenticación requerida
            showKeysAuthRequiredModal();
        } else {
            // Si hay token, navegar a la sección de perfil
            navigateToKeysSection();
        }
    };

    // Función global para manejar el clic del botón "Firmar Documento"
    window.handleSignDocumentClick = function () {
        const token = localStorage.getItem("token");
        if (token) {
            // Si está autenticado, ir directamente a la sección de firmar
            window.location.hash = 'firmar';
        } else {
            // Si no está autenticado, mostrar el modal de acceso restringido (igual que menú móvil)
            if (typeof window.showRestrictedAccessModal === 'function') {
                window.showRestrictedAccessModal('firmar');
            } else {
                // Copia de seguridad: crear el modal aquí si no está global
                const actionText = 'firmar documentos';
                const modal = document.createElement('div');
                modal.className = 'restricted-access-modal';
                modal.innerHTML = `
                    <div class="restricted-access-backdrop"></div>
                    <div class="restricted-access-content">
                        <button class="restricted-access-close"></button>
                        <div class="restricted-access-icon"></div>
                        <h3>Acceso Restringido</h3>
                        <p>Para <strong>${actionText}</strong> necesitas iniciar sesión en tu cuenta.</p>
                        <button class="restricted-access-login-btn">Iniciar Sesión</button>
                    </div>
                `;
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                document.body.appendChild(modal);
                const btnLogin = modal.querySelector('.restricted-access-login-btn');
                const btnClose = modal.querySelector('.restricted-access-close');
                const backdrop = modal.querySelector('.restricted-access-backdrop');
                function closeModal() { document.body.removeChild(modal); }
                btnLogin.addEventListener('click', () => { closeModal(); setTimeout(() => { if (window.showLoginModal) { window.showLoginModal(); } }, 100); });
                btnClose.addEventListener('click', closeModal);
                backdrop.addEventListener('click', closeModal);
                function handleEscape(e) { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handleEscape); } }
                document.addEventListener('keydown', handleEscape);
            }
        }
    };

    // Eliminada función showSignAuthRequiredModal (ya no se usa, lógica unificada en showKeysAuthRequiredModal)

    // Función para mostrar el modal de autenticación requerida para crear llaves
    function showKeysAuthRequiredModal() {
        const modal = document.getElementById('signAuthRequiredModal');
        const title = document.getElementById('signAuthTitle');
        const description = document.getElementById('signAuthDescription');
        const subdescription = document.getElementById('signAuthSubdescription');

        if (modal && title && description && subdescription) {
            // Cambiar el contenido para llaves
            title.textContent = 'Acceso Restringido';
            description.innerHTML = '<strong>Para crear y gestionar llaves digitales necesitas iniciar sesión</strong>';
            subdescription.textContent = 'Las llaves digitales están vinculadas a tu identidad personal. Solo tú puedes generar y gestionar tus propias llaves para garantizar la seguridad y privacidad de tus credenciales.';

            modal.style.display = 'flex';
        }
    }

    // Función para cargar la foto de perfil del usuario autenticado
    async function loadUserProfilePhoto() {
        const token = localStorage.getItem("token");
        if (!token || localStorage.getItem('forcePasswordChange') === 'true') return;

        try {
            const response = await fetch('/api/profile/photo', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.hasPhoto && data.photoUrl) {
                    const separator = data.photoUrl.includes('?') ? '&' : '?';
                    const photoUrl = data.photoVersion
                        ? `${data.photoUrl}${separator}v=${encodeURIComponent(data.photoVersion)}`
                        : data.photoUrl;
                    const photoResponse = await fetch(photoUrl, {
                        headers: { 'Authorization': `Bearer ${token}` },
                        cache: 'no-store'
                    });
                    if (!photoResponse.ok) return;

                    const photoBlob = await photoResponse.blob();
                    if (window.__profilePhotoObjectUrl) {
                        URL.revokeObjectURL(window.__profilePhotoObjectUrl);
                    }
                    const objectUrl = URL.createObjectURL(photoBlob);
                    window.__profilePhotoObjectUrl = objectUrl;

                    if (typeof window.updateProfilePhoto === 'function') {
                        window.updateProfilePhoto(objectUrl);
                    } else {
                        const mobileAvatar = document.querySelector('.user-profile-avatar');
                        if (mobileAvatar) {
                            mobileAvatar.querySelectorAll(':scope > img').forEach(image => image.remove());
                            const image = document.createElement('img');
                            image.src = objectUrl;
                            image.alt = 'Avatar de usuario';
                            mobileAvatar.prepend(image);
                            mobileAvatar.classList.add('has-photo');
                        }
                        const desktopAvatar = document.querySelector('.profile-avatar-large');
                        if (desktopAvatar) desktopAvatar.src = objectUrl;
                        const headerAvatar = document.querySelector('.profile-avatar-small');
                        if (headerAvatar) headerAvatar.src = objectUrl;
                    }
                } else {
                    // Sin foto: limpiar avatares y mostrar SVG por defecto
                    const mobileAvatar = document.querySelector('.user-profile-avatar');
                    if (mobileAvatar) {
                        mobileAvatar.querySelectorAll(':scope > img').forEach(image => image.remove());
                        mobileAvatar.classList.remove('has-photo');
                    }
                }
            }
        } catch (error) {
            console.log('Error al cargar foto de perfil:', error);
            // No mostrar error al usuario, es opcional
        }
    }

    // Sistema de renovación automática de tokens
    function startTokenRenewalSystem() {
        if (!localStorage.getItem("token")) return;

        // Renovar a mitad de la sesión de 8 horas si hay actividad reciente.
        tokenRenewalInterval = setInterval(async () => {
            const timeSinceLastActivity = Date.now() - lastActivityTime;

            // Si ha pasado más de 2 horas sin actividad, no renovar
            if (timeSinceLastActivity > 2 * 60 * 60 * 1000) {
                console.log('⏰ Sesión inactiva por más de 2 horas, no se renovará automáticamente');
                return;
            }

            try {
                const currentToken = localStorage.getItem("token");
                if (!currentToken) return;

                const response = await fetch('/api/auth/renew', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem("token", data.token);
                    console.log('🔄 Token renovado automáticamente');
                } else {
                    console.log('⚠️ No se pudo renovar el token automáticamente');
                }
            } catch (error) {
                console.log('Error renovando token:', error);
            }
        }, 4 * 60 * 60 * 1000); // 4 horas

        // Detectar actividad del usuario
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, () => {
                lastActivityTime = Date.now();
            }, { passive: true });
        });

        console.log('🔄 Sistema de renovación automática de tokens iniciado');
    }

    // Función para detener el sistema de renovación
    function stopTokenRenewalSystem() {
        if (tokenRenewalInterval) {
            clearInterval(tokenRenewalInterval);
            tokenRenewalInterval = null;
            console.log('🛑 Sistema de renovación automática detenido');
        }
    }

    // Exponer función para uso externo
    window.stopTokenRenewalSystem = stopTokenRenewalSystem;

    // Exponer la función globalmente para uso en otros módulos
    window.loadUserProfilePhoto = loadUserProfilePhoto;

    // Exponer funciones de modales globalmente para uso en otros módulos
    window.showLoginModal = showLoginModal;
    window.showRegisterModal = showRegisterModal;
    window.closeModals = closeModals;

    // Eliminados event listeners del modal signAuthRequiredModal (ya no se usa)
});
