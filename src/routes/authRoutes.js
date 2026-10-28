const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/config', authController.config);
router.post('/demo', authController.demo);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Mi cuenta: descargar y eliminar los propios datos
router.get('/export', authMiddleware, authController.exportData);
router.delete('/me', authMiddleware, authController.deleteAccount);

module.exports = router;
