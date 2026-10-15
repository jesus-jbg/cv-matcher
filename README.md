# CV Matcher

Aplicación web para **crear y gestionar varios CVs** y **medir cuánto encaja cada uno con una oferta de trabajo**. Pegas una oferta y la app te muestra el porcentaje de compatibilidad, qué palabras clave de la oferta ya están en tu CV y cuáles te faltan.

Proyecto personal de portfolio: backend en Node.js/Express con MySQL y front end en JavaScript vanilla (sin frameworks).

![Análisis de una oferta](docs/screenshots/analizar.png)

> Las capturas usan datos de ejemplo.

## Funcionalidades

- **Cuentas de usuario** con registro, inicio de sesión (JWT) y recuperación de contraseña por correo.
- **Varios CVs por usuario**, con CV preferente, duplicado y borrado.
- **Editor con vista previa en vivo** y 6 plantillas: Moderno, Clásico, Minimalista, Lateral, Ejecutivo y Creativo.
- **Foto de perfil** que se reduce automáticamente en el navegador.
- **Importar un CV existente** (PDF, DOCX o TXT) y rellenar los campos automáticamente. Con una clave de la API de Claude el análisis es más preciso; sin ella usa un analizador básico.
- **Analizador de ofertas**:
  - Porcentaje de compatibilidad entre el CV elegido y la oferta.
  - La oferta se muestra con las palabras subrayadas: amarillo si están en tu CV, coral si faltan.
  - Botón para añadir una habilidad que falta directamente al CV.
- **Candidaturas**: historial de ofertas analizadas, con búsqueda, orden por fecha o compatibilidad y enlace público de cada una.
- **Exportar el CV** a PDF y a Word (`.doc`).
- **Interfaz** con modo claro/oscuro, adaptada a móvil, con atajos de teclado (Ctrl+S para guardar, Ctrl+Intro para analizar) y aviso de cambios sin guardar.

## Capturas

| Mis CVs | Plantillas |
|---|---|
| ![Mis CVs](docs/screenshots/cvs.png) | ![Plantillas](docs/screenshots/plantillas.png) |

| Candidaturas | Modo oscuro | Móvil |
|---|---|---|
| ![Candidaturas](docs/screenshots/jobs.png) | ![Modo oscuro](docs/screenshots/dark-analizar.png) | ![Móvil](docs/screenshots/mobile-analizar.png) |

## Tecnologías

| Capa | Herramientas |
|---|---|
| Servidor | Node.js, Express 5 |
| Base de datos | MySQL (`mysql2`) |
| Autenticación | JWT (`jsonwebtoken`), `bcryptjs` |
| Subida y lectura de archivos | `multer`, `pdf-parse`, `mammoth` |
| Correo | `nodemailer` |
| IA (opcional) | API de Claude (Anthropic) para importar CVs |
| Front end | HTML, CSS y JavaScript vanilla (módulos ES), sin paso de compilación |
| PDF | `html2pdf.js` (se carga desde cdnjs al exportar) |

## Cómo funciona el análisis de ofertas

El porcentaje se calcula en `src/utils/matchCalculator.js` por **coincidencia de términos**, no de forma semántica:

1. Se extraen las palabras clave de la oferta, ignorando palabras vacías en español e inglés.
2. Cada palabra pesa según cuántas veces aparece en la oferta (entre 1 y 2).
3. Se comprueba cuáles aparecen en el CV (título, resumen, habilidades, puestos, empresas y estudios).
4. El porcentaje es el peso de las palabras encontradas sobre el peso total.

Se ignoran tildes, mayúsculas y plurales simples. No entiende sinónimos (por ejemplo, "JS" y "JavaScript" cuentan como palabras distintas).

## Instalación

### Requisitos

- Node.js 20 o superior
- MySQL 8 o MariaDB equivalente

### Pasos

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/jesus-jbg/cv-matcher.git
cd cv-matcher
npm install

# 2. Crear la base de datos y las tablas
mysql -u root -p -e "CREATE DATABASE cv_matcher_db CHARACTER SET utf8mb4;"
mysql -u root -p cv_matcher_db < schema.sql

# 3. Configurar las variables de entorno
cp .env.example .env        # en Windows: copy .env.example .env
# Edita .env y rellena como mínimo DB_PASSWORD y JWT_SECRET

# 4. Arrancar
npm start
```

Abre <http://localhost:3000>. Para desarrollo con recarga automática: `npm run dev`.

### Datos de demostración

Para probar la app sin crear nada a mano:

```bash
npm run seed
```

Crea un usuario de prueba con un CV y una candidatura de ejemplo:

| Usuario | Contraseña |
|---|---|
| `test@gmail.com` | `1234` |

Es solo para desarrollo local; no uses esta cuenta en un servidor público. Si prefieres empezar desde cero, `npm run seed:reset` **borra todos los datos** de la base de datos y vuelve a crear solo los de demostración.

> El formulario de registro exige 8 caracteres como mínimo, pero la cuenta de prueba se crea directamente en la base de datos y puede entrar con `1234`.

En lugar de la línea de comandos, también puedes crear la base de datos desde phpMyAdmin e importar `schema.sql`.

### Variables de entorno

Todas están documentadas en [`.env.example`](.env.example).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `JWT_SECRET` | Sí | Clave para firmar los tokens. Mínimo 16 caracteres. El servidor no arranca sin ella. |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Sí | Conexión a MySQL. |
| `PORT` | No | Puerto del servidor (por defecto 3000). |
| `APP_URL` | No | Dirección pública, usada en los enlaces de los correos. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | No | Envío de correos. Sin `SMTP_HOST`, el enlace de recuperación se escribe en la consola del servidor. |
| `ANTHROPIC_API_KEY` | No | Activa el análisis con IA al importar un CV. |

Para generar un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Correo con Gmail

Activa la verificación en dos pasos en tu cuenta de Google, crea una **contraseña de aplicación** y úsala como `SMTP_PASS` con `SMTP_HOST=smtp.gmail.com` y `SMTP_PORT=587`.

## Estructura del proyecto

```
cv-matcher/
├── schema.sql              # Tablas de la base de datos
├── scripts/seed.js         # Datos de demostración (npm run seed)
├── src/
│   ├── app.js              # Servidor Express y rutas
│   ├── config/             # Conexión MySQL y secreto JWT
│   ├── controllers/        # Lógica de auth, CVs, importación y candidaturas
│   ├── middlewares/        # Verificación del token
│   ├── routes/             # Definición de endpoints
│   └── utils/              # Cálculo del match, lectura de PDF/DOCX, correo, límite de intentos
└── public/                 # Front end (se sirve como archivos estáticos)
    ├── index.html          # Entrar / registrarse / recuperar contraseña
    ├── reset.html          # Contraseña nueva
    ├── dashboard.html      # Panel: Mis CVs, Analizar oferta, Candidaturas
    ├── view.html           # Página pública de una candidatura
    ├── styles.css
    └── js/                 # Módulos ES: cv.js, match.js, jobs.js, cv-preview.js, ...
```

## API

Las rutas con 🔒 requieren la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crear cuenta (contraseña de 8 caracteres como mínimo) |
| POST | `/api/auth/login` | Iniciar sesión y recibir el token |
| POST | `/api/auth/forgot-password` | Pedir el enlace de recuperación por correo |
| POST | `/api/auth/reset-password` | Fijar una contraseña nueva con el enlace recibido |
| GET | `/api/cv/list` 🔒 | Lista de CVs del usuario |
| GET | `/api/cv/:id` 🔒 | Un CV completo |
| POST | `/api/cv/save` 🔒 | Crear o actualizar un CV |
| DELETE | `/api/cv/:id` 🔒 | Borrar un CV |
| POST | `/api/cv/import` 🔒 | Importar un CV desde PDF, DOCX o TXT (máx. 5 MB) |
| POST | `/api/jobs` 🔒 | Analizar una oferta y guardar la candidatura |
| GET | `/api/jobs` 🔒 | Lista de candidaturas |
| GET | `/api/jobs/public/:slug` | Datos públicos de una candidatura |

## Seguridad

- Contraseñas cifradas con bcrypt; el servidor no arranca sin un `JWT_SECRET` fuerte.
- Cada usuario solo puede ver y modificar sus propios CVs y candidaturas.
- Consultas SQL parametrizadas y texto del usuario escapado en pantalla.
- Recuperación de contraseña con enlaces de un solo uso que caducan en 1 hora. En la base de datos solo se guarda el hash del enlace, y la respuesta es la misma exista o no el correo.
- Límite de intentos en la recuperación de contraseña.
- El archivo `.env` está en `.gitignore`: **nunca lo subas a GitHub**.

## Limitaciones conocidas

- El PDF se genera como imagen, así que el texto no es seleccionable y los sistemas ATS no pueden leerlo.
- La página pública de una candidatura muestra nombre, email y teléfono a cualquiera que tenga el enlace.
- El análisis de ofertas no entiende sinónimos.
- No hay tests automáticos.

## Próximos pasos

- [ ] PDF con texto seleccionable, compatible con ATS
- [ ] CV público con URL propia y control de qué datos se muestran
- [ ] Estados de candidatura (enviada, entrevista, rechazada...) con notas
- [ ] Sugerencias con IA para adaptar el CV a cada oferta
- [ ] Idiomas, enlaces (LinkedIn, GitHub) y proyectos en el CV
- [ ] `helmet`, limitación de intentos en el login y CORS restringido
- [ ] Tests automáticos y despliegue en línea

## Autor

**Jesús Bejarano González** · Desarrollador de aplicaciones web (DAW)
