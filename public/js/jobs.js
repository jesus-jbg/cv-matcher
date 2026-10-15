// Pantalla "Candidaturas": lista de ofertas analizadas con búsqueda y orden.
import { api } from './api.js';
import { state, on } from './store.js';
import { $, escapeHtml, icon, toast, formatRelative, copyText, debounce } from './ui.js';
import { onShow, navigate } from './router.js';

let loaded = false;

const publicUrl = slug => `${window.location.origin}/view.html?slug=${encodeURIComponent(slug)}`;

function paintBadge() {
  const badge = $('#jobsCount');
  if (!badge) return;
  badge.textContent = String(state.jobs.length);
  badge.hidden = state.jobs.length === 0;
}

function rowHtml(j) {
  const pct = Math.max(0, Math.min(100, Number(j.match_percentage) || 0));
  const meta = [j.company_name, j.cv_title ? `CV: ${j.cv_title}` : 'CV eliminado', formatRelative(j.created_at)].filter(Boolean);
  return `
  <article class="job-row" data-slug="${escapeHtml(j.slug)}">
    <div class="job-pct" role="img" aria-label="${pct} por ciento de compatibilidad">
      <strong>${pct}<small>%</small></strong>
      <div class="job-bar"><i style="--p:${pct / 100}"></i></div>
    </div>
    <div class="job-main">
      <h3 title="${escapeHtml(j.job_title)}">${escapeHtml(j.job_title)}</h3>
      <p>${meta.map(escapeHtml).join(' · ')}</p>
    </div>
    <div class="job-actions">
      <button type="button" class="icon-btn" data-copy="${escapeHtml(j.slug)}" aria-label="Copiar enlace público de ${escapeHtml(j.job_title)}" title="Copiar enlace público">${icon('link')}</button>
      <a class="icon-btn" href="${escapeHtml(publicUrl(j.slug))}" target="_blank" rel="noopener" aria-label="Abrir página pública de ${escapeHtml(j.job_title)}" title="Abrir página pública">${icon('external')}</a>
    </div>
  </article>`;
}

function render() {
  const list = $('#jobsList');
  const toolbar = $('#jobsToolbar');
  const lede = $('#jobsLede');
  const total = state.jobs.length;

  toolbar.hidden = total === 0;
  lede.textContent = total
    ? `${total} ${total === 1 ? 'oferta analizada' : 'ofertas analizadas'}, con su compatibilidad.`
    : 'Las ofertas que analices aparecerán aquí.';

  if (!total) {
    list.innerHTML = `
      <div class="empty-state">
        <h2>Todavía no has analizado ninguna oferta</h2>
        <p>Pega una oferta y verás cuánto encaja con tu CV. Cada análisis se guarda aquí.</p>
        <a class="btn btn-primary" href="#analizar">${icon('target')}<span>Analizar una oferta</span></a>
      </div>`;
    return;
  }

  const q = $('#jobSearch').value.trim().toLowerCase();
  let rows = state.jobs.filter(j => !q || `${j.job_title} ${j.company_name}`.toLowerCase().includes(q));
  if ($('#jobSort').value === 'match') {
    rows = rows.slice().sort((a, b) => b.match_percentage - a.match_percentage);
  }

  list.innerHTML = rows.length
    ? `<div class="jobs">${rows.map(rowHtml).join('')}</div>`
    : `<div class="empty-state"><h2>Sin resultados</h2><p>Ninguna candidatura coincide con «${escapeHtml(q)}».</p></div>`;
}

export async function loadJobs() {
  try {
    state.jobs = await api('/api/jobs');
    loaded = true;
  } catch (err) {
    if (!loaded) {
      $('#jobsList').innerHTML = `<div class="callout is-error">${icon('alert')}<div>No se pudieron cargar las candidaturas: ${escapeHtml(err.message)}</div></div>`;
      return;
    }
    toast(err.message, { type: 'error' });
  }
  paintBadge();
  render();
}

export function initJobs() {
  $('#jobSearch').addEventListener('input', debounce(render, 120));
  $('#jobSort').addEventListener('change', render);
  $('#jobsList').addEventListener('click', async e => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const ok = await copyText(publicUrl(btn.dataset.copy));
    toast(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace', { type: ok ? 'ok' : 'error' });
  });
  on('jobs:changed', loadJobs);
  onShow('candidaturas', () => { if (loaded) loadJobs(); });
}
