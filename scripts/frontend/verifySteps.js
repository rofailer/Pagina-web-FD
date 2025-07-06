document.addEventListener("DOMContentLoaded", () => {
    // --- Variables de estado ---
    let currentStep = 1;
    let selectedProfesorId = null;

    // --- Elementos de pasos y barra de progreso ---
    const steps = [
        document.getElementById("verifyStep1"),
        document.getElementById("verifyStep2"),
        document.getElementById("verifyStep3"),
        document.getElementById("verifyStep4"),
    ];
    const indicatorSteps = document.querySelectorAll("#verifyStepIndicator .step");

    // --- Utilidad para mostrar el paso current ---
    function showStep(step) {
        steps.forEach((div, i) => div.style.display = (i === step - 1) ? "" : "none");
        indicatorSteps.forEach((el, i) => el.classList.toggle("active", i === step - 1));
        currentStep = step;
    }

    // --- Cargar profesores y mostrar paso 1 ---
    function cargarProfesoresYMostrarPaso1() {
        const token = localStorage.getItem("token");
        if (!token) {
            if (window.showLoginModal) window.showLoginModal();
            else alert("Debes iniciar sesión para usar esta función.");
            return;
        }
        fetch("/api/profesores", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async res => {
                if (!res.ok) {
                    const data = await res.json();
                    if (window.showLoginModal) window.showLoginModal();
                    else alert(data.error || "Sesión expirada. Por favor, inicia sesión de nuevo.");
                    localStorage.removeItem("token");
                    return [];
                }
                return res.json();
            })
            .then(data => {
                if (!Array.isArray(data)) return;
                const select = document.getElementById("profesorSelect");
                select.innerHTML = '<option value="">Selecciona un profesor/tutor</option>';
                data.forEach(prof => {
                    const option = document.createElement("option");
                    option.value = prof.id;
                    option.textContent = prof.nombre;
                    select.appendChild(option);
                });
                showStep(1);
            });
    }

    // --- Paso 1: Seleccionar profesor ---
    document.getElementById("acceptProfesorBtn").onclick = () => {
        const select = document.getElementById("profesorSelect");
        if (!select.value) {
            alert("Selecciona un profesor o tutor.");
            return;
        }
        selectedProfesorId = select.value;
        showStep(2);
    };

    // --- Paso 2: Seleccionar aval firmado ---
    document.getElementById("acceptAvalBtn").onclick = () => {
        const signedFile = document.getElementById("signedFile").files[0];
        if (!signedFile) {
            alert("Selecciona el archivo avalado (PDF firmado).");
            return;
        }
        showStep(3);
    };

    // --- Paso 3: Seleccionar original y verificar ---
    document.getElementById("acceptOriginalBtn").onclick = () => {
        const originalFile = document.getElementById("originalFile").files[0];
        if (!originalFile) {
            alert("Selecciona el archivo original (PDF).");
            return;
        }

        // Mostrar loader y texto "Verificando..." antes de hacer la petición
        showStep(4);
        const resultElem = document.getElementById("verificationResult");
        const detailsElem = document.getElementById("verificationDetails");
        const continueBtn = document.getElementById("continueVerifyBtn");
        const retryKeyBtn = document.getElementById("retryKeyBtn");

        resultElem.innerHTML = `
            <span class="loader" style="vertical-align: middle"></span>
            <span style="margin-left: 10px;">Verificando...</span>
        `;
        detailsElem.textContent = "";
        continueBtn.style.display = "none";
        retryKeyBtn.style.display = "none";
        document.getElementById("restartVerifyProcessBtn").style.display = "none"; // Oculta siempre al entrar

        // --- Procesar verificación ---
        const signedFile = document.getElementById("signedFile").files[0];
        const formData = new FormData();
        formData.append("signedFile", signedFile);
        formData.append("originalFile", originalFile);
        formData.append("profesorId", selectedProfesorId);

        fetch("/verify-document", {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: formData,
        })
            .then(async (response) => {
                setTimeout(async () => {
                    continueBtn.style.display = "none";
                    retryKeyBtn.style.display = "none";
                    document.getElementById("restartVerifyProcessBtn").style.display = "none";
                    detailsElem.textContent = "";

                    if (response.ok) {
                        const data = await response.json();
                        if (data.reason === "key_mismatch") {
                            // Solo mostrar "Intentar con otro profesor"
                            resultElem.textContent = "❌ El profesor/tutor seleccionado NO avaló este documento.";
                            resultElem.style.color = "orange";
                            detailsElem.innerHTML = `
<ul class="no-bullets">
  <li>La llave pública del profesor/tutor seleccionado no coincide con la firma digital.</li>
  <li>No se puede verificar la autenticidad del aval.</li>
</ul>
`;
                            retryKeyBtn.style.display = "inline-block";
                        }
                        else if (data.reason === "invalid_signature") {
                            // Solo mostrar "Verificar otro documento"
                            resultElem.textContent = "⚠️ El profesor/tutor sí avaló el documento, pero el archivo original NO coincide.";
                            resultElem.style.color = "red";
                            detailsElem.innerHTML = `
<ul class="no-bullets">
  <li>La llave pública coincide con la firma digital.</li>
  <li>El documento original ha sido modificado o no corresponde con el aval.</li>
</ul>
`;
                            continueBtn.style.display = "inline-block";
                        }
                        else if (data.valid && data.professorMatch && data.signatureMatch) {
                            // Solo mostrar "Volver a empezar"
                            resultElem.textContent = "✅ El profesor/tutor avaló el documento y la firma digital es válida.";
                            resultElem.style.color = "green";
                            detailsElem.innerHTML = `
<ul class="no-bullets">
  <li>La llave pública coincide con la firma digital.</li>
  <li>El documento original no ha sido modificado.</li>
</ul>
`;
                            document.getElementById("restartVerifyProcessBtn").style.display = "inline-block";
                        }
                        else {
                            resultElem.textContent = data.message || "Error al verificar el documento.";
                            resultElem.style.color = "red";
                            continueBtn.style.display = "inline-block";
                        }
                    } else {
                        resultElem.textContent = "Error al verificar el documento.";
                        resultElem.style.color = "red";
                        continueBtn.style.display = "inline-block";
                    }
                }, 1200);
            })
            .catch(() => {
                setTimeout(() => {
                    resultElem.textContent = "Error al verificar el documento.";
                    resultElem.style.color = "red";
                    continueBtn.style.display = "inline-block";
                    retryKeyBtn.style.display = "none";
                }, 1200);
            });
    };

    // --- Acciones finales ---
    function limpiarFormulariosVerificar() {
        document.getElementById("verifyAvalForm").reset();
        document.getElementById("verifyOriginalForm").reset();
        // Limpia los inputs file manualmente
        const signedFile = document.getElementById("signedFile");
        if (signedFile) signedFile.value = "";
        const signedCustom = signedFile?.parentElement?.querySelector('.file-custom');
        if (signedCustom) signedCustom.textContent = "Ningún archivo seleccionado";
        const originalFile = document.getElementById("originalFile");
        if (originalFile) originalFile.value = "";
        const originalCustom = originalFile?.parentElement?.querySelector('.file-custom');
        if (originalCustom) originalCustom.textContent = "Ningún archivo seleccionado";
        document.getElementById("verificationResult").textContent = "";
        document.getElementById("verificationDetails").textContent = "";
        document.getElementById("continueVerifyBtn").style.display = "none";
        document.getElementById("retryKeyBtn").style.display = "none";
    }

    document.getElementById("continueVerifyBtn").onclick = () => {
        limpiarFormulariosVerificar();
        showStep(1);
    };
    document.getElementById("retryKeyBtn").onclick = () => {
        limpiarFormulariosVerificar();
        showStep(1);
    };
    document.getElementById("restartVerifyProcessBtn").onclick = () => {
        limpiarFormulariosVerificar();
        showStep(1);
    };

    // --- Estado inicial ---
    document.getElementById("continueVerifyBtn").style.display = "none";
    document.getElementById("retryKeyBtn").style.display = "none";
    showStep(1);

    // --- Hacer la función global para frontend.js ---
    window.cargarProfesoresYMostrarPaso1 = cargarProfesoresYMostrarPaso1;
});