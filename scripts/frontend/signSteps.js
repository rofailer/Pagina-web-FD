document.addEventListener("DOMContentLoaded", () => {
    // --- Variables de estado ---
    let currentStep = 1;
    let downloadUrl = null;

    // --- Elementos de pasos y barra de progreso ---
    const steps = [
        document.getElementById("signStep1"),
        document.getElementById("signStep2"),
        document.getElementById("signStep3"),
    ];
    const indicatorSteps = document.querySelectorAll("#signStepIndicator .step");

    // --- Utilidad para mostrar el paso current ---
    function showStep(step) {
        steps.forEach((div, i) => div.style.display = (i === step - 1) ? "" : "none");
        indicatorSteps.forEach((el, i) => el.classList.toggle("active", i === step - 1));
        currentStep = step;

        if (step === 2) {
            document.getElementById("signDocumentButton").style.display = "";
            document.getElementById("signLoading").style.display = "none";
        }
    }

    // --- Paso 1: Seleccionar y aceptar documento ---
    document.getElementById("acceptDocumentBtn").onclick = () => {
        const fileInput = document.getElementById("fileInput");
        if (!fileInput.files.length) {
            alert("Selecciona un archivo PDF primero.");
            return;
        }
        window.firmaEnCurso = true; // Marcar proceso en curso
        showStep(2);
    };

    // --- Paso 2: Firmar documento ---
    document.getElementById("signDocumentButton").onclick = () => {
        const token = localStorage.getItem("token");
        if (!token) {
            if (window.showLoginModal) window.showLoginModal();
            else alert("Debes iniciar sesión para firmar documentos.");
            return;
        }
        window.showKeyPasswordModal(async (keyPassword) => {
            document.getElementById("signDocumentButton").style.display = "none";
            document.getElementById("signLoading").style.display = "";

            const fileInput = document.getElementById("fileInput");
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append("document", file);
            formData.append("keyPassword", keyPassword);

            setTimeout(async () => {
                try {
                    const response = await fetch("/sign-document", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                        body: formData,
                    });

                    if (response.ok) {
                        const data = await response.json();
                        downloadUrl = data.downloadUrl;
                        document.getElementById("signLoading").style.display = "none";
                        showStep(3);
                        document.getElementById("restartSignProcessBtn").style.display = "none";
                        window.firmaEnCurso = false; // Proceso terminado
                    } else {
                        document.getElementById("signLoading").style.display = "none";
                        const error = await response.json();
                        alert(error.error || "Error al firmar el documento");
                        if (response.status === 401 || response.status === 403) {
                            if (window.showLoginModal) window.showLoginModal();
                            localStorage.removeItem("token");
                        }
                        showStep(1);
                        window.firmaEnCurso = false;
                    }
                } catch (err) {
                    document.getElementById("signLoading").style.display = "none";
                    alert("Error al firmar el documento.");
                    showStep(1);
                    window.firmaEnCurso = false;
                }
            }, 1200);
        });
    };

    // --- Paso 3: Descargar documento firmado y volver a empezar ---
    document.getElementById("downloadSignedBtn").onclick = async () => {
        if (!downloadUrl) {
            alert("No hay documento para descargar.");
            return;
        }
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "documento_avalado.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        document.getElementById("restartSignProcessBtn").style.display = "inline-block";
    };

    function limpiarFormulariosFirmar() {
        document.getElementById("signForm").reset();
        const fileInput = document.getElementById("fileInput");
        if (fileInput) fileInput.value = "";
        const fileCustom = fileInput?.parentElement?.querySelector('.file-custom');
        if (fileCustom) fileCustom.textContent = "Ningún archivo seleccionado";
        document.getElementById("signDocumentButton").style.display = "";
        document.getElementById("signLoading").style.display = "none";
        downloadUrl = null;
        showStep(1);
        window.firmaEnCurso = false;
    }

    document.getElementById("restartSignProcessBtn").onclick = limpiarFormulariosFirmar;

    // --- Estado inicial ---
    showStep(1);

    // Hacer la función global para frontend.js
    window.limpiarFormulariosFirmar = limpiarFormulariosFirmar;
});

window.firmaEnCurso = false;
window.verificacionEnCurso = false;