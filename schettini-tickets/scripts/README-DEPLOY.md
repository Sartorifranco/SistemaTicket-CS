# Scripts de despliegue

Hay dos formas de usar los scripts según **dónde** quieras ejecutarlos.

---

## 1. Ejecutar en el VPS (recomendado después de subir cambios)

Entrás por SSH al servidor y corrés el script ahí. Así se hace el build en el servidor y se reinicia PM2.

### Primera vez: dar permiso de ejecución

```bash
cd /var/www/tickets/schettini-tickets
chmod +x scripts/deploy.sh
```

### Cada vez que despliegues

**Si actualizás el código con Git (git pull en el servidor):**

```bash
cd /var/www/tickets/schettini-tickets
bash scripts/deploy.sh --pull
```

Eso hace: `git pull` → `npm run build` (frontend) → `pm2 restart tickets-api`.

**Si subís los archivos por FTP/SFTP (sin Git en el servidor):**

```bash
cd /var/www/tickets/schettini-tickets
bash scripts/deploy.sh
```

Eso hace: `npm run build` (frontend) → `pm2 restart tickets-api` (sin git pull).

---

## 2. Ejecutar en tu PC (Windows) con PowerShell

Desde la carpeta del proyecto en tu PC podés hacer el build local y, si tenés SSH configurado, disparar el despliegue en el VPS sin entrar a mano.

### Primera vez: configurar el script

Abrí `scripts/deploy.ps1` y completá (arriba del archivo):

- `$SERVER_USER`: usuario SSH del VPS (ej. `root`)
- `$SERVER_IP`: IP del VPS (ej. `200.58.127.173`)
- `$REMOTE_PATH`: ruta del proyecto en el VPS (ej. `/var/www/tickets/schettini-tickets`)

### Cómo usarlo

1. Abrí PowerShell.
2. Andá a la raíz del proyecto (donde están las carpetas `backend` y `frontend`):

   ```powershell
   cd C:\Users\...\SistemaTicket-CS\schettini-tickets
   ```

3. Ejecutá:

   ```powershell
   .\scripts\deploy.ps1
   ```

4. El script:
   - Hace **build del frontend** en tu PC (para ver si compila bien).
   - Te pregunta: **¿Desplegar en el VPS por SSH? (s/n)**.
   - Si elegís **s**: se conecta al VPS por SSH y ejecuta `deploy.sh --pull` allí (git pull + build en el servidor + pm2 restart). Necesitás tener **SSH** configurado (ej. `ssh root@200.58.127.173` sin contraseña, con llave).
   - Si elegís **n**: solo te recuerda que en el VPS ejecutes `bash scripts/deploy.sh` después de subir los archivos.

### Si no usás Git en el VPS

Si en el servidor no hacés `git pull` y subís todo por FTP/SFTP:

1. Subí los archivos nuevos al VPS.
2. Entrá por SSH al VPS y ejecutá solo el script **en el servidor** (sin `--pull`):

   ```bash
   cd /var/www/tickets/schettini-tickets
   bash scripts/deploy.sh
   ```

---

## Resumen

| Dónde      | Comando / acción |
|-----------|-------------------|
| **En el VPS** (con Git)   | `cd /var/www/tickets/schettini-tickets && bash scripts/deploy.sh --pull` |
| **En el VPS** (sin Git)   | `cd /var/www/tickets/schettini-tickets && bash scripts/deploy.sh` |
| **En tu PC (PowerShell)** | `cd ...\schettini-tickets` y luego `.\scripts\deploy.ps1` (opcionalmente desplegar por SSH) |
