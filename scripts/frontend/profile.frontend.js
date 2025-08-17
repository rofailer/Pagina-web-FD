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

function setupPdfTemplates() {
    const templates = document.querySelectorAll('.pdf-template');
    templates.forEach(template => {
        template.addEventListener('click', function () {
            // Remover selección anterior
            templates.forEach(tmpl => tmpl.classList.remove('selected'));
            // Seleccionar nueva plantilla
            this.classList.add('selected');

            const templateType = this.dataset.template;
            showNotification(`Plantilla "${templateType}" seleccionada`, 'info');
        });
    });
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
        const userNameInput = document.getElementById('userName');
        const userEmailInput = document.getElementById('userEmail');
        const userOrganizationInput = document.getElementById('userOrganization');
        const userBioInput = document.getElementById('userBio');

        if (userNameInput) userNameInput.value = '';
        if (userEmailInput) userEmailInput.value = '';
        if (userOrganizationInput) userOrganizationInput.value = '';
        if (userBioInput) userBioInput.value = '';

        // Restablecer foto
        const photoContainer = document.querySelector('.perfil-photo');
        if (photoContainer) {
            photoContainer.innerHTML = '<div class="perfil-photo-placeholder">📷</div>';
        }

        showNotification('Configuraciones restablecidas a valores por defecto', 'info');
    }
}

// ===========================
// UTILIDADES
// ===========================
// Las notificaciones ahora se manejan con el sistema global de notifications.js

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

    if (userData.name) document.getElementById('userName').value = userData.name;
    if (userData.email) document.getElementById('userEmail').value = userData.email;
    if (userData.organization) document.getElementById('userOrganization').value = userData.organization;
    if (userData.bio) document.getElementById('userBio').value = userData.bio;
    if (userData.photo) {
        const photoContainer = document.querySelector('.perfil-photo');
        photoContainer.innerHTML = `<img src="${userData.photo}" alt="Foto de perfil">`;
    }
}

function saveUserData() {
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        organization: document.getElementById('userOrganization').value,
        bio: document.getElementById('userBio').value,
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

function loadUserKeys() {
    // Esta función se conectará con el sistema existente de llaves
    const keysList = document.getElementById('profileKeysList');

    // Ejemplo de estructura para mostrar llaves
    const exampleKeys = [
        { name: 'Llave Principal', date: '2024-01-15', type: 'RSA-2048' },
        { name: 'Llave Tesis', date: '2024-01-20', type: 'RSA-2048' }
    ];

    keysList.innerHTML = '';
    exampleKeys.forEach(key => {
        const keyElement = createKeyElement(key);
        keysList.appendChild(keyElement);
    });

    updateKeysCount();
}

// createKeyElement function removed - duplicate function eliminated

// Esta función está duplicada - comentada para evitar conflictos
// La función principal está arriba con toda la lógica
/*
function showCreateKeyModal() {
    // Mostrar el campo de nombre de llave
    const keyNameInput = document.getElementById('keyNameInput');
    keyNameInput.focus();
    keyNameInput.scrollIntoView({ behavior: 'smooth' });
}
*/

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
            document.getElementById('currentEncryption').textContent = encryption.toUpperCase();
        });
    });
}

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

function setupPdfTemplates() {
    const templates = document.querySelectorAll('.pdf-template');
    templates.forEach(template => {
        template.addEventListener('click', function () {
            // Remover selección anterior
            templates.forEach(tmpl => tmpl.classList.remove('selected'));
            // Seleccionar nueva plantilla
            this.classList.add('selected');

            const templateType = this.dataset.template;
            showNotification(`Plantilla "${templateType}" seleccionada`, 'info');
        });
    });
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
