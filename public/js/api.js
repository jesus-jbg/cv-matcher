// Acceso a la API: añade el token, convierte errores en excepciones legibles
// y devuelve al login si la sesión ha caducado.

const TOKEN_KEY = 'token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* sin almacenamiento */ }
}

export function clearSession() {
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* sin almacenamiento */ }
}

// Email de la cuenta, leído del propio token (solo para mostrarlo; el servidor es quien manda).
export function getAccountEmail() {
  const token = getToken();
  if (!token) return '';
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json).email || '';
  } catch (e) {
    return '';
  }
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function goToLogin(expired = false) {
  clearSession();
  window.location.replace(expired ? '/index.html?expired=1' : '/index.html');
}

/**
 * api('/api/cv/list')
 * api('/api/cv/save', { method: 'POST', body: {...} })
 * api('/api/cv/import', { method: 'POST', formData })
 */
export async function api(path, { method = 'GET', body, formData, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // el navegador añade el Content-Type con su boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, { method, headers, body: payload, signal, cache: 'no-store' });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('No se pudo conectar con el servidor. Comprueba que está en marcha.', 0);
  }

  const isAuthCall = path.startsWith('/api/auth/');
  if ((res.status === 401 || res.status === 403) && !isAuthCall) {
    goToLogin(true);
    throw new ApiError('Tu sesión ha caducado. Entra de nuevo.', res.status);
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* respuesta sin JSON */ }

  if (!res.ok) {
    throw new ApiError((data && data.error) || `Error ${res.status}`, res.status, data);
  }
  return data;
}
