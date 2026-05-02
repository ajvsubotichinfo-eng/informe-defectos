/**
 * store.js — Capa de persistencia de datos
 * ─────────────────────────────────────────
 * Responsabilidad única: leer y escribir el estado
 * de los daños en localStorage.
 *
 * Para escalar: reemplazar las funciones get/save
 * con llamadas a una API REST sin tocar el resto
 * de la aplicación.
 */

const STORAGE_KEY = 'damages_informe_v1';

const store = (() => {

  /** Carga los daños desde localStorage */
  function get() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      console.error('[store] Error al leer datos:', e);
      return [];
    }
  }

  /** Persiste el array completo de daños */
  function save(damages) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(damages));
    } catch (e) {
      console.error('[store] Error al guardar datos:', e);
      alert('No se pudieron guardar los datos. Verificá el espacio disponible en el dispositivo.');
    }
  }

  /** Agrega un nuevo daño y persiste */
  function add(damage) {
    const current = get();
    current.push(damage);
    save(current);
    return current;
  }

  /** Elimina un daño por id y persiste */
  function remove(id) {
    const updated = get().filter(d => d.id !== id);
    save(updated);
    return updated;
  }

  /** Borra todo el historial */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }

  return { get, save, add, remove, clear };

})();
