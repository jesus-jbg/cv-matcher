// Pantalla «Mi cuenta»: descargar todos los datos y eliminar la cuenta (RGPD).
import { api, getAccountEmail, goToLogin } from './api.js';
import { $, toast, setLoading, confirmDialog } from './ui.js';

const isDemo = () => getAccountEmail().endsWith('@demo.invalid');

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportData() {
  const btn = $('#exportDataBtn');
  setLoading(btn, true, 'Preparando…');
  try {
    const data = await api('/api/auth/export');
    download(`cv-matcher-mis-datos-${new Date().toISOString().slice(0, 10)}.json`, data);
    toast('Datos descargados', { type: 'ok' });
  } catch (err) {
    toast(err.message, { type: 'error' });
  } finally {
    setLoading(btn, false);
  }
}

async function deleteAccount() {
  const err = $('#deleteError');
  err.hidden = true;
  const password = $('#deletePassword').value;
  if (!isDemo() && !password) {
    err.textContent = 'Escribe tu contraseña para confirmar.';
    err.hidden = false;
    $('#deletePassword').focus();
    return;
  }
  const ok = await confirmDialog({
    title: '¿Eliminar tu cuenta?',
    message: 'Se borrarán para siempre tu cuenta, tus CV y tus candidaturas. No se puede deshacer.',
    confirmText: 'Sí, eliminar todo',
    tone: 'danger'
  });
  if (!ok) return;

  const btn = $('#deleteAccountBtn');
  setLoading(btn, true, 'Eliminando…');
  try {
    await api('/api/auth/me', { method: 'DELETE', body: isDemo() ? {} : { password } });
    goToLogin();
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
    setLoading(btn, false);
  }
}

export function initAccount() {
  if (isDemo()) {
    $('#deletePwField').hidden = true;
    $('#accountLede').textContent = 'Esta es una cuenta de demo: se borra sola a las 24 h, pero puedes eliminarla ya.';
  } else {
    $('#deletePwField').hidden = false;
  }
  $('#exportDataBtn').addEventListener('click', exportData);
  $('#deleteAccountBtn').addEventListener('click', deleteAccount);
}
