// Envío de correos por SMTP (nodemailer).
// Si SMTP_HOST no está configurado (desarrollo en localhost), no se envía nada:
// el mensaje se escribe en la consola del servidor para poder copiar el enlace.
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL directo; 587 = STARTTLS
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    console.log('\n📧 [SMTP sin configurar] Correo que se habría enviado:');
    console.log(`   Para:   ${to}\n   Asunto: ${subject}\n   ${text.split('\n').join('\n   ')}\n`);
    return { sent: false };
  }
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  await tx.sendMail({ from, to, subject, text, html });
  return { sent: true };
}

module.exports = { sendMail };
