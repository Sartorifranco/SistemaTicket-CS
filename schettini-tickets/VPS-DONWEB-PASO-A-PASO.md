# VPS DonWeb – Todo en el mismo lugar (paso a paso)

En el VPS vas a tener: **MySQL**, **backend Node.js** y **frontend React** servidos desde el mismo servidor. Por ahora usamos la IP o el dominio que te dé DonWeb; cuando compres un dominio, lo agregamos.

---

## Parte 1: Crear el VPS en DonWeb

1. Entrá a **DonWeb** (donweb.com) con tu cuenta.
2. Buscá **VPS** o **Servidores virtuales** en el menú.
3. Elegí un plan (cualquiera que sea Linux, por ejemplo Ubuntu 22.04).
4. Comprá/activá el VPS. DonWeb te va a dar:
   - **IP del servidor** (ej. `190.xxx.xxx.xxx`)
   - **Usuario** para SSH (a veces `root` o un usuario que vos definís)
   - **Contraseña** o **llave SSH** para entrar

Anotá la **IP** y cómo entrás por SSH (usuario + contraseña o llave). Lo vas a usar en todos los pasos siguientes.

---

## Parte 2: Conectarte al VPS por primera vez

En tu PC (Windows):

- **Opción A – PowerShell (Windows 10/11)**  
  Abrí PowerShell y ejecutá:
  ```powershell
  ssh root@TU_IP
  ```
  (Reemplazá `TU_IP` por la IP que te dio DonWeb y `root` por el usuario si es otro.)  
  Si pide contraseña, pegá la que te dieron.

- **Opción B – PuTTY**  
  Descargá PuTTY, abrilo, en “Host” poné la IP, puerto 22, “Open”, y cuando pida usuario y contraseña ingresálos.

Cuando veas una terminal con algo como `root@nombre:~#`, ya estás dentro del VPS.

---

## Parte 3: Instalar todo en el VPS (copiá y pegá por bloques)

Ejecutá estos comandos **uno por uno o por bloques** en la sesión SSH. Si algo pide confirmación (Y/n), escribí `y` y Enter.

### 3.1 Actualizar el sistema

```bash
apt update && apt upgrade -y
```

### 3.2 Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

Deberías ver la versión de Node (v20.x) y de npm.

### 3.3 Instalar MySQL

```bash
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql
```

Seguridad básica de MySQL (te va a pedir contraseña para root y algunas preguntas; podés elegir las opciones por defecto):

```bash
mysql_secure_installation
```

- Contraseña para root: elegí una y anotala.
- “Remove anonymous users?” → Y  
- “Disallow root login remotely?” → Y  
- “Remove test database?” → Y  
- “Reload privilege tables?” → Y  

### 3.4 Crear la base de datos y el usuario para la app

Entrá a MySQL (te pide la contraseña de root que definiste):

```bash
mysql -u root -p
```

Dentro del cliente MySQL, ejecutá (cambiá `TU_PASSWORD_SEGURO` por una contraseña que quieras para la app):

```sql
CREATE DATABASE schettini_tickets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tickets'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURO';
GRANT ALL PRIVILEGES ON schettini_tickets.* TO 'tickets'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Anotá: usuario `tickets`, contraseña la que pusiste, base `schettini_tickets`. La vas a usar en el `.env` del backend.

### 3.5 Instalar Nginx (para HTTPS y proxy)

```bash
apt install -y nginx
systemctl enable nginx
```

Por ahora no editamos Nginx; primero subimos la app. Después configuramos Nginx para que escuche en el puerto 80 y envíe todo al Node (puerto 5050).

### 3.6 Instalar PM2 (para que Node quede siempre corriendo)

```bash
npm install -g pm2
```

---

## Parte 4: Subir el proyecto al VPS

Tenés dos formas.

### Opción A – Subir por FTP/SFTP (FileZilla, WinSCP)

1. En FileZilla o WinSCP: conectate por **SFTP** a la IP del VPS, usuario `root` (o el que uses) y contraseña/llave SSH.
2. Creá la carpeta `/var/www/tickets`.
3. Subí:
   - Toda la carpeta **backend** dentro de `/var/www/tickets/` (que quede `/var/www/tickets/backend/...`).
   - La carpeta **frontend** completa; después en el VPS generamos el build (o subís ya la carpeta **build** si la generaste en tu PC).

### Opción B – Clonar con Git (si el proyecto está en GitHub/GitLab)

En el VPS:

```bash
apt install -y git
mkdir -p /var/www
cd /var/www
git clone https://github.com/TU_USUARIO/TU_REPO.git tickets
cd tickets
# Si el repo tiene la estructura schettini-tickets/backend y schettini-tickets/frontend:
# mv schettini-tickets/* . && rmdir schettini-tickets   # solo si hace falta
```

Después tenés que tener en `/var/www/tickets` algo como:

- `backend/` (con `src/`, `package.json`, etc.)
- `frontend/` (con `src/`, `package.json`, etc.)

---

## Parte 5: Configurar el backend en el VPS

### 5.1 Instalar dependencias del backend

```bash
cd /var/www/tickets/backend
npm install --production
```

### 5.2 Crear el archivo .env

```bash
nano .env
```

Pegá algo como esto y **reemplazá** los valores (JWT_SECRET, DB_PASSWORD, FRONTEND_URL, email, etc.):

```env
PORT=5050
NODE_ENV=production

JWT_SECRET=genera_una_clave_larga_aleatoria_de_64_caracteres

DB_HOST=localhost
DB_PORT=3306
DB_USER=tickets
DB_PASSWORD=TU_PASSWORD_SEGURO_QUE_PUSISTE_EN_MYSQL
DB_NAME=schettini_tickets
DB_SSL=false

EMAIL_HOST=smtp.ejemplo.com
EMAIL_PORT=587
EMAIL_USER=tu_email@ejemplo.com
EMAIL_PASS=tu_password_email

FRONTEND_URL=http://TU_IP_DEL_VPS

# Para que el navegador permita requests desde tu sitio (reemplazá por la IP real del VPS)
CORS_ORIGINS=http://TU_IP_DEL_VPS
```

Para generar un JWT_SECRET seguro en el VPS:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiá el resultado y usalo como `JWT_SECRET`. Guardá en nano: `Ctrl+O`, Enter, `Ctrl+X`.

### 5.3 Importar tu base de datos (si ya tenés datos en MySQL Workbench)

- En **MySQL Workbench** (en tu PC): conectate a tu base local, **Server → Data Export** y exportá la base a un archivo `.sql`.
- Subí ese `.sql` al VPS (por ejemplo a `/var/www/tickets/backup.sql`) con FileZilla/WinSCP.
- En el VPS:

```bash
mysql -u tickets -p schettini_tickets < /var/www/tickets/backup.sql
```

(Te pide la contraseña del usuario `tickets`.)  
Si todavía no tenés tablas, más adelante tendrás que crear el esquema (tablas) según lo que use la app; si ya tenés todo en Workbench, con este export/import alcanza.

### 5.4 Probar que el backend arranca

```bash
cd /var/www/tickets/backend
node src/app.js
```

Deberías ver algo como “Servidor corriendo en puerto 5050”. Probá desde tu PC en el navegador: `http://TU_IP:5050` (si no hay firewall bloqueando). Si ves algo del backend, está bien. Detené el proceso con `Ctrl+C`.

### 5.5 Dejarlo corriendo con PM2

```bash
cd /var/www/tickets/backend
pm2 start src/app.js --name tickets-api
pm2 save
pm2 startup
```

Ejecutá el comando que te imprima `pm2 startup` (suele ser una línea con `sudo env ...`). Así el backend se reinicia solo si se reinicia el VPS.

---

## Parte 6: Frontend (build y que lo sirva el backend)

El backend ya está preparado para servir la carpeta `frontend/build` desde la misma app. Hay dos formas.

### Opción A – Build en el VPS (recomendado)

```bash
cd /var/www/tickets/frontend
npm install
npm run build
```

No hace falta definir ninguna variable de entorno: el frontend está preparado para usar la **misma URL** del sitio (mismo dominio o IP) para la API y los sockets cuando todo está en el mismo servidor.

### Opción B – Build en tu PC y subir la carpeta build

En tu PC, en la carpeta del frontend:

```powershell
cd schettini-tickets\frontend
npm install
npm run build
```

Si la app y la API van a estar en la **misma URL** (por ejemplo `http://TU_IP`), no hace falta definir variables: el frontend usará esa misma URL. Si por algún motivo quisieras forzar la URL del backend:

```powershell
$env:REACT_APP_API_URL = "http://TU_IP_DEL_VPS"
$env:REACT_APP_SOCKET_URL = "http://TU_IP_DEL_VPS"
npm run build
```

Después subí por SFTP **el contenido** de la carpeta `frontend/build` a `/var/www/tickets/frontend/build/` en el VPS (de forma que exista `/var/www/tickets/frontend/build/index.html`, etc.).

---

## Parte 7: Nginx para que todo funcione por el puerto 80 (y después HTTPS)

Así el sitio se ve en `http://TU_IP` (y más adelante en tu dominio).

```bash
nano /etc/nginx/sites-available/tickets
```

Pegá esta configuración (reemplazá `TU_IP` por la IP de tu VPS si querés, o dejalo con `_` que acepta cualquier nombre):

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/tickets/frontend/build;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:5050;
        proxy_set_header Host $host;
    }
}
```

Guardá: `Ctrl+O`, Enter, `Ctrl+X`.

Activar el sitio y recargar Nginx:

```bash
ln -sf /etc/nginx/sites-available/tickets /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Abrí en el navegador: `http://TU_IP`. Deberías ver la app de tickets (login, etc.). Si la API y el frontend están en la misma IP, no hace falta tocar CORS.

---

## Parte 8: Firewall (recomendado)

Solo dejamos SSH, HTTP y HTTPS; el puerto 5050 no hace falta abrirlo al mundo porque Nginx hace de proxy:

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
ufw status
```

---

## Resumen de qué tenés que hacer vos

1. **DonWeb**: crear el VPS y anotar IP + usuario + contraseña SSH.  
2. **Conectarte por SSH** y seguir las partes 3 a 7 (instalar Node, MySQL, Nginx, PM2; crear base y usuario; subir proyecto; .env; build frontend; Nginx).  
3. **Ferozo**: no hace falta hacer nada ahí por ahora.  
4. **Dominio**: cuando compres uno, lo agregamos (DNS apuntando a la IP del VPS, y en Nginx + CORS el nuevo dominio).

Si querés, en el siguiente mensaje podés decirme: (1) si ya tenés el VPS creado y la IP, (2) si preferís subir el proyecto por Git o por FTP, y (3) si ya tenés un archivo `.sql` exportado de MySQL Workbench. Con eso te doy los comandos exactos adaptados a tu caso (por ejemplo solo los de subida y .env).

---

## Cuando más adelante compres un dominio

- En el panel del dominio: creá un registro **A** apuntando a la **IP del VPS**.
- En el VPS, editás Nginx y CORS:
  - En `/etc/nginx/sites-available/tickets`: cambiá `server_name _;` por `server_name tudominio.com www.tudominio.com;`.
  - En el `.env` del backend agregá: `CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com`.
  - Reiniciá: `pm2 restart tickets-api` y `systemctl reload nginx`.

Opcional: HTTPS con Let's Encrypt (certbot). Cuando quieras, lo hacemos en un paso más.
