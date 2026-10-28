const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const cvRoutes = require('./routes/cvRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();
// Detrás de un proxy (Render, Railway...) pon TRUST_PROXY=1 para que el límite de intentos use la IP real
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use(cors());
app.use(express.json());

// Textos legales (privacidad, aviso legal, términos)
const { render: renderLegal } = require('./legal/pages');
for (const slug of ['privacidad', 'aviso-legal', 'terminos']) {
  app.get(`/${slug}`, (req, res) => res.type('html').send(renderLegal(slug)));
}

// Servir archivos estáticos del Frontend
app.use(express.static(path.join(__dirname, '../public')));

// Ruta raíz para servir la vista de Login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/jobs', jobRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Express listo' });
});

if (process.env.NODE_ENV === 'production' && !process.env.LEGAL_EMAIL) {
  console.warn('⚠️  Define LEGAL_EMAIL: los textos legales necesitan un correo de contacto.');
}

const PORT = process.env.PORT || 3000;
require('./config/migrate').ensureSchema().finally(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
});