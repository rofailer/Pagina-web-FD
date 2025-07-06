(function () {
    try {
        // Lee la configuración guardada (si existe)
        const config = JSON.parse(localStorage.getItem("config") || "null");
        if (!config) {
            // No hay configuración: NO apliques nada, deja el CSS por defecto
            return;
        }
        // Si hay configuración, aplica los valores personalizados
        if (config.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', config.primaryColor);
        }
        if (config.secondaryColor) {
            document.documentElement.style.setProperty('--secondary-color', config.secondaryColor);
        }

        // Título de la página
        if (config.title) {
            document.title = config.title;
        }

        // Logo (si existe un <img id="logoImg"> en tu HTML)
        if (config.logo) {
            // Si el DOM ya está cargado, aplica el logo
            if (document.readyState === "complete" || document.readyState === "interactive") {
                const logoImg = document.getElementById('logoImg');
                if (logoImg) {
                    logoImg.src = config.logo;
                    logoImg.style.display = 'inline';
                }
            } else {
                // Si no, espera al DOMContentLoaded
                document.addEventListener('DOMContentLoaded', function () {
                    const logoImg = document.getElementById('logoImg');
                    if (logoImg) {
                        logoImg.src = config.logo;
                        logoImg.style.display = 'inline';
                    }
                });
            }
        }

        // Footer (si existe un <footer><p>...</p></footer>)
        if (config.footer) {
            document.addEventListener('DOMContentLoaded', function () {
                const footerParagraph = document.querySelector('footer p');
                if (footerParagraph) {
                    footerParagraph.textContent = config.footer;
                }
            });
        }

        // Fondo personalizado (color o imagen base64)
        if (config.contentBg) {
            if (config.contentBg.startsWith('data:image')) {
                document.body.style.backgroundImage = `url('${config.contentBg}')`;
                document.body.style.backgroundColor = '';
            } else {
                document.body.style.backgroundImage = '';
                document.body.style.backgroundColor = config.contentBg;
            }
        }
    } catch (e) { }
})();

