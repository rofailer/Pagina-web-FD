document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos
    const keysList = document.getElementById("profileKeysList");
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

            // Debug temporal: ver estructura de las llaves
            console.log('Estructura de llaves recibidas:', keys);
            if (keys.length > 0) {
                console.log('Primera llave ejemplo:', keys[0]);
                console.log('Campos disponibles:', Object.keys(keys[0]));
            }

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
            } catch (err) {
                // Continuar sin marcar la llave activa
            }

            // Calcular estadísticas de llaves
            const totalKeys = keys.length;
            let activeKeys = 0;
            let expiredKeys = 0;

            keys.forEach(key => {
                const expirationDate = new Date(key.expiration_date);
                const now = new Date();
                const isExpired = key.expired || now > expirationDate;

                if (isExpired) {
                    expiredKeys++;
                } else {
                    activeKeys++;
                }
            });

            // Actualizar contadores en la interfaz
            const totalKeysElement = document.getElementById("totalKeysCount");
            const activeKeysElement = document.getElementById("activeKeysCount");
            const expiredKeysElement = document.getElementById("expiredKeysCount");

            if (totalKeysElement) totalKeysElement.textContent = totalKeys;
            if (activeKeysElement) activeKeysElement.textContent = activeKeys;
            if (expiredKeysElement) expiredKeysElement.textContent = expiredKeys;

            // Actualizar información de llave activa
            const activeKeyInfo = document.getElementById("activeKeyInfo");
            const activeKeyNameElement = document.getElementById("activeKeyName");
            const activeKeyIndicator = document.getElementById("activeKeyIndicator");

            if (activeKeyInfo && activeKeyNameElement) {
                // Limpiar clases anteriores
                activeKeyInfo.classList.remove("no-active-key", "expired-key");

                if (activeKeyName) {
                    // Verificar si la llave activa está expirada
                    const activeKey = keys.find(key => key.key_name === activeKeyName);
                    let isActiveKeyExpired = false;

                    if (activeKey) {
                        const expirationDate = new Date(activeKey.expiration_date);
                        const now = new Date();
                        isActiveKeyExpired = activeKey.expired || now > expirationDate;
                    }

                    activeKeyNameElement.textContent = activeKeyName;

                    if (isActiveKeyExpired) {
                        activeKeyInfo.classList.add("expired-key");
                    }
                    // Si no está expirada, no agregamos ninguna clase especial (estado normal)
                } else {
                    // No hay llave activa
                    activeKeyInfo.classList.add("no-active-key");
                    activeKeyNameElement.textContent = "No hay llave activa";
                }
            }

            // Solo actualizar si existe el contenedor
            if (keysList) {
                keysList.innerHTML = "";
                keys.forEach(key => {
                    // Usar expiration_date directamente del servidor
                    const expirationDate = new Date(key.expiration_date);
                    const now = new Date();
                    const isExpired = key.expired || now > expirationDate;
                    const isActive = key.key_name === activeKeyName;

                    // Calcular días hasta expiración usando timeRemaining del servidor
                    const daysUntilExpiration = Math.ceil(key.timeRemaining / (1000 * 60 * 60 * 24));

                    let expirationText = '';
                    let expirationClass = 'normal';

                    if (isExpired) {
                        expirationText = `Fecha de expiración: ${expirationDate.toLocaleDateString('es-ES')} (Expirada)`;
                        expirationClass = 'normal';
                    } else if (daysUntilExpiration <= 30) {
                        expirationText = `Fecha de expiración: ${expirationDate.toLocaleDateString('es-ES')} (${daysUntilExpiration} día${daysUntilExpiration !== 1 ? 's' : ''} restante${daysUntilExpiration !== 1 ? 's' : ''})`;
                        expirationClass = 'normal';
                    } else {
                        expirationText = `Fecha de expiración: ${expirationDate.toLocaleDateString('es-ES')} (${daysUntilExpiration} días restantes)`;
                        expirationClass = 'normal';
                    }

                    const listItem = document.createElement("div");
                    let itemClass = "key-item";
                    if (isActive) itemClass += " active";
                    if (isExpired) itemClass += " expired";
                    listItem.className = itemClass;

                    listItem.innerHTML = `
                        <div class="key-info">
                            <div class="key-details-container">
                                <div class="key-name">
                                    ${key.key_name}
                                    ${isActive ? '<span class="active-badge">ACTIVA</span>' : ''}
                                </div>
                                <div class="key-details">
                                    <span>${key.encryption_type || 'RSA-2048'}</span>
                                    <span class="expiration-status ${expirationClass}">${expirationText}</span>
                                </div>
                            </div>
                        </div>
                        <div class="key-actions">
                            <button class="key-action-btn key-download-btn clear-btn" onclick="downloadKey('${key.key_name}')" title="Descargar llave">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </button>
                            <button class="key-action-btn key-delete-btn clear-btn" onclick="event.stopPropagation(); deleteKey('${key.key_name}')" title="Eliminar llave">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                    <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    `;

                    listItem.addEventListener("click", () => {
                        if (typeof window.selectKeyProfile === "function") {
                            window.selectKeyProfile(key.id);
                        }
                    });

                    keysList.appendChild(listItem);
                });
            }
        } catch (err) {
            // Puedes omitir el error si no hay sesión
        }
    }

    // La función para generar nuevas llaves ahora está en profile.frontend.js
    // mediante showCreateKeyModal()

    // Función para seleccionar una llave activa - CENTRALIZADA
    window.selectKeyProfile = async (keyId) => {
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
                // Usar el sistema de notificaciones de la página
                if (typeof showNotification === 'function') {
                    showNotification("Llave activa actualizada correctamente", "success");
                } else {
                    alert("Llave activa actualizada correctamente");
                }
                // Recargar las llaves en perfil
                if (typeof loadKeys === "function") loadKeys();
                if (typeof loadActiveKey === "function") loadActiveKey();
            } else {
                // Usar el sistema de notificaciones de la página
                if (typeof showNotification === 'function') {
                    showNotification("Error al seleccionar la llave", "error");
                } else {
                    alert("Error al seleccionar la llave");
                }
            }
        } catch (err) {
            // Usar el sistema de notificaciones de la página
            if (typeof showNotification === 'function') {
                showNotification("Error al seleccionar la llave", "error");
            } else {
                alert("Error al seleccionar la llave");
            }
        }
    };

    // Cargar las llaves y la llave activa al cargar la página
    loadKeys();
    loadActiveKey();

    // Hacer funciones globales para coordinación entre archivos
    window.loadActiveKey = loadActiveKey;
    window.loadKeys = loadKeys;
});
