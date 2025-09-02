// ===========================
// PERFIL - JAVASCRIPT FUNCTIONS
// ===========================

// Función temporal para evitar errores mientras se migra la funcionalidad a keys.frontend.js
function updateKeysCount() {
    console.log('updateKeysCount: función temporal - la funcionalidad real está en keys.frontend.js');
    // No hacer nada por ahora para evitar errores de elementos null
}

document.addEventListener('DOMContentLoaded', function () {
    initializeProfile();
    initializeTabs();
});

// ===========================
// SISTEMA DE PESTAÑAS
// ===========================
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.perfil-tab-btn');
    const tabContents = document.querySelectorAll('.perfil-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            // Remover active de todos los botones y contenidos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activar el botón clickeado
            this.classList.add('active');

            // Activar el contenido correspondiente
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Efectos adicionales según la pestaña
            switch (targetTab) {
                case 'gestion-llaves':
                    // updateKeysCount(); // Comentado temporalmente - manejado por keys.frontend.js
                    loadUserKeys();
                    break;
                case 'configuracion-cifrado':
                    loadEncryptionSettings();
                    break;
                case 'datos-personales':
                    loadUserData();
                    break;
                case 'personalizacion-pdf':
                    loadCurrentTemplate();
                    break;
                case 'historial-firma':
                    loadHistorialFirma();
                    break;
            }
        });
    });
}

// ===========================
// INICIALIZACIÓN
// ===========================
function initializeProfile() {
    setupEncryptionOptions();
    setupPdfTemplates();
    loadUserData();
    loadUserKeys();
    // updateKeysCount(); // Comentado temporalmente - manejado por keys.frontend.js
    loadAdvancedSettings();
}

// ===========================
// PERSONALIZACIÓN PDF: Cargar plantilla actual y mostrar modal de reset
// ===========================
function loadCurrentTemplate() {
    // Carga la configuración actual y actualiza el panel visualmente
    setupPdfTemplates();
    // Animación visual para la sección de personalización
    const panel = document.getElementById('customTemplateOptions');
    if (panel) {
        panel.classList.remove('section-animate');
        void panel.offsetWidth;
        panel.classList.add('section-animate');
    }
    // Vincular botón de reset para mostrar el modal
    const resetBtn = document.getElementById('resetTemplateBtn');
    if (resetBtn) {
        resetBtn.onclick = function (e) {
            e.preventDefault();
            const modal = document.getElementById('templateResetModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('show'), 10);
            }
        };
    }
    const cancelBtn = document.getElementById('cancelTemplateResetBtn');
    const closeBtn = document.getElementById('closeTemplateResetModal');
    const confirmBtn = document.getElementById('confirmTemplateResetBtn');
    [cancelBtn, closeBtn].forEach(btn => {
        if (btn) {
            btn.onclick = function () {
                const modal = document.getElementById('templateResetModal');
                if (modal) {
                    modal.classList.remove('show');
                    setTimeout(() => modal.style.display = 'none', 200);
                }
            };
        }
    });
    // Botón de confirmar reset
    if (confirmBtn) {
        confirmBtn.onclick = async function () {
            setControlStatus('applying');
            // Restablecer: volver a plantilla clásica (template1)
            const res = await fetch('/api/pdf-template/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ template: 'template1' })
            });
            if (res.ok) {
                setControlStatus('success');
                showNotification('Plantilla restablecida a Clásico', 'success');
                // Actualiza el selector visualmente a Clásico
                renderPdfTemplateSelector('template1');
                setupPdfTemplates();
            } else {
                setControlStatus('error');
                showNotification('Error al restablecer', 'error');
            }
            const modal = document.getElementById('templateResetModal');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.style.display = 'none', 200);
            }
        };
    }
}

// ===========================
// DATOS PERSONALES
// ===========================
function selectProfilePhoto() {
    document.getElementById('profilePhotoInput').click();
}

function handleProfilePhoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const photoContainer = document.querySelector('.perfil-photo');
            photoContainer.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil">`;
        };
        reader.readAsDataURL(file);
    }
}

function loadUserData() {
    // Cargar datos del usuario desde localStorage o backend
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    const userNameInput = document.getElementById('userName');
    const userEmailInput = document.getElementById('userEmail');
    const userOrganizationInput = document.getElementById('userOrganization');
    const userBioInput = document.getElementById('userBio');

    if (userNameInput && userData.name) userNameInput.value = userData.name;
    if (userEmailInput && userData.email) userEmailInput.value = userData.email;
    if (userOrganizationInput && userData.organization) userOrganizationInput.value = userData.organization;
    if (userBioInput && userData.bio) userBioInput.value = userData.bio;

    if (userData.photo) {
        const photoContainer = document.querySelector('.perfil-photo');
        if (photoContainer) {
            photoContainer.innerHTML = `<img src="${userData.photo}" alt="Foto de perfil">`;
        }
    }
}

function saveUserData() {
    const userNameInput = document.getElementById('userName');
    const userEmailInput = document.getElementById('userEmail');
    const userOrganizationInput = document.getElementById('userOrganization');
    const userBioInput = document.getElementById('userBio');

    const userData = {
        name: userNameInput ? userNameInput.value : '',
        email: userEmailInput ? userEmailInput.value : '',
        organization: userOrganizationInput ? userOrganizationInput.value : '',
        bio: userBioInput ? userBioInput.value : '',
        photo: document.querySelector('.perfil-photo img')?.src || ''
    };

    localStorage.setItem('userData', JSON.stringify(userData));
    showNotification('Datos personales guardados correctamente', 'success');
}

// ===========================
// GESTIÓN DE LLAVES
// ===========================
function updateKeysCount() {
    const keysList = document.getElementById('profileKeysList');

    if (keysList) {
        const count = keysList.children.length;

        // Actualizar los nuevos elementos de estadísticas
        const totalKeysElement = document.getElementById('totalKeysCount');
        const activeKeysElement = document.getElementById('activeKeysCount');
        const expiredKeysElement = document.getElementById('expiredKeysCount');

        if (totalKeysElement) totalKeysElement.textContent = count;
        // Por ahora mostrar count en activas hasta que se implemente la lógica completa
        if (activeKeysElement) activeKeysElement.textContent = count;
        if (expiredKeysElement) expiredKeysElement.textContent = '0';
    }
}

async function loadUserKeys() {
    const keysList = document.getElementById('profileKeysList');
    if (!keysList) return;

    try {
        const response = await fetch('/list-keys', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const keys = await response.json();
            keysList.innerHTML = '';

            if (keys.length === 0) {
                keysList.innerHTML = '<p class="no-keys-message">No tienes llaves generadas aún.</p>';
            } else {
                keys.forEach(key => {
                    const keyElement = createKeyElement(key);
                    keysList.appendChild(keyElement);
                });
            }
        } else {
            keysList.innerHTML = '<p class="error-message">Error al cargar las llaves.</p>';
        }
    } catch (error) {
        console.error('Error al cargar llaves:', error);
        keysList.innerHTML = '<p class="error-message">Error de conexión.</p>';
    }

    updateKeysCount();
}

function createKeyElement(key) {
    const keyDiv = document.createElement('div');
    keyDiv.className = 'key-item';
    keyDiv.innerHTML = `
        <div class="key-info">
            <div class="key-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="8" y="6" width="13" height="12" rx="1" stroke="currentColor" stroke-width="2"/>
                    <circle cx="10" cy="12" r="1" fill="currentColor"/>
                    <path d="M3 15a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1z" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 15h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="key-details-container">
                <div class="key-name">${key.key_name}</div>
                <div class="key-details">
                    <span>${key.encryption_type || 'AES-256-CBC'}</span>
                    <span>Creada: ${new Date(key.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
        <div class="key-actions">
            <button class="key-action-btn key-download-btn" onclick="event.stopPropagation(); downloadKey('${key.key_name}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Descargar
            </button>
            <button class="key-action-btn key-delete-btn" onclick="event.stopPropagation(); deleteKey('${key.key_name}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Eliminar
            </button>
        </div>
    `;
    return keyDiv;
}

function showCreateKeyModal() {
    console.log('showCreateKeyModal llamada - iniciando proceso de creación de llave');

    // Verificar el campo de nombre de llave primero
    const keyNameInput = document.getElementById('keyNameInput');
    if (!keyNameInput) {
        console.warn('keyNameInput no encontrado');
        alert('Error: Campo de nombre de llave no encontrado');
        return;
    }

    const keyName = keyNameInput.value.trim();
    if (!keyName) {
        // Resaltar el campo y mostrar mensaje de error
        keyNameInput.style.border = '2px solid #f44336';
        keyNameInput.style.boxShadow = '0 0 5px rgba(244, 67, 54, 0.5)';
        keyNameInput.focus();
        keyNameInput.scrollIntoView({ behavior: 'smooth' });

        // Mostrar mensaje de error
        alert('Por favor, ingresa un nombre para la nueva llave');

        // Restaurar estilo después de un tiempo
        setTimeout(() => {
            keyNameInput.style.border = '';
            keyNameInput.style.boxShadow = '';
        }, 3000);

        return;
    }

    // Si hay nombre, continuar con el proceso
    keyNameInput.focus();
    keyNameInput.scrollIntoView({ behavior: 'smooth' });

    // Dar un pequeño delay para asegurar que todos los scripts estén cargados
    setTimeout(() => {
        // Mostrar el modal de contraseña para generar la llave
        console.log('Verificando si existe showKeyPasswordModal:', typeof window.showKeyPasswordModal);
        if (typeof window.showKeyPasswordModal === 'function') {
            console.log('Mostrando modal de contraseña');
            window.showKeyPasswordModal(async (keyPassword) => {
                try {
                    const encryptionType = localStorage.getItem("encryptionType") || "aes-256-cbc";
                    const keyName = keyNameInput ? keyNameInput.value.trim() : "";

                    console.log('Enviando solicitud de generación de llave:', { keyName, encryptionType });

                    const response = await fetch("/generate-keys", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                        body: JSON.stringify({ keyPassword, encryptionType, keyName }),
                    });

                    console.log('Respuesta del servidor:', response.status, response.statusText);

                    const data = await response.json();
                    console.log('Datos recibidos:', data);

                    if (data.success) {
                        console.log('Llave creada exitosamente');

                        // Usar el sistema de notificaciones de la página
                        if (typeof showNotification === 'function') {
                            showNotification(`Llave "${data.keyName}" generada correctamente`, 'success');
                        } else {
                            alert(`Llave "${data.keyName}" generada correctamente.`);
                        }

                        // Limpiar el campo de nombre después de generar la llave
                        if (keyNameInput) {
                            keyNameInput.value = "";
                            // Restaurar estilo del input
                            keyNameInput.style.border = '';
                            keyNameInput.style.boxShadow = '';
                        }

                        // Recargar las llaves - con manejo de errores
                        try {
                            if (typeof window.loadKeys === "function") {
                                console.log('Recargando llaves con window.loadKeys');
                                window.loadKeys();
                            }
                        } catch (loadError) {
                            console.warn('Error al recargar con window.loadKeys:', loadError);
                        }

                        try {
                            console.log('Intentando recargar llaves del perfil');
                            if (typeof loadProfileKeys === "function") {
                                loadProfileKeys();
                            }
                        } catch (profileError) {
                            console.warn('Error al recargar llaves del perfil:', profileError);
                        }

                    } else {
                        console.error('Error en la respuesta del servidor:', data.error);

                        // Usar el sistema de notificaciones de la página
                        if (typeof showNotification === 'function') {
                            showNotification(data.error || "Error al generar la llave", 'error');
                        } else {
                            alert(data.error || "Error al generar la llave.");
                        }
                    }
                } catch (err) {
                    console.error('Error completo en la generación de llave:', err);

                    // Usar el sistema de notificaciones de la página
                    if (typeof showNotification === 'function') {
                        showNotification(`Error al generar la llave: ${err.message}`, 'error');
                    } else {
                        alert(`Error al generar la llave: ${err.message}`);
                    }
                }
            });
        } else {
            console.error('showKeyPasswordModal no está disponible. Tipo:', typeof window.showKeyPasswordModal);

            // Usar el sistema de notificaciones de la página
            if (typeof showNotification === 'function') {
                showNotification('Error: No se puede mostrar el modal de contraseña. Verifica que todos los scripts estén cargados.', 'error');
            } else {
                alert('Error: No se puede mostrar el modal de contraseña. Verifica que todos los scripts estén cargados.');
            }
        }
    }, 100); // Fin del setTimeout
}

// Hacer la función disponible globalmente para el onclick en HTML
window.showCreateKeyModal = showCreateKeyModal;

function downloadKey(keyName) {
    showNotification(`Descargando llave: ${keyName}`, 'info');
    // Aquí se conectará con la funcionalidad existente de descarga
}

// deleteKey function removed - now handled by deleteKey.frontend.js module

// ===========================
// CONFIGURACIÓN DE CIFRADO
// ===========================
function setupEncryptionOptions() {
    const options = document.querySelectorAll('.encryption-option');
    options.forEach(option => {
        option.addEventListener('click', function () {
            // Remover selección anterior
            options.forEach(opt => opt.classList.remove('selected'));
            // Seleccionar nueva opción
            this.classList.add('selected');

            const encryption = this.dataset.encryption;
            const currentDisplay = document.getElementById('currentEncryption');
            if (currentDisplay) {
                currentDisplay.textContent = encryption.toUpperCase();
            }
        });
    });
}

function loadEncryptionSettings() {
    const savedType = localStorage.getItem("encryptionType") || "aes-256-cbc";
    const currentDisplay = document.getElementById('currentEncryption');
    const options = document.querySelectorAll('.encryption-option');

    if (currentDisplay) {
        currentDisplay.textContent = savedType.toUpperCase();
    }

    options.forEach(option => {
        if (option.dataset.encryption === savedType) {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        }
    });
}

// ===========================
// PERSONALIZACIÓN PDF
// ===========================
function selectLogo() {
    const logoInput = document.getElementById('logoInput');
    if (logoInput) {
        logoInput.click();
    }
}

function handleLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.querySelector('.pdf-preview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Logo personalizado">`;
            }
        };
        reader.readAsDataURL(file);
    }
}

function renderPdfTemplateSelector(currentTemplate) {
    const templates = [
        { id: 'template1', name: 'Clásico', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><line x1="8" y1="7" x2="16" y2="7" stroke="#2563eb" stroke-width="1.5"/><line x1="8" y1="11" x2="16" y2="11" stroke="#2563eb" stroke-width="1.5"/><line x1="8" y1="15" x2="13" y2="15" stroke="#2563eb" stroke-width="1.5"/></svg>` },
        { id: 'template2', name: 'Moderno', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><rect x="8" y="7" width="8" height="2" fill="#2563eb"/><rect x="8" y="11" width="8" height="2" fill="#2563eb"/><rect x="8" y="15" width="5" height="2" fill="#2563eb"/></svg>` },
        { id: 'template3', name: 'Minimalista', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="#2563eb" stroke-width="1.5"/></svg>` },
        { id: 'template4', name: 'Elegante', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><path d="M8 8C8 10 16 10 16 8" stroke="#2563eb" stroke-width="1.5"/><path d="M8 16C8 14 16 14 16 16" stroke="#2563eb" stroke-width="1.5"/></svg>` },
        { id: 'custom', name: 'Personalizado', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><path d="M12 8v4l3 3" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` }
    ];
    const container = document.getElementById('pdfTemplatesSelector');
    // Preview should update in real time when clicking different templates
    if (!container) return;
    // Estado local: cuál radio está seleccionado (sin aplicar aún)
    // selected: la plantilla seleccionada temporalmente (preview)
    // currentTemplate: la plantilla activa real (aplicada)
    // Elimina dependencias de variables globales y usa solo el argumento actual
    let selected = currentTemplate;
    let active = (typeof window._pdfTemplateActive !== 'undefined') ? window._pdfTemplateActive : currentTemplate;
    let html = '<div class="perfil-template-selector" style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;margin-bottom:18px;">';
    templates.forEach(t => {
        html += `
        <label class="template-radio-label${selected === t.id ? ' selected-radio' : ''}" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 18px;border-radius:10px;border:2px solid #e0e0e0;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.2s;cursor:pointer;min-width:90px;position:relative;${selected === t.id ? 'border-color:#2563eb !important;box-shadow:0 0 0 2px #2563eb22;' : ''}">
            <input type="radio" name="pdfTemplate" value="${t.id}" ${selected === t.id ? 'checked' : ''} style="accent-color:#2563eb;width:20px;height:20px;margin-bottom:6px;" />
            <span style="display:flex;align-items:center;justify-content:center;">${t.svg}</span>
            <span style="font-weight:500;font-size:1em;">${t.name}</span>
            ${(active === t.id) ? '<span class="active-template-indicator">Plantilla activa</span>' : ''}
        </label>`;
    });
    html += '</div>';
    container.innerHTML = html;
    // Siempre asocia eventos a los radios tras cada render
    container.querySelectorAll('input[type=radio][name=pdfTemplate]').forEach(radio => {
        radio.addEventListener('change', function () {
            renderPdfTemplateSelector(this.value);
            if (window._lastPdfTemplateConfig) {
                renderPdfTemplatePreview(this.value, window._lastPdfTemplateConfig.customConfig || {}, window._lastPdfTemplateConfig);
            }
        });
    });
    // Preview SOLO visible en la sección de perfil cuando esté activa
    let preview = document.querySelector('.pdf-preview');
    if (preview && !preview.closest('#tab-personalizacion-pdf')) {
        // Si el preview existe pero no está en la sección de PDF, lo eliminamos
        preview.remove();
    }
    // Siempre mostrar la sección de personalización de estilos y logo
    const customDiv = document.getElementById('customTemplateOptions');
    if (customDiv) customDiv.style.display = '';
    // Si es custom, recargar autores/firmas/posiciones
    if (currentTemplate === 'custom') {
        fetch('/api/pdf-template/config', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(cfg => setupCustomTemplateForm(cfg.customConfig || {}));
    }
}

// Añade estilos para el indicador visual
const activeTemplateStyle = document.createElement('style');
activeTemplateStyle.textContent = `
.selected-radio {
  box-shadow: 0 0 0 2px #2563eb22 !important;
  border-color: #2563eb !important;
}
.active-template-indicator {
  margin-top: 6px;
  color: #10b981;
  font-size: 0.95em;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: block;
}
`;
document.head.appendChild(activeTemplateStyle);

// ===========================
// PERSONALIZACIÓN PDF
// ===========================
function selectLogo() {
    document.getElementById('logoInput').click();
}

function handleLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.querySelector('.pdf-preview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Logo personalizado">`;
        };
        reader.readAsDataURL(file);
    }
}

// ===========================
// CONFIGURACIÓN AVANZADA
// ===========================
function toggleSetting(toggle) {
    toggle.classList.toggle('active');

    // Guardar configuración
    const settings = {};
    document.querySelectorAll('.toggle-switch').forEach((switchEl, index) => {
        const settingItem = switchEl.closest('.setting-item');
        const label = settingItem.querySelector('.setting-label').textContent;
        settings[label] = switchEl.classList.contains('active');
    });

    localStorage.setItem('advancedSettings', JSON.stringify(settings));
}

function loadAdvancedSettings() {
    const settings = JSON.parse(localStorage.getItem('advancedSettings') || '{}');

    document.querySelectorAll('.setting-item').forEach(item => {
        const label = item.querySelector('.setting-label').textContent;
        const toggle = item.querySelector('.toggle-switch');

        if (settings.hasOwnProperty(label)) {
            if (settings[label]) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    });
}

// ===========================
// ACCIONES GLOBALES
// ===========================
function saveAllSettings() {
    try {
        // Guardar datos personales
        saveUserData();

        // Guardar configuración de cifrado
        const selectedEncryption = document.querySelector('.encryption-option.selected');
        if (selectedEncryption) {
            localStorage.setItem('encryptionType', selectedEncryption.dataset.encryption);
        }

        // Guardar plantilla PDF seleccionada
        const selectedTemplate = document.querySelector('.pdf-template.selected');
        if (selectedTemplate) {
            localStorage.setItem('pdfTemplate', selectedTemplate.dataset.template);
        }

        // Guardar configuraciones avanzadas (ya se guardan automáticamente)

        showNotification('¡Todas las configuraciones han sido guardadas exitosamente!', 'success');

    } catch (error) {
        console.error('Error guardando configuraciones:', error);
        showNotification('Error al guardar las configuraciones', 'error');
    }
}

function resetAllSettings() {
    if (confirm('¿Estás seguro de que quieres restablecer todas las configuraciones?')) {
        // Limpiar localStorage
        localStorage.removeItem('userData');
        localStorage.removeItem('encryptionType');
        localStorage.removeItem('pdfTemplate');
        localStorage.removeItem('advancedSettings');

        // Recargar configuraciones por defecto
        initializeProfile();

        // Limpiar formularios
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('userOrganization').value = '';
        document.getElementById('userBio').value = '';

        // Restablecer foto
        document.querySelector('.perfil-photo').innerHTML = '<div class="perfil-photo-placeholder">📷</div>';

        showNotification('Configuraciones restablecidas a valores por defecto', 'info');
    }
}

// ===========================
// UTILIDADES
// ===========================
// Las notificaciones ahora se manejan con el sistema global de notifications.js

// ===== HISTORIAL DE FIRMA FUNCTIONS =====
function loadHistorialFirma() {
    console.log('Cargando historial de firma...');

    // Configurar filtros
    setupHistorialFilters();

    // Cargar documentos del historial
    displayHistorialDocuments();
}

function setupHistorialFilters() {
    const filterBtn = document.querySelector('.filter-btn');
    const fechaInicio = document.getElementById('filtro-fecha-inicio');
    const fechaFin = document.getElementById('filtro-fecha-fin');
    const estadoSelect = document.getElementById('filtro-estado');

    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            const filtros = {
                fechaInicio: fechaInicio?.value || '',
                fechaFin: fechaFin?.value || '',
                estado: estadoSelect?.value || ''
            };

            console.log('Aplicando filtros:', filtros);
            filterHistorialDocuments(filtros);
        });
    }

    // Configurar paginación
    setupHistorialPagination();
}

function displayHistorialDocuments() {
    const historialList = document.getElementById('historial-documentos');
    if (!historialList) return;

    // Los documentos de ejemplo ya están en el HTML
    // Configurar event listeners para las acciones
    setupHistorialActions();
}

function setupHistorialActions() {
    const historialList = document.getElementById('historial-documentos');
    if (!historialList) return;

    // Botones de descarga
    historialList.querySelectorAll('.descargar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const historialItem = e.target.closest('.historial-item');
            const nombreDoc = historialItem.querySelector('.documento-nombre').textContent;
            console.log('Descargando documento:', nombreDoc);

            // Aquí iría la lógica para descargar el documento
            showNotification('Descargando documento firmado...', 'info');
        });
    });

    // Botones de verificación
    historialList.querySelectorAll('.verificar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const historialItem = e.target.closest('.historial-item');
            const nombreDoc = historialItem.querySelector('.documento-nombre').textContent;
            console.log('Verificando firma del documento:', nombreDoc);

            // Aquí iría la lógica para verificar la firma
            showNotification('Verificando firma digital...', 'info');

            setTimeout(() => {
                showNotification('Firma verificada correctamente', 'success');
            }, 2000);
        });
    });

    // Botones de información
    historialList.querySelectorAll('.info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const historialItem = e.target.closest('.historial-item');
            const nombreDoc = historialItem.querySelector('.documento-nombre').textContent;
            console.log('Mostrando detalles del documento:', nombreDoc);

            // Aquí se abriría un modal con los detalles completos
            showDocumentDetails(historialItem);
        });
    });
}

function filterHistorialDocuments(filtros) {
    const historialItems = document.querySelectorAll('.historial-item');
    let itemsVisible = 0;

    historialItems.forEach(item => {
        let mostrar = true;

        // Filtrar por estado si se especifica
        if (filtros.estado) {
            const estadoElement = item.querySelector('.estado');
            const estadoActual = estadoElement.textContent.toLowerCase().trim();
            if (!estadoActual.includes(filtros.estado.toLowerCase())) {
                mostrar = false;
            }
        }

        // Aquí se agregarían más filtros (fecha, etc.)

        item.style.display = mostrar ? 'flex' : 'none';
        if (mostrar) itemsVisible++;
    });

    // Mostrar mensaje si no hay resultados
    const noDocumentosMsg = document.querySelector('.no-documentos');
    if (noDocumentosMsg) {
        noDocumentosMsg.style.display = itemsVisible === 0 ? 'block' : 'none';
    }

    showNotification(`Se encontraron ${itemsVisible} documentos`, 'info');
}

function setupHistorialPagination() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            console.log('Página anterior');
            // Lógica de paginación
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            console.log('Página siguiente');
            // Lógica de paginación
        });
    }
}

function showDocumentDetails(historialItem) {
    const nombreDoc = historialItem.querySelector('.documento-nombre').textContent;
    const fecha = historialItem.querySelector('.fecha').textContent;
    const estado = historialItem.querySelector('.estado').textContent;

    // Por ahora solo mostrar en consola, luego se puede crear un modal
    console.log('Detalles del documento:', {
        nombre: nombreDoc,
        fecha: fecha,
        estado: estado
    });

    showNotification('Función de detalles en desarrollo', 'info');
}

// ===========================
// FUNCIONES AUXILIARES PARA PLANTILLAS PDF
// ===========================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// === PDF Template Setup ===
function setupPdfTemplates() {
    fetch('/api/pdf-template/config', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(res => res.json())
        .then(config => {
            let currentTemplate = config.template || 'template1';
            // Permite que la plantilla activa sea la última aplicada
            window._pdfTemplateActive = currentTemplate;
            renderPdfTemplateSelector(currentTemplate);
            renderPdfTemplatePreview(currentTemplate, config.customConfig || {}, config);
            const customDiv = document.getElementById('customTemplateOptions');
            if (customDiv) customDiv.style.display = '';
            setupTemplateControlPanel();
            setupCustomTemplateForm(config.customConfig || {}, config);
            // Lógica del botón aplicar
            const applyBtn = document.getElementById('applyTemplateChangesBtn');
            if (applyBtn) {
                applyBtn.onclick = async function (e) {
                    e.preventDefault();
                    applyBtn.disabled = true;
                    applyBtn.classList.add('loading');
                    setControlStatus('applying');
                    // Toma la plantilla seleccionada actualmente en el DOM
                    const selectedRadio = document.querySelector('input[type=radio][name=pdfTemplate]:checked');
                    const selectedTemplate = selectedRadio ? selectedRadio.value : currentTemplate;
                    window._pdfTemplateActive = selectedTemplate;
                    let customConfig = {};
                    const form = document.getElementById('customTemplateForm');
                    if (form) {
                        customConfig = {
                            fieldFontSize: form.fieldFontSize ? parseInt(form.fieldFontSize.value, 10) : 16,
                            fieldColor: form.fieldColor ? form.fieldColor.value : '#222',
                            logo: form.pdfLogo && form.pdfLogo.files && form.pdfLogo.files[0] ? form.pdfLogo.files[0] : undefined
                        };
                        if (selectedTemplate === 'custom') {
                            customConfig = {
                                ...customConfig,
                                posTitulo: customPreviewState.posTitulo,
                                posAutores: customPreviewState.posAutores,
                                posFecha: customPreviewState.posFecha,
                                posFirmas: customPreviewState.posFirmas,
                                autores: customPreviewState.autores,
                                numFirmas: customPreviewState.posFirmas ? customPreviewState.posFirmas.length : 1
                            };
                        }
                    }
                    try {
                        let body, headers;
                        if (customConfig.logo) {
                            body = new FormData();
                            body.append('template', selectedTemplate);
                            body.append('customConfig', JSON.stringify(customConfig));
                            body.append('logo', customConfig.logo);
                            headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
                        } else {
                            body = JSON.stringify({ template: selectedTemplate, customConfig });
                            headers = {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            };
                        }
                        const res = await fetch('/api/pdf-template/config', {
                            method: 'POST',
                            headers,
                            body
                        });
                        if (res.ok) {
                            // Hacer GET para obtener el estado real
                            const getRes = await fetch('/api/pdf-template/config', {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                            });
                            if (getRes.ok) {
                                const config = await getRes.json();
                                window._pdfTemplateActive = config.template || 'template1';
                                window._lastPdfTemplateConfig = config;
                                renderPdfTemplateSelector(window._pdfTemplateActive);
                                renderPdfTemplatePreview(window._pdfTemplateActive, config.customConfig || {}, config);
                                setControlStatus('success');
                                showNotification('Configuración aplicada', 'success');
                            }
                            animateApplyButton(applyBtn);
                        }
                    } finally {
                        applyBtn.disabled = false;
                        applyBtn.classList.remove('loading');
                    }
                };
            }
            // Actualiza preview al cambiar plantilla
            const radios = document.querySelectorAll('input[type=radio][name=pdfTemplate]');
            radios.forEach(radio => {
                radio.addEventListener('change', function () {
                    const template = this.value;
                    window._pdfTemplateSelected = template;
                    renderPdfTemplateSelector(template);
                    renderPdfTemplatePreview(template, config.customConfig || {}, config);
                });
            });
            // Actualiza preview al editar campos de color/fuente/logo
            const form = document.getElementById('customTemplateForm');
            if (form) {
                ['fieldFontSize', 'fieldColor', 'pdfLogo'].forEach(field => {
                    if (form[field]) {
                        form[field].addEventListener('input', function () {
                            const customConfig = {
                                fieldFontSize: form.fieldFontSize ? parseInt(form.fieldFontSize.value, 10) : 16,
                                fieldColor: form.fieldColor ? form.fieldColor.value : '#222'
                            };
                            renderPdfTemplatePreview(window._pdfTemplateSelected || currentTemplate, customConfig, config);
                        });
                    }
                });
            }
        });
}

// Define la función para evitar ReferenceError
function setupTemplateControlPanel() { }

// === PDF Template Preview ===
let customPreviewState = {
    autores: ['Autor/es de ejemplo'],
    posAutores: [{ x: 120, y: 90 }],
    posTitulo: { x: 120, y: 60 },
    posFecha: { x: 120, y: 120 },
    posFirmas: [{ x: 100, y: 200 }],
    numFirmas: 1
};

function renderPdfTemplatePreview(template, customConfig, fullConfig) {
    const preview = document.querySelector('.pdf-preview');
    if (!preview) return;
    preview.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 250;
    preview.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Valores base
    let titulo = (customConfig?.titulo || fullConfig?.titulo || 'Título de ejemplo');
    let autores = (customConfig?.autores || fullConfig?.autores || customPreviewState.autores || ['Autor/es de ejemplo']);
    if (typeof autores === 'string') autores = autores.split('\n');
    let fecha = (customConfig?.fecha || fullConfig?.fecha || '2025-08-25');
    let firmante = (customConfig?.firmante || fullConfig?.firmante || 'Nombre Firmante');
    let logoUrl = (customConfig?.logoUrl || fullConfig?.logoUrl || window._pdfPreviewLogoUrl || null);
    let fieldFontSize = customConfig?.fieldFontSize || 16;
    let fieldColor = customConfig?.fieldColor || '#222';
    let numFirmas = customConfig?.numFirmas || fullConfig?.numFirmas || 1;

    // --- Plantillas prediseñadas ---
    if (template !== 'custom') {
        // --- Unique styles for each template ---
        let borderColor = '#2563eb', borderWidth = 3, bgColor = '#fff', titleColor = '#2563eb', authorColor = fieldColor, firmaBoxColor = '#bbb', firmaTextColor = '#222', font = 'Arial', titleFontWeight = 'bold', authorFontWeight = '', authorFontStyle = '', titleFontSize = fieldFontSize + 4, authorFontSize = fieldFontSize, firmaFont = 'bold 13px Arial', textAlign = 'center', extraDraw = null;
        switch (template) {
            case 'template1': // Clásico
                // Defaults already set
                break;
            case 'template2': // Moderno
                borderColor = '#10b981';
                borderWidth = 2;
                titleColor = '#10b981';
                authorColor = '#333';
                bgColor = '#f8fafc';
                titleFontWeight = 'bold';
                titleFontSize = fieldFontSize + 6;
                authorFontSize = fieldFontSize + 1;
                firmaBoxColor = '#e0e7ef';
                firmaTextColor = '#10b981';
                font = 'Segoe UI';
                break;
            case 'template3': // Minimalista
                borderColor = '#222';
                borderWidth = 1.5;
                titleColor = '#222';
                authorColor = '#666';
                bgColor = '#fff';
                titleFontWeight = '';
                titleFontSize = fieldFontSize + 2;
                authorFontSize = fieldFontSize - 1;
                firmaBoxColor = '#f3f3f3';
                firmaTextColor = '#222';
                font = 'Helvetica Neue';
                break;
            case 'template4': // Elegante
                borderColor = '#7c3aed';
                borderWidth = 2.5;
                titleColor = '#7c3aed';
                authorColor = '#444';
                bgColor = '#f6f0ff';
                titleFontWeight = 'bold';
                titleFontSize = fieldFontSize + 5;
                authorFontSize = fieldFontSize + 1;
                firmaBoxColor = '#ede9fe';
                firmaTextColor = '#7c3aed';
                font = 'Georgia';
                authorFontStyle = 'italic';
                extraDraw = function () {
                    // Draw a subtle line under the title
                    ctx.strokeStyle = '#c4b5fd';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(60, 90);
                    ctx.lineTo(340, 90);
                    ctx.stroke();
                };
                break;
        }
        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(20, 20, 360, 210);
        // Logo
        if (logoUrl) {
            const img = new window.Image();
            img.onload = function () {
                ctx.drawImage(img, 40, 30, 48, 48);
                drawTexts();
            };
            img.src = logoUrl;
        } else {
            drawTexts();
        }
        function drawTexts() {
            ctx.font = `${titleFontWeight} ${titleFontSize}px ${font}`;
            ctx.fillStyle = titleColor;
            ctx.textAlign = textAlign;
            ctx.fillText(titulo, 200, 80);
            ctx.font = `${authorFontStyle} ${authorFontWeight} ${authorFontSize}px ${font}`;
            ctx.fillStyle = authorColor;
            autores.forEach((autor, i) => {
                ctx.fillText(autor, 200, 110 + i * 20);
            });
            ctx.font = `italic ${fieldFontSize - 2}px ${font}`;
            ctx.fillStyle = '#888';
            ctx.fillText('Firmado por: ' + firmante, 200, 170);
            ctx.fillText('Fecha aval: ' + fecha, 200, 190);
            if (typeof extraDraw === 'function') extraDraw();
        }
        // Zona de firmas global (mínimo 1)
        for (let i = 0; i < Math.max(1, numFirmas); i++) {
            ctx.fillStyle = firmaBoxColor;
            ctx.fillRect(80 + i * 110, 200, 100, 24);
            ctx.fillStyle = firmaTextColor;
            ctx.font = firmaFont;
            ctx.textAlign = 'center';
            ctx.fillText('FIRMA', 130 + i * 110, 217);
        }
        return;
    }
    // --- Plantilla personalizada: todos los campos movibles, pero visual igual a Clásico ---
    // Usa el estado global para mantener posiciones y autores
    let posTitulo = customPreviewState.posTitulo;
    let posAutores = customPreviewState.posAutores;
    let posFecha = customPreviewState.posFecha;
    let posFirmas = customPreviewState.posFirmas;
    let dragging = null; // 'titulo', 'autor0', 'autor1', ..., 'fecha', 'firma0', ...
    let offset = { x: 0, y: 0 };
    function drawCustom() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Visual igual a Clásico
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, 360, 210);
        // Logo global
        if (logoUrl) {
            const img = new window.Image();
            img.onload = function () {
                ctx.drawImage(img, 40, 30, 48, 48);
                drawTextsAndFirmas();
            };
            img.src = logoUrl;
        } else {
            drawTextsAndFirmas();
        }
        function drawTextsAndFirmas() {
            // Título
            ctx.font = `bold ${fieldFontSize + 4}px Arial`;
            ctx.fillStyle = '#2563eb';
            ctx.textAlign = 'left';
            ctx.fillText(titulo, posTitulo.x, posTitulo.y);
            // Autores (varios)
            ctx.font = `${fieldFontSize}px Arial`;
            ctx.fillStyle = fieldColor;
            autores.forEach((autor, i) => {
                ctx.fillText(autor, posAutores[i]?.x || 120, posAutores[i]?.y || (posTitulo.y + 30 + i * 20));
            });
            // Fecha
            ctx.font = `italic ${fieldFontSize - 2}px Arial`;
            ctx.fillStyle = '#888';
            ctx.fillText(fecha, posFecha.x, posFecha.y);
            // Firmas (varias)
            for (let i = 0; i < posFirmas.length; i++) {
                ctx.fillStyle = dragging === 'firma' + i ? '#10b981' : '#bbb';
                ctx.fillRect(posFirmas[i].x, posFirmas[i].y, 100, 24);
                ctx.fillStyle = '#222';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('FIRMA', posFirmas[i].x + 15, posFirmas[i].y + 17);
            }
        }
    }
    drawCustom();
    // Drag & drop para todos los campos
    canvas.onmousedown = function (e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x >= posTitulo.x && x <= posTitulo.x + 200 && y >= posTitulo.y - 18 && y <= posTitulo.y + 5) {
            dragging = 'titulo'; offset.x = x - posTitulo.x; offset.y = y - posTitulo.y;
        } else if (x >= posFecha.x && x <= posFecha.x + 120 && y >= posFecha.y - 13 && y <= posFecha.y + 5) {
            dragging = 'fecha'; offset.x = x - posFecha.x; offset.y = y - posFecha.y;
        } else {
            for (let i = 0; i < autores.length; i++) {
                let ax = posAutores[i]?.x || 120, ay = posAutores[i]?.y || (posTitulo.y + 30 + i * 20);
                if (x >= ax && x <= ax + 200 && y >= ay - 14 && y <= ay + 5) {
                    dragging = 'autor' + i; offset.x = x - ax; offset.y = y - ay; break;
                }
            }
            for (let i = 0; i < posFirmas.length; i++) {
                if (x >= posFirmas[i].x && x <= posFirmas[i].x + 100 && y >= posFirmas[i].y && y <= posFirmas[i].y + 24) {
                    dragging = 'firma' + i; offset.x = x - posFirmas[i].x; offset.y = y - posFirmas[i].y; break;
                }
            }
        }
    };
    canvas.onmousemove = function (e) {
        if (!dragging) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (dragging === 'titulo') {
            posTitulo.x = Math.max(20, Math.min(x - offset.x, canvas.width - 200));
            posTitulo.y = Math.max(30, Math.min(y - offset.y, canvas.height - 20));
        } else if (dragging === 'fecha') {
            posFecha.x = Math.max(20, Math.min(x - offset.x, canvas.width - 120));
            posFecha.y = Math.max(30, Math.min(y - offset.y, canvas.height - 20));
        } else if (dragging && dragging.startsWith('autor')) {
            let idx = parseInt(dragging.replace('autor', ''));
            if (!posAutores[idx]) posAutores[idx] = { x: 120, y: 90 + idx * 20 };
            posAutores[idx].x = Math.max(20, Math.min(x - offset.x, canvas.width - 200));
            posAutores[idx].y = Math.max(30, Math.min(y - offset.y, canvas.height - 20));
        } else if (dragging && dragging.startsWith('firma')) {
            let idx = parseInt(dragging.replace('firma', ''));
            posFirmas[idx].x = Math.max(20, Math.min(x - offset.x, canvas.width - 100));
            posFirmas[idx].y = Math.max(30, Math.min(y - offset.y, canvas.height - 24));
        }
        drawCustom();
    };
    canvas.onmouseup = function () {
        dragging = null;
        drawCustom();
    };
    // Actualiza controles de firmas y autores
    const firmasCount = document.getElementById('firmasCount');
    if (firmasCount) firmasCount.textContent = `${posFirmas.length} firmas`;
}

// Controles para agregar/eliminar firmas y autores en custom
function setupCustomTemplateForm(customConfig) {
    const form = document.getElementById('customTemplateForm');
    if (!form) return;
    // Inicializa autores
    const autoresInput = document.getElementById('customAutores');
    if (autoresInput) {
        autoresInput.value = (customConfig.autores && Array.isArray(customConfig.autores)) ? customConfig.autores.join('\n') : (customConfig.autores || 'Autor/es de ejemplo');
        autoresInput.oninput = function () {
            customPreviewState.autores = autoresInput.value.split('\n');
            // Ajusta posiciones si cambian autores
            while (customPreviewState.posAutores.length < customPreviewState.autores.length) {
                customPreviewState.posAutores.push({ x: 120, y: 90 + customPreviewState.posAutores.length * 20 });
            }
            renderPdfTemplatePreview('custom', customPreviewState);
        };
        customPreviewState.autores = autoresInput.value.split('\n');
    }
    // Inicializa firmas
    const addFirmaBtn = document.getElementById('addFirmaBtn');
    const removeFirmaBtn = document.getElementById('removeFirmaBtn');
    if (addFirmaBtn) {
        addFirmaBtn.onclick = function () {
            customPreviewState.posFirmas.push({ x: 100 + customPreviewState.posFirmas.length * 30, y: 200 });
            renderPdfTemplatePreview('custom', customPreviewState);
        };
    }
    if (removeFirmaBtn) {
        removeFirmaBtn.onclick = function () {
            if (customPreviewState.posFirmas.length > 1) {
                customPreviewState.posFirmas.pop();
                renderPdfTemplatePreview('custom', customPreviewState);
            }
        };
    }
    // Inicializa posiciones
    customPreviewState.posTitulo = customConfig.posTitulo || { x: 120, y: 60 };
    customPreviewState.posFecha = customConfig.posFecha || { x: 120, y: 120 };
    customPreviewState.posFirmas = customConfig.posFirmas || [{ x: 100, y: 200 }];
    customPreviewState.posAutores = customConfig.posAutores || customPreviewState.autores.map((a, i) => ({ x: 120, y: 90 + i * 20 }));
    // Al guardar, envía todas las posiciones y autores
    form.onsubmit = async function (e) {
        e.preventDefault();
        // Recoge todos los datos relevantes de la configuración personalizada
        const config = {
            posTitulo: customPreviewState.posTitulo,
            posAutores: customPreviewState.posAutores,
            posFecha: customPreviewState.posFecha,
            posFirmas: customPreviewState.posFirmas,
            autores: customPreviewState.autores,
            fieldFontSize: form.fieldFontSize ? parseInt(form.fieldFontSize.value, 10) : 16,
            fieldColor: form.fieldColor ? form.fieldColor.value : '#222',
            numFirmas: customPreviewState.posFirmas ? customPreviewState.posFirmas.length : 1
        };
        renderPdfTemplatePreview('custom', config);
        // Guardar configuración personalizada y logo en el backend
        try {
            setControlStatus && setControlStatus('applying');
            const pdfLogoInput = document.getElementById('pdfLogo');
            let formData = null;
            let useFormData = pdfLogoInput && pdfLogoInput.files && pdfLogoInput.files[0];
            if (useFormData) {
                formData = new FormData();
                formData.append('template', 'custom');
                formData.append('customConfig', JSON.stringify(config));
                formData.append('logo', pdfLogoInput.files[0]);
            }
            const res = await fetch('/api/pdf-template/config', {
                method: 'POST',
                headers: useFormData ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: useFormData ? formData : JSON.stringify({ template: 'custom', customConfig: config })
            });
            if (res.ok) {
                setControlStatus && setControlStatus('success');
                showNotification && showNotification('Configuración personalizada guardada', 'success');
            } else {
                setControlStatus && setControlStatus('error');
                showNotification && showNotification('Error al guardar configuración', 'error');
            }
        } catch (err) {
            setControlStatus && setControlStatus('error');
            showNotification && showNotification('Error al guardar configuración', 'error');
        }
    };
    // Render inicial
    renderPdfTemplatePreview('custom', customPreviewState);
}

// ===========================
// CONTROL DE ESTILO Y ANIMACIONES
// ===========================
// Animación para el botón de aplicar cambios
function animateApplyButton(btn) {
    btn.classList.remove('applied');
    // Forzar reflow para reiniciar la animación
    void btn.offsetWidth;
    btn.classList.add('applied');
    setTimeout(() => btn.classList.remove('applied'), 1200);
}

// Añadir estilos para la animación y color del botón
// Botón aplicar: solo color, sin animación JS
const style = document.createElement('style');
style.textContent = `
#applyTemplateChangesBtn {
    background: var(--primary-color,#2563eb);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 8px 22px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 8px #2563eb22;
}
`;
document.head.appendChild(style);

// Añadir estilos para el modal usando la variable CSS principal
const modalStyle = document.createElement('style');
modalStyle.textContent = `
#templateResetModal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.18);
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}
#templateResetModal.show {
  display: flex;
  opacity: 1;
}
#templateResetModal .modal-content {
  background: #fff;
  border-radius: 10px;
  padding: 32px 28px 22px 28px;
  box-shadow: 0 4px 32px #2563eb22;
  min-width: 320px;
  max-width: 95vw;
  text-align: center;
  border: 2px solid var(--primary-color,#2563eb);
}
#templateResetModal .modal-content h3 {
  color: var(--primary-color,#2563eb);
  font-size: 1.2em;
  margin-bottom: 18px;
}
#templateResetModal .modal-content button {
  background: var(--primary-color,#2563eb);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 7px 20px;
  font-size: 1em;
  font-weight: 600;
  margin: 0 8px;
  cursor: pointer;
  transition: background 0.2s;
}
#templateResetModal .modal-content button.cancel {
  background: #e5e7eb;
  color: #222;
}
`;
document.head.appendChild(modalStyle);

// Añadir estilos para el feedback visual de control-status
const statusStyle = document.createElement('style');
statusStyle.textContent = `
.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  font-size: 1em;
  margin-top: 10px;
  padding: 8px 18px;
  border-radius: 8px;
  /* box-shadow: 0 2px 8px #0001; */
  background: transparent !important;
  transition: background 0.3s, color 0.3s;
}
.status-indicator .indicator-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #bbb;
  box-shadow: 0 0 0 2px #bbb2;
  animation: pulse 1.2s infinite;
}
.status-indicator.applying {
  background: #e0e7ff;
  color: #1e40af;
}
.status-indicator.applying .indicator-dot {
  background: #2563eb;
  box-shadow: 0 0 0 2px #2563eb44;
}
.status-indicator.success {
  background: #d1fae5;
  color: #065f46;
}
.status-indicator.success .indicator-dot {
  background: #10b981;
  box-shadow: 0 0 0 2px #10b98144;
}
.status-indicator.error {
  background: #fee2e2;
  color: #991b1b;
}
.status-indicator.error .indicator-dot {
  background: #ef4444;
  box-shadow: 0 0 0 2px #ef444444;
}
.status-indicator.inactive {
  background: #f3f4f6;
  color: #374151;
}
.status-indicator.inactive .indicator-dot {
  background: #bbb;
  box-shadow: 0 0 0 2px #bbb2;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 2px #bbb2; }
  50% { box-shadow: 0 0 0 6px #bbb1; }
  100% { box-shadow: 0 0 0 2px #bbb2; }
}
`;
document.head.appendChild(statusStyle);

// Reemplaza la función setControlStatus para mantener el feedback visible 2 segundos
let controlStatusTimeout;
function setControlStatus(state) {
    const controlStatus = document.getElementById('controlStatus');
    if (!controlStatus) return;
    let html = '';
    if (state === 'applying') {
        html = `<div class="status-indicator applying"><div class="indicator-dot"></div><span>Aplicando configuración...</span></div>`;
    } else if (state === 'success') {
        html = `<div class="status-indicator success"><div class="indicator-dot"></div><span>Configuración aplicada</span></div>`;
    } else if (state === 'error') {
        html = `<div class="status-indicator error"><div class="indicator-dot"></div><span>Error al aplicar</span></div>`;
    } else {
        html = `<div class="status-indicator inactive"><div class="indicator-dot"></div><span>Esperando configuración</span></div>`;
    }
    controlStatus.innerHTML = html;
}

// ===========================
// FUNCIONES AUXILIARES
// ===========================
function setupCustomTemplateForm(customConfig) {
    const form = document.getElementById('customTemplateForm');
    if (!form) return;
    // Inicializa autores
    const autoresInput = document.getElementById('customAutores');
    if (autoresInput) {
        autoresInput.value = (customConfig.autores && Array.isArray(customConfig.autores)) ? customConfig.autores.join('\n') : (customConfig.autores || 'Autor/es de ejemplo');
        autoresInput.oninput = function () {
            customPreviewState.autores = autoresInput.value.split('\n');
            // Ajusta posiciones si cambian autores
            while (customPreviewState.posAutores.length < customPreviewState.autores.length) {
                customPreviewState.posAutores.push({ x: 120, y: 90 + customPreviewState.posAutores.length * 20 });
            }
            renderPdfTemplatePreview('custom', customPreviewState);
        };
        customPreviewState.autores = autoresInput.value.split('\n');
    }
    // Inicializa firmas
    const addFirmaBtn = document.getElementById('addFirmaBtn');
    const removeFirmaBtn = document.getElementById('removeFirmaBtn');
    if (addFirmaBtn) {
        addFirmaBtn.onclick = function () {
            customPreviewState.posFirmas.push({ x: 100 + customPreviewState.posFirmas.length * 30, y: 200 });
            renderPdfTemplatePreview('custom', customPreviewState);
        };
    }
    if (removeFirmaBtn) {
        removeFirmaBtn.onclick = function () {
            if (customPreviewState.posFirmas.length > 1) {
                customPreviewState.posFirmas.pop();
                renderPdfTemplatePreview('custom', customPreviewState);
            }
        };
    }
    // Inicializa posiciones
    customPreviewState.posTitulo = customConfig.posTitulo || { x: 120, y: 60 };
    customPreviewState.posFecha = customConfig.posFecha || { x: 120, y: 120 };
    customPreviewState.posFirmas = customConfig.posFirmas || [{ x: 100, y: 200 }];
    customPreviewState.posAutores = customConfig.posAutores || customPreviewState.autores.map((a, i) => ({ x: 120, y: 90 + i * 20 }));
    // Al guardar, envía todas las posiciones y autores
    form.onsubmit = async function (e) {
        e.preventDefault();
        const config = {
            posTitulo: customPreviewState.posTitulo,
            posAutores: customPreviewState.posAutores,
            posFecha: customPreviewState.posFecha,
            posFirmas: customPreviewState.posFirmas,
            autores: customPreviewState.autores
        };
        renderPdfTemplatePreview('custom', config);
        // Guardar configuración personalizada y logo en el backend
        try {
            setControlStatus && setControlStatus('applying');
            const pdfLogoInput = document.getElementById('pdfLogo');
            let formData = null;
            let useFormData = pdfLogoInput && pdfLogoInput.files && pdfLogoInput.files[0];
            if (useFormData) {
                formData = new FormData();
                formData.append('template', 'custom');
                formData.append('customConfig', JSON.stringify(config));
                formData.append('logo', pdfLogoInput.files[0]);
            }
            const res = await fetch('/api/pdf-template/config', {
                method: 'POST',
                headers: useFormData ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: useFormData ? formData : JSON.stringify({ template: 'custom', customConfig: config })
            });
            if (res.ok) {
                setControlStatus && setControlStatus('success');
                showNotification && showNotification('Configuración personalizada guardada', 'success');
            } else {
                setControlStatus && setControlStatus('error');
                showNotification && showNotification('Error al guardar configuración', 'error');
            }
        } catch (err) {
            setControlStatus && setControlStatus('error');
            showNotification && showNotification('Error al guardar configuración', 'error');
        }
    };
    // Render inicial
    renderPdfTemplatePreview('custom', customPreviewState);
}

// === ENVÍO DE DATOS DEL DOCUMENTO AL FIRMAR ===
document.addEventListener('DOMContentLoaded', function () {
    const signForm = document.getElementById('signForm');
    const fileInput = document.getElementById('fileInput');
    const docTitleInput = document.getElementById('docTitle');
    if (fileInput && docTitleInput) {
        fileInput.addEventListener('change', function () {
            if (fileInput.files[0]) {
                const fileName = fileInput.files[0].name.replace(/\.[^.]+$/, '');
                docTitleInput.value = fileName;
            }
        });
    }
    if (signForm) {
        signForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const fileInput = document.getElementById('fileInput');
            const docTitle = document.getElementById('docTitle').value;
            const docAuthors = document.getElementById('docAuthors').value;
            const selectedTemplate = window._pdfTemplateSelected || localStorage.getItem('pdfTemplate') || 'template1';
            if (!fileInput.files[0]) {
                showNotification && showNotification('Selecciona un archivo PDF', 'error');
                return;
            }
            const formData = new FormData();
            formData.append('document', fileInput.files[0]);
            formData.append('titulo', docTitle);
            formData.append('autores', docAuthors);
            formData.append('template', selectedTemplate);
            try {
                const res = await fetch('/sign-document', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'documento_firmado.pdf';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        window.URL.revokeObjectURL(url);
                        a.remove();
                    }, 100);
                    showNotification && showNotification('Documento firmado correctamente', 'success');
                } else {
                    showNotification && showNotification('Error al firmar el documento', 'error');
                }
            } catch (err) {
                showNotification && showNotification('Error de conexión al firmar', 'error');
            }
        });
    }
});
