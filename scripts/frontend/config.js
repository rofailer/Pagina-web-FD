document.addEventListener("DOMContentLoaded", () => {
    // Elementos del DOM
    const configForm = document.getElementById("configForm");
    const logoPreview = document.getElementById("logoPreview");
    const logoUpload = document.getElementById("logoUpload");
    const tituloWeb = document.getElementById("tituloWeb");
    const tituloWebInicio = document.getElementById("tituloWebInicio");
    const footerParagraph = document.querySelector('footer p');
    const pageTitleInput = document.getElementById("pageTitle");
    const primaryColorInput = document.getElementById("primaryColor");
    const secondaryColorInput = document.getElementById("secondaryColor");
    const footerTextInput = document.getElementById('footerText');
    const faviconElement = document.querySelector("link[rel='icon']");
    const content = document.querySelector('.content');
    const contentBgFileInput = document.getElementById('contentBgFile');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const removeContentBgBtn = document.getElementById('removeContentBgBtn');

    // Valores predeterminados
    const defaultConfig = {
        title: "Firmas Digitales FD",
        footer: "© 2025 Firmas Digitales FD. Todos los derechos reservados.",
        logo: "", // Logo predeterminado vacío
        contentBg: "#f5f5f5",
        primaryColor: "#ed700f",
        secondaryColor: "#333333"
    };

    // Aplica la configuración recibida
    function applyConfig(config) {
        // Título
        if (config.title) {
            if (tituloWeb) tituloWeb.textContent = config.title;
            if (tituloWebInicio) tituloWebInicio.textContent = config.title;
            document.title = config.title;
            if (pageTitleInput) pageTitleInput.value = config.title;
        }

        // Footer
        if (config.footer && footerParagraph) {
            footerParagraph.textContent = config.footer;
        }
        if (footerTextInput) {
            footerTextInput.value = config.footer || "";
        }

        // Colores
        if (config.primaryColor) {
            document.documentElement.style.setProperty("--primary-color", config.primaryColor);
            if (primaryColorInput) primaryColorInput.value = config.primaryColor;
        }
        if (config.secondaryColor) {
            document.documentElement.style.setProperty("--secondary-color", config.secondaryColor);
            if (secondaryColorInput) secondaryColorInput.value = config.secondaryColor;
        }

        // Logo
        if (config.logo && logoPreview) {
            logoPreview.src = config.logo;
            logoPreview.style.display = "inline-block";
        } else if (logoPreview) {
            logoPreview.src = "";
            logoPreview.style.display = "none";
        }

        // Favicon (opcional)
        if (config.favicon && faviconElement) {
            faviconElement.href = config.favicon;
        }

        // Fondo del contenido
        if (content) {
            if (config.contentBg && config.contentBg.startsWith('data:image')) {
                content.style.backgroundImage = `url('${config.contentBg}')`;
                content.style.backgroundColor = '';
            } else if (config.contentBg) {
                content.style.backgroundImage = '';
                content.style.backgroundColor = config.contentBg;
            } else {
                content.style.backgroundImage = '';
                content.style.backgroundColor = defaultConfig.contentBg;
            }
        }
    }

    // Cargar configuración desde el servidor (si existe)
    async function loadConfigFromServer() {
        try {
            const response = await fetch("/api/config");
            if (!response.ok) throw new Error("No se pudieron cargar las configuraciones");
            const config = await response.json();
            applyConfig({ ...defaultConfig, ...config });
        } catch (err) {
            // Si falla, aplica solo los valores por defecto
            applyConfig(defaultConfig);
        }
    }

    // Guardar configuración en el servidor
    async function handleConfigSubmit(e) {
        e.preventDefault();

        // Logo
        let logoBase64 = "";
        if (logoPreview && logoPreview.src && logoPreview.style.display !== "none") {
            logoBase64 = logoPreview.src;
        }

        // Fondo del contenido
        let contentBgBase64 = "";
        if (contentBgFileInput && contentBgFileInput.files && contentBgFileInput.files[0]) {
            const file = contentBgFileInput.files[0];
            contentBgBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        const newConfig = {
            title: pageTitleInput.value,
            footer: footerTextInput.value,
            primaryColor: primaryColorInput.value,
            secondaryColor: secondaryColorInput.value,
            logo: logoBase64,
            contentBg: contentBgBase64,
        };

        try {
            const response = await fetch("/api/config", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newConfig),
            });

            if (!response.ok) throw new Error("No tienes permisos para realizar esta acción");

            alert("Configuraciones guardadas correctamente");
            applyConfig({ ...defaultConfig, ...newConfig });
        } catch (err) {
            alert("Error al guardar configuraciones");
        }
    }

    // Eventos para quitar logo y fondo
    if (removeLogoBtn && logoPreview && logoUpload) {
        removeLogoBtn.addEventListener('click', () => {
            logoPreview.src = '';
            logoPreview.style.display = 'none';
            logoUpload.value = '';
        });
    }

    if (removeContentBgBtn && contentBgFileInput && content) {
        removeContentBgBtn.addEventListener('click', () => {
            content.style.backgroundImage = '';
            content.style.backgroundColor = defaultConfig.contentBg;
            contentBgFileInput.value = '';
        });
    }

    // Vista previa del logo
    if (logoUpload && logoPreview) {
        logoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    logoPreview.src = ev.target.result;
                    logoPreview.style.display = 'inline-block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Registrar el evento de guardar configuraciones
    if (configForm) {
        configForm.addEventListener("submit", handleConfigSubmit);
    }

    // Cargar configuración al iniciar
    loadConfigFromServer();
});