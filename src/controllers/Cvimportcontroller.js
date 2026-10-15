const path = require('path');
const { extractText, cleanText } = require('../utils/cvTextExtractor');
const { parseCvText } = require('../utils/cvParser');
const { parseCvWithClaude } = require('../utils/cvAiParser');

// Límite sencillo por usuario (protege el coste de la API): 10 importaciones por hora
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map();

function rateLimited(userId) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(userId, recent); return true; }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

// POST /api/cv/import  (multipart, campo "file")
// NO guarda nada: devuelve los datos extraídos para que el usuario los revise en el formulario.
exports.importCV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  }
  if (rateLimited(req.user.id)) {
    return res.status(429).json({ error: 'Has importado muchos CVs seguidos. Inténtalo de nuevo en un rato.' });
  }

  let text;
  try {
    text = cleanText(await extractText(req.file.buffer, req.file.originalname));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error al leer el archivo de CV:', err);
    return res.status(422).json({ error: 'No se pudo leer el archivo. ¿Está dañado o protegido con contraseña?' });
  }

  if (text.length < 40) {
    return res.status(422).json({
      error: 'No se encontró texto en el archivo. Si es un PDF escaneado (una imagen), no se puede leer: usa un PDF o Word con texto seleccionable.'
    });
  }

  let cv = null;
  let method = 'basic';
  let aiFailed = false;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      cv = await parseCvWithClaude(text);
      if (cv) method = 'ai';
    } catch (err) {
      aiFailed = true;
      console.error('Análisis con IA no disponible, se usa el análisis básico:', err.message);
    }
  }

  if (!cv) {
    cv = parseCvText(text);
    if (aiFailed) cv.warnings.unshift('La IA no estuvo disponible y se usó el análisis básico: revisa bien los datos.');
  }

  const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname)).slice(0, 80);
  res.json({ ...cv, title: `CV importado - ${baseName}`.slice(0, 120), method });
};