// Página para fijar la contraseña nueva (reset.html?token=...).
import { api } from './api.js';
import { $, hydrateIcons, initTheme, icon, setLoading } from './ui.js';

const token = new URLSearchParams(window.location.search).get('token') || '';

function showError(msg) {
  const box = $('#errorMessage');
  box.textContent = msg;
  box.hidden = !msg;
}

hydrateIcons();
initTheme();

// El token se quita de la barra de direcciones para que no quede en el historial visible.
if (token) history.replaceState(null, '', window.location.pathname);
if (!token) showError('Falta el enlace de recuperación. Pide uno nuevo desde la pantalla de entrada.');

const pw = $('#newPassword');
const toggle = $('#togglePw');
const paint = () => {
  const shown = pw.type === 'text';
  toggle.innerHTML = icon(shown ? 'eyeoff' : 'eye');
  toggle.setAttribute('aria-label', shown ? 'Ocultar contraseña' : 'Mostrar contraseña');
};
toggle.addEventListener('click', () => { pw.type = pw.type === 'password' ? 'text' : 'password'; paint(); });
paint();

$('#resetForm').addEventListener('submit', async e => {
  e.preventDefault();
  showError('');
  if (pw.value.length < 8) return showError('La contraseña debe tener al menos 8 caracteres.');
  if (pw.value !== $('#newPassword2').value) return showError('Las dos contraseñas no coinciden.');
  const btn = $('#submitBtn');
  setLoading(btn, true, 'Guardando…');
  try {
    await api('/api/auth/reset-password', { method: 'POST', body: { token, password: pw.value } });
    $('#resetForm').hidden = true;
    $('#doneBox').hidden = false;
  } catch (err) {
    showError(err.message);
    setLoading(btn, false);
  }
});
