const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const cvRoutes = require('./routes/cvRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;
require('./config/migrate').ensureSchema().finally(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
});