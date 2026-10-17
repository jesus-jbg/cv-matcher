const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const authMiddleware = require('../middlewares/authMiddleware');

// Ruta pública para ver una candidatura por su slug
router.get('/public/:slug', jobController.getApplicationBySlug);

// Rutas privadas protegidas por autenticación
router.use(authMiddleware);
router.post('/', jobController.createApplication);
router.get('/', jobController.getApplications);
router.post('/:id/skills', jobController.addSkillToApplication);
router.delete('/:id', jobController.deleteApplication);

module.exports = router;