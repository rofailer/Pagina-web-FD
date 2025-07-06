document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("encryptionTypeSelect");
    const btn = document.getElementById("confirmEncryptionTypeBtn");
    const msg = document.getElementById("encryptionTypeMsg");

    // Cargar selección previa
    const savedType = localStorage.getItem("encryptionType") || "aes-256-cbc";
    select.value = savedType;

    btn.addEventListener("click", () => {
        localStorage.setItem("encryptionType", select.value);
        msg.style.display = "block";
        setTimeout(() => window.location.reload(), 1000);
    });
});