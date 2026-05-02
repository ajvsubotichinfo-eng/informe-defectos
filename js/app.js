/**
 * app.js — Lógica de negocio y orquestación
 * ──────────────────────────────────────────────────
 * Responsabilidad: coordinar store.js y ui.js.
 * No renderiza HTML directamente ni accede
 * a localStorage — eso lo delega a los módulos.
 *
 * Aquí vive la lógica de validación y las
 * acciones del usuario (agregar, eliminar, exportar).
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
  storageKey:   'damages_informe_v1',
};


/* ══════════════════════════════════════════════════
   FORMULARIO — gestión de severidad
══════════════════════════════════════════════════ */
const form = (() => {

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
    document.getElementById('fArea').value  = '';
    document.getElementById('fTitle').value = '';
    document.getElementById('fDesc').value  = '';
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

  /** Valida campos requeridos. Retorna string con error o null si ok. */
  function _validate(area, title, sev) {
    if (!area)  return 'Por favor seleccioná el área de la vivienda.';
    if (!title) return 'Por favor describí el daño.';
    if (!sev)   return 'Por favor indicá la gravedad del daño.';
    return null;
  }

  /** Construye el objeto daño a partir de los campos del formulario */
  function _buildDamage(area, title, desc, sev) {
    return {
      id:       Date.now(),
      area,
      title,
      desc,
      severity: sev,
      photos:   photos.getAll(),
      videos:   videos.getAll(),
      date:     new Date().toLocaleDateString('es-AR'),
    };
  }

  /** Agrega un nuevo daño desde el formulario */
  function add() {
    const area  = document.getElementById('fArea').value;
    const title = document.getElementById('fTitle').value.trim();
    const desc  = document.getElementById('fDesc').value.trim();
    const sev   = form.getSev();

    const error = _validate(area, title, sev);
    if (error) { alert(error); return; }

    const damage    = _buildDamage(area, title, desc, sev);
    const allDamages = store.add(damage);

    // 1. Limpiar formulario (el usuario lo ve en blanco)
    form.reset();
    renderer.all(allDamages);

    // 2. Navegar al listado luego de un instante
    setTimeout(() => tabs.switchDirect('listado'), 300);
  }

  /** Elimina un daño por id */
  function remove(id) {
    if (!confirm('¿Eliminar este daño del informe?')) return;
    const allDamages = store.remove(id);
    renderer.all(allDamages);
  }

  /** Borra todos los daños */
  function clearAll() {
    if (!confirm('¿Eliminar TODOS los daños del informe? Esta acción no se puede deshacer.')) return;
    const allDamages = store.clear();
    renderer.all(allDamages);
  }

  return { add, remove, clearAll };

})();


/* ══════════════════════════════════════════════════
   EXPORTADOR — formatos de salida
══════════════════════════════════════════════════ */
const exporter = (() => {

  /** Exporta el informe completo como archivo JSON */
  function toJSON() {
    const payload = {
      informe: {
        ...CONFIG,
        fechaExportacion: new Date().toISOString(),
        totalDaños:       store.get().length,
        daños:            store.get(),
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
    return new Date().toISOString().slice(0, 10); // "2026-05-01"
  }

  return { toJSON };

})();


/* ══════════════════════════════════════════════════
   INIT — punto de entrada de la aplicación
══════════════════════════════════════════════════ */
(function init() {
  renderer.headerDate();
  renderer.all(store.get());
})();
