// Navegación entre pantallas con el hash de la URL (#cvs, #analizar, #candidaturas, #cuenta).
import { $, $$ } from './ui.js';

const VIEWS = {
  cvs: 'Mis CVs',
  analizar: 'Analizar oferta',
  candidaturas: 'Candidaturas',
  cuenta: 'Mi cuenta'
};
const hooks = {};

export const currentView = () => {
  const h = window.location.hash.replace('#', '');
  return VIEWS[h] ? h : 'cvs';
};

export function onShow(name, fn) {
  (hooks[name] = hooks[name] || []).push(fn);
}

export function navigate(name) {
  if (window.location.hash === `#${name}`) render();
  else window.location.hash = name;
}

function render() {
  const name = currentView();
  $$('[data-view]').forEach(sec => { sec.hidden = sec.dataset.view !== name; });
  $$('[data-nav]').forEach(a => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${VIEWS[name]} · CV Matcher`;
  (hooks[name] || []).forEach(fn => fn());
  const h1 = $(`[data-view="${name}"] h1`);
  if (h1 && document.activeElement === document.body) h1.setAttribute('tabindex', '-1');
}

export function startRouter() {
  window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0 }); });
  render();
}
