const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./config/jwt'); // falla al arrancar si JWT_SECRET falta o es débil

const authRoutes = require('./routes/authRoutes');
const cvRoutes = require('./routes/cvRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();

app.use(cors());
// 5 MB: la foto viaja en base64 dentro del JSON (el límite por defecto, 100 KB, la rechazaba)
app.use(express.json({ limit: '5mb' }));

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

// Errores de middleware (JSON mal formado, cuerpo demasiado grande...) siempre en JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Los datos enviados son demasiado grandes (¿foto muy pesada?).' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON no válido.' });
  }
  console.error('Error no controlado:', err);
  res.status(err.status || 500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});