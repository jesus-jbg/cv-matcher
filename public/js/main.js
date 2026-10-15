// Punto de entrada del panel (dashboard.html).
import { getToken, getAccountEmail, goToLogin } from './api.js';
import { $, $$, hydrateIcons, initTheme } from './ui.js';
import { startRouter } from './router.js';
import { initCvs } from './cv.js';
import { initMatch } from './match.js';
import { initJobs, loadJobs } from './jobs.js';

if (!getToken()) {
  goToLogin();
} else {
  hydrateIcons();
  initTheme();

  const email = getAccountEmail();
  $$('#accountEmail, [data-account-email]').forEach(el => { el.textContent = email; el.title = email; });
  $$('[data-logout]').forEach(btn => btn.addEventListener('click', () => goToLogin()));

  initMatch();
  initJobs();
  startRouter();
  loadJobs();
  initCvs();
}
