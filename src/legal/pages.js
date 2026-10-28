// Textos legales (privacidad, aviso legal y términos). Se generan en el servidor para que
// los datos del titular salgan de variables de entorno y no haya que tocar el código.
//   LEGAL_NAME   nombre del titular        (por defecto: Jesús Bejarano González)
//   LEGAL_EMAIL  correo de contacto        (obligatorio para publicar la app)
//   LEGAL_PLACE  localidad                 (por defecto: Sevilla, España)
//   LEGAL_HOSTING proveedores de alojamiento y base de datos (texto libre)
// Son textos orientativos para un proyecto personal sin fines comerciales; no sustituyen
// el consejo de un profesional si la app llegara a usarse como servicio real.

const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function settings() {
  const email = (process.env.LEGAL_EMAIL || '').trim();
  return {
    name: (process.env.LEGAL_NAME || 'Jesús Bejarano González').trim(),
    email,
    place: (process.env.LEGAL_PLACE || 'Sevilla, España').trim(),
    hosting: (process.env.LEGAL_HOSTING || 'el proveedor de alojamiento del servidor y el proveedor de la base de datos contratados para este despliegue').trim(),
    registrationOpen: process.env.REGISTRATION_OPEN !== 'false',
    demo: process.env.DEMO_MODE === 'true',
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    mail: Boolean(process.env.SMTP_HOST),
    repo: 'https://github.com/jesus-jbg/cv-matcher'
  };
}

const contact = s => (s.email
  ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`
  : '<strong>(correo de contacto sin configurar: define LEGAL_EMAIL)</strong>');

const UPDATED = '27 de octubre de 2026';

function privacy(s) {
  return `
<h1>Política de privacidad</h1>
<p class="meta">Última actualización: ${UPDATED}</p>

<h2>1. Quién es el responsable</h2>
<p><strong>${esc(s.name)}</strong>, ${esc(s.place)}. Contacto: ${contact(s)}.<br>
CV Matcher es un proyecto personal de portafolio, sin ánimo de lucro ni publicidad.</p>

<h2>2. Qué datos se tratan</h2>
<ul>
  <li><strong>Cuenta:</strong> correo electrónico y contraseña. La contraseña se guarda cifrada (hash bcrypt); nadie, ni el titular, puede leerla.</li>
  <li><strong>Contenido que tú introduces:</strong> los datos de tus CV (nombre, correo, teléfono, foto, resumen, experiencia, formación, habilidades) y las ofertas que pegas para analizar, con su resultado.</li>
  ${s.demo ? '<li><strong>Demo:</strong> la cuenta de demostración usa un correo ficticio (@demo.invalid) y datos de ejemplo. No introduzcas datos reales en ella.</li>' : ''}
  <li><strong>Enlace público de una candidatura:</strong> cada candidatura tiene un enlace que puede abrir cualquiera que lo conozca y que muestra el puesto, la empresa, el porcentaje, y el nombre, correo, teléfono, resumen y habilidades del CV usado. Solo se comparte si tú das ese enlace; al eliminar la candidatura o la cuenta deja de funcionar.</li>
  <li><strong>Datos técnicos:</strong> tu dirección IP se usa en memoria para limitar intentos de acceso y no se guarda en la base de datos. El proveedor de alojamiento puede conservarla en sus registros de acceso.</li>
  <li><strong>Archivos de CV que importas (PDF, Word, texto):</strong> se leen en memoria para rellenar el formulario y no se almacenan.</li>
</ul>
<p>No se piden ni se necesitan datos de categorías especiales (salud, ideología, etc.). Te pedimos que no los incluyas, ni datos de terceros sin su permiso.</p>

<h2>3. Para qué se usan</h2>
<p>Únicamente para prestarte el servicio: guardar tus CV, compararlos con ofertas y permitirte descargarlos${s.mail ? ', y enviarte el correo de recuperación de contraseña si lo pides' : ''}. No se venden, no se ceden a terceros con fines comerciales, no se hacen perfiles ni decisiones automatizadas con efectos sobre ti.</p>

<h2>4. Base legal</h2>
<p>La ejecución del servicio que solicitas al crear una cuenta o usar la demo (art. 6.1.b RGPD) y, para las medidas de seguridad como el límite de intentos, el interés legítimo en proteger el servicio (art. 6.1.f RGPD).</p>

<h2>5. Cuánto tiempo se conservan</h2>
<ul>
  <li>Cuentas reales: hasta que las elimines desde «Mi cuenta» o lo solicites por correo.</li>
  ${s.demo ? '<li>Cuentas de demo: se borran automáticamente pasadas 24 horas (o antes, si las eliminas tú).</li>' : ''}
  <li>Enlaces de recuperación de contraseña: caducan a los 60 minutos.</li>
</ul>

<h2>6. Quién más puede tratar tus datos</h2>
<p>Para funcionar, la app usa ${esc(s.hosting)}, que actúan como encargados del tratamiento y alojan los datos${s.mail ? '; y un servicio de correo para enviar los mensajes de recuperación' : ''}.${s.ai ? ' Si usas «Importar CV», el texto del archivo se envía a la API de Anthropic para extraer sus campos; ese texto no se guarda en este servicio.' : ''}
Alguno de estos proveedores puede estar fuera del Espacio Económico Europeo; en ese caso se apoyan en garantías adecuadas como las cláusulas contractuales tipo de la Comisión Europea.</p>

<h2>7. Tus derechos</h2>
<p>Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad:</p>
<ul>
  <li>Desde la propia app, en <strong>Mi cuenta</strong>: descargar todos tus datos en JSON y eliminar la cuenta y todo su contenido al instante.</li>
  <li>O escribiendo a ${contact(s)}.</li>
</ul>
<p>Si crees que tus datos no se tratan correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" rel="noopener">aepd.es</a>).</p>

<h2>8. Cookies y almacenamiento del navegador</h2>
<p>CV Matcher <strong>no usa cookies</strong> ni herramientas de analítica o publicidad. Solo guarda en tu navegador (localStorage) el identificador de tu sesión y tu preferencia de tema claro u oscuro, imprescindibles para que la app funcione. Se borran al cerrar sesión.</p>

<h2>9. Seguridad</h2>
<p>Contraseñas cifradas, conexión HTTPS, límite de intentos de acceso y tokens de sesión con caducidad de 24 horas. Ningún sistema es infalible: por eso, y al ser un proyecto personal, evita guardar información que no quieras que esté en un servidor.</p>

<h2>10. Cambios</h2>
<p>Si esta política cambia, se actualizará esta página con su fecha.</p>`;
}

function legal(s) {
  return `
<h1>Aviso legal</h1>
<p class="meta">Última actualización: ${UPDATED}</p>

<h2>Titular</h2>
<p><strong>${esc(s.name)}</strong>, ${esc(s.place)}. Contacto: ${contact(s)}.</p>

<h2>Objeto y naturaleza</h2>
<p>CV Matcher es un proyecto personal de demostración técnica (portafolio). No se realiza con él ninguna actividad económica, no hay publicidad, ventas ni contraprestación alguna.</p>

<h2>Propiedad intelectual</h2>
<p>El código fuente está publicado en <a href="${esc(s.repo)}" rel="noopener">GitHub</a>; consulta el repositorio para conocer sus condiciones de uso. Los contenidos que introduces en tu cuenta (tus CV y ofertas) siguen siendo tuyos.</p>

<h2>Responsabilidad</h2>
<p>El servicio se ofrece «tal cual», sin garantía de disponibilidad ni de conservación de los datos. El porcentaje de compatibilidad es una estimación orientativa basada en coincidencia de palabras; no garantiza ni predice el resultado de ninguna candidatura. Se pueden enlazar webs de terceros sobre las que el titular no tiene control.</p>

<h2>Datos personales</h2>
<p>El tratamiento de datos se describe en la <a href="/privacidad">política de privacidad</a>.</p>

<h2>Legislación aplicable</h2>
<p>Este aviso se rige por la legislación española.</p>`;
}

function terms(s) {
  return `
<h1>Términos de uso</h1>
<p class="meta">Última actualización: ${UPDATED}</p>

<p>Al usar CV Matcher aceptas estos términos. Si no estás de acuerdo, no uses la aplicación.</p>

<h2>1. El servicio</h2>
<p>CV Matcher permite guardar varios CV y compararlos con ofertas de trabajo para ver qué palabras clave coinciden. Es un proyecto personal de portafolio: puede cambiar, interrumpirse o cerrarse sin previo aviso.</p>

<h2>2. Cuenta y demo</h2>
<ul>
  ${s.registrationOpen ? '<li>Eres responsable de mantener en secreto tu contraseña y de lo que ocurra con tu cuenta.</li>' : '<li>El registro de cuentas permanentes está cerrado; se accede con una demo temporal.</li>'}
  ${s.demo ? '<li>Las cuentas de demo son temporales y se borran automáticamente a las 24 horas.</li>' : ''}
  <li>Puedes eliminar tu cuenta y todos tus datos en cualquier momento desde «Mi cuenta».</li>
</ul>

<h2>3. Tu contenido</h2>
<ul>
  <li>Los CV y ofertas que introduces son tuyos y respondes de que son veraces y de que tienes derecho a usarlos.</li>
  <li>Los enlaces públicos de candidaturas muestran datos de contacto de tu CV: compártelos solo con quien quieras.</li>
  <li>No introduzcas datos de otras personas sin su permiso, ni datos especialmente sensibles (salud, ideología, etc.), ni contenido ilegal u ofensivo.</li>
  <li>Se recomienda no usar la demo con datos reales.</li>
</ul>

<h2>4. Uso aceptable</h2>
<p>No está permitido intentar acceder a cuentas ajenas, sobrecargar el servidor, automatizar accesos masivos, buscar vulnerabilidades sin permiso ni usar la app para fines ilícitos. Se pueden limitar o eliminar cuentas que incumplan estas normas.</p>

<h2>5. Sin garantías</h2>
<p>El servicio se ofrece «tal cual». El porcentaje de compatibilidad es orientativo y no asegura resultado alguno en un proceso de selección. Haz copia de tus CV: el titular no se responsabiliza de pérdidas de datos, en la medida que permita la ley.</p>

<h2>6. Privacidad</h2>
<p>El tratamiento de tus datos se explica en la <a href="/privacidad">política de privacidad</a>. Dudas o solicitudes: ${contact(s)}.</p>

<h2>7. Cambios y ley aplicable</h2>
<p>Los términos pueden actualizarse; la versión vigente es la publicada en esta página. Se rigen por la legislación española.</p>`;
}

const PAGES = {
  privacidad: { title: 'Política de privacidad', body: privacy },
  'aviso-legal': { title: 'Aviso legal', body: legal },
  terminos: { title: 'Términos de uso', body: terms }
};

function render(slug) {
  const page = PAGES[slug];
  if (!page) return null;
  const s = settings();
  const links = Object.entries(PAGES)
    .map(([k, p]) => `<a href="/${k}"${k === slug ? ' aria-current="page"' : ''}>${esc(p.title)}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)} · CV Matcher</title>
  <meta name="color-scheme" content="light dark">
  <meta name="robots" content="noindex">
  <script src="/js/theme-init.js"></script>
  <link rel="stylesheet" href="/styles.css">
  <style>
    .legal { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; color: var(--ink); line-height: 1.65; }
    .legal-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
    .legal-top a { color: var(--accent); font-weight: 600; }
    .legal h1 { font-size: clamp(1.75rem, 1.3rem + 1.4vw, 2.25rem); font-weight: 700; }
    .legal h2 { margin-top: 28px; font-size: 1.125rem; font-weight: 700; }
    .legal p, .legal ul { margin-top: 10px; }
    .legal ul { padding-left: 22px; display: grid; gap: 6px; }
    .legal a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
    .legal .meta { color: var(--ink-2); font-size: 0.875rem; }
    .legal-foot { margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.9375rem; }
    .legal-foot a[aria-current] { color: var(--ink); text-decoration: none; font-weight: 700; }
  </style>
</head>
<body>
  <main class="legal">
    <div class="legal-top"><a href="/">← Volver a CV Matcher</a></div>
    ${page.body(s)}
    <nav class="legal-foot" aria-label="Textos legales">${links}</nav>
  </main>
</body>
</html>`;
}

module.exports = { render, PAGES };
