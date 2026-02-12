# Desplegar Sistema de Tickets en DonWeb (Ferozo)

Guía paso a paso para usar tu hosting DonWeb con MySQL Workbench y subir el sistema de tickets.

---

## Resumen rápido

| Qué | Dónde | Cómo |
|-----|--------|------|
| **Base de datos MySQL** | DonWeb (Ferozo) → Bases de datos | Creas la base en el panel; te conectás desde **MySQL Workbench** con el host/usuario/contraseña que te den. |
| **Frontend (React)** | DonWeb (Ferozo) → FTP | Generás el build en tu PC y subís la carpeta `build` por FTP. |
| **Backend (Node.js)** | **No corre en hosting compartido** | Hay que ponerlo en un VPS o en un servicio que soporte Node (ver más abajo). |

---

## 1. Base de datos: seguir usando MySQL Workbench

Podés seguir usando MySQL Workbench. La idea es que la base “viva” en DonWeb y Workbench solo sea tu cliente para administrarla.

### 1.1 Crear la base en Ferozo

1. En el panel Ferozo entrá a **Bases de datos**.
2. Creá una nueva base MySQL (nombre sugerido: `schettini_tickets` o el que uses ahora).
3. Anotá:
   - **Host** (ej. `mysql.ferozo.com` o el que muestre el panel)
   - **Usuario**
   - **Contraseña**
   - **Nombre de la base**

Si el panel no muestra “acceso remoto”, en la ayuda o soporte de DonWeb preguntá: “¿Cuál es el host de MySQL para conectarme por fuera del hosting?” (a veces es el mismo dominio o una IP).

### 1.2 Conectar desde MySQL Workbench

1. Abrí MySQL Workbench.
2. Nueva conexión:
   - **Host**: el que te dio Ferozo (no uses `localhost` si la base está en DonWeb).
   - **Puerto**: 3306 (salvo que te indiquen otro).
   - **Usuario** y **Contraseña**: los de la base que creaste.
3. Probá la conexión y conectate.

### 1.3 Dejar la base con tu esquema actual

- Si **ya tenés** el esquema y datos en Workbench (en tu MySQL local):
  - En Workbench: **Server → Data Export** → elegí tu base local → exportá a un `.sql`.
  - Conectado a la base **remota** de DonWeb en Workbench: **Server → Data Import** → importá ese `.sql`.
- Si **empezás de cero** en DonWeb, creá las tablas que usa la app (usuarios, tickets, notificaciones, etc.). Si tenés un script `.sql` del proyecto, ejecutalo sobre la base de DonWeb desde Workbench.

Así seguís usando Workbench para todo: la base está en DonWeb y vos la administrás desde tu PC.

---

## 2. Frontend: subir por FTP a DonWeb

El sitio que se ve (React) sí puede estar 100 % en DonWeb.

### 2.1 Generar el build en tu PC

En la carpeta del **frontend**:

```bash
cd schettini-tickets/frontend
npm install
npm run build
```

Si tu backend en producción va a estar en otra URL (no Render), antes del build definí las variables (en PowerShell, en la misma ventana donde corrés `npm run build`):

```powershell
$env:REACT_APP_API_URL = "https://TU-URL-DEL-BACKEND.com"
$env:REACT_APP_SOCKET_URL = "https://TU-URL-DEL-BACKEND.com"
npm run build
```

Reemplazá `TU-URL-DEL-BACKEND.com` por la URL real del backend (la tendrás cuando definas dónde hostear el Node.js; ver punto 3).

### 2.2 Subir por FTP

En la captura tenés:

- **FTP**: `ftp://a0021444` y `ftp://ftp@a0021444.ferozo.com`
- Usuario/contraseña: los de tu cuenta FTP de Ferozo (suelen ser los del panel o los que te dio DonWeb).

Pasos:

1. Conectate con un cliente FTP (FileZilla, WinSCP, o el que uses):
   - Host: `a0021444.ferozo.com` (o el que indique DonWeb)
   - Usuario y contraseña FTP
2. Entrá a la carpeta que sirve la web (típicamente `public_html` o `www` o `httpdocs`).
3. **Subí todo el contenido** de la carpeta `schettini-tickets/frontend/build` **dentro** de esa carpeta (no la carpeta “build” en sí; los archivos que están *dentro* de `build`: `index.html`, carpeta `static`, etc.).

Así `a0021444.ferozo.com` (o tu dominio si lo apuntás ahí) mostrará la app React.

---

## 3. Backend (Node.js): el detalle importante

En planes compartidos (Ferozo/DonWeb típico) **no se ejecutan aplicaciones Node.js**. Solo PHP, archivos estáticos y MySQL. Por eso el backend no se “sube por FTP” como el frontend: tiene que correr en un servidor que soporte Node.

Opciones:

### Opción A – VPS de DonWeb (recomendada si querés todo en DonWeb)

- DonWeb vende **VPS**. Ahí sí podés instalar Node.js y correr el backend.
- Pasos generales:
  1. Contratar un VPS (Linux).
  2. Instalar Node.js (v18 o 20).
  3. Subir la carpeta `backend`, configurar variables de entorno (`.env`) con el host/usuario/contraseña de la base que creaste en Ferozo.
  4. Ejecutar `node src/app.js` (o con PM2 para que quede siempre corriendo).
  5. Opcional: poner Nginx delante y HTTPS.

Si elegís esta opción, cuando tengas la URL del VPS (ej. `https://api.tudominio.com`), usás esa URL en `REACT_APP_API_URL` y `REACT_APP_SOCKET_URL` al hacer el build del frontend (punto 2.1).

### Opción B – Otro servicio solo para el backend (Node.js)

- Servicios que soportan Node gratis o barato: **Railway**, **Fly.io**, **Cyclic**, etc. (vos no querés Render, pero la idea es la misma).
- Subís solo la carpeta `backend`, configurás las variables de entorno (sobre todo `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` apuntando a la base de **DonWeb**) y te dan una URL (ej. `https://tu-app.railway.app`).
- Esa URL es la que ponés en `REACT_APP_API_URL` y `REACT_APP_SOCKET_URL` al construir el frontend.

La base de datos puede seguir 100 % en DonWeb y manejada con MySQL Workbench; solo el backend corre en otro lado.

### Opción C – Preguntar a DonWeb

- En el panel Ferozo buscá si hay algo como “Node.js”, “Aplicaciones” o “Entorno Node”. Si tu plan intermedio lo tiene, te dirían cómo subir una app Node.
- Si no hay nada de eso, confirmarán que el backend debe ir en VPS u otro servicio.

---

## 4. CORS y dominio

En el backend ya están permitidos:

- `https://a0021444.ferozo.com`
- `http://a0021444.ferozo.com`

Si más adelante usás otro dominio (ej. `www.tudominio.com`), en el backend podés agregar en las variables de entorno:

```env
CORS_ORIGINS=https://www.tudominio.com,https://tudominio.com
```

El backend lee `CORS_ORIGINS` y suma esos orígenes a la lista.

---

## 5. Resumen de qué necesito de vos para seguir

Para armarte los pasos exactos (o scripts) según lo que elijas:

1. **Base de datos**: ¿Ya creaste la base MySQL en Ferozo y tenés host / usuario / contraseña / nombre de base? (No me pases la contraseña; solo si ya está creada y tenés los datos.)
2. **Backend**: ¿Preferís **VPS de DonWeb** o usar otro servicio (Railway, Fly.io, etc.) solo para el backend?
3. **Dominio**: ¿Vas a usar solo `a0021444.ferozo.com` o tenés otro dominio (ej. de DonWeb) para el sitio?

Con eso te digo el siguiente paso concreto (por ejemplo: “crear la base así”, “poner estas variables en el backend”, “ejecutar este comando para el build”) y, si querés, te preparo un pequeño script para que solo tengas que poner la URL del backend y hacer el build + subir por FTP.

Sí es posible seguir usando MySQL Workbench: la base puede estar en DonWeb y vos te conectás desde Workbench a esa base remota.
