/* Herramientas administrativas de PDF aval y consulta segura de base de datos. */
(function initializeAdvancedAdminTools() {
  'use strict';

  const AVAL_VARIABLES = ['$autores', '$titulo', '$modalidad', '$avalador', '$fecha', '$institucion', '$ubicacion'];

  class AdvancedConfiguration {
    constructor(adminPanel) {
      this.adminPanel = adminPanel;
      this.pdfRoot = document.getElementById('pdfAdminTool');
      this.databaseRoot = document.getElementById('databaseAdminTool');
      this.pdfPreviewUrl = null;
      this.databaseState = { tableName: '', page: 1, totalPages: 1 };

      this.renderPdfTool();
      this.renderDatabaseTool();
      this.bindEvents();
      this.configurePermissions();
    }

    get token() {
      return this.adminPanel?.getAdminToken?.() || localStorage.getItem('admin_token') || '';
    }

    get isOwner() {
      return String(this.adminPanel?.currentRole || '').toLowerCase() === 'owner';
    }

    headers(json = false) {
      return {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${this.token}`,
        'Cache-Control': 'no-store'
      };
    }

    renderPdfTool() {
      if (!this.pdfRoot) return;
      this.pdfRoot.innerHTML = `
        <div class="pdf-admin-layout">
          <form class="admin-tool-card pdf-config-form" id="pdfConfigForm">
            <header class="admin-tool-heading">
              <div><span class="admin-eyebrow">Documento de aval</span><h2>Diseño y contenido del PDF</h2></div>
              <span class="admin-tool-badge">Persistente</span>
            </header>
            <p class="admin-tool-description">Personaliza la plantilla usada al generar los avales. El logo se toma de la identidad visual del sitio.</p>

            <div class="pdf-form-grid">
              <label class="admin-tool-field">Plantilla
                <select id="pdfSelectedTemplate">
                  <option value="clasico">Clásica</option><option value="moderno">Moderna</option>
                  <option value="minimalista">Minimalista</option><option value="elegante">Elegante</option>
                </select>
              </label>
              <label class="admin-tool-field">Fuente del título
                <select id="pdfTitleFont"><option>Helvetica-Bold</option><option>Times-Bold</option><option>Courier-Bold</option></select>
              </label>
              <label class="admin-tool-field">Fuente del texto
                <select id="pdfBodyFont"><option>Helvetica</option><option>Times-Roman</option><option>Courier</option></select>
              </label>
              <label class="admin-tool-field">Estilo del borde
                <select id="pdfBorderStyle"><option value="classic">Clásico</option><option value="solid">Sólido</option><option value="double">Doble</option><option value="minimal">Mínimo</option><option value="none">Sin borde</option></select>
              </label>
            </div>

            <fieldset class="pdf-fieldset"><legend>Colores</legend><div class="pdf-color-grid">
              <label>Principal <input id="pdfPrimaryColor" type="color" value="#2563eb"></label>
              <label>Secundario <input id="pdfSecondaryColor" type="color" value="#64748b"></label>
              <label>Texto <input id="pdfTextColor" type="color" value="#1f2937"></label>
              <label>Borde <input id="pdfBorderColor" type="color" value="#1f2937"></label>
            </div></fieldset>

            <fieldset class="pdf-fieldset"><legend>Medidas</legend><div class="pdf-form-grid pdf-number-grid">
              <label class="admin-tool-field">Título (pt)<input id="pdfTitleSize" type="number" min="14" max="48" value="24"></label>
              <label class="admin-tool-field">Texto (pt)<input id="pdfBodySize" type="number" min="8" max="24" value="12"></label>
              <label class="admin-tool-field">Margen superior<input id="pdfMarginTop" type="number" min="20" max="140" value="60"></label>
              <label class="admin-tool-field">Margen inferior<input id="pdfMarginBottom" type="number" min="20" max="140" value="60"></label>
              <label class="admin-tool-field">Margen izquierdo<input id="pdfMarginLeft" type="number" min="20" max="140" value="50"></label>
              <label class="admin-tool-field">Margen derecho<input id="pdfMarginRight" type="number" min="20" max="140" value="50"></label>
            </div></fieldset>

            <fieldset class="pdf-fieldset"><legend>Elementos visibles</legend><div class="pdf-toggle-grid">
              ${['Logo', 'Institución', 'Fecha', 'Firma', 'Autores', 'Avalador'].map((label, index) => `<label><input id="pdfShow${['Logo', 'Institution', 'Date', 'Signature', 'Authors', 'Avalador'][index]}" type="checkbox" checked> ${label}</label>`).join('')}
            </div></fieldset>

            <label class="admin-tool-field pdf-aval-field">Texto del aval
              <textarea id="pdfAvalText" rows="7" maxlength="4000" placeholder="Escribe el concepto que aparecerá en el PDF"></textarea>
            </label>
            <div class="pdf-variable-list" aria-label="Variables disponibles">${AVAL_VARIABLES.map(variable => `<button type="button" data-pdf-variable="${variable}">${variable}</button>`).join('')}</div>

            <footer class="admin-tool-actions">
              <button class="admin-btn admin-btn-secondary" id="previewPdfConfigBtn" type="button">Vista previa</button>
              <button class="admin-btn admin-btn-primary" id="savePdfConfigBtn" type="submit">Guardar PDF aval</button>
            </footer>
          </form>
          <aside class="admin-tool-card pdf-preview-card">
            <header class="admin-tool-heading">
              <div><span class="admin-eyebrow">Previsualización</span><h2>Resultado del PDF</h2></div>
              <a class="admin-btn admin-btn-secondary pdf-preview-open" id="pdfPreviewOpen" href="#" target="_blank" rel="noopener" hidden>Abrir en grande</a>
            </header>
            <div class="pdf-preview-empty" id="pdfPreviewEmpty">Genera una vista previa para revisar el resultado antes de guardar.</div>
            <iframe id="pdfPreviewFrame" title="Vista previa del PDF aval" hidden></iframe>
          </aside>
        </div>`;
    }

    renderDatabaseTool() {
      if (!this.databaseRoot) return;
      this.databaseRoot.innerHTML = `
        <div class="database-admin-layout">
          <section class="admin-tool-card database-summary-card">
            <header class="admin-tool-heading"><div><span class="admin-eyebrow">Estado del servicio</span><h2>Base de datos</h2></div><span id="databaseStatusBadge" class="admin-tool-badge neutral">Comprobando</span></header>
            <div id="databaseStats" class="database-stats" aria-live="polite"></div>
            <div class="admin-tool-actions">
              <button class="admin-btn admin-btn-secondary" id="refreshDatabaseBtn" type="button">Actualizar</button>
              <button class="admin-btn admin-btn-primary" id="downloadDatabaseBackupBtn" type="button">Descargar copia SQL</button>
            </div>
            <p class="database-security-note">La consulta es de solo lectura. Contraseñas, llaves privadas, tokens, fotos y datos criptográficos se muestran protegidos.</p>
          </section>
          <section class="admin-tool-card database-browser-card">
            <header class="admin-tool-heading"><div><span class="admin-eyebrow">Explorador seguro</span><h2>Tablas</h2></div><span id="databaseTableCount" class="admin-tool-badge neutral">0</span></header>
            <div class="database-browser-grid"><nav id="databaseTables" class="database-table-list" aria-label="Tablas de la base de datos"></nav><div id="databaseTableView" class="database-table-view"><div class="database-empty">Selecciona una tabla para consultar sus registros.</div></div></div>
          </section>
        </div>`;
    }

    bindEvents() {
      document.getElementById('pdfConfigForm')?.addEventListener('submit', event => this.savePdfConfiguration(event));
      document.getElementById('previewPdfConfigBtn')?.addEventListener('click', () => this.previewPdfConfiguration());
      document.querySelectorAll('[data-pdf-variable]').forEach(button => button.addEventListener('click', () => this.insertPdfVariable(button.dataset.pdfVariable)));
      document.getElementById('refreshDatabaseBtn')?.addEventListener('click', () => this.loadDatabaseOverview());
      document.getElementById('downloadDatabaseBackupBtn')?.addEventListener('click', () => this.downloadDatabaseBackup());
    }

    configurePermissions() {
      if (!this.isOwner) {
        const saveButton = document.getElementById('savePdfConfigBtn');
        if (saveButton) {
          saveButton.disabled = true;
          saveButton.textContent = 'Solo lectura para administradores';
        }
        const backupButton = document.getElementById('downloadDatabaseBackupBtn');
        if (backupButton) backupButton.hidden = true;
      }
    }

    async activate(toolName) {
      if (toolName === 'pdf-aval') await this.loadPdfConfiguration();
      if (toolName === 'base-datos') await this.loadDatabaseOverview();
    }

    async loadPdfConfiguration() {
      if (!this.pdfRoot || this.pdfRoot.dataset.loaded === 'true') return;
      try {
        const response = await fetch('/api/admin/pdf/config', { headers: this.headers(), cache: 'no-store' });
        if (!response.ok) throw await this.responseError(response, 'No se pudo cargar la configuración PDF');
        const payload = await response.json();
        this.populatePdfForm(payload.config || payload);
        this.pdfRoot.dataset.loaded = 'true';
      } catch (error) {
        this.notify(error.message, 'error');
      }
    }

    populatePdfForm(config = {}) {
      const setValue = (id, value) => { const element = document.getElementById(id); if (element && value !== undefined && value !== null) element.value = value; };
      const setChecked = (id, value) => { const element = document.getElementById(id); if (element) element.checked = value !== false; };
      setValue('pdfSelectedTemplate', config.selectedTemplate);
      setValue('pdfPrimaryColor', config.colorConfig?.primary);
      setValue('pdfSecondaryColor', config.colorConfig?.secondary);
      setValue('pdfTextColor', config.colorConfig?.text);
      setValue('pdfBorderColor', config.borderConfig?.color);
      setValue('pdfTitleFont', config.fontConfig?.title);
      setValue('pdfBodyFont', config.fontConfig?.body);
      setValue('pdfBorderStyle', config.borderConfig?.style);
      setValue('pdfTitleSize', config.layoutConfig?.titleSize);
      setValue('pdfBodySize', config.layoutConfig?.bodySize);
      setValue('pdfMarginTop', config.layoutConfig?.marginTop);
      setValue('pdfMarginBottom', config.layoutConfig?.marginBottom);
      setValue('pdfMarginLeft', config.layoutConfig?.marginLeft);
      setValue('pdfMarginRight', config.layoutConfig?.marginRight);
      setValue('pdfAvalText', config.avalTextConfig?.template || '');
      setChecked('pdfShowLogo', config.visualConfig?.showLogo);
      setChecked('pdfShowInstitution', config.visualConfig?.showInstitution);
      setChecked('pdfShowDate', config.visualConfig?.showDate);
      setChecked('pdfShowSignature', config.visualConfig?.showSignature);
      setChecked('pdfShowAuthors', config.visualConfig?.showAuthors);
      setChecked('pdfShowAvalador', config.visualConfig?.showAvalador);
    }

    collectPdfConfiguration() {
      const value = id => document.getElementById(id)?.value;
      const checked = id => document.getElementById(id)?.checked !== false;
      const number = id => Number(value(id));
      return {
        selectedTemplate: value('pdfSelectedTemplate'),
        colorConfig: { primary: value('pdfPrimaryColor'), secondary: value('pdfSecondaryColor'), text: value('pdfTextColor'), accent: '#f59e0b', background: '#ffffff' },
        fontConfig: { title: value('pdfTitleFont'), body: value('pdfBodyFont'), metadata: 'Helvetica-Oblique', signature: 'Times-Bold' },
        layoutConfig: { titleSize: number('pdfTitleSize'), bodySize: number('pdfBodySize'), marginTop: number('pdfMarginTop'), marginBottom: number('pdfMarginBottom'), marginLeft: number('pdfMarginLeft'), marginRight: number('pdfMarginRight'), lineHeight: 1.6 },
        borderConfig: { style: value('pdfBorderStyle'), color: value('pdfBorderColor'), width: 2, cornerRadius: 0, showDecorative: true },
        visualConfig: { showLogo: checked('pdfShowLogo'), showInstitution: checked('pdfShowInstitution'), showDate: checked('pdfShowDate'), showSignature: checked('pdfShowSignature'), showAuthors: checked('pdfShowAuthors'), showAvalador: checked('pdfShowAvalador') },
        avalTextConfig: { template: value('pdfAvalText') || '', variables: AVAL_VARIABLES }
      };
    }

    async savePdfConfiguration(event) {
      event?.preventDefault();
      if (!this.isOwner) return this.notify('Solo el propietario puede modificar el PDF aval', 'warning');
      const form = document.getElementById('pdfConfigForm');
      if (form && !form.reportValidity()) return;
      const button = document.getElementById('savePdfConfigBtn');
      this.setBusy(button, true, 'Guardando…');
      try {
        const response = await fetch('/api/admin/pdf/config', { method: 'PUT', headers: this.headers(true), body: JSON.stringify(this.collectPdfConfiguration()) });
        if (!response.ok) throw await this.responseError(response, 'No se pudo guardar el PDF aval');
        this.notify('Configuración del PDF aval guardada', 'success');
      } catch (error) {
        this.notify(error.message, 'error');
      } finally {
        this.setBusy(button, false, 'Guardar PDF aval');
      }
    }

    async previewPdfConfiguration() {
      const button = document.getElementById('previewPdfConfigBtn');
      this.setBusy(button, true, 'Generando…');
      try {
        const response = await fetch('/api/admin/pdf/preview', { method: 'POST', headers: this.headers(true), body: JSON.stringify(this.collectPdfConfiguration()) });
        if (!response.ok) throw await this.responseError(response, 'No se pudo generar la vista previa');
        if (this.pdfPreviewUrl) URL.revokeObjectURL(this.pdfPreviewUrl);
        this.pdfPreviewUrl = URL.createObjectURL(await response.blob());
        const frame = document.getElementById('pdfPreviewFrame');
        const empty = document.getElementById('pdfPreviewEmpty');
        const openLink = document.getElementById('pdfPreviewOpen');
        if (frame) {
          frame.src = `${this.pdfPreviewUrl}#page=1&zoom=page-width&navpanes=0`;
          frame.hidden = false;
        }
        if (openLink) {
          openLink.href = this.pdfPreviewUrl;
          openLink.hidden = false;
        }
        if (empty) empty.hidden = true;
      } catch (error) {
        this.notify(error.message, 'error');
      } finally {
        this.setBusy(button, false, 'Vista previa');
      }
    }

    insertPdfVariable(variable) {
      const textarea = document.getElementById('pdfAvalText');
      if (!textarea || !AVAL_VARIABLES.includes(variable)) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.setRangeText(variable, start, end, 'end');
      textarea.focus();
    }

    async loadDatabaseOverview() {
      if (!this.databaseRoot) return;
      const statusBadge = document.getElementById('databaseStatusBadge');
      if (statusBadge) { statusBadge.textContent = 'Comprobando'; statusBadge.className = 'admin-tool-badge neutral'; }
      try {
        const [statusResponse, tablesResponse] = await Promise.all([
          fetch('/api/admin/database/status', { headers: this.headers(), cache: 'no-store' }),
          fetch('/api/admin/database/tables', { headers: this.headers(), cache: 'no-store' })
        ]);
        if (!statusResponse.ok) throw await this.responseError(statusResponse, 'No se pudo comprobar la base de datos');
        if (!tablesResponse.ok) throw await this.responseError(tablesResponse, 'No se pudo consultar las tablas');
        this.renderDatabaseStatus(await statusResponse.json());
        this.renderDatabaseTables((await tablesResponse.json()).tables || []);
      } catch (error) {
        if (statusBadge) { statusBadge.textContent = 'Sin conexión'; statusBadge.className = 'admin-tool-badge danger'; }
        this.notify(error.message, 'error');
      }
    }

    renderDatabaseStatus(status) {
      const badge = document.getElementById('databaseStatusBadge');
      if (badge) { badge.textContent = status.online ? 'En línea' : 'Sin conexión'; badge.className = `admin-tool-badge ${status.online ? 'success' : 'danger'}`; }
      const stats = document.getElementById('databaseStats');
      if (!stats) return;
      stats.replaceChildren(...[
        ['Base', status.database || '—'], ['Versión', status.version || '—'], ['Tablas', status.tableCount ?? 0], ['Tamaño', status.size || '0 MB']
      ].map(([label, content]) => {
        const item = document.createElement('div'); const strong = document.createElement('strong'); const span = document.createElement('span');
        strong.textContent = String(content); span.textContent = label; item.append(strong, span); return item;
      }));
    }

    renderDatabaseTables(tables) {
      const list = document.getElementById('databaseTables');
      const count = document.getElementById('databaseTableCount');
      if (count) count.textContent = String(tables.length);
      if (!list) return;
      list.replaceChildren(...tables.map(table => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'database-table-button';
        const name = document.createElement('span'); name.textContent = table.name;
        const rows = document.createElement('small'); rows.textContent = `${Number(table.rows || 0).toLocaleString('es-CO')} filas`;
        button.append(name, rows); button.addEventListener('click', () => this.loadDatabaseTable(table.name, 1)); return button;
      }));
    }

    async loadDatabaseTable(tableName, page = 1) {
      const view = document.getElementById('databaseTableView');
      if (view) view.innerHTML = '<div class="database-empty">Cargando registros…</div>';
      try {
        const response = await fetch('/api/admin/database/table-data', { method: 'POST', headers: this.headers(true), body: JSON.stringify({ tableName, page, limit: 15 }) });
        if (!response.ok) throw await this.responseError(response, 'No se pudo consultar la tabla');
        const payload = await response.json();
        this.databaseState = { tableName, page: payload.pagination?.currentPage || page, totalPages: payload.pagination?.totalPages || 1 };
        this.renderDatabaseTable(payload);
      } catch (error) {
        if (view) { view.replaceChildren(); const message = document.createElement('div'); message.className = 'database-empty'; message.textContent = error.message; view.append(message); }
      }
    }

    renderDatabaseTable(payload) {
      const view = document.getElementById('databaseTableView');
      if (!view) return;
      view.replaceChildren();
      const heading = document.createElement('div'); heading.className = 'database-table-heading';
      const title = document.createElement('h3'); title.textContent = payload.tableName;
      const meta = document.createElement('span'); meta.textContent = `${Number(payload.pagination?.totalRecords || 0).toLocaleString('es-CO')} registros`;
      heading.append(title, meta); view.append(heading);
      if (!payload.data?.length) { const empty = document.createElement('div'); empty.className = 'database-empty'; empty.textContent = 'Esta tabla no contiene registros.'; view.append(empty); return; }
      const wrapper = document.createElement('div'); wrapper.className = 'database-table-scroll';
      const table = document.createElement('table'); const thead = document.createElement('thead'); const headerRow = document.createElement('tr');
      const columns = payload.columns?.map(column => column.name) || Object.keys(payload.data[0]);
      columns.forEach(column => { const th = document.createElement('th'); th.textContent = column; headerRow.append(th); });
      thead.append(headerRow); table.append(thead);
      const tbody = document.createElement('tbody');
      payload.data.forEach(row => { const tr = document.createElement('tr'); columns.forEach(column => { const td = document.createElement('td'); const value = row[column]; td.textContent = value === null ? 'NULL' : typeof value === 'object' ? JSON.stringify(value) : String(value); td.title = td.textContent; tr.append(td); }); tbody.append(tr); });
      table.append(tbody); wrapper.append(table); view.append(wrapper);
      const pagination = document.createElement('div'); pagination.className = 'database-pagination';
      const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'admin-btn admin-btn-secondary'; previous.textContent = 'Anterior'; previous.disabled = !payload.pagination?.hasPrevPage;
      previous.addEventListener('click', () => this.loadDatabaseTable(payload.tableName, this.databaseState.page - 1));
      const label = document.createElement('span'); label.textContent = `Página ${this.databaseState.page} de ${Math.max(this.databaseState.totalPages, 1)}`;
      const next = document.createElement('button'); next.type = 'button'; next.className = 'admin-btn admin-btn-secondary'; next.textContent = 'Siguiente'; next.disabled = !payload.pagination?.hasNextPage;
      next.addEventListener('click', () => this.loadDatabaseTable(payload.tableName, this.databaseState.page + 1));
      pagination.append(previous, label, next); view.append(pagination);
    }

    async downloadDatabaseBackup() {
      if (!this.isOwner) return this.notify('Solo el propietario puede descargar copias de seguridad', 'warning');
      const button = document.getElementById('downloadDatabaseBackupBtn'); this.setBusy(button, true, 'Preparando…');
      try {
        const response = await fetch('/api/admin/database/export', { headers: this.headers(), cache: 'no-store' });
        if (!response.ok) throw await this.responseError(response, 'No se pudo generar la copia de seguridad');
        const disposition = response.headers.get('Content-Disposition') || '';
        const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `firmas-digitales-${new Date().toISOString().slice(0, 10)}.sql`;
        const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = fileName; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        this.notify('Copia de seguridad descargada', 'success');
      } catch (error) {
        this.notify(error.message, 'error');
      } finally {
        this.setBusy(button, false, 'Descargar copia SQL');
      }
    }

    setBusy(button, busy, label) { if (!button) return; button.disabled = busy; button.textContent = label; button.setAttribute('aria-busy', String(busy)); }
    notify(message, type = 'info') { this.adminPanel?.showNotification?.(message, type); }
    async responseError(response, fallback) { try { const data = await response.json(); return new Error(data.message || data.error || fallback); } catch { return new Error(fallback); } }
  }

  function attach(panel) {
    if (!panel || panel.advancedConfig) return;
    panel.advancedConfig = new AdvancedConfiguration(panel);
    const originalSwitchTab = panel.switchTab.bind(panel);
    panel.switchTab = async function switchTabWithAdvancedTools(tabId) {
      await originalSwitchTab(tabId);
      await panel.advancedConfig.activate(tabId);
    };
  }

  window.AdvancedConfiguration = AdvancedConfiguration;
  window.addEventListener('admin:ready', event => attach(event.detail?.panel));
  if (window.adminPanel) attach(window.adminPanel);
})();
