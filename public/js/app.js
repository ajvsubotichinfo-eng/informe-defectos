/**
 * app.js — Lógica de negocio y orquestación
 * ──────────────────────────────────────────────────
 * Coordina store.js (API) y ui.js (DOM).
 * Maneja login, alta/baja de daños y exportación.
 */


/* ══════════════════════════════════════════════════
   CONFIGURACIÓN DEL INFORME
   Para adaptar a otra propiedad, solo editar aquí.
══════════════════════════════════════════════════ */
const CONFIG = {
  inquilino:    'Alejandro José Valdez Subotich',
  arrendador:   'Javier Flores',
  direccion:    'José Federico Moreno 1356, Mendoza, Argentina',
  fechaIngreso: '01/05/2026',
};


/* ══════════════════════════════════════════════════
   AUTH — login / logout / pantalla inicial
══════════════════════════════════════════════════ */
const auth = (() => {

  function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appMain').style.display     = 'none';
    document.getElementById('userBar').style.display     = 'none';
    document.getElementById('loginPin').value = '';
    document.getElementById('loginError').textContent = '';
    setTimeout(() => document.getElementById('loginPin').focus(), 50);
  }

  function showApp(name) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appMain').style.display     = 'block';
    document.getElementById('userBar').style.display     = 'flex';
    document.getElementById('userName').textContent      = name;
  }

  async function tryLogin() {
    const pin = document.getElementById('loginPin').value.trim();
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    if (!pin) { errEl.textContent = 'Ingresá tu PIN.'; return; }

    try {
      const name = await store.login(pin);
      showApp(name);
      await damages.refresh();
    } catch (err) {
      errEl.textContent = err.message || 'PIN incorrecto.';
    }
  }

  function logout() {
    store.session.clear();
    showLogin();
  }

  return { showLogin, showApp, tryLogin, logout };

})();


/* ══════════════════════════════════════════════════
   FORMULARIO — gestión de severidad
   (nombre `formCtrl`, no `form`, para evitar choque
    con la propiedad nativa HTMLButtonElement.form)
══════════════════════════════════════════════════ */
const formCtrl = (() => {

  let _currentSev = '';

  function setSev(sev) {
    _currentSev = sev;
    document.querySelectorAll('.sev-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sev === sev);
    });
  }

  function getSev() {
    return _currentSev;
  }

  function reset() {
    _currentSev = '';
    document.getElementById('fArea').value    = '';
    document.getElementById('fSubarea').value = '';
    document.getElementById('fTitle').value   = '';
    document.getElementById('fDesc').value    = '';
    document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
    photos.reset();
    videos.reset();
  }

  return { setSev, getSev, reset };

})();


/* ══════════════════════════════════════════════════
   DAÑOS — lógica principal (agregar / eliminar)
══════════════════════════════════════════════════ */
const damages = (() => {

  let _cache = [];

  function _validate(area, title) {
    if (!area)  return 'Por favor seleccioná el área de la vivienda.';
    if (!title) return 'Por favor describí el daño.';
    return null;
  }

  /** Vuelve a pedir la lista al backend y la pinta */
  async function refresh() {
    try {
      _cache = await store.getAll();
      renderer.all(_cache, store.session.getUser());
    } catch (err) {
      console.error('[damages] refresh:', err);
    }
  }

  /** Agrega un nuevo daño desde el formulario */
  async function add() {
    const area     = document.getElementById('fArea').value;
    const subarea  = document.getElementById('fSubarea').value.trim();
    const title    = document.getElementById('fTitle').value.trim();
    const desc     = document.getElementById('fDesc').value.trim();
    const sev      = formCtrl.getSev();

    const error = _validate(area, title);
    if (error) { alert(error); return; }

    const btn = event && event.target && event.target.closest('.btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Subiendo...'; }

    try {
      await store.add({
        area,
        subarea,
        title,
        desc,
        severity:   sev,
        videos:     videos.getAll(),
        photoFiles: photos.getFiles(),
      });

      formCtrl.reset();
      await refresh();
      setTimeout(() => tabs.switchDirect('listado'), 300);
    } catch (err) {
      alert(err.message || 'No se pudo guardar el daño.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✓ Agregar al informe'; }
    }
  }

  /** Elimina un daño por id (solo si soy el autor — el server también valida) */
  async function remove(id) {
    if (!confirm('¿Eliminar este daño del informe?')) return;
    try {
      await store.remove(id);
      await refresh();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar.');
    }
  }

  function getCache() {
    return _cache;
  }

  return { refresh, add, remove, getCache };

})();


/* ══════════════════════════════════════════════════
   EXPORTADOR — formatos de salida
══════════════════════════════════════════════════ */
const exporter = (() => {

  function toJSON() {
    const payload = {
      informe: {
        ...CONFIG,
        fechaExportacion: new Date().toISOString(),
        totalDaños:       damages.getCache().length,
        daños:            damages.getCache(),
      }
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: 'application/json' }
    );

    const link  = document.createElement('a');
    link.href   = URL.createObjectURL(blob);
    link.download = `informe-vivienda-mendoza-${_dateSlug()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function _dateSlug() {
    return new Date().toISOString().slice(0, 10);
  }

  return { toJSON };

})();


/* ══════════════════════════════════════════════════
   INIT — punto de entrada de la aplicación
══════════════════════════════════════════════════ */
(async function init() {
  renderer.headerDate();

  const savedPin  = store.session.getPin();
  const savedUser = store.session.getUser();

  if (savedPin && savedUser) {
    auth.showApp(savedUser);
    await damages.refresh();
  } else {
    auth.showLogin();
  }
})();
