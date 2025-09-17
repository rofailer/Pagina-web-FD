/* ========================================
   GESTIÓN AVANZADA DE USUARIOS - MÓDULO ADMINISTRATIVO
   ======================================== */

class UserManagement {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.users = [];
        this.roles = ['owner', 'admin', 'user'];
        this.currentEditUser = null;

        this.init();
    }

    // Helper para obtener headers de autenticación
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    init() {
        this.setupAdvancedEventListeners();
        this.loadUserRoles();
    }

    setupAdvancedEventListeners() {
        // Búsqueda de usuarios
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // Filtros por rol
        const roleFilters = document.querySelectorAll('.role-filter');
        roleFilters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.applyFilters();
            });
        });

        // Acciones en masa
        const bulkActions = document.getElementById('bulkUserActions');
        if (bulkActions) {
            bulkActions.addEventListener('change', (e) => {
                this.handleBulkAction(e.target.value);
            });
        }

        // Selección múltiple
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('user-checkbox')) {
                this.updateBulkActions();
            }
        });
    }

    async loadUserRoles() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No hay token disponible para cargar roles');
                return;
            }

            const response = await fetch(`${this.adminPanel.apiBase}/user-roles`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.renderRoleFilters(data.data);
                } else {
                    console.error('Respuesta inválida del servidor:', data);
                }
            } else {
                console.error('Error en la respuesta:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error cargando roles:', error);
        }
    }

    renderRoleFilters(roles) {
        const container = document.getElementById('roleFiltersContainer');
        if (!container) return;

        const filtersHTML = roles.map(role => `
            <label class="filter-checkbox">
                <input type="checkbox" class="role-filter" value="${role.id}" checked>
                <span class="checkmark"></span>
                ${role.name} (${role.count})
            </label>
        `).join('');

        container.innerHTML = filtersHTML;
    }

    filterUsers(searchTerm) {
        const filteredUsers = this.users.filter(user => {
            const matchesSearch = !searchTerm ||
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch;
        });

        this.renderFilteredUsers(filteredUsers);
    }

    applyFilters() {
        const selectedRoles = Array.from(document.querySelectorAll('.role-filter:checked'))
            .map(checkbox => checkbox.value);

        const searchTerm = document.getElementById('userSearch')?.value || '';

        const filteredUsers = this.users.filter(user => {
            const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(user.role);
            const matchesSearch = !searchTerm ||
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesRole && matchesSearch;
        });

        this.renderFilteredUsers(filteredUsers);
    }

    renderFilteredUsers(users) {
        const container = document.getElementById('usersList');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = `
                <div class="admin-alert info">
                    <div class="admin-alert-content">
                        <h4>No se encontraron usuarios</h4>
                        <p>Ajusta los filtros o términos de búsqueda.</p>
                    </div>
                </div>
            `;
            return;
        }

        const usersHTML = users.map(user => `
            <div class="admin-user-row ${user.status}" data-user-id="${user.id}">
                <div class="user-select">
                    <input type="checkbox" class="user-checkbox" value="${user.id}">
                </div>
                <div class="user-info">
                    <div class="user-avatar" style="background: ${this.getUserColor(user.id)}">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                        <h4>${user.name}</h4>
                        <span>${user.email}</span>
                        <div class="user-meta">
                            <span class="user-last-login">Último acceso: ${this.formatDate(user.lastLogin)}</span>
                            <span class="user-created">Creado: ${this.formatDate(user.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="user-role ${user.role}">
                    <select class="role-selector" data-user-id="${user.id}">
                        ${this.roles.map(role => `
                            <option value="${role}" ${user.role === role ? 'selected' : ''}>
                                ${this.adminPanel.translateRole(role)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="user-status">
                    <div class="admin-switch">
                        <input type="checkbox" ${user.status === 'active' ? 'checked' : ''} 
                               data-user-id="${user.id}" data-action="toggle-status">
                        <span class="admin-switch-slider"></span>
                    </div>
                    <span class="${user.status}">${this.adminPanel.translateStatus(user.status)}</span>
                </div>
                <div class="user-stats">
                    <div class="stat-item">
                        <span class="stat-value">${user.signaturesCount || 0}</span>
                        <span class="stat-label">Firmas</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${user.keysCount || 0}</span>
                        <span class="stat-label">Llaves</span>
                    </div>
                </div>
                <div class="user-actions">
                    <div class="action-dropdown">
                        <button class="action-toggle" data-user-id="${user.id}">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                            </svg>
                        </button>
                        <div class="action-menu" id="userActions_${user.id}">
                            <button class="action-item" data-action="edit" data-user-id="${user.id}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Editar
                            </button>
                            <button class="action-item" data-action="reset-password" data-user-id="${user.id}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2h-3m-7 0h3m0 0V9a2 2 0 012-2m0 0a2 2 0 012-2m-2 2H9a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2z"></path>
                                </svg>
                                Resetear Contraseña
                            </button>
                            <button class="action-item" data-action="view-activity" data-user-id="${user.id}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                                Ver Actividad
                            </button>
                            <hr class="action-separator">
                            <button class="action-item danger" data-action="delete" data-user-id="${user.id}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="admin-user-header">
                <div class="select-all">
                    <input type="checkbox" id="selectAllUsers">
                </div>
                <span>Usuario</span>
                <span>Rol</span>
                <span>Estado</span>
                <span>Estadísticas</span>
                <span>Acciones</span>
            </div>
            ${usersHTML}
        `;

        this.setupUserRowEvents();
    }

    setupUserRowEvents() {
        const container = document.getElementById('usersList');
        if (!container) return;

        // Usar event delegation para mejor rendimiento y evitar problemas con elementos recreados
        container.addEventListener('change', (e) => {
            // Cambio de rol
            if (e.target.classList.contains('role-selector')) {
                this.changeUserRole(e.target.dataset.userId, e.target.value);
            }

            // Toggle de estado
            if (e.target.hasAttribute('data-action') && e.target.getAttribute('data-action') === 'toggle-status') {
                this.toggleUserStatus(e.target.dataset.userId, e.target.checked);
            }

            // Selección múltiple
            if (e.target.classList.contains('user-checkbox')) {
                this.updateBulkActions();
            }
        });

        container.addEventListener('click', (e) => {
            // Menús de acciones
            if (e.target.closest('.action-toggle')) {
                const toggle = e.target.closest('.action-toggle');
                e.stopPropagation();
                this.toggleActionMenu(toggle.dataset.userId);
            }

            // Acciones específicas
            if (e.target.closest('.action-item')) {
                const item = e.target.closest('.action-item');
                const action = item.dataset.action;
                const userId = item.dataset.userId;
                this.handleUserAction(action, userId);
            }
        });

        // Seleccionar todos (fuera del contenedor de usuarios)
        const selectAll = document.getElementById('selectAllUsers');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', () => {
            document.querySelectorAll('.action-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        });
    }

    toggleActionMenu(userId) {
        const menu = document.getElementById(`userActions_${userId}`);
        if (menu) {
            const isVisible = menu.style.display === 'block';

            // Cerrar todos los menús
            document.querySelectorAll('.action-menu').forEach(m => {
                m.style.display = 'none';
            });

            // Mostrar/ocultar el menú actual
            menu.style.display = isVisible ? 'none' : 'block';
        }
    }

    async handleUserAction(action, userId) {
        switch (action) {
            case 'edit':
                await this.editUser(userId);
                break;
            case 'reset-password':
                await this.resetUserPassword(userId);
                break;
            case 'view-activity':
                await this.viewUserActivity(userId);
                break;
            case 'delete':
                await this.deleteUser(userId);
                break;
        }
    }

    async editUser(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            this.currentEditUser = user;

            const modalHTML = `
                <div class="admin-modal" id="editUserModal">
                    <div class="admin-modal-content">
                        <div class="admin-modal-header">
                            <h3>Editar Usuario</h3>
                            <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">×</button>
                        </div>
                        <div class="admin-modal-body">
                            <form id="editUserForm" class="admin-form">
                                <div class="admin-form-grid">
                                    <div class="admin-form-group">
                                        <label for="editUserName">Nombre Completo</label>
                                        <input type="text" id="editUserName" name="name" class="admin-input" 
                                               value="${user.name}" required>
                                    </div>
                                    <div class="admin-form-group">
                                        <label for="editUserEmail">Correo Electrónico</label>
                                        <input type="email" id="editUserEmail" name="email" class="admin-input" 
                                               value="${user.email}" required>
                                    </div>
                                    <div class="admin-form-group">
                                        <label for="editUserRole">Rol</label>
                                        <select id="editUserRole" name="role" class="admin-select" required>
                                            ${this.roles.map(role => `
                                                <option value="${role}" ${user.role === role ? 'selected' : ''}>
                                                    ${this.adminPanel.translateRole(role)}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    <div class="admin-form-group">
                                        <label for="editUserPhone">Teléfono</label>
                                        <input type="tel" id="editUserPhone" name="phone" class="admin-input" 
                                               value="${user.phone || ''}">
                                    </div>
                                    <div class="admin-form-group full-width">
                                        <label for="editUserNotes">Notas</label>
                                        <textarea id="editUserNotes" name="notes" class="admin-textarea" 
                                                  rows="3" placeholder="Notas adicionales sobre el usuario">${user.notes || ''}</textarea>
                                    </div>
                                </div>
                                <div class="user-permissions">
                                    <h4>Permisos Especiales</h4>
                                    <div class="permission-grid">
                                        <label class="permission-item">
                                            <input type="checkbox" name="permissions[]" value="manage_users" 
                                                   ${user.permissions?.includes('manage_users') ? 'checked' : ''}>
                                            <span>Gestionar Usuarios</span>
                                        </label>
                                        <label class="permission-item">
                                            <input type="checkbox" name="permissions[]" value="manage_themes" 
                                                   ${user.permissions?.includes('manage_themes') ? 'checked' : ''}>
                                            <span>Gestionar Temas</span>
                                        </label>
                                        <label class="permission-item">
                                            <input type="checkbox" name="permissions[]" value="manage_pdf" 
                                                   ${user.permissions?.includes('manage_pdf') ? 'checked' : ''}>
                                            <span>Configurar PDF</span>
                                        </label>
                                        <label class="permission-item">
                                            <input type="checkbox" name="permissions[]" value="view_logs" 
                                                   ${user.permissions?.includes('view_logs') ? 'checked' : ''}>
                                            <span>Ver Logs del Sistema</span>
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="admin-modal-footer">
                            <button type="button" class="admin-btn secondary" onclick="this.closest('.admin-modal').remove()">Cancelar</button>
                            <button type="button" class="admin-btn primary" onclick="adminPanel.userManagement.updateUser()">Actualizar Usuario</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        } catch (error) {
            console.error('Error abriendo editor de usuario:', error);
            this.adminPanel.showNotification('Error al cargar datos del usuario', 'error');
        }
    }

    async updateUser() {
        try {
            if (!this.currentEditUser) return;

            const form = document.getElementById('editUserForm');
            const formData = new FormData(form);
            const userData = Object.fromEntries(formData.entries());

            // Obtener permisos seleccionados
            const permissions = Array.from(form.querySelectorAll('input[name="permissions[]"]:checked'))
                .map(checkbox => checkbox.value);
            userData.permissions = permissions;

            const response = await fetch(`${this.adminPanel.apiBase}/users/${this.currentEditUser.id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const updatedUser = await response.json();

                // Actualizar usuario en la lista local
                const index = this.users.findIndex(u => u.id === this.currentEditUser.id);
                if (index !== -1) {
                    this.users[index] = updatedUser;
                }

                this.applyFilters(); // Re-renderizar la lista
                this.adminPanel.updateMetrics();

                document.getElementById('editUserModal').remove();
                this.adminPanel.showNotification('Usuario actualizado correctamente', 'success');

                this.currentEditUser = null;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error al actualizar usuario');
            }
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            this.adminPanel.showNotification(error.message || 'Error al actualizar usuario', 'error');
        }
    }

    async resetUserPassword(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            const confirmed = confirm(`¿Estás seguro de que quieres resetear la contraseña de ${user.name}?`);
            if (!confirmed) return;

            this.adminPanel.showLoading('Reseteando contraseña...');

            const response = await fetch(`${this.adminPanel.apiBase}/users/${userId}/reset-password`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();

                // Mostrar nueva contraseña temporal
                const modalHTML = `
                    <div class="admin-modal" id="passwordResetModal">
                        <div class="admin-modal-content">
                            <div class="admin-modal-header">
                                <h3>Contraseña Reseteada</h3>
                                <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">×</button>
                            </div>
                            <div class="admin-modal-body">
                                <div class="admin-alert success">
                                    <div class="admin-alert-content">
                                        <h4>Contraseña reseteada exitosamente</h4>
                                        <p>La nueva contraseña temporal para <strong>${user.name}</strong> es:</p>
                                    </div>
                                </div>
                                <div class="password-display">
                                    <input type="text" value="${result.temporaryPassword}" readonly class="admin-input" id="tempPassword">
                                    <button type="button" class="admin-btn secondary" onclick="navigator.clipboard.writeText(document.getElementById('tempPassword').value); this.textContent = 'Copiado!'">
                                        Copiar
                                    </button>
                                </div>
                                <p class="password-note">El usuario deberá cambiar esta contraseña en su próximo inicio de sesión.</p>
                            </div>
                            <div class="admin-modal-footer">
                                <button type="button" class="admin-btn primary" onclick="this.closest('.admin-modal').remove()">Entendido</button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', modalHTML);
                this.adminPanel.showNotification('Contraseña reseteada correctamente', 'success');
            } else {
                throw new Error('Error al resetear contraseña');
            }
        } catch (error) {
            console.error('Error reseteando contraseña:', error);
            this.adminPanel.showNotification('Error al resetear contraseña', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    async viewUserActivity(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            this.adminPanel.showLoading('Cargando actividad del usuario...');

            const response = await fetch(`${this.adminPanel.apiBase}/users/${userId}/activity`);
            if (response.ok) {
                const activity = await response.json();
                this.showUserActivityModal(user, activity);
            } else {
                throw new Error('Error al cargar actividad');
            }
        } catch (error) {
            console.error('Error cargando actividad:', error);
            this.adminPanel.showNotification('Error al cargar actividad del usuario', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    showUserActivityModal(user, activity) {
        const activityHTML = activity.map(item => `
            <div class="activity-item ${item.type}">
                <div class="activity-icon">
                    ${this.getActivityIcon(item.type)}
                </div>
                <div class="activity-content">
                    <h5>${item.action}</h5>
                    <p>${item.description}</p>
                    <span class="activity-time">${this.formatDate(item.timestamp)}</span>
                </div>
            </div>
        `).join('');

        const modalHTML = `
            <div class="admin-modal" id="userActivityModal">
                <div class="admin-modal-content" style="max-width: 600px;">
                    <div class="admin-modal-header">
                        <h3>Actividad de ${user.name}</h3>
                        <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">×</button>
                    </div>
                    <div class="admin-modal-body">
                        <div class="activity-timeline">
                            ${activityHTML || '<p class="text-center">No hay actividad registrada.</p>'}
                        </div>
                    </div>
                    <div class="admin-modal-footer">
                        <button type="button" class="admin-btn secondary" onclick="this.closest('.admin-modal').remove()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    getActivityIcon(type) {
        const icons = {
            'login': '🔑',
            'logout': '🚪',
            'sign': '✍️',
            'verify': '✅',
            'upload': '📁',
            'download': '📥',
            'settings': '⚙️',
            'error': '❌'
        };
        return icons[type] || '📝';
    }

    async changeUserRole(userId, newRole) {
        try {
            const response = await fetch(`${this.adminPanel.apiBase}/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                // Actualizar usuario local
                const user = this.users.find(u => u.id === userId);
                if (user) {
                    user.role = newRole;
                }

                this.adminPanel.showNotification('Rol actualizado correctamente', 'success');
            } else {
                throw new Error('Error al cambiar rol');
            }
        } catch (error) {
            console.error('Error cambiando rol:', error);
            this.adminPanel.showNotification('Error al cambiar rol del usuario', 'error');
        }
    }

    async toggleUserStatus(userId, isActive) {
        try {
            const status = isActive ? 'active' : 'inactive';

            const response = await fetch(`${this.adminPanel.apiBase}/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                // Actualizar usuario local
                const user = this.users.find(u => u.id === userId);
                if (user) {
                    user.status = status;
                }

                this.adminPanel.showNotification(
                    `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente`,
                    'success'
                );
            } else {
                throw new Error('Error al cambiar estado');
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            this.adminPanel.showNotification('Error al cambiar estado del usuario', 'error');
        }
    }

    async deleteUser(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.adminPanel.showNotification('Usuario no encontrado', 'error');
                return;
            }

            // Confirmación de eliminación
            const confirmed = confirm(`¿Estás seguro de que quieres eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`);
            if (!confirmed) return;

            this.adminPanel.showLoading('Eliminando usuario...');

            const response = await fetch(`${this.adminPanel.apiBase}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                // Remover usuario de la lista local
                this.users = this.users.filter(u => u.id !== userId);

                // Re-renderizar la lista
                this.applyFilters();

                this.adminPanel.showNotification('Usuario eliminado correctamente', 'success');
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
                throw new Error(errorData.message || 'Error al eliminar usuario');
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            this.adminPanel.showNotification(error.message || 'Error al eliminar usuario', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    async createUser(userData) {
        try {
            this.adminPanel.showLoading('Creando usuario...');

            const response = await fetch(`${this.adminPanel.apiBase}/users`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const newUser = await response.json();

                // Agregar usuario a la lista local
                this.users.push(newUser.user || newUser);

                // Re-renderizar la lista
                this.applyFilters();

                this.adminPanel.showNotification('Usuario creado correctamente', 'success');
                return newUser;
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
                throw new Error(errorData.message || 'Error al crear usuario');
            }
        } catch (error) {
            console.error('Error creando usuario:', error);
            this.adminPanel.showNotification(error.message || 'Error al crear usuario', 'error');
            throw error;
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    toggleSelectAll(checked) {
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBulkActions();
    }

    updateBulkActions() {
        const selectedUsers = document.querySelectorAll('.user-checkbox:checked');
        const bulkActions = document.getElementById('bulkUserActions');

        if (bulkActions) {
            bulkActions.style.display = selectedUsers.length > 0 ? 'block' : 'none';
        }
    }

    async handleBulkAction(action) {
        const selectedUserIds = Array.from(document.querySelectorAll('.user-checkbox:checked'))
            .map(checkbox => checkbox.value);

        if (selectedUserIds.length === 0) return;

        const confirmed = confirm(`¿Estás seguro de aplicar "${action}" a ${selectedUserIds.length} usuario(s)?`);
        if (!confirmed) return;

        try {
            this.adminPanel.showLoading(`Aplicando acción a ${selectedUserIds.length} usuarios...`);

            const response = await fetch(`${this.adminPanel.apiBase}/users/bulk-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    userIds: selectedUserIds
                })
            });

            if (response.ok) {
                await this.adminPanel.loadUsers(); // Recargar lista
                this.adminPanel.showNotification('Acción aplicada correctamente', 'success');
            } else {
                throw new Error('Error en acción masiva');
            }
        } catch (error) {
            console.error('Error en acción masiva:', error);
            this.adminPanel.showNotification('Error al aplicar acción masiva', 'error');
        } finally {
            this.adminPanel.hideLoading();
        }
    }

    getUserColor(userId) {
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ];
        return colors[userId % colors.length];
    }

    formatDate(dateString) {
        if (!dateString) return 'Nunca';

        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora mismo';
        if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;

        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Exportar para uso en el panel principal
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManagement;
}
