class UserManagement {
  constructor(adminPanel) {
    this.adminPanel = adminPanel;
    this.users = [];
    this.filteredUsers = [];
    this.editorMode = 'create';
    this.editingUserId = null;
    this.loadingPromise = null;
    this.submitInProgress = false;
    this.photoCache = new Map();
    this.presenceTimer = null;
    this.lastPresenceHeartbeatAt = 0;
    this.confirmCallback = null;

    this.bindEvents();
  }

  get authHeaders() {
    return {
      Authorization: `Bearer ${this.adminPanel.getAdminToken()}`,
      'Content-Type': 'application/json'
    };
  }

  bindEvents() {
    const search = document.getElementById('userSearch');
    const roleFilter = document.getElementById('userRoleFilter');
    const presenceFilter = document.getElementById('userPresenceFilter');
    const accountFilter = document.getElementById('userAccountFilter');
    const usersList = document.getElementById('usersList');
    const editorForm = document.getElementById('userEditorForm');

    search?.addEventListener('input', () => this.applyFilters());
    roleFilter?.addEventListener('change', () => this.applyFilters());
    presenceFilter?.addEventListener('change', () => this.applyFilters());
    accountFilter?.addEventListener('change', () => this.applyFilters());
    document.getElementById('refreshUsersBtn')?.addEventListener('click', () => this.loadUsers());
    document.getElementById('openCreateUserBtn')?.addEventListener('click', () => this.openCreateDialog());
    editorForm?.addEventListener('submit', (event) => this.handleEditorSubmit(event));

    usersList?.addEventListener('change', (event) => this.handleListChange(event));
    usersList?.addEventListener('click', (event) => this.handleListClick(event));

    document.addEventListener('click', (event) => {
      const closeButton = event.target.closest('[data-close-dialog]');
      if (!closeButton) return;
      this.closeDialog(closeButton.dataset.closeDialog);
    });

    document.getElementById('confirmDialogAction')?.addEventListener('click', async () => {
      const callback = this.confirmCallback;
      this.confirmCallback = null;
      this.closeDialog('confirmDialog');
      if (callback) await callback();
    });

    document.getElementById('copyTemporaryPasswordBtn')?.addEventListener('click', () => {
      this.copyTemporaryPassword();
    });

    window.addEventListener('beforeunload', () => this.dispose());
  }

  async loadUsers({ silent = false } = {}) {
    if (this.loadingPromise) return this.loadingPromise;

    const table = document.querySelector('.users-table');
    if (!silent) this.renderLoading();
    table?.setAttribute('aria-busy', 'true');

    this.loadingPromise = (async () => {
      try {
        await this.refreshCurrentUserPresence();
        const response = await fetch(`${this.adminPanel.apiBase}/users`, {
          headers: { Authorization: `Bearer ${this.adminPanel.getAdminToken()}` },
          cache: 'no-store'
        });

        if (!response.ok) throw new Error(await this.readError(response, 'No se pudieron cargar los usuarios'));

        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : payload.users || payload.data || [];
        this.users = rows.map((user) => this.normalizeUser(user)).filter((user) => user.id);
        this.updateMetrics();
        this.applyFilters();
        this.startPresenceRefresh();
        return this.users;
      } catch (error) {
        console.error('Error cargando usuarios:', error);
        if (!silent || this.users.length === 0) this.renderError(error.message);
        this.adminPanel.showNotification(error.message, 'error');
        return this.users;
      } finally {
        table?.setAttribute('aria-busy', 'false');
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  normalizeUser(rawUser = {}) {
    const id = Number(rawUser.id);
    const keysCount = this.toNonNegativeNumber(rawUser.keysCount ?? rawUser.keys_count);
    const activeKeysCount = this.toNonNegativeNumber(rawUser.activeKeysCount ?? rawUser.active_keys_count);
    const activeKeyId = Number(rawUser.activeKeyId ?? rawUser.active_key_id) || null;
    const hasPhoto = Boolean(
      rawUser.hasPhoto
      ?? rawUser.has_photo
      ?? rawUser.photoUrl
      ?? rawUser.photo_url
      ?? rawUser.foto_perfil
    );

    return {
      ...rawUser,
      id: Number.isInteger(id) && id > 0 ? id : null,
      name: String(rawUser.name ?? rawUser.nombre ?? rawUser.username ?? rawUser.usuario ?? 'Usuario'),
      email: String(rawUser.email ?? rawUser.username ?? rawUser.usuario ?? ''),
      username: String(rawUser.username ?? rawUser.usuario ?? ''),
      role: this.normalizeRole(rawUser.role ?? rawUser.rol),
      accountStatus: this.normalizeAccountStatus(
        rawUser.accountStatus ?? rawUser.account_status ?? rawUser.estado_cuenta ?? rawUser.status
      ),
      presenceStatus: this.normalizePresence(
        rawUser.presenceStatus ?? rawUser.presence_status ?? rawUser.estado_presencia
      ),
      selectedPresenceStatus: this.normalizePresence(
        rawUser.selectedPresenceStatus
        ?? rawUser.selected_presence_status
        ?? rawUser.estado_presencia
        ?? rawUser.presenceStatus
      ),
      lastSeenAt: rawUser.lastSeenAt ?? rawUser.last_seen_at ?? rawUser.ultimo_acceso ?? rawUser.lastLogin ?? null,
      createdAt: rawUser.createdAt ?? rawUser.created_at ?? null,
      keysCount,
      activeKeysCount,
      activeKeyId,
      hasActiveKey: Boolean(rawUser.hasActiveKey ?? rawUser.has_active_key) || Boolean(activeKeyId) || activeKeysCount > 0,
      photoUrl: hasPhoto
        ? String(rawUser.photoUrl ?? rawUser.photo_url ?? rawUser.foto_perfil ?? '')
        : '',
      photoVersion: String(rawUser.photoVersion ?? rawUser.photo_version ?? rawUser.updated_at ?? '')
    };
  }

  normalizeRole(value) {
    const role = String(value || '').toLowerCase();
    if (role === 'owner') return 'owner';
    if (role === 'admin') return 'admin';
    return 'user';
  }

  normalizeAccountStatus(value) {
    const statuses = {
      activo: 'active',
      active: 'active',
      inactivo: 'inactive',
      inactive: 'inactive',
      suspendido: 'suspended',
      suspended: 'suspended',
      pendiente: 'pending',
      pending: 'pending'
    };
    return statuses[String(value || '').toLowerCase()] || 'active';
  }

  normalizePresence(value) {
    const statuses = {
      online: 'online',
      en_linea: 'online',
      'en linea': 'online',
      'en línea': 'online',
      away: 'away',
      ausente: 'away',
      busy: 'busy',
      ocupado: 'busy',
      offline: 'offline',
      desconectado: 'offline'
    };
    return statuses[String(value || '').toLowerCase()] || 'offline';
  }

  toNonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  applyFilters() {
    const query = String(document.getElementById('userSearch')?.value || '').trim().toLocaleLowerCase('es');
    const role = document.getElementById('userRoleFilter')?.value || 'all';
    const presence = document.getElementById('userPresenceFilter')?.value || 'all';
    const account = document.getElementById('userAccountFilter')?.value || 'all';

    this.filteredUsers = this.users.filter((user) => {
      const haystack = `${user.name} ${user.email} ${user.username}`.toLocaleLowerCase('es');
      return (!query || haystack.includes(query))
        && (role === 'all' || user.role === role)
        && (presence === 'all' || user.presenceStatus === presence)
        && (account === 'all' || user.accountStatus === account);
    });

    this.renderUsers();
  }

  updateMetrics() {
    this.setMetric('metricTotalUsers', this.users.length);
    this.setMetric('metricOnlineUsers', this.users.filter((user) => user.presenceStatus === 'online').length);
    this.setMetric('metricUsersWithKeys', this.users.filter((user) => user.keysCount > 0).length);
    this.setMetric('metricAdminUsers', this.users.filter((user) => ['admin', 'owner'].includes(user.role)).length);
  }

  setMetric(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = new Intl.NumberFormat('es-CO').format(value);
  }

  renderLoading() {
    const container = document.getElementById('usersList');
    if (!container) return;
    container.innerHTML = `
      <div class="users-loading-state">
        <span class="admin-spinner" aria-hidden="true"></span>
        <p>Cargando usuarios…</p>
      </div>
    `;
  }

  renderError(message) {
    const container = document.getElementById('usersList');
    if (!container) return;
    container.innerHTML = `
      <div class="users-error-state">
        <strong>No fue posible cargar los usuarios</strong>
        <p>${this.escapeHTML(message || 'Intenta nuevamente en unos segundos.')}</p>
        <button class="admin-btn admin-btn-secondary" type="button" data-action="retry">Reintentar</button>
      </div>
    `;
  }

  renderUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;

    this.prunePhotoCache();

    if (this.filteredUsers.length === 0) {
      container.innerHTML = `
        <div class="users-empty-state">
          <strong>No hay usuarios que coincidan</strong>
          <p>Prueba con otra búsqueda o restablece los filtros.</p>
          <button class="admin-btn admin-btn-secondary" type="button" data-action="clear-filters">Limpiar filtros</button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredUsers.map((user) => this.renderUserRow(user)).join('');
    this.loadAuthenticatedPhotos();
  }

  renderUserRow(user) {
    const isSelf = Number(user.id) === Number(this.adminPanel.currentUser?.id);
    const currentRole = this.adminPanel.currentRole;
    const protectedOwner = user.role === 'owner' && currentRole !== 'owner';
    const canChangeRole = !isSelf && !protectedOwner;
    const canChangeAccount = !isSelf && !protectedOwner;
    const canDelete = !isSelf && !protectedOwner;
    const canEdit = !protectedOwner;
    const canReset = !protectedOwner;
    const initials = this.getInitials(user.name);
    const photoKey = this.getPhotoKey(user);
    const cachedPhoto = this.photoCache.get(user.id);
    const cachedUrl = cachedPhoto?.key === photoKey ? cachedPhoto.objectUrl : '';
    const presenceLabel = this.translatePresence(user.presenceStatus);

    return `
      <article class="admin-user-row ${protectedOwner ? 'is-protected' : ''}" data-user-id="${user.id}">
        <div class="user-identity">
          <div class="user-avatar-wrap" title="${this.escapeAttribute(presenceLabel)}">
            <span class="user-avatar-fallback" aria-hidden="true">${this.escapeHTML(initials)}</span>
            <img
              class="user-avatar"
              alt="Foto de ${this.escapeAttribute(user.name)}"
              ${cachedUrl ? `src="${this.escapeAttribute(cachedUrl)}"` : 'hidden'}
              ${user.photoUrl ? `data-photo-url="${this.escapeAttribute(user.photoUrl)}" data-photo-key="${this.escapeAttribute(photoKey)}"` : ''}
            />
            <span class="presence-dot ${user.presenceStatus}" aria-label="${this.escapeAttribute(presenceLabel)}"></span>
          </div>
          <div class="user-primary">
            <div class="user-name-line">
              <strong>${this.escapeHTML(user.name)}</strong>
              ${isSelf ? '<span class="user-self-badge">Tú</span>' : ''}
            </div>
            <span>${this.escapeHTML(user.email || user.username || 'Sin correo')}</span>
            <div class="user-presence-copy">
              <b>${this.escapeHTML(presenceLabel)}</b>
              <span>·</span>
              <span>${this.escapeHTML(this.formatLastSeen(user.lastSeenAt, user.presenceStatus))}</span>
            </div>
          </div>
        </div>

        <div class="user-control user-role-control">
          <select data-action="change-role" aria-label="Rol de ${this.escapeAttribute(user.name)}" ${canChangeRole ? '' : 'disabled'}>
            ${this.roleOptions(user.role)}
          </select>
          <small>${protectedOwner ? 'Cuenta protegida' : isSelf ? 'Tu rol actual' : 'Permisos del usuario'}</small>
        </div>

        <div class="user-control user-account-control">
          <select data-action="change-account" aria-label="Estado de cuenta de ${this.escapeAttribute(user.name)}" ${canChangeAccount ? '' : 'disabled'}>
            ${this.accountOptions(user.accountStatus)}
          </select>
          <small class="account-status-copy ${user.accountStatus}">${this.escapeHTML(this.translateAccountStatus(user.accountStatus))}</small>
        </div>

        <div class="user-keys">
          <span class="key-count-badge">${user.keysCount} ${user.keysCount === 1 ? 'llave' : 'llaves'}</span>
          ${user.hasActiveKey ? '<span class="active-key-badge">Activa</span>' : ''}
        </div>

        <div class="user-actions">
          <button
            class="user-action-button icon-only"
            type="button"
            data-action="edit"
            ${canEdit ? '' : 'disabled'}
            title="Editar usuario"
            aria-label="Editar a ${this.escapeAttribute(user.name)}"
          >
            <svg class="user-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m4 20 4.1-.9L19 8.2a2.3 2.3 0 0 0-3.2-3.2L4.9 15.9 4 20Z" />
              <path d="m14.8 6 3.2 3.2M4.9 15.9l3.2 3.2" />
            </svg>
          </button>
          <button
            class="user-action-button icon-only"
            type="button"
            data-action="reset-password"
            ${canReset ? '' : 'disabled'}
            title="Restablecer contraseña"
            aria-label="Restablecer contraseña de ${this.escapeAttribute(user.name)}"
          >
            <svg class="user-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10m-10 0h11a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10Z" />
              <path d="M12 14v2.5" />
            </svg>
          </button>
          <button
            class="user-action-button icon-only danger"
            type="button"
            data-action="delete"
            ${canDelete ? '' : 'disabled'}
            title="Eliminar usuario"
            aria-label="Eliminar a ${this.escapeAttribute(user.name)}"
          >
            <svg class="user-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
            </svg>
          </button>
        </div>
      </article>
    `;
  }

  roleOptions(selectedRole) {
    const canGrantOwner = this.adminPanel.currentRole === 'owner';
    return [
      ['user', 'Usuario'],
      ['admin', 'Administrador'],
      ['owner', 'Propietario']
    ].map(([value, label]) => {
      const disabled = value === 'owner' && !canGrantOwner && selectedRole !== 'owner';
      return `<option value="${value}" ${selectedRole === value ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${label}</option>`;
    }).join('');
  }

  accountOptions(selectedStatus) {
    return [
      ['active', 'Activa'],
      ['inactive', 'Inactiva'],
      ['suspended', 'Suspendida'],
      ['pending', 'Pendiente']
    ].map(([value, label]) => (
      `<option value="${value}" ${selectedStatus === value ? 'selected' : ''}>${label}</option>`
    )).join('');
  }

  handleListChange(event) {
    const control = event.target.closest('select[data-action]');
    if (!control) return;
    const row = control.closest('[data-user-id]');
    const user = this.findUser(row?.dataset.userId);
    if (!user) return;

    if (control.dataset.action === 'change-role') {
      this.changeUserRole(user, control.value, control);
    } else if (control.dataset.action === 'change-account') {
      this.changeAccountStatus(user, control.value, control);
    }
  }

  handleListClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton || actionButton.disabled) return;

    const action = actionButton.dataset.action;
    if (action === 'retry') {
      this.loadUsers();
      return;
    }
    if (action === 'clear-filters') {
      this.clearFilters();
      return;
    }

    const row = actionButton.closest('[data-user-id]');
    const user = this.findUser(row?.dataset.userId);
    if (!user) return;

    if (action === 'edit') this.openEditDialog(user);
    if (action === 'delete') this.confirmDelete(user);
    if (action === 'reset-password') this.confirmPasswordReset(user);
  }

  clearFilters() {
    const search = document.getElementById('userSearch');
    const role = document.getElementById('userRoleFilter');
    const presence = document.getElementById('userPresenceFilter');
    const account = document.getElementById('userAccountFilter');
    if (search) search.value = '';
    if (role) role.value = 'all';
    if (presence) presence.value = 'all';
    if (account) account.value = 'all';
    this.applyFilters();
  }

  findUser(userId) {
    return this.users.find((user) => Number(user.id) === Number(userId));
  }

  async changeUserRole(user, newRole, control) {
    const previousRole = user.role;
    if (newRole === previousRole) return;
    control.disabled = true;

    try {
      const response = await fetch(`${this.adminPanel.apiBase}/users/${user.id}/role`, {
        method: 'PUT',
        headers: this.authHeaders,
        body: JSON.stringify({ role: newRole })
      });
      if (!response.ok) throw new Error(await this.readError(response, 'No se pudo cambiar el rol'));
      user.role = this.normalizeRole(newRole);
      this.updateMetrics();
      this.adminPanel.showNotification('Rol actualizado correctamente', 'success');
    } catch (error) {
      control.value = previousRole;
      this.adminPanel.showNotification(error.message, 'error');
    } finally {
      control.disabled = false;
    }
  }

  async changeAccountStatus(user, newStatus, control) {
    const previousStatus = user.accountStatus;
    if (newStatus === previousStatus) return;
    control.disabled = true;

    try {
      const response = await fetch(`${this.adminPanel.apiBase}/users/${user.id}/status`, {
        method: 'PUT',
        headers: this.authHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error(await this.readError(response, 'No se pudo cambiar el estado de la cuenta'));
      user.accountStatus = this.normalizeAccountStatus(newStatus);
      this.adminPanel.showNotification('Estado de cuenta actualizado', 'success');
      this.applyFilters();
    } catch (error) {
      control.value = previousStatus;
      this.adminPanel.showNotification(error.message, 'error');
    } finally {
      control.disabled = false;
    }
  }

  openCreateDialog() {
    this.editorMode = 'create';
    this.editingUserId = null;
    const form = document.getElementById('userEditorForm');
    form?.reset();

    document.getElementById('userEditorEyebrow').textContent = 'Nueva cuenta';
    document.getElementById('userEditorTitle').textContent = 'Agregar usuario';
    document.getElementById('saveUserBtn').textContent = 'Crear usuario';
    document.getElementById('editorPasswordField').hidden = false;
    const password = document.getElementById('editorUserPassword');
    if (password) password.required = true;

    const role = document.getElementById('editorUserRole');
    if (role) {
      role.disabled = false;
      role.value = 'user';
      role.querySelector('option[value="owner"]')?.toggleAttribute('disabled', this.adminPanel.currentRole !== 'owner');
    }

    document.getElementById('editorRoleHelp').textContent = 'Los permisos se aplican inmediatamente.';
    this.openDialog('userEditorDialog');
    setTimeout(() => document.getElementById('editorUserName')?.focus(), 0);
  }

  openEditDialog(user) {
    this.editorMode = 'edit';
    this.editingUserId = user.id;
    const isSelf = Number(user.id) === Number(this.adminPanel.currentUser?.id);
    const role = document.getElementById('editorUserRole');

    document.getElementById('userEditorEyebrow').textContent = 'Datos de cuenta';
    document.getElementById('userEditorTitle').textContent = 'Editar usuario';
    document.getElementById('saveUserBtn').textContent = 'Guardar cambios';
    document.getElementById('editorUserName').value = user.name;
    document.getElementById('editorUserEmail').value = user.email;
    document.getElementById('editorPasswordField').hidden = true;
    const password = document.getElementById('editorUserPassword');
    if (password) {
      password.required = false;
      password.value = '';
    }

    if (role) {
      role.value = user.role;
      role.disabled = isSelf;
      role.querySelector('option[value="owner"]')?.toggleAttribute(
        'disabled',
        this.adminPanel.currentRole !== 'owner' && user.role !== 'owner'
      );
    }

    document.getElementById('editorRoleHelp').textContent = isSelf
      ? 'Por seguridad no puedes cambiar tu propio rol.'
      : 'Los permisos se aplican inmediatamente.';
    this.openDialog('userEditorDialog');
  }

  async handleEditorSubmit(event) {
    event.preventDefault();
    if (this.submitInProgress) return;

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const currentUser = this.findUser(this.editingUserId);
    const payload = {
      name: document.getElementById('editorUserName').value.trim(),
      email: document.getElementById('editorUserEmail').value.trim(),
      role: document.getElementById('editorUserRole').disabled
        ? currentUser?.role || 'user'
        : document.getElementById('editorUserRole').value
    };

    if (this.editorMode === 'create') {
      payload.password = document.getElementById('editorUserPassword').value;
    }

    this.submitInProgress = true;
    const saveButton = document.getElementById('saveUserBtn');
    saveButton.disabled = true;
    this.adminPanel.showLoading(this.editorMode === 'create' ? 'Creando usuario…' : 'Guardando cambios…');

    try {
      const url = this.editorMode === 'create'
        ? `${this.adminPanel.apiBase}/users`
        : `${this.adminPanel.apiBase}/users/${this.editingUserId}`;
      const response = await fetch(url, {
        method: this.editorMode === 'create' ? 'POST' : 'PUT',
        headers: this.authHeaders,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await this.readError(
          response,
          this.editorMode === 'create' ? 'No se pudo crear el usuario' : 'No se pudo actualizar el usuario'
        ));
      }

      this.closeDialog('userEditorDialog');
      await this.loadUsers({ silent: true });
      this.adminPanel.showNotification(
        this.editorMode === 'create' ? 'Usuario creado correctamente' : 'Usuario actualizado correctamente',
        'success'
      );
    } catch (error) {
      this.adminPanel.showNotification(error.message, 'error');
    } finally {
      this.submitInProgress = false;
      saveButton.disabled = false;
      this.adminPanel.hideLoading();
    }
  }

  confirmDelete(user) {
    this.openConfirmation({
      title: 'Eliminar usuario',
      message: `Se eliminará la cuenta de ${user.name} y sus datos asociados. Esta acción no se puede deshacer.`,
      actionLabel: 'Eliminar usuario',
      callback: () => this.deleteUser(user)
    });
  }

  async deleteUser(user) {
    this.adminPanel.showLoading('Eliminando usuario…');
    try {
      const response = await fetch(`${this.adminPanel.apiBase}/users/${user.id}`, {
        method: 'DELETE',
        headers: this.authHeaders
      });
      if (!response.ok) throw new Error(await this.readError(response, 'No se pudo eliminar el usuario'));

      this.users = this.users.filter((item) => Number(item.id) !== Number(user.id));
      this.releasePhoto(user.id);
      this.updateMetrics();
      this.applyFilters();
      this.adminPanel.showNotification('Usuario eliminado correctamente', 'success');
    } catch (error) {
      this.adminPanel.showNotification(error.message, 'error');
    } finally {
      this.adminPanel.hideLoading();
    }
  }

  confirmPasswordReset(user) {
    this.openConfirmation({
      title: 'Restablecer contraseña',
      message: `Se generará una contraseña temporal para ${user.name}. Su sesión actual dejará de ser válida.`,
      actionLabel: 'Generar contraseña',
      callback: () => this.resetUserPassword(user)
    });
  }

  async resetUserPassword(user) {
    this.adminPanel.showLoading('Generando contraseña temporal…');
    try {
      const response = await fetch(`${this.adminPanel.apiBase}/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: this.authHeaders
      });
      if (!response.ok) throw new Error(await this.readError(response, 'No se pudo restablecer la contraseña'));

      const result = await response.json();
      document.getElementById('temporaryPasswordValue').value = result.temporaryPassword || '';
      this.openDialog('temporaryPasswordDialog');
      this.adminPanel.showNotification('Contraseña temporal generada', 'success');
    } catch (error) {
      this.adminPanel.showNotification(error.message, 'error');
    } finally {
      this.adminPanel.hideLoading();
    }
  }

  openConfirmation({ title, message, actionLabel, callback }) {
    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').textContent = message;
    document.getElementById('confirmDialogAction').textContent = actionLabel;
    this.confirmCallback = callback;
    this.openDialog('confirmDialog');
  }

  openDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (dialogId === 'confirmDialog') this.confirmCallback = null;
  }

  async copyTemporaryPassword() {
    const input = document.getElementById('temporaryPasswordValue');
    const value = input?.value || '';
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.adminPanel.showNotification('Contraseña copiada', 'success');
    } catch {
      input.select();
      document.execCommand('copy');
      this.adminPanel.showNotification('Contraseña copiada', 'success');
    }
  }

  startPresenceRefresh() {
    if (this.presenceTimer) return;
    this.presenceTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && this.adminPanel.currentTab === 'gestion-usuarios') {
        this.loadUsers({ silent: true });
      }
    }, 45000);
  }

  async refreshCurrentUserPresence() {
    const now = Date.now();
    if (now - this.lastPresenceHeartbeatAt < 30000) return;

    const sessionToken = localStorage.getItem('token');
    if (!sessionToken || !this.sessionTokenBelongsToCurrentUser(sessionToken)) return;

    this.lastPresenceHeartbeatAt = now;
    try {
      const response = await fetch('/api/profile/heartbeat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        cache: 'no-store'
      });
      if (!response.ok) this.lastPresenceHeartbeatAt = 0;
    } catch {
      this.lastPresenceHeartbeatAt = 0;
    }
  }

  sessionTokenBelongsToCurrentUser(token) {
    try {
      const encodedPayload = String(token).split('.')[1];
      if (!encodedPayload) return false;
      const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
      const payload = JSON.parse(window.atob(normalized + padding));
      return Number(payload.id) === Number(this.adminPanel.currentUser?.id);
    } catch {
      return false;
    }
  }

  async loadAuthenticatedPhotos() {
    const images = [...document.querySelectorAll('#usersList img[data-photo-url]')];
    await Promise.allSettled(images.map((image) => this.loadAuthenticatedPhoto(image)));
  }

  async loadAuthenticatedPhoto(image) {
    const row = image.closest('[data-user-id]');
    const userId = Number(row?.dataset.userId);
    const photoUrl = image.dataset.photoUrl;
    const photoKey = image.dataset.photoKey;
    if (!userId || !photoUrl || !photoKey) return;

    const cached = this.photoCache.get(userId);
    if (cached?.key === photoKey) {
      image.src = cached.objectUrl;
      image.hidden = false;
      return;
    }

    try {
      const objectUrl = await this.fetchPhotoObjectUrl(photoUrl);
      const previous = this.photoCache.get(userId);
      if (previous?.objectUrl) URL.revokeObjectURL(previous.objectUrl);
      this.photoCache.set(userId, { key: photoKey, objectUrl });
      image.addEventListener('error', () => { image.hidden = true; }, { once: true });
      image.src = objectUrl;
      image.hidden = false;
    } catch (error) {
      image.hidden = true;
      console.warn(`No se pudo cargar la foto del usuario ${userId}:`, error.message);
    }
  }

  async fetchPhotoObjectUrl(photoUrl, depth = 0) {
    if (depth > 1) throw new Error('Respuesta de foto inválida');
    const url = new URL(photoUrl, window.location.origin);
    if (url.origin !== window.location.origin) throw new Error('Origen de foto no permitido');

    const response = await fetch(url.pathname + url.search, {
      headers: { Authorization: `Bearer ${this.adminPanel.getAdminToken()}` },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Foto no disponible (${response.status})`);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      const nestedUrl = payload.photoUrl || payload.photoPath;
      if (!nestedUrl) throw new Error('El usuario no tiene foto');
      return this.fetchPhotoObjectUrl(nestedUrl, depth + 1);
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('El archivo recibido no es una imagen');
    return URL.createObjectURL(blob);
  }

  getPhotoKey(user) {
    return `${user.photoUrl}|${user.photoVersion}`;
  }

  prunePhotoCache() {
    const ids = new Set(this.users.map((user) => Number(user.id)));
    for (const userId of this.photoCache.keys()) {
      if (!ids.has(Number(userId))) this.releasePhoto(userId);
    }
  }

  releasePhoto(userId) {
    const cached = this.photoCache.get(Number(userId));
    if (cached?.objectUrl) URL.revokeObjectURL(cached.objectUrl);
    this.photoCache.delete(Number(userId));
  }

  dispose() {
    if (this.presenceTimer) window.clearInterval(this.presenceTimer);
    for (const cached of this.photoCache.values()) {
      if (cached.objectUrl) URL.revokeObjectURL(cached.objectUrl);
    }
    this.photoCache.clear();
  }

  getInitials(name) {
    return String(name || 'U')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U';
  }

  translatePresence(status) {
    return {
      online: 'En línea',
      away: 'Ausente',
      busy: 'Ocupado',
      offline: 'Desconectado'
    }[status] || 'Desconectado';
  }

  translateAccountStatus(status) {
    return {
      active: 'Acceso habilitado',
      inactive: 'Acceso inhabilitado',
      suspended: 'Cuenta suspendida',
      pending: 'Activación pendiente'
    }[status] || 'Estado desconocido';
  }

  formatLastSeen(value, presenceStatus) {
    if (presenceStatus === 'online') return 'Activo ahora';
    if (!value) return 'Sin actividad reciente';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin actividad reciente';

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} d`;
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  async readError(response, fallback) {
    try {
      const body = await response.json();
      return body.message || body.error || fallback;
    } catch {
      return fallback;
    }
  }

  escapeHTML(value) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
  }

  escapeAttribute(value) {
    return this.escapeHTML(value).replace(/`/g, '&#96;');
  }
}

window.UserManagement = UserManagement;
