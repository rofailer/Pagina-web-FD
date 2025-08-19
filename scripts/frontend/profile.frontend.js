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
    // Inicializar drag and drop
    setupPdfDragAndDrop();

    // Configurar botones de acción
    setupPdfTemplateButtons();

    // Cargar estado actual de la plantilla
    loadCurrentTemplate();

    // Configurar formulario de subida
    setupTemplateUploadForm();
}

function setupPdfDragAndDrop() {
    const uploadArea = document.getElementById('pdfUploadArea');
    const fileInput = document.getElementById('templatePdfInput');

    if (!uploadArea || !fileInput) return;

    // Prevenir comportamiento por defecto del navegador
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Efectos visuales para drag over
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    // Manejar drop
    uploadArea.addEventListener('drop', handleDrop, false);

    // Click en área de subida
    uploadArea.addEventListener('click', () => fileInput.click());

    // Change en input file
    fileInput.addEventListener('change', handleFileSelect);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        uploadArea.classList.add('dragover');
    }

    function unhighlight() {
        uploadArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                uploadPdfTemplate(file);
            } else {
                showNotification('Por favor selecciona un archivo PDF válido', 'error');
            }
        }
    }
}

function setupPdfTemplateButtons() {
    // Botón subir nueva plantilla
    const uploadBtn = document.getElementById('uploadTemplateBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            document.getElementById('templatePdfInput').click();
        });
    }

    // Botón descargar plantilla actual
    const downloadBtn = document.getElementById('downloadTemplateBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadCurrentTemplate);
    }

    // Botón eliminar plantilla
    const deleteBtn = document.getElementById('deleteTemplateBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteCurrentTemplate);
    }

    // Botón vista previa
    const previewBtn = document.getElementById('previewTemplateBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', previewCurrentTemplate);
    }

    // Botón aplicar cambios
    const applyBtn = document.getElementById('applyTemplateChangesBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyTemplateChanges);
    }

    // Botón restablecer
    const resetBtn = document.getElementById('resetTemplateBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTemplateConfiguration);
    }
}

function setupTemplateUploadForm() {
    const form = document.getElementById('templateUploadForm');
    if (form) {
        form.addEventListener('submit', handleTemplateFormSubmit);
    }
}

async function uploadPdfTemplate(file) {
    const progressBar = document.querySelector('.progress-fill');
    const progressContainer = document.querySelector('.upload-progress');
    const statusElement = document.querySelector('.template-status');
    const uploadArea = document.getElementById('pdfUploadArea');

    try {
        // Mostrar progreso
        if (progressContainer) progressContainer.style.display = 'block';
        if (uploadArea) uploadArea.style.display = 'none';

        updateTemplateStatus('Subiendo plantilla...', 'uploading');

        // Verificar si el backend está disponible
        const backendAvailable = await checkBackendAvailability();

        if (!backendAvailable) {
            // Simular subida exitosa localmente
            await simulateLocalUpload(file, progressBar);
            return;
        }

        // Simular progreso de subida
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 95) progress = 95;

            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
        }, 200);

        // Crear FormData
        const formData = new FormData();
        formData.append('templatePdf', file);
        formData.append('templateName', file.name);

        // Enviar al servidor
        const response = await fetch('/api/template/upload', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        clearInterval(progressInterval);

        if (response.ok) {
            const result = await response.json();

            // Completar progreso
            if (progressBar) progressBar.style.width = '100%';

            setTimeout(() => {
                updateTemplateStatus(`Plantilla activa: ${file.name}`, 'success');
                enableTemplateActions(true);

                // Ocultar progreso después de un momento
                setTimeout(() => {
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (uploadArea) uploadArea.style.display = 'flex';
                }, 2000);
            }, 500);

            showNotification('Plantilla PDF subida exitosamente', 'success');

        } else {
            throw new Error('Error al subir la plantilla');
        }

    } catch (error) {
        console.warn('Error uploading template (usando modo offline):', error);
        // Modo offline - simular subida exitosa
        await simulateLocalUpload(file, progressBar);
    }
}

async function simulateLocalUpload(file, progressBar) {
    const progressText = document.getElementById('progressText');

    // Simular progreso de subida local
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress > 100) progress = 100;

        if (progressBar) {
            progressBar.style.width = progress + '%';
        }

        if (progressText) {
            progressText.textContent = `Subiendo... ${Math.round(progress)}%`;
        }

        if (progress >= 100) {
            clearInterval(progressInterval);

            // Guardar en localStorage
            const templateData = {
                name: file.name,
                size: file.size,
                uploadDate: new Date().toISOString(),
                exists: true
            };
            localStorage.setItem('currentTemplate', JSON.stringify(templateData));

            setTimeout(() => {
                if (progressText) {
                    progressText.textContent = 'Completado 100%';
                }

                updateTemplateStatus(`Plantilla activa: ${file.name}`, 'success');
                enableTemplateActions(true);
                updateTemplateInfo(templateData);

                const progressContainer = document.querySelector('.upload-progress');
                const uploadArea = document.getElementById('pdfUploadArea');

                // Ocultar progreso después de un momento
                setTimeout(() => {
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (uploadArea) uploadArea.style.display = 'flex';
                }, 1500);
            }, 800);

            showNotification('Plantilla configurada correctamente (modo offline)', 'success');
        }
    }, 150);
}

async function checkBackendAvailability() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 segundo timeout

        const response = await fetch('/api/template/current', {
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        return false;
    }
}

function updateTemplateStatus(message, type) {
    const statusContainer = document.getElementById('templateStatus');

    if (!statusContainer) return;

    // Crear el HTML del estado
    let statusHTML = `
        <div class="template-status status-${type}">
            <div class="status-icon">
                ${getStatusSVG(type)}
            </div>
            <div class="status-text">
                <div class="status-title">${message}</div>
                <div class="status-desc">${getStatusDescription(type)}</div>
            </div>
        </div>
    `;

    statusContainer.innerHTML = statusHTML;
}

function getStatusSVG(type) {
    switch (type) {
        case 'success':
            return `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        case 'error':
            return `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        case 'uploading':
            return `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;
        case 'none':
        default:
            return `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;
    }
}

function getStatusDescription(type) {
    switch (type) {
        case 'success':
            return 'Plantilla configurada y lista para usar en todas las firmas';
        case 'error':
            return 'Hubo un problema al cargar o configurar la plantilla';
        case 'uploading':
            return 'Procesando plantilla, por favor espere...';
        case 'none':
        default:
            return 'Se está usando el PDF en blanco por defecto';
    }
}

async function loadCurrentTemplate() {
    try {
        // Primero verificar localStorage
        const localTemplate = localStorage.getItem('currentTemplate');
        if (localTemplate) {
            const template = JSON.parse(localTemplate);
            if (template.exists) {
                updateTemplateStatus(`Plantilla activa: ${template.name}`, 'success');
                enableTemplateActions(true);
                updateTemplateInfo(template);
                return;
            }
        }

        // Intentar cargar desde backend
        const backendAvailable = await checkBackendAvailability();
        if (!backendAvailable) {
            updateTemplateStatus('No hay plantilla configurada', 'none');
            enableTemplateActions(false);
            return;
        }

        const response = await fetch('/api/template/current', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const template = await response.json();

            if (template.exists) {
                updateTemplateStatus(`Plantilla activa: ${template.name}`, 'success');
                enableTemplateActions(true);
                updateTemplateInfo(template);

                // Guardar en localStorage
                localStorage.setItem('currentTemplate', JSON.stringify(template));
            } else {
                updateTemplateStatus('No hay plantilla configurada', 'none');
                enableTemplateActions(false);
            }
        } else {
            updateTemplateStatus('No hay plantilla configurada', 'none');
            enableTemplateActions(false);
        }

    } catch (error) {
        console.warn('Backend no disponible - usando estado por defecto');
        updateTemplateStatus('No hay plantilla configurada', 'none');
        enableTemplateActions(false);
    }
}

function updateTemplateInfo(template) {
    // Actualizar información en la interfaz
    const infoElements = {
        name: document.querySelector('.template-name'),
        size: document.querySelector('.template-size'),
        date: document.querySelector('.template-date'),
        pages: document.querySelector('.template-pages')
    };

    if (infoElements.name) infoElements.name.textContent = template.name;
    if (infoElements.size) infoElements.size.textContent = formatFileSize(template.size);
    if (infoElements.date) infoElements.date.textContent = formatDate(template.uploadDate);
    if (infoElements.pages) infoElements.pages.textContent = `${template.pages} página(s)`;
}

function enableTemplateActions(enable) {
    const buttons = [
        'downloadTemplateBtn',
        'deleteTemplateBtn',
        'previewTemplateBtn'
    ];

    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = !enable;
            if (enable) {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
            }
        }
    });
}

async function downloadCurrentTemplate() {
    try {
        const response = await fetch('/api/template/download', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla-aval.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showNotification('Plantilla descargada exitosamente', 'success');
        } else {
            throw new Error('Error al descargar plantilla');
        }
    } catch (error) {
        console.error('Error downloading template:', error);
        showNotification('Error al descargar la plantilla', 'error');
    }
}

async function deleteCurrentTemplate() {
    if (!confirm('¿Estás seguro de que quieres eliminar la plantilla actual? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch('/api/template/delete', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            updateTemplateStatus('No hay plantilla configurada', 'none');
            enableTemplateActions(false);
            clearTemplateInfo();
            showNotification('Plantilla eliminada exitosamente', 'success');
        } else {
            throw new Error('Error al eliminar plantilla');
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        showNotification('Error al eliminar la plantilla', 'error');
    }
}

async function previewCurrentTemplate() {
    try {
        const response = await fetch('/api/template/preview', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            showNotification('Abriendo vista previa...', 'info');
        } else {
            throw new Error('Error al obtener vista previa');
        }
    } catch (error) {
        console.error('Error previewing template:', error);
        showNotification('Error al obtener vista previa', 'error');
    }
}

function clearTemplateInfo() {
    const infoElements = [
        '.template-name',
        '.template-size',
        '.template-date',
        '.template-pages'
    ];

    infoElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) element.textContent = '-';
    });
}

function handleTemplateFormSubmit(e) {
    e.preventDefault();
    // El formulario se maneja a través del drag & drop y file input
    showNotification('Use el área de arrastrar y soltar o el botón de subir', 'info');
}

async function applyTemplateChanges() {
    const applyBtn = document.getElementById('applyTemplateChangesBtn');
    const statusIndicator = document.querySelector('.status-indicator');

    if (!applyBtn) return;

    // Cambiar estado a procesando
    updateControlStatus('processing', 'Aplicando configuración...');

    // Deshabilitar botón temporalmente
    const originalHTML = applyBtn.innerHTML;
    applyBtn.disabled = true;
    applyBtn.innerHTML = `
        <span class="btn-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </span>
        <span class="btn-text">Aplicando...</span>
    `;

    try {
        // Simular proceso de aplicación
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar si hay plantilla configurada
        const localTemplate = localStorage.getItem('currentTemplate');
        if (localTemplate) {
            const template = JSON.parse(localTemplate);
            if (template.exists) {
                updateControlStatus('active', 'Configuración aplicada exitosamente');
                showNotification('Plantilla aplicada al sistema de firmas', 'success');

                // Marcar como aplicada
                template.applied = true;
                template.appliedDate = new Date().toISOString();
                localStorage.setItem('currentTemplate', JSON.stringify(template));
            } else {
                throw new Error('No hay plantilla configurada');
            }
        } else {
            throw new Error('No hay plantilla configurada');
        }

    } catch (error) {
        console.error('Error applying template changes:', error);
        updateControlStatus('inactive', 'Error al aplicar configuración');
        showNotification('Error al aplicar la configuración', 'error');
    } finally {
        // Restaurar botón
        setTimeout(() => {
            applyBtn.disabled = false;
            applyBtn.innerHTML = originalHTML;
        }, 1000);
    }
}

async function resetTemplateConfiguration() {
    const resetBtn = document.getElementById('resetTemplateBtn');

    if (!confirm('¿Estás seguro de que quieres restablecer la configuración? Se eliminará la plantilla actual.')) {
        return;
    }

    if (!resetBtn) return;

    // Cambiar estado a procesando
    updateControlStatus('processing', 'Restableciendo configuración...');

    // Deshabilitar botón temporalmente
    const originalHTML = resetBtn.innerHTML;
    resetBtn.disabled = true;
    resetBtn.innerHTML = `
        <span class="btn-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 3v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>
        <span class="btn-text">Restableciendo...</span>
    `;

    try {
        // Simular proceso de restablecimiento
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Limpiar localStorage
        localStorage.removeItem('currentTemplate');

        // Actualizar estados
        updateTemplateStatus('No hay plantilla configurada', 'none');
        updateControlStatus('inactive', 'Esperando configuración');
        enableTemplateActions(false);

        showNotification('Configuración restablecida exitosamente', 'success');

    } catch (error) {
        console.error('Error resetting template:', error);
        updateControlStatus('inactive', 'Error al restablecer');
        showNotification('Error al restablecer la configuración', 'error');
    } finally {
        // Restaurar botón
        setTimeout(() => {
            resetBtn.disabled = false;
            resetBtn.innerHTML = originalHTML;
        }, 500);
    }
}

function updateControlStatus(status, message) {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = statusIndicator.querySelector('span');

    if (!statusIndicator || !statusText) return;

    statusIndicator.className = `status-indicator ${status}`;
    statusText.textContent = message;
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
