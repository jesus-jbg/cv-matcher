// Utilidades de interfaz: iconos, avisos, diálogos de confirmación, tema y formato.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

export const prefersReducedMotion = () =>
  !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export function debounce(fn, wait = 150) {
  let t;
  const wrapped = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  wrapped.flush = (...args) => { clearTimeout(t); fn(...args); };
  return wrapped;
}

/* ---------------------------------------------------------------- iconos */
const ICONS = {
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  pencil: '<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'
};

export function icon(name, { fill = false, label = '' } = {}) {
  const body = ICONS[name] || '';
  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  return `<svg class="icon${fill ? ' icon-fill' : ''}" viewBox="0 0 24 24" ${a11y}>${body}</svg>`;
}

// Sustituye <i data-icon="nombre"></i> por el icono SVG correspondiente.
export function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach(el => {
    const tpl = document.createElement('template');
    tpl.innerHTML = icon(el.dataset.icon, { fill: el.hasAttribute('data-fill') });
    const svg = tpl.content.firstElementChild;
    if (el.className) svg.classList.add(...el.className.split(/\s+/).filter(Boolean));
    el.replaceWith(svg);
  });
}

/* ---------------------------------------------------------------- avisos */
function toastHost() {
  let host = $('#toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

/**
 * toast('CV guardado')
 * toast('No se pudo guardar', { type: 'error' })
 * toast('Experiencia eliminada', { action: { label: 'Deshacer', onClick: () => ... } })
 */
export function toast(message, { type = 'info', action = null, duration } = {}) {
  const host = toastHost();
  const el = document.createElement('div');
  el.className = `toast is-${type}`;
  const iconName = type === 'error' ? 'alert' : type === 'ok' ? 'check' : 'info';
  el.innerHTML = `${icon(iconName)}<span class="toast-msg">${escapeHtml(message)}</span>`;

  let timer;
  const close = () => { clearTimeout(timer); el.remove(); };

  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { close(); action.onClick(); });
    el.appendChild(btn);
  }
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'toast-close';
  x.setAttribute('aria-label', 'Cerrar aviso');
  x.innerHTML = icon('x');
  x.addEventListener('click', close);
  el.appendChild(x);

  host.appendChild(el);
  while (host.children.length > 4) host.firstElementChild.remove();
  timer = setTimeout(close, duration || (type === 'error' ? 7000 : action ? 8000 : 4000));
  return close;
}

/* -------------------------------------------------------------- diálogos */
/**
 * const ok = await confirmDialog({ title, message, confirmText, tone: 'danger' })
 */
export function confirmDialog({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', tone = 'primary' }) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.setAttribute('aria-labelledby', 'dlgTitle');
    dlg.innerHTML = `
      <form method="dialog">
        <div class="dialog-body">
          <h2 id="dlgTitle">${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
        </div>
        <div class="dialog-actions">
          <button type="submit" value="cancel" class="btn btn-secondary" ${tone === 'danger' ? 'autofocus' : ''}>${escapeHtml(cancelText)}</button>
          <button type="submit" value="ok" class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" ${tone === 'danger' ? '' : 'autofocus'}>${escapeHtml(confirmText)}</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);

    let result = false;
    dlg.addEventListener('close', () => {
      result = dlg.returnValue === 'ok';
      dlg.remove();
      resolve(result);
    });
    // Clic fuera del cuadro = cancelar
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close('cancel'); });
    dlg.showModal();
  });
}

/* ------------------------------------------------------------------ tema */
export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function paintThemeButtons() {
  const dark = currentTheme() === 'dark';
  $$('[data-theme-toggle]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(dark));
    const label = btn.querySelector('[data-theme-label]');
    if (label) label.textContent = dark ? 'Modo claro' : 'Modo oscuro';
    btn.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    const slot = btn.querySelector('[data-theme-icon]');
    if (slot) slot.innerHTML = icon(dark ? 'sun' : 'moon');
  });
}

export function initTheme() {
  paintThemeButtons();
  $$('[data-theme-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* sin almacenamiento */ }
    paintThemeButtons();
  }));
}

/* --------------------------------------------------------------- formato */
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Convierte lo que devuelva el servidor para una fecha (DATE) en 'YYYY-MM-DD' para <input type="date">.
// mysql2 entrega los DATE como fecha a medianoche LOCAL del servidor; al pasar por JSON llega como
// "2024-02-29T23:00:00.000Z" y cortar el texto da un día menos. Por eso se lee con la hora local.
export function toDateInput(value) {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// '2024-03-01' -> 'mar 2024'
export function formatMonthYear(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  return `${MONTHS_SHORT[Number(m[2]) - 1] || ''} ${m[1]}`.trim();
}

export function formatRelative(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  }
}

/* ------------------------------------------------------- botón ocupado */
// setLoading(btn, true, 'Guardando…') muestra un spinner y bloquea el botón; setLoading(btn, false) lo restaura.
export function setLoading(btn, loading, label = '') {
  if (!btn) return;
  if (loading) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.dataset.html = btn.innerHTML;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${escapeHtml(label || 'Un momento…')}</span>`;
  } else if (btn.dataset.busy === '1') {
    btn.innerHTML = btn.dataset.html || btn.innerHTML;
    delete btn.dataset.busy;
    delete btn.dataset.html;
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
  }
}
