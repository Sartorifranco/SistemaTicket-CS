# Contexto de despliegue – VPS DonWeb

Referencia del entorno actual para desarrollo y despliegue.

## Estructura en el servidor

| Ruta en el VPS | Descripción |
|----------------|-------------|
| `/var/www/tickets/schettini-tickets/` | Raíz del monorepo |
| `/var/www/tickets/schettini-tickets/backend/` | Backend Node.js |
| `/var/www/tickets/schettini-tickets/frontend/` | Código fuente del frontend React |
| `/var/www/tickets/schettini-tickets/frontend/build/` | Build de producción servido por Nginx |

## Stack

- **Backend**: Node.js 20, puerto 5050, PM2 `tickets-api`
- **Base de datos**: MySQL 8 local, base `schettini_tickets`
- **Nginx**: Proxy inverso; raíz = build de React; `/api` y `/socket.io` → puerto 5050
- **CORS**: `.env` con `CORS_ORIGINS` apuntando a la IP pública (200.58.127.173)

## Después de hacer cambios

- **Script todo-en-uno (recomendado)**: en el VPS, `cd /var/www/tickets/schettini-tickets && bash scripts/deploy.sh` (o `bash scripts/deploy.sh --pull` si usás Git). Ver `scripts/README-DEPLOY.md`.
- **Solo Backend**: en el VPS ejecutar `pm2 restart tickets-api`
- **Solo Frontend**: ejecutar `npm run build` en `frontend/` (en el VPS o local y subir la carpeta `build`) para que Nginx tome los cambios

## URLs

Mantener la API como rutas relativas o basadas en la IP actual hasta configurar el dominio final.
