// Llama a window.openUserKeysModal(callback) para abrir el modal y ejecutar callback(keyId, keyName) al confirmar

(function () {
    const keySelectModal = document.getElementById("keySelectModal");
    const closeKeySelectModal = document.getElementById("closeKeySelectModal");
    const userKeysList = document.getElementById("userKeysList");
    const keyConfirmSection = document.getElementById("keyConfirmSection");
    const keyConfirmText = document.getElementById("keyConfirmText");
    const confirmKeyBtn = document.getElementById("confirmKeyBtn");
    const cancelKeyBtn = document.getElementById("cancelKeyBtn");

    let selectedKeyId = null;
    let selectedKeyName = null;
    let onConfirmCallback = null;

    function openUserKeysModal(callback) {
        onConfirmCallback = callback;
        keyConfirmSection.style.display = "none";
        userKeysList.innerHTML = "<li>Cargando llaves...</li>";
        keySelectModal.style.display = "flex";
        // Obtener la llave activa actual
        fetch("/active-key", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then(res => res.json())
            .then(activeData => {
                const activeKeyId = activeData.activeKey ? activeData.activeKey.id : null;
                // Ahora obtener todas las llaves
                fetch("/user-keys", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        userKeysList.innerHTML = "";
                        if (data.keys && data.keys.length > 0) {
                            data.keys.forEach(key => {
                                const li = document.createElement("li");
                                li.className = (activeKeyId === key.id) ? "active-key" : "";
                                // Nombre
                                const name = document.createElement("div");
                                name.className = "key-name";
                                name.textContent = key.nombre || `Llave ${key.id}`;
                                li.appendChild(name);
                                // Expiración
                                const exp = document.createElement("div");
                                exp.className = "key-exp";
                                if (key.expiration_date) {
                                    const expDate = new Date(key.expiration_date);
                                    if (expDate > new Date()) {
                                        exp.textContent = `Expira: ${expDate.toLocaleString()}`;
                                        exp.classList.add("valid");
                                    } else {
                                        exp.textContent = "Expirada";
                                        exp.classList.add("expired");
                                    }
                                } else {
                                    exp.textContent = "Sin expiración";
                                    exp.classList.add("valid");
                                }
                                li.appendChild(exp);
                                // Botón seleccionar
                                const btn = document.createElement("button");
                                btn.textContent = (activeKeyId === key.id) ? "Llave activa" : "Seleccionar";
                                btn.disabled = (activeKeyId === key.id);
                                btn.onclick = () => {
                                    selectedKeyId = key.id;
                                    selectedKeyName = key.nombre || `Llave ${key.id}`;
                                    keyConfirmText.textContent = `¿Seguro que deseas usar la llave "${selectedKeyName}" para verificar este documento?`;
                                    keyConfirmSection.style.display = "block";
                                };
                                li.appendChild(btn);
                                userKeysList.appendChild(li);
                            });
                        } else {
                            userKeysList.innerHTML = "<li>No tienes llaves disponibles.</li>";
                        }
                    });
            });
    }

    function closeModal() {
        keySelectModal.style.display = "none";
        keyConfirmSection.style.display = "none";
        selectedKeyId = null;
        selectedKeyName = null;
        onConfirmCallback = null;
    }

    closeKeySelectModal.onclick = closeModal;
    cancelKeyBtn.onclick = closeModal;

    confirmKeyBtn.onclick = async () => {
        if (!selectedKeyId || typeof onConfirmCallback !== "function") return;
        // Cambia la llave activa en el backend
        const resp = await fetch('/select-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ keyId: selectedKeyId })
        });
        const data = await resp.json();
        if (data.success) {
            alert(`Llave activa cambiada a "${data.activeKeyName}".`);
            if (typeof loadActiveKey === "function") loadActiveKey();
            if (typeof onConfirmCallback === "function") onConfirmCallback(selectedKeyId, selectedKeyName);
            closeModal();
        } else {
            alert(data.error || "Error al cambiar la llave.");
        }
    };

    window.onclick = function (event) {
        if (event.target === keySelectModal) {
            closeModal();
        }
    };

    // Expón la función globalmente
    window.openUserKeysModal = openUserKeysModal;

    // Verifica si hay token en localStorage antes de intentar cargar llaves
    if (!localStorage.getItem("token")) {
        // No hay sesión, no intentes cargar llaves
        return;
    }
})();