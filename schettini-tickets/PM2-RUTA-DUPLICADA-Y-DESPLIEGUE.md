# PM2, rutas duplicadas y despliegue en el VPS

Este documento resume un problema real que ocurrió en producción y cómo evitar que vuelva a pasar.

## Qué pasó

En el servidor, el proceso **PM2** llamado `tickets-api` ejecutaba el backend desde una ruta **incorrecta**:

- **Incorrecta (código viejo):**  
  `/var/www/tickets/schettini-tickets/schettini-tickets/backend/src/app.js`  
  (notá `schettini-tickets` **duplicado** en la ruta.)

- **Correcta (donde hacemos `git pull` y `deploy.sh`):**  
  `/var/www/tickets/schettini-tickets/backend/src/app.js`

Mientras tanto, el equipo actualizaba el código en el directorio **correcto** y corría `bash scripts/deploy.sh`. El script hacía `pm2 restart tickets-api`, pero **PM2 seguía arrancando el `app.js` del directorio duplicado**. Resultado:

- Los cambios en Git **no** se reflejaban en la API en ejecución.
- Síntomas confusos: errores **403** en rutas que ya estaban corregidas en el repo, logs sin los mensajes nuevos de depuración, etc.

## Cómo comprobarlo en el VPS

```bash
pm2 show tickets-api
```

Revisá la fila **script path** y **exec cwd**. No debe aparecer `schettini-tickets/schettini-tickets` (doble carpeta). Deben coincidir con el repo donde corrés el deploy, por ejemplo:

- `script path`: `.../schettini-tickets/backend/src/app.js`
- `exec cwd`: `.../schettini-tickets/backend`

También podés buscar copias del middleware:

```bash
find /var/www -name "authMiddleware.js" 2>/dev/null
```

Si hay varias rutas, el proceso activo es el que indica `pm2 show tickets-api`.

## Corrección manual (una vez)

Si ya detectaste la ruta duplicada u otra carpeta equivocada:

```bash
pm2 stop tickets-api
pm2 delete tickets-api
cd /var/www/tickets/schettini-tickets/backend
pm2 start src/app.js --name tickets-api --cwd /var/www/tickets/schettini-tickets/backend
pm2 save
```

Ajustá `/var/www/tickets/schettini-tickets` si en tu VPS el clon está en otra ruta; lo importante es que **sea la misma** que usás para `git pull` y `bash scripts/deploy.sh`.

## Qué hace el repo a partir de ahora

El script `scripts/deploy.sh`:

1. Calcula la ruta esperada del backend desde la ubicación del propio `deploy.sh` (`ROOT_DIR/backend/src/app.js`).
2. Compara con lo que PM2 tiene registrado para `tickets-api`.
3. Si detecta la ruta duplicada `schettini-tickets/schettini-tickets`, o si el `app.js` no coincide con este deploy, **elimina y vuelve a crear** el proceso PM2 con `--cwd` correcto y ejecuta `pm2 save`.
4. Si todo coincide, solo hace `pm2 restart tickets-api`.

Así, cada despliegue desde el directorio correcto deja el backend alineado con ese código.

## Buenas prácticas

1. **Un solo clon “oficial”** en el VPS para esta app, y siempre el mismo directorio para `git pull` + `deploy.sh`.
2. Tras un deploy, si algo “no cuadra”, **primero** `pm2 show tickets-api` antes de depurar permisos o rutas de la API.
3. No mezclar otro clon (por ejemplo bajo `/var/www/SistemaTicket-CS/...`) con el proceso PM2 sin actualizar la configuración de PM2.

## Referencia rápida de deploy

```bash
cd /var/www/tickets/schettini-tickets
git pull
bash scripts/deploy.sh
```

(Usá la ruta real de tu clon en el servidor.)
