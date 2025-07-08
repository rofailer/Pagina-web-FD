document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const profileMenuContainer = document.getElementById("profileMenuContainer");
    const profileName = document.getElementById("profileName");
    const adminMenuItem = document.getElementById("adminMenuItem");

    // Verificar autenticación al cargar
    checkAuthStatus();

    // Manejadores de eventos
    loginBtn.addEventListener('click', showLoginModal);
    registerBtn.addEventListener('click', showRegisterModal);
    document.getElementById('showRegister').addEventListener('click', showRegisterModal);
    document.getElementById('showLogin').addEventListener('click', showLoginModal);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // Cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Manejar envío de formularios
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // Funciones
    function showLoginModal(e) {
        e.preventDefault();
        if (isAuthenticated()) {
            logoutUser();
        } else {
            closeModals();
            loginModal.style.display = 'block';
        }
    }

    function showRegisterModal(e) {
        e.preventDefault();
        closeModals();
        registerModal.style.display = 'block';
    }

    function closeModals() {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
    }

    async function handleLogin(e) {
        e.preventDefault();
        const errorElement = document.getElementById('loginError');
        errorElement.textContent = '';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: document.getElementById('loginUsuario').value,
                    password: document.getElementById('loginPassword').value
                })
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

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({ nombre: data.nombre, rol: data.rol }));
            window.location.href = '/';
        } catch (err) {
            document.getElementById('loginError').textContent = "Error de conexión";
            console.error("Error en login:", err);
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const nombre = document.getElementById('registerNombre').value;
        const usuario = document.getElementById('registerUsuario').value;
        const password = document.getElementById('registerPassword').value;
        const errorElement = document.getElementById('registerError');
        errorElement.textContent = '';

        // Validación en frontend antes de enviar
        const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{4,}$/;
        if (!regex.test(password)) {
            errorElement.textContent = "La contraseña debe tener al menos 4 caracteres, una mayúscula, un número y un carácter especial.";
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, usuario, password })
            });

            const data = await response.json();

            if (response.ok) {
                errorElement.textContent = "";
                showSuccess('Registro exitoso. Por favor inicia sesión.');
                showLoginModal({ preventDefault: () => { } });
            } else {
                errorElement.textContent = data.error || "Error al registrar";
            }
        } catch (err) {
            errorElement.textContent = 'Error de conexión';
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
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('user');
        window.location.reload(); // Recargar la página para aplicar cambios
    }

    function isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';
    }

    function showSuccess(message) {
        alert(message); // Puedes reemplazar con un toast más elegante
    }

    // Validación en tiempo real de la contraseña de registro
    const passwordInput = document.getElementById('registerPassword');
    const passwordError = document.getElementById('registerError');
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const value = passwordInput.value;
            const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{4,}$/;
            if (!regex.test(value)) {
                passwordError.textContent = "La contraseña debe tener al menos 4 caracteres, una mayúscula, un número y un carácter especial.";
            } else {
                passwordError.textContent = "";
            }
        });
    }

});