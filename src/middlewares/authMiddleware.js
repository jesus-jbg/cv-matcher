const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token no proporcionado' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified; // Guardamos los datos del usuario en la petición
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido o expirado' });
  }
};