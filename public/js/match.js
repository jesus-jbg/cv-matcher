// Pantalla "Analizar oferta": formulario, resultado con la oferta subrayada y palabras clave.
import { api } from './api.js';
import { state, on, emit, defaultCvId } from './store.js';
import { $, $$, escapeHtml, icon, toast, setLoading, prefersReducedMotion } from './ui.js';
import { syncOpenCv } from './cv.js';

const MIN_CHARS = 25;

/* ---------------------------------------- réplica ligera del servidor */
// Misma idea que src/utils/matchCalculator.js: minúsculas, sin tildes, sin plural.
// El plegado se hace carácter a carácter para que los índices coincidan con el texto original.
function fold(text) {
  let out = '';
  for (const ch of text) {
    const f = ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += f.length === 1 ? f : (f[0] || ' ').padEnd(ch.length, ' ').slice(0, ch.length);
  }
  return out;
}
const TOKEN_RE = /[a-z0-9](?:[a-z0-9+#.]*[a-z0-9+#])?/g;
// Idéntica a stem() de src/utils/matchCalculator.js
const SUFFIXES = ['amientos', 'imientos', 'amiento', 'imiento', 'aciones', 'iciones', 'adores', 'adoras', 'idades',
  'acion', 'icion', 'ador', 'adora', 'idad', 'mente', 'antes', 'ables', 'ibles', 'ando', 'iendo',
  'ante', 'able', 'ible', 'ados', 'adas', 'idos', 'idas', 'ado', 'ada', 'ido', 'ida',
  'es', 'as', 'os', 'ar', 'er', 'ir', 'a', 'o', 'e', 's'];
function stem(t) {
  if (/[+#.]/.test(t) || t.length < 5) return t;
  for (const suf of SUFFIXES) {
    if (t.endsWith(suf) && t.length - suf.length >= 4) return t.slice(0, -suf.length);
  }
  return t;
}
const keyOf = term => stem(fold(String(term)));

/**
 * Devuelve el HTML de la oferta con <mark> en cada palabra clave y, de paso,
 * la forma original (con tildes) de cada término para mostrarla en las etiquetas.
 */
function highlight(text, matched, missing, partial = []) {
  const okKeys = new Map(matched.map((t, i) => [keyOf(t), i]));
  const lowKeys = new Map(partial.map((t, i) => [keyOf(t), i]));
  const missKeys = new Map(missing.map((t, i) => [keyOf(t), i]));
  const surface = new Map();
  const exactSeen = new Set();
  const termFold = new Map([...matched, ...partial, ...missing].map(t => [keyOf(t), fold(String(t))]));
  const folded = fold(text);
  let html = '';
  let last = 0;
  let n = 0;
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(folded))) {
    const key = stem(m[0]);
    const kind = okKeys.has(key) ? 'ok' : lowKeys.has(key) ? 'low' : missKeys.has(key) ? 'miss' : null;
    if (!kind) continue;
    const original = text.slice(m.index, m.index + m[0].length);
    // Etiqueta: se prefiere la aparición exacta de la palabra que devuelve el servidor
    // (así «diseño» no se muestra como «Diseñar», que comparte raíz).
    const exact = termFold.get(key) === m[0];
    if (exact ? !exactSeen.has(key) : !surface.has(key)) surface.set(key, original);
    if (exact) exactSeen.add(key);
    html += escapeHtml(text.slice(last, m.index));
    html += `<mark class="mk mk-${kind}" data-key="${escapeHtml(key)}" style="--i:${Math.min(n++, 40)}">${escapeHtml(original)}</mark>`;
    last = m.index + m[0].length;
  }
  html += escapeHtml(text.slice(last));
  return { html, surface };
}

/* ------------------------------------------------------------ render */
function levelOf(pct) {
  if (pct >= 70) return { cls: 'is-high', icon: 'check', label: 'Compatibilidad alta', text: 'Tu CV ya cubre la mayor parte de lo que piden. Revisa lo que falta y envíalo.' };
  if (pct >= 40) return { cls: 'is-mid', icon: 'info', label: 'Compatibilidad media', text: 'Hay base, pero faltan términos importantes. Si los tienes, añádelos a tu CV con las mismas palabras que usa la oferta.' };
  return { cls: 'is-low', icon: 'alert', label: 'Compatibilidad baja', text: 'Tu CV comparte pocas palabras con esta oferta. Puede que el puesto no encaje, o que tu CV no refleje todo lo que sabes.' };
}

function renderLevels(levels) {
  const short = levels.filter(l => !l.ok).length;
  return `
      <section class="levels" aria-label="Niveles que pide la oferta">
        <h3>Nivel que pide la oferta</h3>
        <ul class="level-list">${levels.map(l => `
          <li class="level-row ${l.ok ? 'is-ok' : 'is-short'}">
            ${icon(l.ok ? 'check' : 'alert')}
            <span class="level-skill">${escapeHtml(l.skill)}</span>
            <span class="level-detail">Piden <strong>${escapeHtml(l.required.toLowerCase())}</strong> · tú: <strong>${escapeHtml(l.have.toLowerCase())}</strong></span>
          </li>`).join('')}
        </ul>
        <p class="hint" style="margin-top:8px">${short
          ? 'Si tu nivel real es mayor, súbelo en la habilidad de tu CV (pulsa el indicador de nivel) y vuelve a analizar. Las habilidades por debajo de lo que piden cuentan solo en parte.'
          : 'Tu CV alcanza el nivel que piden en todas las habilidades que indican nivel.'}</p>
      </section>`;
}

function renderEmpty() {
  $('#matchResult').innerHTML = `
    <div class="sheet result-empty">
      <div>
        <h2>Aquí verás el resultado</h2>
        <p class="hint" style="margin-top:6px">Las palabras de la oferta que están en tu CV se subrayan en amarillo; las que no, en coral.</p>
      </div>
      <div class="example-paper" aria-hidden="true">
        <span class="example-tag">Ejemplo</span>
        <p>Buscamos perfil con <mark class="mk mk-ok">Python</mark>, <mark class="mk mk-ok">Odoo</mark> y <mark class="mk mk-ok">MySQL</mark>. Se valorará <mark class="mk mk-miss">Docker</mark> e <mark class="mk mk-miss">inglés</mark>.</p>
      </div>
    </div>`;
}

function renderLoading() {
  $('#matchResult').innerHTML = `
    <div class="sheet result-card" aria-busy="true">
      <div class="skel" style="height:96px;width:46%"></div>
      <div class="skel" style="height:18px;width:100%"></div>
      <div class="skel" style="height:180px;width:100%"></div>
    </div>`;
}

function countUp(el, to, from = 0) {
  if (prefersReducedMotion() || to === from) { el.textContent = String(to); return; }
  const start = performance.now();
  const dur = 900;
  const tick = now => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

let current = null; // último análisis mostrado: { res, description, cvId }

function renderResult(res, description, cvId, { from = 0, scroll = true } = {}) {
  current = { res, description, cvId };
  const pct = Math.max(0, Math.min(100, Number(res.match_percentage) || 0));
  const matched = res.matched_keywords || [];
  const missing = res.missing_keywords || [];
  const partial = res.partial_keywords || [];
  const levels = res.skill_levels || [];
  const lv = levelOf(pct);
  const { html, surface } = highlight(description, matched, missing, partial);
  const label = term => escapeHtml(surface.get(keyOf(term)) || term);
  const hasKeys = Number(res.total_keywords) > 0;

  const root = $('#matchResult');
  root.innerHTML = `
    <article class="sheet result-card" data-cv-id="${escapeHtml(cvId)}">
      <header>
        <p class="result-meta"><strong>${escapeHtml(res.job_title || '')}</strong> · ${escapeHtml(res.company_name || '')} · comparado con «${escapeHtml(res.cv_title || 'tu CV')}»</p>
        <div class="score" role="img" aria-label="${pct} por ciento de compatibilidad">
          <span class="score-num" data-score>0</span><span class="score-unit">%</span>
        </div>
        <div class="score-track"><div class="score-fill" style="--p:${from / 100}" data-to="${pct / 100}"></div></div>
        ${hasKeys ? `
        <p class="score-level ${lv.cls}">${icon(lv.icon)}<span>${lv.label}</span></p>
        <p class="score-sentence">${lv.text}</p>` : `
        <div class="callout is-warn" style="margin-top:14px">${icon('alert')}<div>No he encontrado palabras clave en el texto. Pega los requisitos completos de la oferta.</div></div>`}
      </header>

      ${hasKeys ? `
      <section aria-label="Oferta con palabras marcadas">
        <div class="legend" role="group" aria-label="Qué marcar en la oferta">
          <button type="button" class="legend-btn" data-legend="ok" aria-pressed="true"><span class="legend-swatch"></span>En tu CV (${matched.length})</button>
          ${partial.length ? `<button type="button" class="legend-btn" data-legend="low" aria-pressed="true"><span class="legend-swatch is-low"></span>Nivel insuficiente (${partial.length})</button>` : ''}
          <button type="button" class="legend-btn" data-legend="miss" aria-pressed="true"><span class="legend-swatch is-miss"></span>Te faltan (${missing.length})</button>
        </div>
        <div class="offer-text" style="margin-top:12px" tabindex="0">${html}</div>
      </section>

      ${levels.length ? renderLevels(levels) : ''}

      <section class="gaps">
        <div class="gap-group">
          <h3>Lo que te falta</h3>
          ${missing.length ? `<ul class="kw-list">${missing.map(t => `
            <li class="kw kw-miss" data-key="${escapeHtml(keyOf(t))}">${label(t)}
              <button type="button" class="kw-add" data-add="${escapeHtml(surface.get(keyOf(t)) || t)}" aria-label="Añadir ${label(t)} a las habilidades de tu CV" title="Añadir a las habilidades de tu CV">${icon('plus')}</button>
            </li>`).join('')}</ul>
          <p class="hint" style="margin-top:8px">Pulsa «+» solo si de verdad tienes esa habilidad.</p>` : `<p class="hint">No te falta ninguna palabra clave importante.</p>`}
        </div>
        <div class="gap-group">
          <h3>Lo que ya cubres</h3>
          ${partial.length ? `<ul class="kw-list" style="margin-bottom:8px">${partial.map(t => `<li class="kw kw-low" data-key="${escapeHtml(keyOf(t))}" title="La tienes, pero con menos nivel del que piden">${label(t)}</li>`).join('')}</ul>` : ''}
          ${matched.length ? `<ul class="kw-list">${matched.map(t => `<li class="kw kw-ok" data-key="${escapeHtml(keyOf(t))}">${label(t)}</li>`).join('')}</ul>` : `${partial.length ? '' : '<p class="hint">Ninguna todavía.</p>'}`}
        </div>
      </section>` : ''}

      <footer class="result-foot">
        ${icon('check')}<span>Guardada en <a href="#candidaturas">Candidaturas</a>.</span>
      </footer>
    </article>`;

  countUp($('[data-score]', root), pct, from);
  const card = $('.result-card', root);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    card.classList.add('is-drawn');
    const fill = $('.score-fill', card);
    if (fill) fill.style.setProperty('--p', fill.dataset.to);
  }));
  if (scroll) card.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/* ---------------------------------------------------------- eventos */
function populateSelect() {
  const sel = $('#matchCvSelector');
  const keep = sel.value;
  const pref = state.cvs.find(c => String(c.id) === defaultCvId());
  sel.innerHTML = `<option value="">${pref ? `Preferente: ${escapeHtml(pref.title || 'CV #' + pref.id)} (automático)` : 'CV preferente (automático)'}</option>` +
    state.cvs.map(c => `<option value="${c.id}">${escapeHtml(c.title || 'CV #' + c.id)}${Number(c.is_default) === 1 ? ' ★' : ''}</option>`).join('');
  if (keep && state.cvs.some(c => String(c.id) === keep)) sel.value = keep;
  $('#matchCvHint').hidden = state.cvs.length > 0;
  $('#analyzeBtn').disabled = false;
}

function updateCounter() {
  const len = $('#jobDescription').value.trim().length;
  $('#jobCounter').textContent = len ? `${len} caracteres · Ctrl+Intro para analizar` : 'Ctrl+Intro para analizar';
}

let busy = false;
async function submit(e) {
  e.preventDefault();
  if (busy) return;
  const form = $('#jobForm');
  const description = $('#jobDescription').value.trim();
  if (description.length < MIN_CHARS) {
    toast('Pega la oferta completa: con tan poco texto no se puede comparar.', { type: 'error' });
    $('#jobDescription').focus();
    return;
  }
  if (!form.reportValidity()) return;
  if (!state.cvs.length) {
    toast('Primero crea o importa un CV.', { type: 'error' });
    return;
  }

  busy = true;
  const btn = $('#analyzeBtn');
  setLoading(btn, true, 'Analizando…');
  renderLoading();
  const selected = $('#matchCvSelector').value;
  try {
    const res = await api('/api/jobs', {
      method: 'POST',
      body: {
        company_name: $('#companyName').value.trim(),
        job_title: $('#jobTitle').value.trim(),
        job_description: description,
        selected_cv_id: selected || null
      }
    });
    renderResult(res, description, selected || defaultCvId());
    form.reset(); // vacía los campos y limpia el estado «inválido» de la validación
    $('#matchCvSelector').value = selected;
    updateCounter();
    emit('jobs:changed');
    toast('Candidatura guardada', { type: 'ok' });
  } catch (err) {
    renderEmpty();
    toast(err.message, { type: 'error' });
  } finally {
    busy = false;
    setLoading(btn, false);
  }
}

export function initMatch() {
  renderEmpty();
  populateSelect();
  on('cvs', populateSelect);

  $('#jobForm').addEventListener('submit', submit);
  $('#jobDescription').addEventListener('input', updateCounter);
  $('#jobDescription').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#jobForm').requestSubmit();
  });

  const paste = $('#pasteBtn');
  if (!navigator.clipboard || !navigator.clipboard.readText) paste.hidden = true;
  paste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return toast('El portapapeles está vacío.');
      $('#jobDescription').value = text.trim();
      updateCounter();
    } catch (err) {
      toast('El navegador no ha permitido leer el portapapeles. Pega con Ctrl+V.', { type: 'error' });
    }
  });

  const result = $('#matchResult');
  result.addEventListener('click', async e => {
    const legend = e.target.closest('[data-legend]');
    if (legend) {
      const on_ = legend.getAttribute('aria-pressed') !== 'true';
      legend.setAttribute('aria-pressed', String(on_));
      $('.result-card', result).classList.toggle(`hide-${legend.dataset.legend}`, !on_);
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add && current) {
      add.disabled = true;
      const skill = add.dataset.add;
      const before = Number(current.res.match_percentage) || 0;
      try {
        const upd = await api(`/api/jobs/${encodeURIComponent(current.res.id)}/skills`, { method: 'POST', body: { skill_name: skill } });
        const merged = { ...current.res, ...upd };
        syncOpenCv(upd.cv_id, skill);
        emit('jobs:changed');
        renderResult(merged, current.description, current.cvId, { from: before, scroll: false });
        const after = Number(upd.match_percentage) || 0;
        toast(`«${skill}» añadida a tu CV · compatibilidad ${before}% → ${after}%`, { type: 'ok' });
      } catch (err) {
        add.disabled = false;
        toast(err.message, { type: 'error' });
      }
    }
  });

  // Resaltar a la vez la etiqueta y todas sus apariciones en el texto
  const hot = (key, on_) => {
    if (!key) return;
    $$('.mk, .kw', result).forEach(el => { if (el.dataset.key === key) el.classList.toggle('is-hot', on_); });
  };
  ['mouseover', 'focusin'].forEach(t => result.addEventListener(t, e => {
    const el = e.target.closest('.mk, .kw');
    if (el) hot(el.dataset.key, true);
  }));
  ['mouseout', 'focusout'].forEach(t => result.addEventListener(t, e => {
    const el = e.target.closest('.mk, .kw');
    if (el) hot(el.dataset.key, false);
  }));
}
