document.addEventListener("DOMContentLoaded", () => {
    const menuBtn = document.getElementById("headerMenuBtn");
    const mobileMenu = document.getElementById("headerMobileMenu");

    menuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("active");
        menuBtn.classList.toggle("active");
        // Opcional: bloquear scroll del body cuando el menú está abierto
        document.body.style.overflow = mobileMenu.classList.contains("active") ? "hidden" : "";
    });

    // Opcional: cerrar menú al hacer click fuera
    document.addEventListener("click", (e) => {
        if (
            mobileMenu.classList.contains("active") &&
            !mobileMenu.contains(e.target) &&
            !menuBtn.contains(e.target)
        ) {
            mobileMenu.classList.remove("active");
            menuBtn.classList.remove("active");
            document.body.style.overflow = "";
        }
    });
});