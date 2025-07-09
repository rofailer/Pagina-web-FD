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

            // Activar animación del botón de cerrar
            setTimeout(() => {
                closeButton.classList.add("animate-in");
                // Mover el foco al botón de cerrar para mejor accesibilidad
                closeButton.focus();
            }, 100);
        }

        // Activar animaciones escalonadas de los elementos del menú
        setTimeout(() => {
            const menuItems = mobileMenu.querySelectorAll('.mobile-menu-item');
            menuItems.forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('animate-in');
                }, index * 50); // 50ms de delay entre cada elemento
            });
        }, 200); // Empezar después de que el menú esté visible
    }

    // Función para cerrar el menú
    function closeMobileMenu() {
        if (!mobileMenu || !menuBtn) {
            return;
        }

        // *** FIX CRÍTICO DE ACCESIBILIDAD ***
        // PASO 1: Forzar el blur del botón X si tiene foco
        if (closeButton && document.activeElement === closeButton) {
            closeButton.blur();
        }

        // PASO 2: Hacer el botón hamburguesa visible y focusable PRIMERO
        if (menuBtn) {
            menuBtn.style.opacity = "1";
            menuBtn.style.pointerEvents = "auto";
            menuBtn.style.display = "flex";
            menuBtn.style.visibility = "visible";
        }

        // PASO 3: Usar requestAnimationFrame para asegurar que el DOM se actualice
        requestAnimationFrame(() => {
            // PASO 4: Ahora mover el foco al botón hamburguesa
            if (menuBtn) {
                menuBtn.focus();
            }

            // PASO 5: Usar otro requestAnimationFrame para asegurar que el foco se haya movido
            requestAnimationFrame(() => {
                // PASO 6: Actualizar atributos de accesibilidad DESPUÉS del cambio de foco
                if (menuBtn) {
                    menuBtn.setAttribute("aria-expanded", "false");
                }
                if (mobileMenu) {
                    mobileMenu.setAttribute("aria-hidden", "true");
                    mobileMenu.setAttribute("inert", "");
                }

                // Actualizar estado inmediatamente
                isMenuOpen = false;
            });
        });

        // Remover animaciones de entrada (animación de salida)
        const menuItems = mobileMenu.querySelectorAll('.mobile-menu-item');
        menuItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.remove('animate-in');
            }, index * 30); // Animación de salida más rápida
        });

        // Remover animación del botón de cerrar
        if (closeButton) {
            closeButton.classList.remove("animate-in");
        }

        // Remover clases activas con delay para que se vea la animación
        setTimeout(() => {
            mobileMenu.classList.remove("active");
            menuBtn.classList.remove("active");
            if (backdrop) {
                backdrop.classList.remove("active");
                // Forzar el backdrop a estar completamente oculto
                backdrop.style.opacity = "0";
                backdrop.style.visibility = "hidden";
                backdrop.style.pointerEvents = "none";
                backdrop.style.zIndex = "8000"; // Backdrop - above header
            }

            // Forzar el menú a estar cerrado
            mobileMenu.style.right = "-350px";
            mobileMenu.style.transform = "translateX(100%)";

            // Restaurar scroll del body
            document.body.style.overflow = "";

        }, 100); // Delay para permitir que se vea la animación de salida
    }

    // Event listener para el botón hamburguesa
    if (menuBtn) {
        menuBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Pequeño delay para evitar conflictos
            setTimeout(() => {
                toggleMobileMenu();
            }, 10);
        });
    }

    // Verificar y forzar la visibilidad del botón
    function forceButtonVisibility() {
        if (menuBtn) {
            const token = localStorage.getItem("token");

            if (token) {
                // Usuario logueado: mostrar botón
                menuBtn.classList.add("active-session");
                menuBtn.style.display = "flex";
                menuBtn.style.visibility = "visible";
                menuBtn.style.pointerEvents = "auto";
            } else {
                // Usuario no logueado: ocultar botón completamente
                menuBtn.classList.remove("active-session");
                menuBtn.style.display = "none";
                menuBtn.style.visibility = "hidden";
                menuBtn.style.pointerEvents = "none";
            }
        }
    }

    // Ejecutar después de un breve delay
    setTimeout(forceButtonVisibility, 100);

    // También ejecutar cuando cambie el storage
    window.addEventListener("storage", forceButtonVisibility);

    // Event listeners globales para cerrar el menú
    document.addEventListener("click", (e) => {
        // Solo procesar si el menú está abierto
        if (!isMenuOpen) return;

        // NO procesar si es el botón X (ya tiene su propio listener)
        if (closeButton && (e.target === closeButton || closeButton.contains(e.target))) {
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
    }, false);

    // Cerrar menú con tecla Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isMenuOpen) {
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
        }
    }, false);

    // Función para renderizar el menú móvil
    function renderMobileMenu() {
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
        let html = `<li class="menu-section profile-section mobile-menu-item">`;
        if (isLogged && userName) {
            html += `<span class="profile-name">${userName}</span>`;
        }
        html += `</li>`;

        html += `<li class="menu-divider mobile-menu-item"><hr></li>`;

        // --- Sección 2: Perfil/Admin según rol ---
        html += `<li class="menu-section nav-section mobile-menu-item">`;
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

        html += `<li class="menu-divider mobile-menu-item"><hr></li>`;

        // --- Sección 3: Navegación general SOLO en móvil/tablet ---
        if (isMobile) {
            html += `<li class="menu-section general-section mobile-menu-item">`;
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
            html += `<li class="menu-section logout-section mobile-menu-item"><a href="#" id="mobileLogoutBtn">Cerrar sesión</a></li>`;
        }

        mobileMenuList.innerHTML = html;
    }

    // Llama a la función al cargar y cada vez que cambie el estado de sesión
    renderMobileMenu();

    // Exponer funciones globalmente para uso externo
    window.renderMobileMenu = renderMobileMenu;
    window.closeMobileMenu = closeMobileMenu;
    window.openMobileMenu = openMobileMenu;

    // Vuelve a renderizar el menú si cambia el tamaño de la ventana
    window.addEventListener("resize", renderMobileMenu);

    // --- Eventos para login/registro/logout en menú móvil ---
    document.addEventListener("click", function (e) {
        // Login
        if (e.target && e.target.id === "mobileLoginBtn") {
            e.preventDefault();
            closeMobileMenu();
            if (window.showLoginModal) window.showLoginModal();
            return;
        }
        // Registro
        if (e.target && e.target.id === "mobileRegisterBtn") {
            e.preventDefault();
            closeMobileMenu();
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
            localStorage.removeItem("keysGuideShown");
            closeMobileMenu();
            renderMobileMenu();
            window.location.reload();
            return;
        }
        // Navegación - cerrar menú al navegar
        if (e.target && (
            e.target.id === "mobileGoToProfile" ||
            e.target.id === "mobileGoToAdmin" ||
            e.target.href && e.target.href.includes("#")
        )) {
            closeMobileMenu();
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
            console.log("- backdrop zIndex:", window.getComputedStyle(backdrop).zIndex);
        }

        if (mobileMenu) {
            console.log("- mobileMenu classList:", mobileMenu.classList.toString());
            console.log("- mobileMenu style:", mobileMenu.style.cssText);
            console.log("- mobileMenu zIndex:", window.getComputedStyle(mobileMenu).zIndex);
        }

        if (closeButton) {
            console.log("- closeButton style:", closeButton.style.cssText);
            console.log("- closeButton zIndex:", window.getComputedStyle(closeButton).zIndex);
        }
    }

    // Exponer la función de debug globalmente
    window.debugMobileMenu = debugElements;

    // Event listener específico para el botón X
    function setupCloseButtonListener() {
        if (closeButton) {
            // Remover listener previo si existe
            closeButton.removeEventListener('click', handleCloseButtonClick);
            // Añadir nuevo listener
            closeButton.addEventListener('click', handleCloseButtonClick, true);
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
});
