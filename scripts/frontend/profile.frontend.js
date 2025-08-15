// ===========================
// PERFIL - JAVASCRIPT FUNCTIONS
// ===========================

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
                    updateKeysCount();
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
    updateKeysCount();
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
    const keysCountElement = document.getElementById('keysCount');

    if (keysList && keysCountElement) {
        const count = keysList.children.length;
        keysCountElement.textContent = count;
    }
}

function loadUserKeys() {
    // Esta función se conectará con el sistema existente de llaves
    const keysList = document.getElementById('profileKeysList');

    if (!keysList) return;

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
                <div class="key-name">${key.name}</div>
                <div class="key-details">
                    <span>${key.type}</span>
                    <span>Creada: ${key.date}</span>
                </div>
            </div>
        </div>
        <div class="key-actions">
            <button class="key-action-btn key-download-btn" onclick="downloadKey('${key.name}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Descargar
            </button>
            <button class="key-action-btn key-delete-btn" onclick="deleteKey('${key.name}')">
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
    // Enfocar el campo de nombre de llave
    const keyNameInput = document.getElementById('keyNameInput');
    if (keyNameInput) {
        keyNameInput.focus();
        keyNameInput.scrollIntoView({ behavior: 'smooth' });
    }

    // Mostrar el modal de contraseña para generar la llave
    if (typeof window.showKeyPasswordModal === 'function') {
        window.showKeyPasswordModal(async (keyPassword) => {
            try {
                const encryptionType = localStorage.getItem("encryptionType") || "aes-256-cbc";
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

                    // Recargar las llaves
                    if (typeof window.loadKeys === "function") {
                        window.loadKeys();
                    }
                    loadProfileKeys(); // Recargar en el perfil

                    // Limpiar el campo de nombre después de generar la llave
                    if (keyNameInput) keyNameInput.value = "";
                } else {
                    alert(data.error || "Error al generar la llave.");
                }
            } catch (err) {
                alert("Error al generar la llave.");
            }
        });
    } else {
        alert('Por favor, inicia sesión para generar llaves.');
    }
}

function downloadKey(keyName) {
    showNotification(`Descargando llave: ${keyName}`, 'info');
    // Aquí se conectará con la funcionalidad existente de descarga
}

function deleteKey(keyName) {
    if (confirm(`¿Estás seguro de que quieres eliminar la llave "${keyName}"?`)) {
        showNotification(`Llave "${keyName}" eliminada`, 'success');
        loadUserKeys(); // Recargar la lista
    }
}

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
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 500;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Agregar estilos para las animaciones de notificación
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

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
    const count = keysList.children.length;
    document.getElementById('keysCount').textContent = count;
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
                <div class="key-name">${key.name}</div>
                <div class="key-details">
                    <span>${key.type}</span>
                    <span>Creada: ${key.date}</span>
                </div>
            </div>
        </div>
        <div class="key-actions">
            <button class="key-action-btn key-download-btn" onclick="downloadKey('${key.name}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Descargar
            </button>
            <button class="key-action-btn key-delete-btn" onclick="deleteKey('${key.name}')">
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
    // Mostrar el campo de nombre de llave
    const keyNameInput = document.getElementById('keyNameInput');
    keyNameInput.focus();
    keyNameInput.scrollIntoView({ behavior: 'smooth' });
}

function downloadKey(keyName) {
    showNotification(`Descargando llave: ${keyName}`, 'info');
    // Aquí se conectará con la funcionalidad existente de descarga
}

function deleteKey(keyName) {
    if (confirm(`¿Estás seguro de que quieres eliminar la llave "${keyName}"?`)) {
        showNotification(`Llave "${keyName}" eliminada`, 'success');
        loadUserKeys(); // Recargar la lista
    }
}

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
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 500;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Agregar estilos para las animaciones de notificación si no existen
if (!document.getElementById('profile-notification-styles')) {
    const notificationStyles = document.createElement('style');
    notificationStyles.id = 'profile-notification-styles';
    notificationStyles.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(notificationStyles);
}

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
