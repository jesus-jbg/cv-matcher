// Página pública de una candidatura (view.html?slug=...).
import { $, escapeHtml, icon, initTheme, hydrateIcons, formatRelative } from './ui.js';

const root = () => $('#publicContent');

function stateBox(title, text) {
  root().innerHTML = `<div class="sheet state-box">${icon('alert')}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p><a class="btn btn-primary" href="/index.html"><span>Ir a CV Matcher</span></a></div>`;
}

function render(raw) {
  // Acepta la fila plana actual o una forma anidada { job, candidate }
  const job = raw.job || raw;
  const cand = raw.candidate || raw;
  const pct = Math.max(0, Math.min(100, Number(job.match_percentage) || 0));
  const skills = (cand.skills || []).map(s => s.skill_name || s).filter(Boolean);
  const contact = [
    cand.email && `<span>${icon('mail')}${escapeHtml(cand.email)}</span>`,
    cand.phone && `<span>${icon('phone')}${escapeHtml(cand.phone)}</span>`
  ].filter(Boolean).join('');

  document.title = `${job.job_title || 'Candidatura'} · CV Matcher`;
  root().innerHTML = `
    <article class="sheet public-head">
      <div>
        <p class="result-meta">Candidatura${job.created_at ? ' · ' + escapeHtml(formatRelative(job.created_at)) : ''}</p>
        <h1>${escapeHtml(job.job_title || 'Candidatura')}</h1>
        <p class="company">${escapeHtml(job.company_name || '')}</p>
      </div>
      <div>
        <div class="score" role="img" aria-label="${pct} por ciento de compatibilidad"><span class="score-num" style="font-size:clamp(3.5rem,9vw,5rem)">${pct}</span><span class="score-unit">%</span></div>
        <p class="hint">de compatibilidad con la oferta</p>
      </div>
    </article>
    <article class="sheet public-sheet">
      ${cand.full_name ? `<section><h2>${escapeHtml(cand.full_name)}</h2><div class="contact-line">${contact}</div></section>` : ''}
      ${cand.summary ? `<section><h2>Perfil</h2><p class="prose">${escapeHtml(cand.summary)}</p></section>` : ''}
      ${skills.length ? `<section><h2>Habilidades</h2><ul class="kw-list">${skills.map(s => `<li class="kw kw-ok">${escapeHtml(s)}</li>`).join('')}</ul></section>` : ''}
    </article>`;
  hydrateIcons(root());
}

async function load() {
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) return stateBox('Enlace incompleto', 'Falta el identificador de la candidatura.');
  try {
    const res = await fetch(`/api/jobs/public/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.status === 404) return stateBox('Candidatura no encontrada', 'El enlace no es correcto o ya no existe.');
    if (!res.ok) throw new Error();
    render(await res.json());
  } catch (e) {
    stateBox('No se pudo cargar', 'Inténtalo de nuevo en unos minutos.');
  }
}

hydrateIcons();
initTheme();
load();
