/**
 * ui.js — Capa de renderizado / DOM
 * ────────────────────────────────────────────────
 * Construye y actualiza el DOM. No sabe de la API
 * ni de localStorage; recibe todo por parámetros.
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
   FOTOS — manejo de archivos en el formulario
   Guarda los `File` reales (para subirlos por multipart)
   y muestra previews con object URLs.
══════════════════════════════════════════════════ */
const photos = (() => {

  let _files       = [];   // File[]
  let _previewUrls = [];   // string[] (object URLs paralelos a _files)

  function handle(event) {
    const newFiles = Array.from(event.target.files);
    newFiles.forEach(file => {
      _files.push(file);
      _previewUrls.push(URL.createObjectURL(file));
    });
    _renderThumbs();
  }

  function _renderThumbs() {
    const container = document.getElementById('thumbsContainer');
    container.innerHTML = '';
    _previewUrls.forEach((src, i) => {
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
    URL.revokeObjectURL(_previewUrls[index]);
    _files.splice(index, 1);
    _previewUrls.splice(index, 1);
    _renderThumbs();
  }

  function getFiles() {
    return [..._files];
  }

  function reset() {
    _previewUrls.forEach(url => URL.revokeObjectURL(url));
    _files = [];
    _previewUrls = [];
    document.getElementById('thumbsContainer').innerHTML = '';
    document.getElementById('fPhotos').value = '';
  }

  return { handle, remove, getFiles, reset };

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
  const SEV_ORDER_NONE = 99;   // los sin clasificar al final

  const SEV_LABELS = {
    leve:     '🟡 Leve',
    moderado: '🟠 Moderado',
    grave:    '🔴 Grave',
  };

  const SEV_PLURAL = {
    leve:     'Leves',
    moderado: 'Moderados',
    grave:    'Graves',
  };

  function _escape(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

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
            `<img src="${_escape(p)}" onclick="lightbox.open('${_escape(p)}')" title="Ver foto">`
          ).join('')}
        </div>`
      : '';

    const linksHtml = damage.videos.length
      ? `<div class="evidence-links">
          ${damage.videos.map(v =>
            `<a href="${_escape(v)}" target="_blank" rel="noopener">🎬 ${_escape(_shortenUrl(v))}</a>`
          ).join('')}
        </div>`
      : '';

    return `<div class="card-evidence">${photosHtml}${linksHtml}</div>`;
  }

  function _buildCard(damage, index, currentUser) {
    const descHtml = damage.desc
      ? `<div class="card-desc">${_escape(damage.desc)}</div>`
      : '';

    const subareaHtml = damage.subarea
      ? ` <span class="card-subarea">› ${_escape(damage.subarea)}</span>`
      : '';

    const isOwner = damage.created_by === currentUser;
    const deleteBtn = isOwner
      ? `<button class="btn-sm del" onclick="damages.remove(${damage.id})">Eliminar</button>`
      : '';

    const authorHtml = damage.created_by
      ? `<span class="card-author">· por ${_escape(damage.created_by)}</span>`
      : '';

    const sevHtml = SEV_LABELS[damage.severity]
      ? `<span class="card-sev sev-${damage.severity}">${SEV_LABELS[damage.severity]}</span>`
      : `<span class="card-sev sev-none">— Sin clasificar</span>`;

    return `
      <div class="damage-card">
        <div class="card-header">
          <div class="card-left">
            <div class="card-area">Nº${index + 1} · ${_escape(damage.area)}${subareaHtml}</div>
            <div class="card-title">${_escape(damage.title)}</div>
            ${descHtml}
          </div>
          ${sevHtml}
        </div>
        ${_buildEvidenceBlock(damage)}
        <div class="card-actions">
          <span class="card-date">Registrado: ${_escape(damage.date)} ${authorHtml}</span>
          ${deleteBtn}
        </div>
      </div>
    `;
  }

  /** Renderiza la lista completa de daños */
  function list(damageArray, currentUser) {
    const el = document.getElementById('damageList');
    document.getElementById('totalBadge').textContent = damageArray.length;

    if (!damageArray.length) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📋</div>
          <p>Todavía no se registró ningún daño.<br>
             Usá la pestaña <strong>"+ Registrar Daño"</strong> para comenzar.</p>
        </div>
      `;
      return;
    }

    const sorted = [...damageArray].sort((a, b) => {
      const aOrder = SEV_ORDER[a.severity] ?? SEV_ORDER_NONE;
      const bOrder = SEV_ORDER[b.severity] ?? SEV_ORDER_NONE;
      return aOrder - bOrder;
    });

    el.innerHTML = sorted.map((d, i) => _buildCard(d, i, currentUser)).join('');
  }

  /** Renderiza las píldoras de conteo por gravedad */
  function counters(damageArray) {
    const bar = document.getElementById('counterBar');

    if (!damageArray.length) {
      bar.innerHTML = '';
      return;
    }

    const counts = { leve: 0, moderado: 0, grave: 0, none: 0 };
    damageArray.forEach(d => {
      if (counts[d.severity] !== undefined) counts[d.severity]++;
      else counts.none++;
    });

    const pills = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => {
        const label = sev === 'none'
          ? 'Sin clasificar'
          : (count === 1 ? _capitalize(sev) : SEV_PLURAL[sev]);
        return `
          <div class="counter-pill ${sev}">
            <span class="num">${count}</span> ${label}
          </div>
        `;
      });

    bar.innerHTML = pills.join('');
  }

  function tabCount(total) {
    const el = document.getElementById('tabCount');
    el.textContent = total ? `(${total})` : '';
  }

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
  function all(damageArray, currentUser) {
    list(damageArray, currentUser);
    counters(damageArray);
    tabCount(damageArray.length);
  }

  return { list, counters, tabCount, headerDate, all };

})();
