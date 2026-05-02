/**
 * ui.js — Capa de renderizado / DOM
 * ────────────────────────────────────────────────
 * Responsabilidad única: construir y actualizar
 * elementos del DOM. No contiene lógica de negocio
 * ni accede directamente a localStorage.
 *
 * Cada función recibe los datos que necesita
 * como parámetros → fácil de testear y reutilizar.
 */


/* ══════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════ */
const tabs = (() => {

  function switch_(id, event) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    if (event) event.target.closest('.tab').classList.add('active');
  }

  /** Cambia de tab sin necesidad de un evento (llamada programática) */
  function switchDirect(id) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    const idx = id === 'registrar' ? 0 : 1;
    document.querySelectorAll('.tab')[idx].classList.add('active');
  }

  return { switch: switch_, switchDirect };

})();


/* ══════════════════════════════════════════════════
   LIGHTBOX
══════════════════════════════════════════════════ */
const lightbox = (() => {

  function open(src) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightbox').classList.add('open');
  }

  function close() {
    document.getElementById('lightbox').classList.remove('open');
  }

  return { open, close };

})();


/* ══════════════════════════════════════════════════
   FOTOS — thumbnails en el formulario
══════════════════════════════════════════════════ */
const photos = (() => {

  let _current = []; // base64 array temporal (antes de guardar)

  function handle(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        _current.push(ev.target.result);
        _renderThumbs();
      };
      reader.readAsDataURL(file);
    });
  }

  function _renderThumbs() {
    const container = document.getElementById('thumbsContainer');
    container.innerHTML = '';
    _current.forEach((src, i) => {
      const div = document.createElement('div');
      div.className = 'thumb';
      div.innerHTML = `
        <img src="${src}" onclick="lightbox.open('${src}')" title="Ver foto">
        <button class="del-thumb" onclick="photos.remove(${i})">✕</button>
      `;
      container.appendChild(div);
    });
  }

  function remove(index) {
    _current.splice(index, 1);
    _renderThumbs();
  }

  function getAll() {
    return [..._current];
  }

  function reset() {
    _current = [];
    document.getElementById('thumbsContainer').innerHTML = '';
    document.getElementById('fPhotos').value = '';
  }

  return { handle, remove, getAll, reset };

})();


/* ══════════════════════════════════════════════════
   VIDEOS — campos de link en el formulario
══════════════════════════════════════════════════ */
const videos = (() => {

  function addField() {
    const container = document.getElementById('videoLinks');
    const div = document.createElement('div');
    div.className = 'video-entry';
    div.innerHTML = `
      <input type="url" class="vlink" placeholder="https://..." />
      <button class="btn-icon danger" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
  }

  function getAll() {
    return Array.from(document.querySelectorAll('.vlink'))
      .map(input => input.value.trim())
      .filter(Boolean);
  }

  function reset() {
    document.getElementById('videoLinks').innerHTML = `
      <div class="video-entry">
        <input type="url" class="vlink" placeholder="https://youtube.com/... o Google Drive, Dropbox, etc." />
        <button class="btn-icon" onclick="videos.addField()">+</button>
      </div>
    `;
  }

  return { addField, getAll, reset };

})();


/* ══════════════════════════════════════════════════
   RENDERS — listado de daños y contadores
══════════════════════════════════════════════════ */
const renderer = (() => {

  const SEV_ORDER = { grave: 0, moderado: 1, leve: 2 };

  const SEV_LABELS = {
    leve:     '🟡 Leve',
    moderado: '🟠 Moderado',
    grave:    '🔴 Grave',
  };

  function _shortenUrl(url) {
    try {
      const u = new URL(url);
      const path = u.pathname.length > 30
        ? u.pathname.slice(0, 28) + '…'
        : u.pathname;
      return u.hostname + path;
    } catch {
      return url.slice(0, 50);
    }
  }

  function _buildEvidenceBlock(damage) {
    if (!damage.photos.length && !damage.videos.length) return '';

    const photosHtml = damage.photos.length
      ? `<div class="evidence-photos">
          ${damage.photos.map(p =>
            `<img src="${p}" onclick="lightbox.open('${p}')" title="Ver foto">`
          ).join('')}
        </div>`
      : '';

    const linksHtml = damage.videos.length
      ? `<div class="evidence-links">
          ${damage.videos.map(v =>
            `<a href="${v}" target="_blank">🎬 ${_shortenUrl(v)}</a>`
          ).join('')}
        </div>`
      : '';

    return `<div class="card-evidence">${photosHtml}${linksHtml}</div>`;
  }

  function _buildCard(damage, index) {
    const descHtml = damage.desc
      ? `<div class="card-desc">${damage.desc}</div>`
      : '';

    return `
      <div class="damage-card">
        <div class="card-header">
          <div class="card-left">
            <div class="card-area">Nº${index + 1} · ${damage.area}</div>
            <div class="card-title">${damage.title}</div>
            ${descHtml}
          </div>
          <span class="card-sev sev-${damage.severity}">
            ${SEV_LABELS[damage.severity] || damage.severity}
          </span>
        </div>
        ${_buildEvidenceBlock(damage)}
        <div class="card-actions">
          <span class="card-date">Registrado: ${damage.date}</span>
          <button class="btn-sm del" onclick="damages.remove(${damage.id})">Eliminar</button>
        </div>
      </div>
    `;
  }

  /** Renderiza la lista completa de daños */
  function list(damageArray) {
    const el = document.getElementById('damageList');
    document.getElementById('totalBadge').textContent = damageArray.length;

    if (!damageArray.length) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📋</div>
          <p>Todavía no registraste ningún daño.<br>
             Usá la pestaña <strong>"+ Registrar Daño"</strong> para comenzar.</p>
        </div>
      `;
      return;
    }

    const sorted = [...damageArray].sort(
      (a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
    );

    el.innerHTML = sorted.map((d, i) => _buildCard(d, i)).join('');
  }

  /** Renderiza las píldoras de conteo por gravedad */
  function counters(damageArray) {
    const bar = document.getElementById('counterBar');

    if (!damageArray.length) {
      bar.innerHTML = '';
      return;
    }

    const counts = { leve: 0, moderado: 0, grave: 0 };
    damageArray.forEach(d => counts[d.severity]++);

    const pills = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => {
        const plural = count > 1 && sev !== 'grave'
          ? (sev === 'leve' ? 's' : 's')
          : '';
        return `
          <div class="counter-pill ${sev}">
            <span class="num">${count}</span> ${_capitalize(sev)}${plural}
          </div>
        `;
      });

    bar.innerHTML = pills.join('');
  }

  /** Actualiza el número entre paréntesis en la tab de listado */
  function tabCount(total) {
    const el = document.getElementById('tabCount');
    el.textContent = total ? `(${total})` : '';
  }

  /** Actualiza la fecha de generación en el header */
  function headerDate() {
    document.getElementById('genDate').textContent =
      new Date().toLocaleDateString('es-AR', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
  }

  function _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Llama a todos los renders del listado */
  function all(damageArray) {
    list(damageArray);
    counters(damageArray);
    tabCount(damageArray.length);
  }

  return { list, counters, tabCount, headerDate, all };

})();
