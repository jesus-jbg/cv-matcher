# Publicar una demo en línea

Esta guía deja CV Matcher accesible desde internet para que cualquiera (por ejemplo, un reclutador) lo pruebe sin instalar nada. Necesitas un servicio que ejecute **Node.js** y una base de datos **MySQL** en la nube.

> Los planes gratuitos y sus límites cambian con el tiempo: revisa las condiciones actuales antes de elegir. Un servicio gratuito suele «dormirse» tras un rato sin visitas y tarda unos segundos en despertar.

## 1. Antes de publicar

- [ ] `git ls-files .env` no muestra nada (el `.env` no está en Git).
- [ ] `copia_total.sql` y cualquier volcado de tu base local **no** están en el repositorio.
- [ ] Tienes un `JWT_SECRET` nuevo, distinto al de tu PC:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] No vas a crear `test@gmail.com` / `1234` en el servidor. Para la demo se usa el modo demo.
- [ ] Repositorio en público solo cuando lo anterior esté comprobado.

## 2. Base de datos MySQL en la nube

Crea una base MySQL (o compatible) y apunta servidor, puerto, usuario, contraseña y nombre. No hace falta importar nada: si está vacía, la app crea las tablas al arrancar. Los servicios en la nube exigen conexión cifrada, así que usa `DB_SSL=true`.

## 3. Servicio web (por ejemplo, Render)

1. Crea un **Web Service** conectado a tu repositorio de GitHub.
2. Configura:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Health check path:** `/api/health`
3. Añade las **variables de entorno** (nunca subas un `.env`):

| Variable | Valor |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | los datos de tu base de datos |
| `DB_SSL` | `true` |
| `JWT_SECRET` | el que generaste |
| `APP_URL` | la dirección pública que te asigne el servicio |
| `TRUST_PROXY` | `1` |
| `NODE_ENV` | `production` |
| `DEMO_MODE` | `true` |
| `REGISTRATION_OPEN` | `false` |
| `LEGAL_EMAIL` | tu correo de contacto (aparece en los textos legales) |
| `LEGAL_HOSTING` | por ejemplo: `Render (servidor) y Aiven (base de datos)` |

Deja **vacía** `ANTHROPIC_API_KEY` (cualquier visitante de la demo podría gastar tu saldo) y no configures SMTP si no lo necesitas: con el registro cerrado no hay recuperación de contraseña.

4. Despliega. Cada `git push` a `main` vuelve a desplegar.

## 4. Modo demo

Con `DEMO_MODE=true`, la pantalla de entrada muestra **«Probar la demo sin registrarte»**: crea una cuenta temporal con un CV y una candidatura de ejemplo, y se borra a las 24 h. Con `REGISTRATION_OPEN=false` no se pueden crear cuentas permanentes.

## 5. Comprobaciones finales

- `https://tu-dirección/api/health` responde `{"status":"ok", ...}`.
- `/privacidad`, `/terminos` y `/aviso-legal` se abren y muestran tu correo.
- Entra con la demo, analiza una oferta, añade una habilidad con «+», exporta un PDF y prueba **Mi cuenta → Eliminar mi cuenta**.
- Desde el móvil, todo se ve bien.

## 6. Enlazarla

- En el `README.md`, descomenta la línea de la demo y pon tu URL.
- En tu portafolio, añade la URL de la demo al proyecto junto al enlace de GitHub.

## Si algo falla

- **El servidor no arranca:** mira los registros. Casi siempre falta `JWT_SECRET` o algún dato de la base.
- **`ECONNREFUSED` o errores `SSL`:** revisa `DB_HOST`, `DB_PORT` y activa `DB_SSL=true`.
- **No sale el botón de demo:** `DEMO_MODE` debe valer exactamente `true`.
- **Los textos legales dicen «correo sin configurar»:** falta `LEGAL_EMAIL`.
- **Tarda en abrir la primera vez:** el servicio gratuito estaba dormido.
