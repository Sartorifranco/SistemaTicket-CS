# Cómo hacer que los cambios impacten en el hosting (DonWeb VPS)

## Idea general

| Dónde | Qué pasa |
|-------|----------|
| **Acá (Cursor / tu PC)** | Yo solo modifico archivos en tu carpeta del proyecto. Esos cambios **quedan solo en tu computadora**. |
| **El hosting (VPS DonWeb)** | Tiene su propia copia del proyecto. **No se actualiza solo**. Vos tenés que llevar los archivos nuevos o modificados desde tu PC al servidor. |

**Conclusión:** cada vez que hagamos cambios en el código, tenés que **subir esos cambios al VPS** y luego **ejecutar el script de deploy** en el servidor. Si no hacés eso, el hosting sigue con la versión vieja.

---

## Paso a paso: de “cambios acá” a “cambios en el hosting”

### 1. Nosotros trabajamos en tu PC

Cuando te digo “listo” o “ya está”, los archivos modificados o nuevos están en:

- `C:\Users\cande_adfb3yp\OneDrive\Escritorio\ST-CS\SistemaTicket-CS\schettini-tickets\`

Esa carpeta es la **versión actual** del proyecto. El VPS **no la ve** hasta que vos la sincronizás.

---

### 2. Vos subís los cambios al servidor

Tenés que hacer que el VPS tenga la misma versión que tu PC. Dos formas típicas:

#### Opción A: Con Git (recomendado si ya usás Git)

**En tu PC:**

1. Guardá todo en Cursor (archivos ya están guardados si trabajamos acá).
2. Abrí terminal en la carpeta del proyecto y ejecutá:
   ```bash
   cd C:\Users\cande_adfb3yp\OneDrive\Escritorio\ST-CS\SistemaTicket-CS\schettini-tickets
   git add .
   git commit -m "Descripción de lo que cambiamos"
   git push
   ```
   (Si tu rama no es `main`, usá el nombre que uses.)

**En el VPS (por SSH):**

1. Conectate: `ssh root@200.58.127.173` (o el usuario/IP que uses).
2. Ejecutá (el `git pull` debe hacerse desde la **raíz del repo**, donde está la carpeta `.git`):
   ```bash
   cd /var/www/tickets
   git pull
   cd schettini-tickets
   bash scripts/deploy.sh
   ```
   O en una sola línea:
   ```bash
   cd /var/www/tickets && git pull && cd schettini-tickets && bash scripts/deploy.sh
   ```
   El deploy incluye la migración de resource_sections si existe.

#### Opción B: Sin Git (subís archivos por FTP/SFTP)

1. En tu PC abrí FileZilla, WinSCP o el programa que uses.
2. Conectate al VPS (IP, usuario, contraseña o llave).
3. Subí **solo lo que cambió** (o toda la carpeta del proyecto) a:
   - `/var/www/tickets/schettini-tickets/`
   Por ejemplo: si cambiamos algo en `backend/`, subí esa carpeta; si cambiamos `frontend/`, subí esa; si agregamos `scripts/`, subí esa carpeta.
4. En el VPS (por SSH) ejecutá:
   ```bash
   cd /var/www/tickets/schettini-tickets
   bash scripts/deploy.sh
   ```

---

### 3. Qué hace el script en el servidor

Cuando corrés `bash scripts/deploy.sh` en el VPS, el script:

1. Entra a la carpeta del proyecto.
2. (Si usaste `deploy.sh --pull`, hace `git pull`.)
3. En `frontend`: instala dependencias (`npm install`) y genera el build (`npm run build`).
4. Reinicia el backend con PM2 (`pm2 restart tickets-api`).

Después de eso, Nginx ya sirve el frontend nuevo y la API corre con el código nuevo.

---

## Resumen en una frase

**Los cambios que hacemos acá impactan en el hosting cuando vos: (1) subís esos cambios al VPS (con Git o por FTP) y (2) en el VPS ejecutás `bash scripts/deploy.sh`.**

---

## Checklist rápido

Cada vez que te diga que terminamos cambios:

- [ ] ¿Guardé / tengo los archivos actualizados en mi PC?
- [ ] ¿Subí los cambios al VPS? (git push + git pull en el VPS, o subida por FTP/SFTP)
- [ ] ¿Entré por SSH al VPS y ejecuté `cd /var/www/tickets/schettini-tickets && bash scripts/deploy.sh`?

Si las tres son sí, el hosting ya tiene el impacto de lo que hicimos acá.
