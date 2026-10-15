const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cvController');
const authMiddleware = require('../middlewares/authMiddleware');
const cvImportController = require('../controllers/cvImportController');
const multer = require('multer');

// Subida en memoria (no se guarda el archivo en disco): máximo 5 MB y un solo archivo
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const uploadCvFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'El archivo supera los 5 MB.' });
    return res.status(400).json({ error: 'No se pudo recibir el archivo.' });
  });
};

// Lista todos los CVs
router.get('/list', authMiddleware, cvController.getCvList);

// Obtiene el CV preferente/por defecto
router.get('/', authMiddleware, cvController.getCV);

// Obtiene un CV específico por su ID
router.get('/:id', authMiddleware, cvController.getCV);

// Importar un CV desde PDF / Word y devolver los datos para rellenar el formulario
router.post('/import', authMiddleware, uploadCvFile, cvImportController.importCV);

// Guardar o actualizar CV
router.post('/save', authMiddleware, cvController.saveCV);
router.put('/', authMiddleware, cvController.saveCV);

// Borrar un CV por su ID
router.delete('/:id', authMiddleware, cvController.deleteCV);

module.exports = router;