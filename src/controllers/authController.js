const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('../config/jwt');
const { sendMail } = require('../utils/mailer');
const { hit } = require('../utils/rateLimit');
const { insertDemoContent } = require('../utils/demoData');

const DEMO_DOMAIN = 'demo.invalid';
const demoEnabled = () => process.env.DEMO_MODE === 'true';
const registrationOpen = () => process.env.REGISTRATION_OPEN !== 'false';

const MIN_PASSWORD = 8;
const RESET_MINUTES = 60;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const validEmail = value => typeof value === 'string' && value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Registro de usuario
exports.register = async (req, res) => {
  const { email, password } = req.body || {};

  if (!registrationOpen()) {
    return res.status(403).json({ error: 'El registro está cerrado en esta demo. Usa «Probar la demo» para entrar.' });
  }
  if (!hit(`register:${req.ip}`, 20, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiados registros desde esta conexión. Inténtalo más tarde.' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }
  if (String(password).length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
  }

  try {
    // Comprobar si el usuario ya existe
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario
    const [result] = await pool.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );

    // Crear un CV base vacío automáticamente
    await pool.query('INSERT INTO cvs (user_id) VALUES (?)', [result.insertId]);

    res.status(201).json({ message: 'Usuario registrado con éxito' });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Login de usuario
exports.login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  if (!hit(`login:${req.ip}`, 30, 15 * 60 * 1000) || !hit(`login-mail:${String(email).toLowerCase()}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar Token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login correcto',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Recuperación de contraseña, paso 1: pedir el enlace por correo.
// La respuesta es SIEMPRE la misma exista o no el correo, para no revelar quién está registrado.
exports.forgotPassword = async (req, res) => {
  const email = String((req.body || {}).email || '').trim();
  const generic = { message: 'Si ese correo está registrado, te hemos enviado un enlace para crear una contraseña nueva. Caduca en 1 hora.' };

  if (!validEmail(email)) {
    return res.status(400).json({ error: 'Escribe un correo electrónico válido' });
  }
  if (!hit(`forgot:${req.ip}`, 10, 15 * 60 * 1000) || !hit(`forgot-mail:${email.toLowerCase()}`, 3, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' });
  }

  try {
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length) {
      const userId = users[0].id;
      const token = crypto.randomBytes(32).toString('hex');

      // Solo vale el último enlace pedido. En la base de datos se guarda únicamente el hash.
      await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);
      await pool.query(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
        [userId, sha256(token), RESET_MINUTES]
      );

      const base = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
      const link = `${base}/reset.html?token=${token}`;

      // Se envía sin esperar, para que el tiempo de respuesta no delate si el correo existe.
      sendMail({
        to: email,
        subject: 'Restablece tu contraseña de CV Matcher',
        text: `Hola,\n\nHas pedido restablecer tu contraseña de CV Matcher. Abre este enlace (caduca en ${RESET_MINUTES} minutos):\n\n${link}\n\nSi no has sido tú, ignora este mensaje: tu contraseña no cambiará.`,
        html: `<p>Hola,</p><p>Has pedido restablecer tu contraseña de CV Matcher. El enlace caduca en ${RESET_MINUTES} minutos:</p><p><a href="${link}">Crear una contraseña nueva</a></p><p style="color:#666">Si no has sido tú, ignora este mensaje: tu contraseña no cambiará.</p>`
      }).catch(err => console.error('No se pudo enviar el correo de recuperación:', err.message));
    }
    res.json(generic);
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Recuperación de contraseña, paso 2: fijar la contraseña nueva con el enlace recibido.
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body || {};

  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ error: 'El enlace no es válido. Pide uno nuevo.' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
  }
  if (!hit(`reset:${req.ip}`, 20, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > NOW()',
      [sha256(token)]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'El enlace ha caducado o ya se usó. Pide uno nuevo.' });
    }
    const userId = rows[0].user_id;
    const hashed = await bcrypt.hash(password, 10);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    await pool.query('DELETE FROM password_resets WHERE user_id = ?', [userId]); // el enlace es de un solo uso

    res.json({ message: 'Contraseña actualizada. Ya puedes entrar con la nueva.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Qué ofrece este servidor (el front end muestra u oculta botones según esto)
exports.config = (req, res) => {
  res.json({ demo: demoEnabled(), registration: registrationOpen() });
};

// Cuenta de demostración temporal: usuario nuevo con un CV y una candidatura de ejemplo.
// Sirve para que alguien pruebe la app sin registrarse. Las cuentas demo se borran a las 24 h.
exports.demo = async (req, res) => {
  if (!demoEnabled()) return res.status(404).json({ error: 'La demo no está activada.' });
  if (!hit(`demo:${req.ip}`, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiadas demos desde esta conexión. Inténtalo más tarde.' });
  }
  try {
    await pool.query("DELETE FROM users WHERE email LIKE ? AND created_at < NOW() - INTERVAL 24 HOUR", [`demo-%@${DEMO_DOMAIN}`]);
    const id = crypto.randomBytes(6).toString('hex');
    const email = `demo-${id}@${DEMO_DOMAIN}`;
    const hashed = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10); // nadie conoce esta contraseña
    const [result] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashed]);
    await insertDemoContent(pool, result.insertId, id);
    const token = jwt.sign({ id: result.insertId, email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Demo lista', token, user: { id: result.insertId, email } });
  } catch (error) {
    console.error('Error al crear la demo:', error);
    res.status(500).json({ error: 'No se pudo crear la demo.' });
  }
};
