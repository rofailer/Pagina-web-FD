document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("tutorialModal");
    const closeBtn = document.getElementById("closeTutorialBtn");
    const showBtn = document.getElementById("showTutorialBtn");

    // Mostrar modal solo la primera vez
    if (!localStorage.getItem("fd_tutorial_shown")) {
        modal.style.display = "block";
        localStorage.setItem("fd_tutorial_shown", "1");
    }

    // Mostrar el botón de ayuda siempre
    if (showBtn) showBtn.style.display = "block";

    // Botón para cerrar el modal
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
        };
    }

    // Botón de ayuda para volver a mostrar el modal
    if (showBtn) {
        showBtn.onclick = () => {
            modal.style.display = "block";
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