/**
 * store.js — Cliente HTTP de la API
 * ─────────────────────────────────────────
 * Reemplaza la versión antigua de localStorage.
 * Toda comunicación con el backend pasa por aquí.
 *
 * Auth: el PIN se guarda en sessionStorage y se manda
 * en el header `X-PIN` de cada pedido. Si el server
 * responde 401 → la sesión expiró y se vuelve al login.
 */

const PIN_KEY  = 'informe_pin';
const USER_KEY = 'informe_user';

const session = {
  setPin(pin)   { sessionStorage.setItem(PIN_KEY, pin); },
  getPin()      { return sessionStorage.getItem(PIN_KEY) || ''; },
  setUser(name) { sessionStorage.setItem(USER_KEY, name); },
  getUser()     { return sessionStorage.getItem(USER_KEY) || ''; },
  clear()       { sessionStorage.removeItem(PIN_KEY); sessionStorage.removeItem(USER_KEY); },
};


/** fetch interno con header X-PIN; redirige al login si 401 */
async function _fetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const pin = session.getPin();
  if (pin) headers.set('X-PIN', pin);

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    session.clear();
    if (typeof auth !== 'undefined') auth.showLogin();
    throw new Error('Sesión inválida');
  }

  return res;
}


const store = (() => {

  /** POST /api/auth — valida PIN y guarda sesión */
  async function login(pin) {
    const res = await fetch('/api/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error('PIN incorrecto');
    const data = await res.json();
    session.setPin(pin);
    session.setUser(data.name);
    return data.name;
  }

  /** GET /api/damages */
  async function getAll() {
    const res = await _fetch('/api/damages');
    if (!res.ok) throw new Error('No se pudieron cargar los daños');
    return await res.json();
  }

  /** POST /api/damages — multipart con campos + fotos */
  async function add({ area, subarea, title, desc, severity, videos, photoFiles }) {
    const fd = new FormData();
    fd.append('area',     area);
    if (subarea) fd.append('subarea', subarea);
    fd.append('title',    title);
    if (desc)    fd.append('desc',    desc);
    fd.append('severity', severity);
    fd.append('videos',   JSON.stringify(videos || []));
    for (const file of photoFiles || []) fd.append('photos', file, file.name);

    const res = await _fetch('/api/damages', { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo guardar el daño');
    }
    return await res.json();
  }

  /** DELETE /api/damages/:id */
  async function remove(id) {
    const res = await _fetch(`/api/damages/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo eliminar');
    }
    return true;
  }

  return { login, getAll, add, remove, session };

})();
