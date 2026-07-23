// ===========================
// PERFIL - JAVASCRIPT FUNCTIONS
// ===========================

document.addEventListener('DOMContentLoaded', function () {
    initializeProfile();
    initializeTabs();
    initializePresenceControls();
});

function passwordChangeIsPending() {
    return localStorage.getItem('forcePasswordChange') === 'true';
}

const PROFILE_LAST_TAB_KEY = 'profileLastTab';
const PROFILE_REMEMBER_TAB_KEY = 'profileRememberLastTab';
const PROFILE_REDUCED_MOTION_KEY = 'profileReducedMotion';

// ===========================
// SISTEMA DE PESTAÑAS
// ===========================
function initializeTabs() {
    const profileSection = document.getElementById('perfilSection');
    if (!profileSection) return;

    const tabButtons = [...profileSection.querySelectorAll('.perfil-tab-btn')];
    const tabContents = [...profileSection.querySelectorAll('.perfil-tab-content')];

    tabButtons.forEach(button => {
        button.setAttribute('role', 'tab');
        button.setAttribute('tabindex', button.classList.contains('active') ? '0' : '-1');
        button.setAttribute('aria-selected', button.classList.contains('active') ? 'true' : 'false');

        button.addEventListener('click', function () {
            activateProfileTab(this.getAttribute('data-tab'));
        });

        button.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                button.click();
                return;
            }

            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
            event.preventDefault();
            const currentIndex = tabButtons.indexOf(button);
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const nextIndex = (currentIndex + direction + tabButtons.length) % tabButtons.length;
            tabButtons[nextIndex].focus();
        });
    });

    const shouldRemember = localStorage.getItem(PROFILE_REMEMBER_TAB_KEY) !== 'false';
    const savedTab = shouldRemember ? localStorage.getItem(PROFILE_LAST_TAB_KEY) : null;
    const initialTab = savedTab && profileSection.querySelector(`[data-tab="${savedTab}"]`)
        ? savedTab
        : (profileSection.querySelector('.perfil-tab-btn.active')?.getAttribute('data-tab') || 'datos-personales');

    activateProfileTab(initialTab, false);
}

function activateProfileTab(targetTab, persist = true) {
    const profileSection = document.getElementById('perfilSection');
    if (!profileSection) return;

    const tabButtons = profileSection.querySelectorAll('.perfil-tab-btn');
    const tabContents = profileSection.querySelectorAll('.perfil-tab-content');
    const targetButton = profileSection.querySelector(`.perfil-tab-btn[data-tab="${targetTab}"]`);
    const targetContent = document.getElementById(`tab-${targetTab}`);
    if (!targetButton || !targetContent) return;

    tabButtons.forEach(button => {
        const isActive = button === targetButton;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        button.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    tabContents.forEach(content => {
        const isActive = content === targetContent;
        content.classList.toggle('active', isActive);
        content.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    if (persist && localStorage.getItem(PROFILE_REMEMBER_TAB_KEY) !== 'false') {
        localStorage.setItem(PROFILE_LAST_TAB_KEY, targetTab);
    }

    switch (targetTab) {
        case 'gestion-llaves':
            if (typeof window.loadKeys === 'function') window.loadKeys();
            else loadUserKeys();
            break;
        case 'datos-personales':
            loadUserData();
            break;
        case 'configuraciones-avanzadas':
            loadAdvancedConfig();
            break;
    }
}

// ===========================
// INICIALIZACIÓN
// ===========================
function initializeProfile() {
    setupEncryptionOptions();
    setupPdfTemplates();
    loadUserData();
    loadUserKeys();
    loadProfileExperienceSettings();
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
            // ✅ MODERNIZADO - Restablecer a plantilla clásica
            const res = await fetch('/api/pdf-template/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ template: 'clasico' })
            });
            if (res.ok) {
                setControlStatus('success');
                showNotification('Plantilla restablecida a Clásico', 'success');
                // Actualiza el selector visualmente a Clásico
                renderPdfTemplateSelector('clasico');
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
// DATOS PERSONALES - VERSIÓN EXPANDIDA CON BACKEND
// ===========================

// Variables globales para datos del usuario
let currentUserData = {};
let currentProfilePhotoObjectUrl = null;
let presenceHeartbeatInterval = null;

const PRESENCE_LABELS = {
    en_linea: 'En línea',
    ausente: 'Ausente',
    ocupado: 'Ocupado',
    desconectado: 'Desconectado'
};

// Función para seleccionar foto de perfil
function selectProfilePhoto() {
    document.getElementById('profilePhotoInput').click();
}

// Función para manejar la subida de foto
async function handleProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        showNotification('Por favor selecciona un archivo de imagen válido', 'error');
        return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('La imagen no puede ser mayor a 5MB', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch('/api/profile/photo', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            await loadPersistentProfilePhoto(
                data.photoUrl || '/api/profile/photo/content',
                data.photoVersion
            );

            showNotification('Foto de perfil actualizada correctamente', 'success');
        } else {
            throw new Error(data.error || 'Error al subir la foto');
        }

    } catch (error) {
        console.error('Error al subir foto:', error);
        showNotification(error.message || 'Error al subir la foto de perfil', 'error');
    }
}

// Función para actualizar la foto de perfil en toda la interfaz
function updateProfilePhoto(photoPath) {
    // 1. Actualizar en la sección de perfil (.perfil-photo)
    const photoContainer = document.querySelector('.perfil-photo');
    if (photoContainer) {
        if (photoPath) {
            photoContainer.innerHTML = `<img src="${photoPath}" alt="Foto de perfil">`;
            photoContainer.classList.add('has-photo');
        } else {
            photoContainer.innerHTML = `
                <div class="perfil-photo-placeholder" aria-hidden="true">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>`;
            photoContainer.classList.remove('has-photo');
        }
    }

    // 2. Actualizar en el menú móvil (.user-profile-avatar)
    const mobileAvatar = document.querySelector('.user-profile-avatar');
    if (mobileAvatar) {
        mobileAvatar.querySelectorAll(':scope > img').forEach(image => image.remove());
        if (photoPath) {
            const image = document.createElement('img');
            image.src = photoPath;
            image.alt = 'Avatar de usuario';
            mobileAvatar.prepend(image);
            mobileAvatar.classList.add('has-photo');
        } else {
            mobileAvatar.classList.remove('has-photo');
        }
    }

    // 3. Actualizar en el dropdown del perfil (desktop) si existe
    const desktopAvatar = document.querySelector('.profile-avatar-large');
    if (desktopAvatar && photoPath) {
        desktopAvatar.src = photoPath;
    }

    // 4. Actualizar avatar pequeño del header si existe
    const headerAvatar = document.querySelector('.profile-avatar-small');
    if (headerAvatar && photoPath) {
        headerAvatar.src = photoPath;
    }
}

async function loadPersistentProfilePhoto(photoUrl = '/api/profile/photo/content', version = null) {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const separator = photoUrl.includes('?') ? '&' : '?';
        const versionedUrl = version ? `${photoUrl}${separator}v=${encodeURIComponent(version)}` : photoUrl;
        const response = await fetch(versionedUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
        });

        if (response.status === 404) {
            updateProfilePhoto(null);
            return false;
        }
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('Respuesta de imagen inválida');

        if (currentProfilePhotoObjectUrl) URL.revokeObjectURL(currentProfilePhotoObjectUrl);
        if (window.__profilePhotoObjectUrl && window.__profilePhotoObjectUrl !== currentProfilePhotoObjectUrl) {
            URL.revokeObjectURL(window.__profilePhotoObjectUrl);
        }
        currentProfilePhotoObjectUrl = URL.createObjectURL(blob);
        window.__profilePhotoObjectUrl = currentProfilePhotoObjectUrl;
        updateProfilePhoto(currentProfilePhotoObjectUrl);
        return true;
    } catch (error) {
        console.error('Error al cargar la foto persistente:', error);
        return false;
    }
}

function normalizePresenceStatus(status) {
    return Object.hasOwn(PRESENCE_LABELS, status) ? status : 'desconectado';
}

function updatePresenceUI(status) {
    const normalizedStatus = normalizePresenceStatus(status);
    const labelText = PRESENCE_LABELS[normalizedStatus];

    document.querySelectorAll('.profile-presence-control').forEach(control => {
        control.dataset.presence = normalizedStatus;
    });
    document.querySelectorAll('#profilePresenceButton, .mobile-profile-presence-toggle').forEach(button => {
        button.setAttribute('aria-label', `Estado: ${labelText}. Cambiar estado`);
    });
    document.querySelectorAll('#profilePresenceLabel, [data-presence-label]').forEach(label => {
        label.textContent = labelText;
    });

    document.querySelectorAll('.profile-presence-option').forEach(option => {
        const isSelected = option.dataset.status === normalizedStatus;
        option.classList.toggle('selected', isSelected);
        option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    try {
        const storedUser = JSON.parse(localStorage.getItem('user')) || {};
        storedUser.presenceStatus = normalizedStatus;
        storedUser.estado_presencia = normalizedStatus;
        localStorage.setItem('user', JSON.stringify(storedUser));
    } catch (_) {
        // La interfaz sigue funcionando aunque el almacenamiento local esté dañado.
    }
}

async function changePresenceStatus(status) {
    const normalizedStatus = normalizePresenceStatus(status);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/profile/presence', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: normalizedStatus })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo cambiar el estado');

        updatePresenceUI(data.presenceStatus || normalizedStatus);
        closePresenceMenu();
        showNotification(`Estado actualizado a ${PRESENCE_LABELS[normalizedStatus]}`, 'success');
    } catch (error) {
        showNotification(error.message || 'No se pudo cambiar el estado', 'error');
    }
}

function closePresenceMenu() {
    document.querySelectorAll('#profilePresenceMenu, .mobile-profile-presence-menu').forEach(menu => {
        menu.classList.remove('open');
    });
    document.querySelectorAll('#profilePresenceButton, .mobile-profile-presence-toggle').forEach(button => {
        button.setAttribute('aria-expanded', 'false');
    });
}

function initializePresenceControls() {
    const button = document.getElementById('profilePresenceButton');
    const menu = document.getElementById('profilePresenceMenu');
    if (!button || !menu || button.dataset.initialized === 'true') return;

    button.dataset.initialized = 'true';
    button.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = menu.classList.toggle('open');
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    menu.addEventListener('click', event => {
        const option = event.target.closest('.profile-presence-option');
        if (option) changePresenceStatus(option.dataset.status);
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.profile-presence-control')) closePresenceMenu();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closePresenceMenu();
    });

    startPresenceHeartbeat();
}

async function sendPresenceHeartbeat() {
    const token = localStorage.getItem('token');
    if (!token || document.visibilityState === 'hidden') return;

    try {
        const response = await fetch('/api/profile/heartbeat', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.presenceStatus) updatePresenceUI(data.presenceStatus);
        }
    } catch (_) {
        // La siguiente pulsación reintentará sin interrumpir el trabajo del usuario.
    }
}

function startPresenceHeartbeat() {
    if (!localStorage.getItem('token') || presenceHeartbeatInterval) return;
    sendPresenceHeartbeat();
    presenceHeartbeatInterval = window.setInterval(sendPresenceHeartbeat, 45_000);
}

window.changePresenceStatus = changePresenceStatus;
window.updatePresenceUI = updatePresenceUI;

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sendPresenceHeartbeat();
});

window.addEventListener('authStateChanged', event => {
    if (event.detail?.authenticated) {
        loadUserData();
        startPresenceHeartbeat();
    } else if (presenceHeartbeatInterval) {
        clearInterval(presenceHeartbeatInterval);
        presenceHeartbeatInterval = null;
    }
});

// Exponer la función globalmente para uso en otros módulos
window.updateProfilePhoto = updateProfilePhoto;

// Función para cargar datos del usuario desde el backend
async function loadUserData() {
    // Verificar si hay un token válido antes de hacer la request
    const token = localStorage.getItem('token');
    if (!token || passwordChangeIsPending()) {
        // No hay token de autenticación, saltando carga de datos del usuario
        return;
    }

    try {
        const response = await fetch('/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                return;
            }
            if (response.status === 403) return;
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            currentUserData = data.user;
            const stats = data.stats;

            // Llenar campos de datos personales
            fillFormFields(currentUserData);

            if (currentUserData.hasPhoto) {
                loadPersistentProfilePhoto(
                    currentUserData.photoUrl || '/api/profile/photo/content',
                    currentUserData.photoVersion
                );
            } else {
                updateProfilePhoto(null);
            }

            updatePresenceUI(
                currentUserData.presenceStatus || currentUserData.estado_presencia
            );

            // Actualizar estadísticas si existen elementos en el DOM
            updateUserStats(stats);

        } else {
            throw new Error(data.error || 'Error al cargar datos del usuario');
        }

    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        // Solo mostrar notificación si hay un token (evita spam en usuarios no logueados)
        if (localStorage.getItem('token')) {
            showNotification('Error al cargar los datos del perfil', 'error');
        }
    }
}

// Función para llenar los campos del formulario
function fillFormFields(userData) {
    // Llenando campos del formulario con datos

    const fieldMappings = {
        'userName': userData.nombre || '',
        'userEmail': userData.email || '',
        'userOrganization': userData.organizacion || '',
        'userBio': userData.biografia || '',
        'userPhone': userData.telefono || '',
        'userAddress': userData.direccion || '',
        'userPosition': userData.cargo || '',
        'userDepartment': userData.departamento || '',
        'userDegree': userData.grado_academico || ''
    };

    // Mapeando campos

    for (const [fieldId, value] of Object.entries(fieldMappings)) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
            // Campo llenado
        } else {
            console.warn(`⚠️ Campo ${fieldId} no encontrado en el DOM`);
        }
    }

    // Formulario llenado completamente
}

// Función para actualizar estadísticas del usuario
function updateUserStats(stats) {
    const statsElements = {
        'totalKeysCount': stats.total_keys || 0,
        'activeKeysCount': stats.active_keys || 0,
        'expiredKeysCount': stats.expired_keys || 0
    };

    for (const [elementId, value] of Object.entries(statsElements)) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
}

// Función para guardar datos personales en el backend
async function saveUserData() {
    try {
        // Recopilar datos del formulario
        const personalData = {
            nombre: document.getElementById('userName')?.value || '',
            email: document.getElementById('userEmail')?.value || '',
            organizacion: document.getElementById('userOrganization')?.value || '',
            biografia: document.getElementById('userBio')?.value || '',
            telefono: document.getElementById('userPhone')?.value || '',
            direccion: document.getElementById('userAddress')?.value || '',
            cargo: document.getElementById('userPosition')?.value || '',
            departamento: document.getElementById('userDepartment')?.value || '',
            grado_academico: document.getElementById('userDegree')?.value || ''
        };

        // Validación básica
        if (!personalData.nombre.trim()) {
            showNotification('El nombre completo es obligatorio', 'error');
            return;
        }

        if (personalData.email && !isValidEmail(personalData.email)) {
            showNotification('Por favor ingresa un correo electrónico válido', 'error');
            return;
        }

        const response = await fetch('/api/profile/personal', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(personalData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Datos personales guardados correctamente', 'success');
            // Recargar datos para mantener sincronización
            await loadUserData();
        } else {
            throw new Error(data.error || 'Error al guardar datos');
        }

    } catch (error) {
        console.error('Error al guardar datos personales:', error);
        showNotification(error.message || 'Error al guardar los datos personales', 'error');
    }
}

// Función de validación de email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para inicializar la sección de datos personales
function initializePersonalDataSection() {
    // Cargar datos del usuario al inicializar
    loadUserData();

    // Agregar event listeners para guardado automático (opcional)
    const saveButton = document.querySelector('.save-btn[onclick="saveUserData()"]');
    if (saveButton) {
        saveButton.onclick = saveUserData;
    }
}

// Llamar a la inicialización cuando se cargue el perfil
document.addEventListener('DOMContentLoaded', function () {
    // Solo inicializar si estamos en la sección de perfil
    if (document.getElementById('perfilSection')) {
        setTimeout(initializePersonalDataSection, 1000); // Pequeño delay para asegurar que todo esté cargado
    }
});

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

    // Verificar si hay un token válido antes de hacer la request
    const token = localStorage.getItem('token');
    if (!token || passwordChangeIsPending()) {
        // No hay token de autenticación, saltando carga de llaves
        keysList.innerHTML = '<p class="no-keys-message">Inicia sesión para ver tus llaves.</p>';
        return;
    }

    try {
        const response = await fetch('/list-keys', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
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
            if (response.status === 401) {
                localStorage.removeItem('token');
                keysList.innerHTML = '<p class="no-keys-message">Sesión expirada. Inicia sesión nuevamente.</p>';
                return;
            }
            if (response.status === 403) return;
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
                    <span>${window.cryptoConfig?.formatEncryptionType(key.encryption_type) || 'AES-256-GCM v2'}</span>
                    <span>Creada: ${new Date(key.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
        <div class="key-actions">
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

function showCreateKeyModal(providedKeyName = '') {

    // Verificar el campo de nombre de llave primero
    const keyNameInput = document.getElementById('keyNameInput');
    if (!keyNameInput) {
        console.warn('keyNameInput no encontrado');
        alert('Error: Campo de nombre de llave no encontrado');
        return;
    }

    if (providedKeyName) keyNameInput.value = providedKeyName.trim();
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
    if (!providedKeyName) {
        keyNameInput.focus();
        keyNameInput.scrollIntoView({ behavior: 'smooth' });
    }

    // Dar un pequeño delay para asegurar que todos los scripts estén cargados
    setTimeout(() => {
        // Mostrar el modal de contraseña para generar la llave
        if (typeof window.showKeyPasswordModal === 'function') {
            window.showKeyPasswordModal(async (keyPassword) => {
                try {
                    const keyName = keyNameInput ? keyNameInput.value.trim() : "";

                    const response = await fetch("/generate-keys", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                        body: JSON.stringify({
                            keyPassword,
                            keyName,
                            encryptionType: window.cryptoConfig?.currentType || 'aes-256-gcm-v2'
                        }),
                    });

                    const data = await response.json();

                    if (data.success) {
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
                                window.loadKeys();
                            }
                        } catch (loadError) {
                            console.warn('Error al recargar con window.loadKeys:', loadError);
                        }

                        try {
                            if (typeof loadProfileKeys === "function") {
                                loadProfileKeys();
                            }
                        } catch (profileError) {
                            console.warn('Error al recargar llaves del perfil:', profileError);
                        }

                        if (typeof window.refreshSignKeys === 'function') {
                            window.refreshSignKeys();
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

// ===========================
// CONFIGURACIÓN DE CIFRADO
// ===========================
function setupEncryptionOptions() {
    loadEncryptionSettings();
}

function loadEncryptionSettings() {
    if (typeof window.renderEncryptionSettings === 'function') {
        window.renderEncryptionSettings();
        return;
    }

    const options = document.querySelectorAll('.encryption-option');
    const selectedType = window.cryptoConfig?.currentType || 'aes-256-gcm-v2';

    options.forEach(option => {
        const isSelected = option.dataset.encryption === selectedType;
        option.classList.toggle('selected', isSelected);
        option.setAttribute('aria-pressed', String(isSelected));
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
        { id: 'clasico', name: 'Clásico', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><line x1="8" y1="7" x2="16" y2="7" stroke="#2563eb" stroke-width="1.5"/><line x1="8" y1="11" x2="16" y2="11" stroke="#2563eb" stroke-width="1.5"/><line x1="8" y1="15" x2="13" y2="15" stroke="#2563eb" stroke-width="1.5"/></svg>` },
        { id: 'moderno', name: 'Moderno', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><rect x="8" y="7" width="8" height="2" fill="#2563eb"/><rect x="8" y="11" width="8" height="2" fill="#2563eb"/><rect x="8" y="15" width="5" height="2" fill="#2563eb"/></svg>` },
        { id: 'minimalista', name: 'Minimalista', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="#2563eb" stroke-width="1.5"/></svg>` },
        { id: 'ejecutivo', name: 'Ejecutivo', svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" stroke-width="2"/><path d="M8 8C8 10 16 10 16 8" stroke="#2563eb" stroke-width="1.5"/><path d="M8 16C8 14 16 14 16 16" stroke="#2563eb" stroke-width="1.5"/></svg>` },
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
// PREFERENCIAS REALES DE EXPERIENCIA
// ===========================
function loadProfileExperienceSettings() {
    const rememberTab = localStorage.getItem(PROFILE_REMEMBER_TAB_KEY) !== 'false';
    const reducedMotion = localStorage.getItem(PROFILE_REDUCED_MOTION_KEY) === 'true';
    const rememberInput = document.getElementById('rememberProfileTab');
    const motionInput = document.getElementById('reduceProfileMotion');

    if (rememberInput) rememberInput.checked = rememberTab;
    if (motionInput) motionInput.checked = reducedMotion;
    document.documentElement.classList.toggle('profile-reduced-motion', reducedMotion);
}

function updateProfileExperience(input) {
    if (!input) return;

    if (input.id === 'rememberProfileTab') {
        localStorage.setItem(PROFILE_REMEMBER_TAB_KEY, String(input.checked));
        if (!input.checked) localStorage.removeItem(PROFILE_LAST_TAB_KEY);
        showNotification(
            input.checked ? 'Se recordará la última sección del perfil' : 'El perfil volverá a abrirse desde el inicio',
            'success'
        );
        return;
    }

    if (input.id === 'reduceProfileMotion') {
        localStorage.setItem(PROFILE_REDUCED_MOTION_KEY, String(input.checked));
        document.documentElement.classList.toggle('profile-reduced-motion', input.checked);
        showNotification(
            input.checked ? 'Movimiento reducido activado' : 'Movimiento reducido desactivado',
            'success'
        );
    }
}

window.updateProfileExperience = updateProfileExperience;

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
            let currentTemplate = config.template || 'clasico'; // ✅ MODERNIZADO
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
                                window._pdfTemplateActive = config.template || 'clasico'; // ✅ MODERNIZADO
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
            case 'clasico': // ✅ MODERNIZADO - Clásico
                // Defaults already set
                break;
            case 'moderno': // ✅ MODERNIZADO - Moderno
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
            case 'minimalista': // ✅ MODERNIZADO - Minimalista
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
            case 'ejecutivo': // ✅ MODERNIZADO - Ejecutivo
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
            const selectedTemplate = window._pdfTemplateSelected || localStorage.getItem('pdfTemplate') || 'clasico'; // ✅ MODERNIZADO
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

/* ========================================
   CONFIGURACIONES AVANZADAS - SOLO OWNER
   ======================================== */

// Cargar configuración avanzada
function loadAdvancedConfig() {
    loadProfileExperienceSettings();
    checkOwnerAccess();
}

async function changeProfilePassword() {
    const currentInput = document.getElementById('profileCurrentPassword');
    const newInput = document.getElementById('profileNewPassword');
    const confirmInput = document.getElementById('profileConfirmPassword');
    const message = document.getElementById('profilePasswordMessage');
    const submitButton = document.querySelector('.password-settings-card .secondary-action');
    const currentPassword = currentInput?.value || '';
    const newPassword = newInput?.value || '';
    const confirmPassword = confirmInput?.value || '';
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

    const setMessage = (text, type = '') => {
        if (!message) return;
        message.textContent = text;
        message.className = type;
    };

    setMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
        setMessage('Completa los tres campos.', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        setMessage('Las contraseñas nuevas no coinciden.', 'error');
        return;
    }
    if (!passwordPattern.test(newPassword)) {
        setMessage('La nueva contraseña no cumple los requisitos indicados.', 'error');
        return;
    }
    if (currentPassword === newPassword) {
        setMessage('La nueva contraseña debe ser diferente a la actual.', 'error');
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Actualizando...';
    }

    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'No fue posible cambiar la contraseña.');

        if (result.token) localStorage.setItem('token', result.token);
        localStorage.removeItem('forcePasswordChange');
        currentInput.value = '';
        newInput.value = '';
        confirmInput.value = '';
        setMessage('Contraseña actualizada correctamente.', 'success');
        showNotification('Contraseña actualizada correctamente', 'success');
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { authenticated: true } }));
    } catch (error) {
        setMessage(error.message, 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Actualizar contraseña';
        }
    }
}

window.changeProfilePassword = changeProfilePassword;

// Verificar si el usuario es owner y mostrar/ocultar secciones correspondientes
function checkOwnerAccess() {
    const token = localStorage.getItem('token');
    if (!token) {
        return;
    }

    // Verificar datos del usuario
    fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(userData => {
            // Mostrar la categoría de administración solo si es owner
            const ownerCategory = document.getElementById('ownerAdminCategory');
            if (ownerCategory) {
                if (userData.rol === 'owner') {
                    ownerCategory.style.display = 'block';
                } else {
                    ownerCategory.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error verificando rol de usuario:', error);
            // Ocultar por seguridad si hay error
            const ownerCategory = document.getElementById('ownerAdminCategory');
            if (ownerCategory) {
                ownerCategory.style.display = 'none';
            }
        });
}

function loadAdvancedSettings() {
    loadProfileExperienceSettings();
}


// Cancelar acceso al panel de owner
function cancelOwnerAccess() {
    const passwordInput = document.getElementById('ownerPassword');
    if (passwordInput) passwordInput.value = '';

    // Cambiar a otra pestaña
    const datosPersonalesTab = document.querySelector('[data-tab="datos-personales"]');
    if (datosPersonalesTab) {
        datosPersonalesTab.click();
    }
}

// Abrir panel de administración - redirige al login administrativo
async function openAdminPanel() {
    try {
        showNotification('Redirigiendo al panel de administración...', 'info');

        // Ir a la página de login administrativo en la misma pestaña
        window.location.href = '/adminLogin';

        showNotification('Panel de administración abierto correctamente', 'success');

    } catch (error) {
        console.error('Error abriendo panel de administración:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Verificar acceso de owner al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    // Cargar configuraciones guardadas
    loadAdvancedSettings();

    // Verificar acceso de owner (esperar un poco para que se cargue la autenticación)
    setTimeout(checkOwnerAccess, 1000);
});

// Exponer funciones globalmente para uso externo
window.checkOwnerAccess = checkOwnerAccess;
window.openAdminPanel = openAdminPanel;
