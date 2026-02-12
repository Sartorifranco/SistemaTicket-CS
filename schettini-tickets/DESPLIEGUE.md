# Guía de despliegue – Sistema de Tickets

Resumen de lo que revisé en el código, los cambios que hice y lo que necesitas para subir el proyecto a un hosting de pago.

---

## 1. Revisión del código (resumen)

### Lo que está bien
- **Frontend**: React (Create React App) con detección de entorno: en local usa `http://localhost:5050`, en producción usa `https://backend-schettini.onrender.com`.
- **Backend**: Express, MySQL (`config/db.js`), Socket.IO, JWT, CORS configurado para `sistematicket-cs.onrender.com`.
- **Notificaciones**: Se usan con MySQL (pool) en controladores y utils; no dependen del modelo Sequelize.

### Cambios realizados
1. **`backend/src/utils/notificationSender.js`**  
   La consulta usaba sintaxis de PostgreSQL (`$1, $2...`). Se cambió a MySQL (`?`) y a las columnas que usa el resto del proyecto (`related_id`, `related_type`, `is_read`).

2. **Firebase opcional**  
   - `frontend/src/config/firebaseConfig.ts`: solo inicializa Firebase si existen variables `REACT_APP_FIREBASE_*` con valores reales (no los placeholders).  
   - `frontend/src/components/Hardware/DynamicSpecsViewer.tsx`: si Firebase no está configurado, muestra un mensaje en lugar de romper.  
   (Ese componente no se usa en ninguna ruta por ahora; si más adelante lo usas, configura Firebase o seguirá mostrando el mensaje.)

3. **`backend/src/models/Notification.js`**  
   Tiene un comentario aclarando que es legacy (Sequelize) y no se usa; las notificaciones usan MySQL vía `config/db.js`. No hace falta tocar este archivo para el despliegue.

---

## 2. Qué necesitas para subir a un hosting de pago

### A) Base de datos MySQL
- Hosting con **MySQL** (o MariaDB) accesible desde internet.
- Debes tener ya creada la base (por ejemplo `schettini_tickets`) y el usuario con permisos.
- En muchos hostings de pago (ej. Render, Railway, Planethoster, etc.) te dan:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`
- Si el proveedor usa conexión segura, en el backend deberás poner `DB_SSL=true` en las variables de entorno.

### B) Backend (Node.js)
- Servidor o servicio que ejecute **Node.js** (v18 o superior recomendado).
- Variables de entorno (las mismas que en `backend/.env.example`):
  - `PORT` (a veces lo asigna el hosting).
  - `JWT_SECRET` (clave larga y aleatoria).
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, y si aplica `DB_SSL`.
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` (para correos).
  - `FRONTEND_URL`: URL final del frontend (ej. `https://tudominio.com`).
  - Opcional: `CORS_ORIGINS` con la URL del frontend si el backend no la tiene ya en código (en `app.js` ya está `sistematicket-cs.onrender.com`).
- Carpeta **uploads**: en entornos serverless o efímeros puede no persistir; si necesitas que los archivos subidos se guarden, usa almacenamiento externo (S3, etc.) o un disco persistente según lo que ofrezca tu hosting.

### C) Frontend (React estático)
- Después de `npm run build` en la carpeta `frontend`, subes el contenido de **`frontend/build`** a:
  - Un hosting estático (Netlify, Vercel, o la carpeta “web” / “public_html” de tu plan), o
  - El mismo dominio que use el backend si el hosting sirve estáticos desde una carpeta.
- Si cambias la URL del backend (ya no es Render), debes actualizar en el código:
  - **`frontend/src/config/axiosConfig.ts`**: `API_BASE_URL` en producción.
  - **`frontend/src/App.tsx`**: `SOCKET_URL` dentro de `SocketConnectionManager`.
  Y volver a hacer `npm run build` antes de subir.

### D) URLs y CORS
- En el backend (`app.js`) están permitidos:
  - `http://localhost:3000`, `http://localhost:5050`, `http://127.0.0.1:3000`
  - `https://sistematicket-cs.onrender.com`
- Si tu frontend en producción va a estar en **otra URL** (ej. `https://tudominio.com`), debes:
  - Añadirla en `allowedOrigins` en `backend/src/app.js`, o
  - Definir `CORS_ORIGINS=https://tudominio.com` en las variables de entorno del backend.

### E) Firebase (opcional)
- Solo si vas a usar el componente de especificaciones en vivo (Firebase):
  - Crear proyecto en Firebase Console y obtener la config.
  - En el frontend (variables de entorno del build):  
    `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`.  
  - Si no configuras nada, la app sigue funcionando; ese componente mostrará el mensaje de “Firebase no configurado”.

---

## 3. Pasos típicos para subir

1. **Base de datos**  
   Crear la base MySQL en tu proveedor e importar tu schema/datos si ya los tienes.

2. **Backend**  
   - En el hosting: crear servicio/sitio Node.js, apuntar el inicio a `node src/app.js` (raíz = carpeta `backend`).
   - Configurar todas las variables de entorno anteriores (sin subir `.env` al repo).
   - Desplegar la carpeta `backend` (sin `node_modules`; el hosting suele hacer `npm install --production`).

3. **Frontend**  
   - En tu PC: en `frontend`, ejecutar `npm install` y luego `npm run build`.
   - Subir el contenido de `frontend/build` al hosting estático o a la carpeta que te indique el panel.
   - Si el backend está en otra URL, actualizar `API_BASE_URL` y `SOCKET_URL` como se indicó y volver a hacer build.

4. **Probar**  
   - Login, creación de tickets, notificaciones en tiempo real (Socket.IO) y envío de emails (activación, etc.).

---

## 4. Lo que necesito de ti para ayudarte a subirlo

Para dejarlo listo para **tu** hosting concreto, conviene que me digas:

1. **Qué hosting vas a usar** (nombre y tipo: compartido, VPS, Render, Railway, Planethoster, etc.).
2. **Si ya tienes** dominio y/o URL final del frontend y del backend (ej. `https://app.tudominio.com`, `https://api.tudominio.com`).
3. **Si ya tienes** base MySQL creada y si te dieron `DB_HOST`, `DB_PORT`, etc. (solo indica “sí” o “no”, no hace falta pegar contraseñas).
4. **Si quieres** que te deje las URLs del backend/frontend parametrizadas por variable de entorno en el frontend (para que no tengas que tocar código al cambiar de dominio).

Con eso puedo indicarte los pasos exactos en tu panel o sugerir cambios concretos en el repo (por ejemplo, usar `REACT_APP_API_URL` y `REACT_APP_SOCKET_URL` en el build).
