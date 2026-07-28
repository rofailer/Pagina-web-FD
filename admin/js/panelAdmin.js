(function initializeAdminAuthentication() {
  const ADMIN_LOGIN_URL = '/adminLogin';
  const UNAUTHORIZED_URL = '/acceso-denegado';
  let completed = false;

  window.goToMainSite = function goToMainSite() {
    sessionStorage.removeItem('admin_token');
    window.location.assign('/');
  };

  start();

  async function start() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('forcePasswordChange');

    const adminToken = sessionStorage.getItem('admin_token');
    // Nunca conservar una sesión administrativa en almacenamiento persistente.
    localStorage.removeItem('admin_token');

    if (!adminToken) {
      failAuthentication(new Error('No existe una sesión administrativa'), ADMIN_LOGIN_URL);
      return;
    }

    try {
      const user = await validateSession(adminToken);
      if (!['admin', 'owner'].includes(String(user.rol ?? user.role ?? '').toLowerCase())) {
        throw new Error('La cuenta no tiene permisos administrativos');
      }

      completed = true;
      window.dispatchEvent(new CustomEvent('admin:authenticated', { detail: { user } }));
    } catch (error) {
      sessionStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token');
      failAuthentication(error, error.status === 403 ? UNAUTHORIZED_URL : ADMIN_LOGIN_URL);
    }
  }

  async function validateSession(token) {
    const response = await fetch('/api/admin/session', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-store'
      },
      cache: 'no-store'
    });
    if (!response.ok) throw await responseError(response, 'La sesión administrativa no es válida');
    const payload = await response.json();
    const user = payload.user || payload.data?.user;
    if (!user?.id) throw new Error('El servidor devolvió una sesión incompleta');
    return user;
  }

  async function responseError(response, fallback) {
    let message = fallback;
    try {
      const payload = await response.json();
      message = payload.message || payload.error || fallback;
    } catch {
      // La respuesta no incluía JSON; se conserva el mensaje seguro.
    }
    const error = new Error(message);
    error.status = response.status;
    return error;
  }

  function failAuthentication(error, destination) {
    if (completed) return;
    const loading = document.getElementById('adminAuthLoading');
    const message = loading?.querySelector('p');
    if (message) message.textContent = 'No fue posible validar el acceso. Redirigiendo…';
    window.setTimeout(() => window.location.replace(destination), 350);
  }
})();
