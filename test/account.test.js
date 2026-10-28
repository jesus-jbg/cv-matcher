// Pruebas de «Mi cuenta» (descargar y eliminar datos) y de los textos legales.
// La base de datos se sustituye por una simulación: no hace falta MySQL.
process.env.JWT_SECRET = 'secreto-de-pruebas-0123456789';
process.env.DEMO_MODE = 'true';
process.env.LEGAL_EMAIL = 'contacto@ejemplo.com';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');

const dbPath = require.resolve('../src/config/db');
const calls = [];
const state = { users: [] };
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/^SELECT id, email, password FROM users/.test(sql)) return [state.users.filter(u => u.id === params[0])];
      if (/^SELECT id, email, created_at FROM users/.test(sql)) return [state.users.filter(u => u.id === params[0])];
      if (/^DELETE FROM users WHERE id/.test(sql)) { state.users = state.users.filter(u => u.id !== params[0]); return [{}]; }
      if (/FROM cvs WHERE user_id/.test(sql)) return [[{ id: 7, user_id: params[0], title: 'Mi CV' }]];
      if (/FROM cv_experiences/.test(sql)) return [[{ id: 1, cv_id: 7, company: 'ACME' }]];
      if (/FROM cv_education/.test(sql)) return [[]];
      if (/FROM cv_skills/.test(sql)) return [[{ id: 1, cv_id: 7, skill_name: 'Python' }]];
      if (/FROM job_applications/.test(sql)) return [[{ id: 3, company_name: 'X' }]];
      return [[]];
    }
  }
};

const authRoutes = require('../src/routes/authRoutes');
const { render } = require('../src/legal/pages');

let server, base;
test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const token = u => jwt.sign({ id: u.id, email: u.email }, process.env.JWT_SECRET);
const call = (method, url, user, body) => fetch(base + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
  body: body ? JSON.stringify(body) : undefined
});

test('exportar y eliminar exigen sesión', async () => {
  assert.equal((await call('GET', '/api/auth/export')).status, 401);
  assert.equal((await call('DELETE', '/api/auth/me')).status, 401);
});

test('exporta todos los datos de la cuenta', async () => {
  const user = { id: 1, email: 'ana@ejemplo.com', password: await bcrypt.hash('clave-correcta', 4), created_at: new Date() };
  state.users = [user];
  const res = await call('GET', '/api/auth/export', user);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.account.email, 'ana@ejemplo.com');
  assert.equal(data.cvs[0].experiences[0].company, 'ACME');
  assert.equal(data.cvs[0].skills[0].skill_name, 'Python');
  assert.equal(data.applications.length, 1);
  assert.equal(data.account.password, undefined);
});

test('eliminar una cuenta real pide la contraseña', async () => {
  const user = { id: 2, email: 'luis@ejemplo.com', password: await bcrypt.hash('clave-correcta', 4) };
  state.users = [user];
  assert.equal((await call('DELETE', '/api/auth/me', user, {})).status, 401);
  assert.equal((await call('DELETE', '/api/auth/me', user, { password: 'incorrecta' })).status, 401);
  assert.equal(state.users.length, 1);
  assert.equal((await call('DELETE', '/api/auth/me', user, { password: 'clave-correcta' })).status, 200);
  assert.equal(state.users.length, 0);
});

test('una cuenta de demo se elimina sin contraseña', async () => {
  const user = { id: 3, email: 'demo-abc123@demo.invalid', password: await bcrypt.hash('x', 4) };
  state.users = [user];
  assert.equal((await call('DELETE', '/api/auth/me', user, {})).status, 200);
  assert.equal(state.users.length, 0);
});

test('los textos legales se generan con los datos del titular', () => {
  for (const slug of ['privacidad', 'aviso-legal', 'terminos']) {
    const html = render(slug);
    assert.match(html, /contacto@ejemplo\.com/);
    if (slug !== 'terminos') assert.match(html, /Jesús Bejarano González/);
    assert.doesNotMatch(html, /undefined|\[object/);
  }
  assert.equal(render('no-existe'), null);
});

test('los textos legales escapan el HTML de las variables', () => {
  process.env.LEGAL_NAME = '<script>alert(1)</script>';
  assert.doesNotMatch(render('aviso-legal'), /<script>alert/);
  delete process.env.LEGAL_NAME;
});
