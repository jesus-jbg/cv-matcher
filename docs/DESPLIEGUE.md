# Publicar una demo en línea

Esta guía deja CV Matcher accesible desde internet para que cualquiera (por ejemplo, un reclutador) lo pruebe sin instalar nada. Necesitas dos cosas: un servicio que ejecute **Node.js** y una base de datos **MySQL** en la nube.

> Los planes gratuitos y sus límites cambian con el tiempo. Revisa las condiciones actuales de cada servicio antes de elegir. Un servicio gratuito suele «dormirse» tras un rato sin visitas y tarda unos segundos en despertar.

## 1. Antes de publicar

- Pon el repositorio de GitHub en público solo cuando hayas comprobado que no contiene `.env` ni contraseñas (`git ls-files .env` no debe mostrar nada).
- Genera un `JWT_SECRET` nuevo, distinto al de tu PC:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- La cuenta `test@gmail.com` con contraseña `1234` es solo para desarrollo local. **No la crees en el servidor público**; para la demo usa el modo demo (paso 4).

## 2. Base de datos MySQL en la nube

Crea una base MySQL (o compatible) en el servicio que prefieras y apunta estos datos: servidor, puerto, usuario, contraseña y nombre de la base de datos.

No hace falta importar nada a mano: si la base está vacía, la app crea las tablas al arrancar (`AUTO_SCHEMA`). La mayoría de servicios en la nube exigen conexión cifrada, así que activa `DB_SSL=true`.

## 3. Servicio web (por ejemplo, Render)

1. Crea un **Web Service** y conéctalo a tu repositorio de GitHub.
2. Configura:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Health check path:** `/api/health`
3. Añade las **variables de entorno** (nunca subas un `.env`):

| Variable | Valor |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | los datos de tu base de datos |
| `DB_SSL` | `true` |
| `JWT_SECRET` | el que generaste arriba |
| `APP_URL` | la dirección pública que te asigne el servicio |
| `TRUST_PROXY` | `1` |
| `DEMO_MODE` | `true` |
| `REGISTRATION_OPEN` | `false` (si no quieres que se creen cuentas) |

4. Despliega. Cada `git push` a `main` vuelve a desplegar.

## 4. Modo demo

Con `DEMO_MODE=true`, la pantalla de entrada muestra **«Probar la demo sin registrarte»**. Cada pulsación crea una cuenta temporal con un CV y una candidatura de ejemplo, y las cuentas demo se borran a las 24 horas. Así no compartes ninguna contraseña y cada visitante parte de datos limpios.

Con `REGISTRATION_OPEN=false` se oculta el registro, de modo que nadie puede llenar tu base de datos con cuentas.

## 5. Comprobaciones finales

- Abre `https://tu-dirección/api/health`: debe responder `{"status":"ok", ...}`.
- Entra con la demo, analiza una oferta, añade una habilidad con «+» y exporta un PDF.
- Pon la dirección en el README y en tu portafolio.

## Si algo falla

- **El servidor no arranca:** revisa los registros del servicio. Casi siempre falta `JWT_SECRET` o algún dato de la base de datos.
- **`ECONNREFUSED` o `SSL` en los registros:** revisa `DB_HOST`, `DB_PORT` y activa `DB_SSL=true`.
- **No sale el botón de demo:** comprueba que `DEMO_MODE` vale exactamente `true`.
