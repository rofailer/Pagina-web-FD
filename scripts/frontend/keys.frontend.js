document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos
    const generateKeysButton = document.getElementById("generateKeysButton");
    const keysList = document.getElementById("keysList");
    const activeKeyElement = document.getElementById("activeKey");

    // Función para cargar la llave activa
    async function loadActiveKey() {
        if (!localStorage.getItem("token")) return;
        try {
            const response = await fetch("/active-key", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            if (!response.ok) return;
            const data = await response.json();
            if (data.activeKey) {
                const expirationDate = new Date(data.expirationDate);
                const now = new Date();

                if (now > expirationDate) {
                    activeKeyElement.textContent = `Llave activa: ${data.activeKey} (Expirada)`;
                } else {
                    activeKeyElement.textContent = `Llave activa: ${data.activeKey}`;
                }
            } else {
                activeKeyElement.textContent = "No hay una llave activa seleccionada.";
            }
        } catch (err) {
            // Puedes omitir el error si no hay sesión
        }
    }

    // Función para cargar la lista de llaves
    async function loadKeys() {
        if (!localStorage.getItem("token")) return;
        try {
            const response = await fetch("/list-keys", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            if (!response.ok) return;
            const keys = await response.json();
            if (!Array.isArray(keys)) return;

            // Obtener la llave activa para marcarla
            let activeKeyName = null;
            try {
                const activeResp = await fetch("/active-key", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                if (activeResp.ok) {
                    const activeData = await activeResp.json();
                    activeKeyName = activeData.activeKey;
                }
            } catch { }

            keysList.innerHTML = "";

            keys.forEach((key) => {
                const expirationDate = new Date(key.expiration_date);
                const now = new Date();
                const timeRemaining = expirationDate - now;
                const isActive = activeKeyName === key.key_name;

                const listItem = document.createElement("li");
                listItem.className = "key-item" + (isActive ? " active" : "");

                listItem.innerHTML = `
                    <span class="key-label">${key.key_name}</span>
                    <span class="key-cipher" style="display:block; color:#0078d7; font-weight:500; margin-bottom:4px;">
                        🔒 Cifrado: ${key.encryption_type ? key.encryption_type.toUpperCase() : 'No especificado'}
                    </span>
                    <span class="key-date">
                        Expira el: ${expirationDate.toLocaleDateString()} 
                        (${timeRemaining > 0 ? `${Math.ceil(timeRemaining / (1000 * 60 * 60 * 24))} días restantes` : "Expirada"})
                    </span>
                    ${isActive ? '<span class="key-type" style="color:green;font-weight:600;">Llave activa</span>' :
                        `<button class="select-key-btn btn-mini" data-key-id="${key.id}">Seleccionar</button>`
                    }
                `;
                keysList.appendChild(listItem);
            });

            // Asigna eventos a los botones de seleccionar
            document.querySelectorAll(".select-key-btn").forEach(btn => {
                btn.addEventListener("click", function () {
                    const keyId = this.getAttribute("data-key-id");
                    if (keyId) selectKey(keyId);
                });
            });
        } catch (err) {
            // Puedes omitir el error si no hay sesión
        }
    }

    // Función para generar nuevas llaves 
    generateKeysButton.addEventListener("click", () => {
        window.showKeyPasswordModal(async (keyPassword) => {
            try {
                const encryptionType = localStorage.getItem("encryptionType") || "aes-256-cbc"; const keyNameInput = document.getElementById("keyNameInput");
                const keyName = keyNameInput ? keyNameInput.value.trim() : "";

                const response = await fetch("/generate-keys", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: JSON.stringify({ keyPassword, encryptionType, keyName }),
                });
                const data = await response.json();

                if (data.success) {
                    alert(`Llave "${data.keyName}" generada correctamente.`);
                    if (typeof loadKeys === "function") loadKeys();
                    // Limpiar el campo de nombre después de generar la llave
                    if (keyNameInput) keyNameInput.value = "";
                } else {
                    alert(data.error || "Error al generar la llave.");
                }
            } catch (err) {
                alert("Error al generar la llave.");
            }
        });
    });

    // Función para seleccionar una llave activa
    window.selectKey = async (keyId) => {
        try {
            const resp = await fetch('/select-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ keyId })
            });
            const data = await resp.json();
            if (data.success) {
                alert("Llave activa actualizada correctamente");
                if (typeof loadKeys === "function") loadKeys();
                if (typeof loadActiveKey === "function") loadActiveKey();
            } else {
                alert(data.error || "Error al seleccionar la llave");
            }
        } catch (err) {
            alert("Error al seleccionar la llave");
        }
    };

    // Cargar las llaves y la llave activa al cargar la página
    loadKeys();
    loadActiveKey();

    window.loadActiveKey = loadActiveKey;
});