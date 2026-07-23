class AdminPanel {
  constructor(sessionUser) {
    this.apiBase = '/api/admin';
    this.currentTab = 'gestion-usuarios';
    this.currentUser = this.normalizeSessionUser(sessionUser);
    this.currentRole = this.currentUser.role;
    this.generalConfig = {};
    this.faviconFile = null;
    this.faviconPreviewUrl = null;
    this.sessionPhotoUrl = null;
    this.sidebarOpen = false;
    this.presenceTimer = null;

    this.userManagement = new UserManagement(this);
    this.bindEvents();
    this.renderSession();
    void this.loadSessionPhoto();
    this.configurePermissions();
    this.revealPanel();
    this.startAdminHeartbeat();
    this.switchTab('gestion-usuarios');
    this.syncAppearanceSelection();
  }

  normalizeSessionUser(user = {}) {
    const roleValue = String(user.role ?? user.rol ?? '').toLowerCase();
    return {
      ...user,
      id: Number(user.id) || null,
      name: String(user.name ?? user.nombre ?? user.username ?? user.usuario ?? 'Administrador'),
      role: roleValue === 'owner' ? 'owner' : 'admin'
    };
  }

  getAdminToken() {
    return localStorage.getItem('admin_token') || '';
  }

  bindEvents() {
    document.querySelectorAll('.admin-nav-item[data-tab]').forEach((button) => {
      button.addEventListener('click', () => this.switchTab(button.dataset.tab));
    });

    document.getElementById('mainSiteBtn')?.addEventListener('click', () => {
      if (typeof window.goToMainSite === 'function') window.goToMainSite();
      else window.location.assign('/');
    });

    document.getElementById('mobileToggleBtn')?.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('adminSidebarOverlay')?.addEventListener('click', () => this.closeSidebar());
    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) this.closeSidebar();
    });

    document.getElementById('generalConfigForm')?.addEventListener('submit', (event) => {
      this.saveGeneralConfig(event);
    });

    document.getElementById('faviconUpload')?.addEventListener('change', (event) => {
      this.selectFavicon(event.target.files?.[0]);
    });
    document.getElementById('uploadFaviconBtn')?.addEventListener('click', () => this.uploadFavicon());

    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.addEventListener('click', () => this.applyTheme(button.dataset.themeOption));
    });

    const colorPicker = document.getElementById('customThemeColor');
    const colorHex = document.getElementById('customThemeHex');
    colorPicker?.addEventListener('input', () => {
      if (colorHex) colorHex.value = colorPicker.value.toUpperCase();
    });
    colorHex?.addEventListener('input', () => {
      const value = this.normalizeHex(colorHex.value);
      if (value && colorPicker) colorPicker.value = value;
    });
    document.getElementById('applyCustomThemeBtn')?.addEventListener('click', () => this.applyCustomTheme());

    document.querySelectorAll('.background-option-card[data-bg]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.background-option-card').forEach((card) => card.classList.remove('selected'));
        button.classList.add('selected');
      });
    });

    window.addEventListener('themeChanged', () => this.syncThemeSelection());
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.sidebarOpen) this.closeSidebar();
    });
  }

  revealPanel() {
    const shell = document.getElementById('adminShell');
    const authLoading = document.getElementById('adminAuthLoading');
    if (shell) shell.hidden = false;
    if (authLoading) authLoading.hidden = true;
  }

  renderSession() {
    const nameElement = document.getElementById('adminSessionName');
    const roleElement = document.getElementById('adminSessionRole');
    const avatarElement = document.getElementById('adminSessionAvatar');
    if (nameElement) nameElement.textContent = this.currentUser.name;
    if (roleElement) roleElement.textContent = this.currentRole === 'owner' ? 'Propietario' : 'Administrador';
    if (avatarElement) avatarElement.textContent = this.getInitials(this.currentUser.name);
  }

  async loadSessionPhoto() {
    const avatarElement = document.getElementById('adminSessionAvatar');
    if (!avatarElement || !this.currentUser.id) return;

    try {
      const response = await fetch(`${this.apiBase}/users/${this.currentUser.id}/photo`, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` },
        cache: 'no-store'
      });
      if (response.status === 404) return;
      if (!response.ok) throw new Error('No se pudo cargar la foto de la sesión');

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) return;
      if (this.sessionPhotoUrl) URL.revokeObjectURL(this.sessionPhotoUrl);
      this.sessionPhotoUrl = URL.createObjectURL(blob);

      const image = document.createElement('img');
      image.src = this.sessionPhotoUrl;
      image.alt = '';
      avatarElement.replaceChildren(image);
      avatarElement.classList.add('has-photo');
    } catch (error) {
      console.warn(error.message);
    }
  }

  startAdminHeartbeat() {
    if (this.presenceTimer) return;
    this.presenceTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void this.sendAdminHeartbeat();
    }, 45_000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.sendAdminHeartbeat();
    });
  }

  async sendAdminHeartbeat() {
    try {
      await fetch(`${this.apiBase}/session/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.getAdminToken()}` },
        cache: 'no-store'
      });
    } catch (_) {
      // El siguiente pulso reintentará sin interrumpir el panel.
    }
  }

  configurePermissions() {
    if (this.currentRole === 'owner') return;
    document.querySelectorAll('[data-owner-only]').forEach((element) => {
      element.hidden = true;
    });
    const saveConfigButton = document.querySelector('#generalConfigForm button[type="submit"]');
    if (saveConfigButton) {
      saveConfigButton.disabled = true;
      saveConfigButton.title = 'Solo el propietario puede modificar esta configuración';
      saveConfigButton.textContent = 'Solo lectura para administradores';
    }
  }

  async switchTab(tabId) {
    const allowedTabs = new Set([
      'gestion-usuarios',
      'configuracion-general',
      'apariencia',
      'pdf-aval',
      'base-datos'
    ]);
    if (tabId === 'base-datos' && this.currentRole !== 'owner') tabId = 'gestion-usuarios';
    const targetTab = allowedTabs.has(tabId) ? tabId : 'gestion-usuarios';
    this.currentTab = targetTab;

    document.querySelectorAll('.admin-nav-item[data-tab]').forEach((button) => {
      const active = button.dataset.tab === targetTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });

    document.querySelectorAll('.admin-tab-content[data-panel]').forEach((panel) => {
      const active = panel.dataset.panel === targetTab;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });

    this.closeSidebar();

    if (targetTab === 'gestion-usuarios' && this.userManagement.users.length === 0) {
      await this.userManagement.loadUsers();
    }
    if (targetTab === 'configuracion-general') await this.loadGeneralConfig();
    if (targetTab === 'apariencia') this.syncAppearanceSelection();
  }

  toggleSidebar() {
    this.sidebarOpen ? this.closeSidebar() : this.openSidebar();
  }

  openSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminSidebarOverlay');
    const toggle = document.getElementById('mobileToggleBtn');
    this.sidebarOpen = true;
    sidebar?.classList.add('mobile-open');
    if (overlay) overlay.hidden = false;
    toggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  closeSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminSidebarOverlay');
    const toggle = document.getElementById('mobileToggleBtn');
    this.sidebarOpen = false;
    sidebar?.classList.remove('mobile-open');
    if (overlay) overlay.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  async loadGeneralConfig() {
    try {
      const response = await fetch(`${this.apiBase}/config`, {
        headers: { Authorization: `Bearer ${this.getAdminToken()}` },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(await this.readError(response, 'No se pudo cargar la configuración'));
      this.generalConfig = await response.json();
      this.populateGeneralConfig();
    } catch (error) {
      console.error('Error cargando configuración general:', error);
      this.showNotification(error.message, 'error');
    }
  }

  populateGeneralConfig() {
    const values = {
      siteTitle: this.generalConfig.siteTitle ?? this.generalConfig.title ?? 'Firmas Digitales FD',
      contactEmail: this.generalConfig.contactEmail ?? '',
      contactPhone: this.generalConfig.contactPhone ?? ''
    };
    for (const [id, value] of Object.entries(values)) {
      const input = document.getElementById(id);
      if (input) input.value = value;
    }
  }

  async saveGeneralConfig(event) {
    event.preventDefault();
    if (this.currentRole !== 'owner') {
      this.showNotification('Solo el propietario puede cambiar la configuración general', 'warning');
      return;
    }

    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const payload = {
      siteTitle: document.getElementById('siteTitle').value.trim(),
      contactEmail: document.getElementById('contactEmail').value.trim(),
      contactPhone: document.getElementById('contactPhone').value.trim()
    };

    this.showLoading('Guardando configuración…');
    try {
      const response = await fetch(`${this.apiBase}/config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAdminToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await this.readError(response, 'No se pudo guardar la configuración'));
      const result = await response.json();
      this.generalConfig = result.config || payload;
      document.getElementById('adminHeaderSubtitle').textContent = payload.siteTitle;
      document.title = `Administración | ${payload.siteTitle}`;
      window.visualManager?.updateInstitutionName?.(payload.siteTitle);
      this.showNotification('Configuración guardada correctamente', 'success');
    } catch (error) {
      this.showNotification(error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  selectFavicon(file) {
    const saveButton = document.getElementById('uploadFaviconBtn');
    if (!file) {
      this.faviconFile = null;
      if (saveButton) saveButton.disabled = true;
      return;
    }

    const allowedTypes = new Set(['image/x-icon', 'image/png', 'image/jpeg', 'image/gif']);
    if (!allowedTypes.has(file.type) || file.size > 1024 * 1024) {
      document.getElementById('faviconUpload').value = '';
      this.showNotification('El icono debe ser ICO, PNG, JPG o GIF y pesar máximo 1 MB', 'warning');
      return;
    }

    if (this.faviconPreviewUrl) URL.revokeObjectURL(this.faviconPreviewUrl);
    this.faviconPreviewUrl = URL.createObjectURL(file);
    this.faviconFile = file;
    document.getElementById('currentFavicon').src = this.faviconPreviewUrl;
    if (saveButton) saveButton.disabled = false;
  }

  async uploadFavicon() {
    if (!this.faviconFile) return;
    const formData = new FormData();
    formData.append('favicon', this.faviconFile);
    this.showLoading('Guardando icono…');

    try {
      const response = await fetch(`${this.apiBase}/upload-favicon`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.getAdminToken()}` },
        body: formData
      });
      if (!response.ok) throw new Error(await this.readError(response, 'No se pudo guardar el icono'));
      const result = await response.json();
      const faviconUrl = `${result.faviconUrl || '/favicon.ico'}?v=${Date.now()}`;
      document.getElementById('currentFavicon').src = faviconUrl;
      const link = document.querySelector('link[rel="icon"]');
      if (link) link.href = faviconUrl;
      const brandLogo = document.querySelector('.admin-brand-logo');
      if (brandLogo) brandLogo.style.backgroundImage = `url("${faviconUrl}")`;
      this.faviconFile = null;
      document.getElementById('faviconUpload').value = '';
      document.getElementById('uploadFaviconBtn').disabled = true;
      this.showNotification('Icono actualizado correctamente', 'success');
    } catch (error) {
      this.showNotification(error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  applyTheme(theme) {
    const success = typeof window.changeTheme === 'function' && window.changeTheme(theme);
    if (!success) {
      document.documentElement.setAttribute('data-theme', theme);
      this.showNotification('El tema se aplicó de forma local', 'info');
    } else {
      this.showNotification('Tema actualizado', 'success');
    }
    this.syncThemeSelection(theme);
  }

  applyCustomTheme() {
    const input = document.getElementById('customThemeHex');
    const color = this.normalizeHex(input?.value);
    if (!color) {
      this.showNotification('Ingresa un color hexadecimal válido', 'warning');
      return;
    }
    if (input) input.value = color.toUpperCase();
    const picker = document.getElementById('customThemeColor');
    if (picker) picker.value = color;
    if (typeof window.setCustomColor === 'function') window.setCustomColor(color);
    else document.documentElement.style.setProperty('--primary-color', color);
    this.syncThemeSelection('custom');
    this.showNotification('Color personalizado aplicado', 'success');
  }

  normalizeHex(value) {
    const string = String(value || '').trim();
    const normalized = string.startsWith('#') ? string : `#${string}`;
    return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : null;
  }

  syncAppearanceSelection() {
    this.syncThemeSelection();
    const currentBackground = document.body.dataset.bg || localStorage.getItem('globalBackground') || 'fondo1';
    document.querySelectorAll('.background-option-card[data-bg]').forEach((card) => {
      card.classList.toggle('selected', card.dataset.bg === currentBackground);
    });
  }

  syncThemeSelection(forcedTheme) {
    const currentTheme = forcedTheme || document.documentElement.dataset.theme || 'orange';
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.themeOption === currentTheme);
    });
  }

  showLoading(message = 'Procesando…') {
    const overlay = document.getElementById('adminOperationLoading');
    const text = document.getElementById('adminOperationText');
    if (text) text.textContent = message;
    if (overlay) overlay.hidden = false;
  }

  hideLoading() {
    const overlay = document.getElementById('adminOperationLoading');
    if (overlay) overlay.hidden = true;
  }

  showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') window.showNotification(String(message), type);
    else console[type === 'error' ? 'error' : 'log'](message);
  }

  getInitials(name) {
    return String(name || 'A')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'A';
  }

  async readError(response, fallback) {
    try {
      const body = await response.json();
      return body.message || body.error || fallback;
    } catch {
      return fallback;
    }
  }
}

window.AdminPanel = AdminPanel;

window.addEventListener('admin:authenticated', (event) => {
  if (window.adminPanel) return;
  window.adminPanel = new AdminPanel(event.detail?.user || {});
  window.dispatchEvent(new CustomEvent('admin:ready', { detail: { panel: window.adminPanel } }));
});
