// Secreto de firma de los JWT. La app NO arranca si falta o es débil:
// un valor por defecto permitiría a cualquiera fabricar tokens válidos.
require('dotenv').config();

const secret = (process.env.JWT_SECRET || '').trim();

if (!secret || secret === 'secreto' || secret.length < 16) {
  console.error(
    '❌ JWT_SECRET no está definido o es demasiado débil (mínimo 16 caracteres).\n' +
    '   Añade una línea como esta a tu .env y reinicia:\n' +
    '   JWT_SECRET=<cadena larga y aleatoria>\n' +
    '   Genera una con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
  process.exit(1);
}

module.exports = { JWT_SECRET: secret };