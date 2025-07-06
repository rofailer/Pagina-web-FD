document.addEventListener("DOMContentLoaded", () => {
    function renderMobileMenu() {
        const mobileMenuList = document.getElementById("mobileMenuList");
        if (!mobileMenuList) return;

        mobileMenuList.innerHTML = "";

        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user")) || null;
        const isLogged = !!token;
        const userRole = user?.rol || null;
        const userName = user?.nombre || "";

        // Detecta si la pantalla es móvil/tablet
        const isMobile = window.innerWidth <= 1100;

        // --- Sección 1: Nombre de usuario o vacío ---
        let html = `<li class="menu-section profile-section">`;
        if (isLogged && userName) {
            html += `<span class="profile-name">${userName}</span>`;
        }
        html += `</li>`;

        html += `<li class="menu-divider"><hr></li>`;

        // --- Sección 2: Perfil/Admin según rol ---
        html += `<li class="menu-section nav-section">`;
        if (!isLogged) {
            html += `
                <a href="#" id="mobileLoginBtn">Iniciar Sesión</a>
                <a href="#" id="mobileRegisterBtn">Registrarse</a>
            `;
        } else {
            html += `<a href="#perfil" id="mobileGoToProfile">Perfil</a>`;
            if (userRole === "owner") {
                html += `<a href="#opciones" id="mobileGoToAdmin">Admin</a>`;
            }
        }
        html += `</li>`;

        html += `<li class="menu-divider"><hr></li>`;

        // --- Sección 3: Navegación general SOLO en móvil/tablet ---
        if (isMobile) {
            html += `<li class="menu-section general-section">`;
            html += `<a href="#inicio">Inicio</a>`;
            if (isLogged) {
                html += `<a href="#firmar">Firmar</a>`;
                html += `<a href="#verificar">Verificar</a>`;
            } else {
                html += `<a href="#" class="disabled" id="mobileFirmarDisabled" style="pointer-events:none;opacity:0.5;">Firmar</a>`;
                html += `<a href="#" class="disabled" id="mobileVerificarDisabled" style="pointer-events:none;opacity:0.5;">Verificar</a>`;
            }
            html += `<a href="#contacto">Contacto</a>`;
            html += `</li>`;
        }

        // --- Cerrar sesión siempre que esté logueado ---
        if (isLogged) {
            html += `<li class="menu-section logout-section"><a href="#" id="mobileLogoutBtn">Cerrar sesión</a></li>`;
        }

        mobileMenuList.innerHTML = html;
    }

    // Llama a la función al cargar y cada vez que cambie el estado de sesión
    renderMobileMenu();
    window.renderMobileMenu = renderMobileMenu;

    // Vuelve a renderizar el menú si cambia el tamaño de la ventana
    window.addEventListener("resize", renderMobileMenu);

    // --- Eventos para login/registro/logout en menú móvil ---
    document.addEventListener("click", function (e) {
        // Login
        if (e.target && e.target.id === "mobileLoginBtn") {
            e.preventDefault();
            if (window.showLoginModal) window.showLoginModal();
            return;
        }
        // Registro
        if (e.target && e.target.id === "mobileRegisterBtn") {
            e.preventDefault();
            if (window.showRegisterModal) window.showRegisterModal();
            return;
        }
        // Logout
        if (e.target && e.target.id === "mobileLogoutBtn") {
            e.preventDefault();
            localStorage.removeItem("token");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userName");
            localStorage.removeItem("user");
            renderMobileMenu();
            window.location.reload();
            return;
        }
        // Evita acción en Firmar/Verificar deshabilitados
        if (
            (e.target && e.target.id === "mobileFirmarDisabled") ||
            (e.target && e.target.id === "mobileVerificarDisabled")
        ) {
            e.preventDefault();
            return;
        }
    });

    // --- Si el usuario inicia/cierra sesión, actualiza el menú ---
    window.addEventListener("storage", renderMobileMenu);
});

// Mostrar el modal de login
window.showLoginModal = function () {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.style.display = "block";
    }
};

// Mostrar el modal de registro
window.showRegisterModal = function () {
    const modal = document.getElementById("registerModal");
    if (modal) {
        modal.style.display = "block";
    }
};

// Cerrar el modal de login
function closeLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.style.display = "none";
    }
    // No toques el menú hamburguesa aquí
}

function closeRegisterModal() {
    const modal = document.getElementById("registerModal");
    if (modal) {
        modal.style.display = "none";
    }
    // No toques el menú hamburguesa aquí
}

// Evento para cerrar al hacer click en la X
document.addEventListener("DOMContentLoaded", () => {
    // Para todos los botones de cerrar modal de login
    document.querySelectorAll('#loginModal .close-modal').forEach(btn => {
        btn.onclick = closeLoginModal;
    });
    // Para todos los botones de cerrar modal de registro
    document.querySelectorAll('#registerModal .close-modal').forEach(btn => {
        btn.onclick = closeRegisterModal;
    });

    // Cerrar al hacer click fuera del contenido del modal de login
    const loginModal = document.getElementById("loginModal");
    if (loginModal) {
        loginModal.onclick = function (e) {
            if (e.target === loginModal) closeLoginModal();
        };
    }
    // Cerrar al hacer click fuera del contenido del modal de registro
    const registerModal = document.getElementById("registerModal");
    if (registerModal) {
        registerModal.onclick = function (e) {
            if (e.target === registerModal) closeRegisterModal();
        };
    }
});