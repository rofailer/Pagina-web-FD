document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos del DOM
    const menuBtn = document.getElementById("headerMenuBtn");
    const mobileMenu = document.getElementById("headerMobileMenu");
    const mobileMenuList = document.getElementById("mobileMenuList");

    let backdrop = null;
    let closeButton = null;
    let isMenuOpen = false; // Variable para controlar el estado del menú

    // FORZAR ESTADO INICIAL CERRADO
    if (mobileMenu) {
        mobileMenu.classList.remove("active");
        mobileMenu.setAttribute("aria-hidden", "true");
        mobileMenu.setAttribute("inert", "");
    }

    if (menuBtn) {
        menuBtn.classList.remove("active");
        menuBtn.setAttribute("aria-expanded", "false");
    }

    // Función para crear elementos dinámicos
    function createDynamicElements() {
        // Crear backdrop si no existe
        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.className = "mobile-menu-backdrop";
            backdrop.setAttribute("aria-hidden", "true");
            backdrop.style.zIndex = "2"; // Por encima del header (1)
            backdrop.style.position = "fixed";
            backdrop.style.top = "0";
            backdrop.style.left = "0";
            backdrop.style.width = "100vw";
            backdrop.style.height = "100vh";
            backdrop.style.background = "rgba(0, 0, 0, 0.3)";
            backdrop.style.opacity = "0";
            backdrop.style.visibility = "hidden";
            backdrop.style.pointerEvents = "none"; // Siempre sin pointer-events
            backdrop.style.backdropFilter = "none";
            backdrop.style.webkitBackdropFilter = "none";
            backdrop.style.filter = "none";
            document.body.appendChild(backdrop);
        }

        // Crear botón de cerrar si no existe
        if (!closeButton && mobileMenu) {
            closeButton = document.createElement("button");
            closeButton.className = "mobile-menu-close";
            closeButton.setAttribute("aria-label", "Cerrar menú");
            closeButton.setAttribute("type", "button");
            closeButton.style.zIndex = "4"; // Por encima del menú (3)
            closeButton.innerHTML = "×";
            mobileMenu.insertBefore(closeButton, mobileMenu.firstChild);

            // Configurar event listener específico para el botón X
            setupCloseButtonListener();
        }
    }

    // Función para alternar el menú
    function toggleMobileMenu() {
        if (!mobileMenu || !menuBtn) {
            return;
        }

        if (isMenuOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    // Función para abrir el menú
    function openMobileMenu() {
        if (!mobileMenu || !menuBtn) {
            return;
        }

        // Crear elementos dinámicos
        createDynamicElements();

        // Renderizar contenido del menú
        renderMobileMenu();

        // Aplicar todas las clases activas
        mobileMenu.classList.add("active");
        menuBtn.classList.add("active");

        // Configurar backdrop correctamente
        if (backdrop) {
            backdrop.classList.add("active");
            backdrop.style.opacity = "1";
            backdrop.style.visibility = "visible";
            backdrop.style.pointerEvents = "none"; // Sin pointer-events para no bloquear clicks
            backdrop.style.zIndex = "8000"; // Backdrop - above header
        }

        // Actualizar estado
        isMenuOpen = true;

        // Ocultar el botón hamburguesa cuando el menú esté abierto
        if (menuBtn) {
            menuBtn.style.opacity = "0";
            menuBtn.style.pointerEvents = "none";
            menuBtn.style.visibility = "hidden";
        }

        // Actualizar atributos de accesibilidad
        menuBtn.setAttribute("aria-expanded", "true");
        mobileMenu.setAttribute("aria-hidden", "false");

        // Remover inert del menú para que sea accesible
        mobileMenu.removeAttribute("inert");

        // Bloquear scroll del body
        document.body.style.overflow = "hidden";

        // Forzar visibilidad del menú
        mobileMenu.style.right = "0px";
        mobileMenu.style.display = "block";
        mobileMenu.style.visibility = "visible";
        mobileMenu.style.opacity = "1";
        mobileMenu.style.transform = "translateX(0)";
        mobileMenu.style.zIndex = "8500"; // Menu - above backdrop

        // Asegurar que el botón X esté visible y activar su animación
        if (closeButton) {
            closeButton.style.zIndex = "8600"; // Close button - above menu
            closeButton.style.display = "flex";
            closeButton.style.visibility = "visible";
            closeButton.style.opacity = "1";

            // Activar animación del botón de cerrar - SIMPLIFICADO
            setTimeout(() => {
                closeButton.classList.add("animate-in");
                closeButton.focus();
            }, 50);
        }

        // Activar animaciones de los elementos del menú - OPTIMIZADO
        setTimeout(() => {
            const menuItems = mobileMenu.querySelectorAll(".mobile-menu-item");
            menuItems.forEach(item => {
                item.classList.add("animate-in");
            });
        }, 100);
    }

    // Función para cerrar el menú - OPTIMIZADA
    function closeMobileMenu() {
        if (!mobileMenu || !menuBtn) {
            return;
        }

        // PASO 1: Forzar el blur del botón X si tiene foco
        if (closeButton && document.activeElement === closeButton) {
            closeButton.blur();
        }

        // PASO 2: Hacer el botón hamburguesa visible y focusable
        if (menuBtn) {
            menuBtn.style.opacity = "1";
            menuBtn.style.pointerEvents = "auto";
            menuBtn.style.display = "flex";
            menuBtn.style.visibility = "visible";
            menuBtn.focus();
        }

        // PASO 3: Actualizar atributos y estado
        if (menuBtn) {
            menuBtn.setAttribute("aria-expanded", "false");
        }
        if (mobileMenu) {
            mobileMenu.setAttribute("aria-hidden", "true");
            mobileMenu.setAttribute("inert", "");
        }

        // Actualizar estado inmediatamente
        isMenuOpen = false;

        // Remover clases activas 
        setTimeout(() => {
            mobileMenu.classList.remove("active");
            menuBtn.classList.remove("active");
            if (backdrop) {
                backdrop.classList.remove("active");
                backdrop.style.opacity = "0";
                backdrop.style.visibility = "hidden";
                backdrop.style.pointerEvents = "none";
                backdrop.style.zIndex = "8000";
            }

            // Forzar el menú a estar cerrado
            mobileMenu.style.right = "-100%";

            // Restaurar scroll del body
            document.body.style.overflow = "";
        }, 50); // Delay reducido
    }

    // Event listener para el botón hamburguesa - OPTIMIZADO
    if (menuBtn) {
        menuBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu();
        });
    }

    // Verificar y forzar la visibilidad del botón
    function forceButtonVisibility() {
        if (menuBtn) {
            const token = localStorage.getItem("token");

            if (token) {
                // Usuario logueado: mostrar botón
                menuBtn.classList.add("active-session");
            } else {
                // Usuario no logueado: también mostrar botón para acceder al login
                menuBtn.classList.remove("active-session");
            }

            // El botón hamburguesa siempre debe estar visible
            menuBtn.style.display = "flex";
            menuBtn.style.visibility = "visible";
            menuBtn.style.pointerEvents = "auto";
        }
    }

    // Ejecutar después de un breve delay
    setTimeout(forceButtonVisibility, 100);

    // También ejecutar cuando cambie el storage
    window.addEventListener("storage", forceButtonVisibility);

    // Escuchar cambios en el estado de autenticación
    window.addEventListener("authStateChanged", (e) => {
        const { authenticated } = e.detail;

        if (authenticated) {
            // Si el usuario se autentica, esperar un poco más para mostrar el menú hamburguesa
            setTimeout(forceButtonVisibility, 100);
        } else {
            // Si el usuario hace logout, ocultar inmediatamente
            setTimeout(forceButtonVisibility, 10);
        }
    });

    // Event listeners globales para cerrar el menú
    document.addEventListener(
        "click",
        (e) => {
            // Solo procesar si el menú está abierto
            if (!isMenuOpen) return;

            // NO procesar si es el botón X (ya tiene su propio listener)
            if (
                closeButton &&
                (e.target === closeButton || closeButton.contains(e.target))
            ) {
                return;
            }

            // NO cerrar si se hace click dentro del menú
            if (mobileMenu && mobileMenu.contains(e.target)) {
                return;
            }

            // NO cerrar si se hace click en el botón hamburguesa (ya está oculto)
            if (menuBtn && menuBtn.contains(e.target)) {
                return;
            }

            // Cerrar si se hace click fuera del menú (en cualquier otro lugar)
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
        },
        false,
    );

    // Cerrar menú con tecla Escape
    document.addEventListener(
        "keydown",
        (e) => {
            if (e.key === "Escape" && isMenuOpen) {
                e.preventDefault();
                e.stopPropagation();
                closeMobileMenu();
            }
        },
        false,
    );

    // Función para renderizar el menú móvil
    function renderMobileMenu() {
        if (!mobileMenuList) return;

        // Guardar el estado de la foto antes de regenerar el HTML
        const currentAvatar = document.querySelector('.user-profile-avatar');
        let currentAvatarHTML = null;
        let hasPhoto = false;

        if (currentAvatar) {
            currentAvatarHTML = currentAvatar.innerHTML;
            hasPhoto = currentAvatar.classList.contains('has-photo');
        }

        mobileMenuList.innerHTML = "";

        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user")) || null;
        const isLogged = !!token;
        const userRole = user?.rol || null;
        const userName = user?.nombre || "";

        let html = "";

        // --- Sección 1: Perfil de usuario o estado sin sesión ---
        if (isLogged && userName) {
            html += `
                <div class="user-profile-section">
                    <div class="user-profile-avatar">
                        <!-- Avatar usa CSS ::before para mostrar "?" -->
                    </div>
                    <div class="user-profile-name">${userName}</div>
                    <div class="user-profile-status">Sesión activa</div>
                    <div class="auth-buttons-row">
                        <li class="mobile-menu-item auth-button"><a href="#perfil" id="mobileGoToProfile">Perfil</a></li>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="no-session-section">
                    <div class="no-session-icon"></div>
                    <div class="no-session-message">Sin sesión iniciada</div>
                    <div class="no-session-subtitle">Inicia sesión para acceder a todas las funciones</div>
                    <div class="auth-buttons-row">
                        <li class="mobile-menu-item auth-button"><a href="#" id="mobileLoginBtn">Iniciar Sesión</a></li>
                    </div>
                </div>
            `;
        }

        // --- Sección 2: Navegación principal ---
        html += `<div class="navigation-section">`;
        html += `<li class="mobile-menu-item"><a href="#inicio">Inicio</a></li>`;

        if (isLogged) {
            html += `<li class="mobile-menu-item"><a href="#firmar">Firmar</a></li>`;
        } else {
            html += `<li class="mobile-menu-item"><a href="#" class="restricted-access" data-action="firmar">Firmar</a></li>`;
        }

        // Verificar siempre libre
        html += `<li class="mobile-menu-item"><a href="#verificar">Verificar</a></li>`;

        html += `<li class="mobile-menu-item"><a href="#contacto">Contacto</a></li>`;
        html += `</div>`;

        // --- Secciones adicionales cuando hay sesión ---
        if (isLogged) {
            // --- Sección de cerrar sesión ---
            html += `<div class="logout-section">`;
            html += `<li class="mobile-menu-item"><a href="#" id="mobileLogoutBtn">Cerrar sesión</a></li>`;
            html += `</div>`;
        } else {
            // Sin sección de autenticación adicional al final
            // Los botones ya están en la sección superior
        }

        mobileMenuList.innerHTML = html;

        // Restaurar la foto del avatar si existía antes y el usuario sigue logueado
        if (isLogged && currentAvatarHTML && hasPhoto) {
            const newAvatar = document.querySelector('.user-profile-avatar');
            if (newAvatar) {
                newAvatar.innerHTML = currentAvatarHTML;
                newAvatar.classList.add('has-photo');
            }
        } else if (isLogged) {
            // Si no había foto guardada pero el usuario está logueado, intentar cargar desde backend
            setTimeout(() => {
                if (typeof loadUserProfilePhoto === 'function') {
                    loadUserProfilePhoto();
                }
            }, 100);
        }
    }

    // Llama a la función al cargar y cada vez que cambie el estado de sesión
    renderMobileMenu();

    // Exponer funciones globalmente para uso externo
    window.renderMobileMenu = renderMobileMenu;
    window.closeMobileMenu = closeMobileMenu;
    window.openMobileMenu = openMobileMenu;

    // Vuelve a renderizar el menú si cambia el tamaño de la ventana
    window.addEventListener("resize", renderMobileMenu);

    // --- Eventos para login/logout en menú móvil ---
    document.addEventListener("click", function (e) {
        // Verificar que el elemento clickeado está dentro del menú móvil
        if (!e.target.closest(".header-mobile-menu")) return;

        // Login
        if (e.target && e.target.id === "mobileLoginBtn") {
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
            setTimeout(() => {
                if (window.showLoginModal) {
                    window.showLoginModal();
                } else {
                    console.error("showLoginModal no está disponible");
                }
            }, 100);
            return;
        }

        // Manejo de acceso restringido (Firmar/Verificar sin sesión)
        if (e.target && e.target.classList.contains("restricted-access")) {
            e.preventDefault();
            e.stopPropagation();

            const action = e.target.getAttribute("data-action");
            closeMobileMenu();

            setTimeout(() => {
                showRestrictedAccessModal(action);
            }, 300);

            return;
        }

        // Logout
        if (e.target && e.target.id === "mobileLogoutBtn") {
            e.preventDefault();
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

            closeMobileMenu();
            renderMobileMenu();

            // Recargar después de un pequeño delay para que se aplique la navegación
            setTimeout(() => {
                window.location.reload();
            }, 100);

            return;
        }
        // Navegación - cerrar menú al navegar
        if (
            e.target &&
            (e.target.id === "mobileGoToProfile" ||
                (e.target.href && e.target.href.includes("#") && !e.target.classList.contains("restricted-access")))
        ) {
            closeMobileMenu();
            return;
        }
    });

    // --- Si el usuario inicia/cierra sesión, actualiza el menú ---
    window.addEventListener("storage", renderMobileMenu);

    // Función adicional para debuggear elementos
    function debugElements() {
        console.log("🔍 DEBUG - Estado de elementos:");
        console.log("- menuBtn:", menuBtn ? "✅ Existe" : "❌ No existe");
        console.log("- mobileMenu:", mobileMenu ? "✅ Existe" : "❌ No existe");
        console.log("- backdrop:", backdrop ? "✅ Existe" : "❌ No existe");
        console.log("- closeButton:", closeButton ? "✅ Existe" : "❌ No existe");
        console.log("- isMenuOpen:", isMenuOpen);

        if (backdrop) {
            console.log("- backdrop classList:", backdrop.classList.toString());
            console.log("- backdrop style:", backdrop.style.cssText);
            console.log(
                "- backdrop zIndex:",
                window.getComputedStyle(backdrop).zIndex,
            );
        }

        if (mobileMenu) {
            console.log("- mobileMenu classList:", mobileMenu.classList.toString());
            console.log("- mobileMenu style:", mobileMenu.style.cssText);
            console.log(
                "- mobileMenu zIndex:",
                window.getComputedStyle(mobileMenu).zIndex,
            );
        }

        if (closeButton) {
            console.log("- closeButton style:", closeButton.style.cssText);
            console.log(
                "- closeButton zIndex:",
                window.getComputedStyle(closeButton).zIndex,
            );
        }
    }

    // Exponer la función de debug globalmente
    window.debugMobileMenu = debugElements;

    // Event listener específico para el botón X
    function setupCloseButtonListener() {
        if (closeButton) {
            // Remover listener previo si existe
            closeButton.removeEventListener("click", handleCloseButtonClick);
            // Añadir nuevo listener
            closeButton.addEventListener("click", handleCloseButtonClick, true);
        }
    }

    // Función para manejar clicks en el botón X
    function handleCloseButtonClick(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeMobileMenu();
    }

    // Accesibilidad: cerrar menú con Escape
    document.addEventListener("keydown", (e) => {
        if (isMenuOpen && e.key === "Escape") {
            closeMobileMenu();
        }
    });

    // Función para mostrar modal de acceso restringido
    function showRestrictedAccessModal(action) {
        const actionText = action === "firmar" ? "firmar documentos" : "verificar documentos";

        // Crear el modal
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

        // Añadir estilos inline para el modal
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

        // Event listeners para los botones
        const btnLogin = modal.querySelector('.restricted-access-login-btn');
        const btnClose = modal.querySelector('.restricted-access-close');
        const backdrop = modal.querySelector('.restricted-access-backdrop');

        function closeModal() {
            document.body.removeChild(modal);
        }

        btnLogin.addEventListener('click', () => {
            closeModal();
            setTimeout(() => {
                if (window.showLoginModal) {
                    window.showLoginModal();
                } else {
                    console.error("showLoginModal no está disponible");
                }
            }, 100);
        });

        btnClose.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);

        // Cerrar con Escape
        function handleEscape(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        }
        document.addEventListener('keydown', handleEscape);
    }

    // Exponer la función globalmente para uso desde otros scripts (ej: hero button)
    window.showRestrictedAccessModal = showRestrictedAccessModal;

    // Llama a la función al cargar y cada vez que cambie el estado de sesión
});
