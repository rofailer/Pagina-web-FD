// Revelado al hacer scroll para la línea de tiempo del proceso (Inicio)
// - Observa cada elemento .timeline-item y agrega la clase 'in-view' cuando entra al viewport
// - Incluye un pequeño escalonado (stagger) para un efecto sutil
(function () {
    const items = document.querySelectorAll(
        ".process-timeline .timeline-item"
    );

    // Si no hay soporte para IntersectionObserver o no hay elementos, mostrar todo
    if (!("IntersectionObserver" in window) || items.length === 0) {
        items.forEach((i) => i.classList.add("in-view"));
        return;
    }

    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in-view");
                    io.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );

    items.forEach((el, idx) => {
        // Pequeño escalonado por índice, con límite superior
        el.style.transitionDelay = `${Math.min(idx * 90, 360)}ms`;
        io.observe(el);
    });
})();
