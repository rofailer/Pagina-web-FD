document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("tutorialModal");
    const closeBtn = document.getElementById("closeTutorialBtn");

    // Mostrar modal solo la primera vez
    if (!localStorage.getItem("fd_tutorial_shown")) {
        modal.style.display = "block";
        localStorage.setItem("fd_tutorial_shown", "1");
    }

    // Botón para cerrar el modal
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
        };
    }

    // Cerrar modal al hacer clic fuera del contenido
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
    }
});

// Exponer función global para abrir el tutorial desde cualquier botón
window.openTutorial = function () {
    const modal = document.getElementById("tutorialModal");
    if (modal) modal.style.display = "block";
};