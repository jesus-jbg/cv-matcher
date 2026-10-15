// Pantalla de acceso (index.html): entrar o crear cuenta.
import { api, getToken, setToken, clearSession } from './api.js';
import { $, hydrateIcons, initTheme, icon, setLoading, prefersReducedMotion } from './ui.js';

if (getToken()) window.location.replace('/dashboard.html');

let mode = 'login';

function setMode(next) {
  mode = next;
  const reg = mode === 'register';
  const forgot = mode === 'forgot';
  $('#tabLogin').setAttribute('aria-selected', String(mode === 'login'));
  $('#tabRegister').setAttribute('aria-selected', String(reg));
  $('#authTabs').hidden = forgot;
  $('#passwordField').hidden = forgot;
  $('#password').required = !forgot;
  $('#forgotLink').hidden = mode !== 'login';
  $('#backLink').hidden = !forgot;
  $('#authTitle').textContent = forgot ? 'Recupera tu contraseña' : reg ? 'Crea tu cuenta' : 'Entra en tu cuenta';
  $('#authLede').textContent = forgot
    ? 'Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.'
    : reg ? 'Es gratis y tardas un minuto.' : 'Tus CVs y tus candidaturas te esperan.';
  $('#submitBtn').innerHTML = `<span>${forgot ? 'Enviar enlace' : reg ? 'Crear cuenta' : 'Entrar'}</span>`;
  $('#pwHint').hidden = !reg;
  $('#password').autocomplete = reg ? 'new-password' : 'current-password';
  showError('');
  $('#authOk').hidden = true;
}

function showError(msg) {
  const box = $('#errorMessage');
  box.textContent = msg;
  box.hidden = !msg;
}

function setupPasswordToggle() {
  const btn = $('#togglePw');
  const input = $('#password');
  const paint = () => {
    const shown = input.type === 'text';
    btn.innerHTML = icon(shown ? 'eyeoff' : 'eye');
    btn.setAttribute('aria-label', shown ? 'Ocultar contraseña' : 'Mostrar contraseña');
  };
  btn.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; paint(); });
  paint();
}

function animateHero() {
  const demo = $('#heroDemo');
  const num = $('#heroNum');
  const target = 62;
  if (prefersReducedMotion()) { demo.classList.add('is-drawn'); num.textContent = `${target}%`; return; }
  setTimeout(() => {
    demo.classList.add('is-drawn');
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / 1100);
      num.textContent = `${Math.round(target * (1 - Math.pow(1 - t, 3)))}%`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, 500);
}

async function submit(e) {
  e.preventDefault();
  const email = $('#email').value.trim();
  const password = $('#password').value;
  if (mode === 'forgot') return submitForgot(email);
  if (mode === 'register' && password.length < 8) {
    showError('La contraseña debe tener al menos 8 caracteres.');
    $('#password').focus();
    return;
  }
  showError('');
  const btn = $('#submitBtn');
  setLoading(btn, true, mode === 'register' ? 'Creando cuenta…' : 'Entrando…');
  try {
    if (mode === 'register') await api('/api/auth/register', { method: 'POST', body: { email, password } });
    const res = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    if (!res || !res.token) throw new Error('Respuesta inesperada del servidor.');
    setToken(res.token);
    window.location.replace('/dashboard.html');
  } catch (err) {
    showError(err.message);
    setLoading(btn, false);
  }
}

async function submitForgot(email) {
  showError('');
  $('#authOk').hidden = true;
  const btn = $('#submitBtn');
  setLoading(btn, true, 'Enviando…');
  try {
    const res = await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
    const ok = $('#authOk');
    ok.textContent = res.message;
    ok.hidden = false;
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(btn, false);
  }
}

hydrateIcons();
initTheme();
setupPasswordToggle();
animateHero();
setMode('login');

$('#tabLogin').addEventListener('click', () => setMode('login'));
$('#tabRegister').addEventListener('click', () => setMode('register'));
$('#forgotLink').addEventListener('click', () => { setMode('forgot'); $('#email').focus(); });
$('#backLink').addEventListener('click', () => setMode('login'));
$('#authForm').addEventListener('submit', submit);

const params = new URLSearchParams(window.location.search);
if (params.get('expired')) {
  clearSession();
  const note = $('#sessionNotice');
  note.textContent = 'Tu sesión ha caducado. Entra de nuevo para continuar.';
  note.hidden = false;
  history.replaceState(null, '', window.location.pathname);
}
