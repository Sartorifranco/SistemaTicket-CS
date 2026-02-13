# Configurar el dominio sch-soporte.com.ar

Guía para que la web de tickets funcione con **sch-soporte.com.ar** en lugar de la IP.

---

## 1. DNS en DonWeb (apuntar el dominio al VPS)

En el panel de DonWeb donde administrás el dominio **sch-soporte.com.ar**:

1. Entrá a **Dominios** → **sch-soporte.com.ar** → **Zona DNS** o **Registros DNS**.
2. Creá o editá estos registros:

| Tipo | Nombre/Host | Valor/Destino | TTL |
|------|-------------|---------------|-----|
| **A** | `@` (o vacío) | `200.58.127.173` | 3600 |
| **A** | `www` | `200.58.127.173` | 3600 |

Si ya existe un registro CNAME para `www`, reemplazalo por el registro A.

3. Guardá los cambios. La propagación puede tardar **5 minutos a 48 horas** (normalmente menos de 1 hora).

---

## 2. Nginx en el VPS

Conectate por SSH al VPS:

```bash
ssh root@200.58.127.173
```

Editá la configuración de Nginx:

```bash
nano /etc/nginx/sites-available/tickets
```

Buscá la línea `server_name _;` y cambiarla por:

```nginx
server_name sch-soporte.com.ar www.sch-soporte.com.ar 200.58.127.173;
```

Así el sitio responde tanto por el dominio como por la IP. Guardá con `Ctrl+O`, Enter, `Ctrl+X`.

Verificá y recargá Nginx:

```bash
nginx -t
systemctl reload nginx
```

---

## 3. CORS en el backend (ya está en el código)

El backend ya incluye `sch-soporte.com.ar` y `www.sch-soporte.com.ar` en CORS. Si usás la variable `CORS_ORIGINS` en el `.env` del backend, agregá:

```env
CORS_ORIGINS=https://sch-soporte.com.ar,https://www.sch-soporte.com.ar,http://sch-soporte.com.ar,http://www.sch-soporte.com.ar
```

Reiniciá el backend:

```bash
cd /var/www/tickets/schettini-tickets
pm2 restart tickets-api
```

---

## 4. Frontend (build con el nuevo dominio)

El frontend usa la misma URL del sitio para la API cuando está en producción. Para que funcione bien con el dominio:

**Opción A – Dejar que use el dominio automáticamente (recomendado)**

En el VPS, en el `.env` del frontend (`/var/www/tickets/schettini-tickets/frontend/.env`), podés dejar `REACT_APP_API_URL` vacío o comentado. Así usará `window.location.origin` (el dominio actual).

**Opción B – Forzar el dominio**

```env
REACT_APP_API_URL=https://sch-soporte.com.ar
```

Luego hacé el deploy:

```bash
cd /var/www/tickets/schettini-tickets
bash scripts/deploy.sh
```

---

## 5. HTTPS con Let's Encrypt (recomendado)

Para que funcione con **https://sch-soporte.com.ar**:

1. Verificá que el dominio ya apunte a la IP (paso 1).
2. En el VPS:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d sch-soporte.com.ar -d www.sch-soporte.com.ar
```

Seguí las instrucciones (email, aceptar términos). Certbot configurará HTTPS en Nginx.

3. Reiniciá el backend para que CORS acepte HTTPS:

```bash
pm2 restart tickets-api
```

---

## Resumen de comandos (en el VPS)

```bash
# 1. Editar Nginx
nano /etc/nginx/sites-available/tickets
# Cambiar server_name _; por: server_name sch-soporte.com.ar www.sch-soporte.com.ar 200.58.127.173;

# 2. Recargar Nginx
nginx -t && systemctl reload nginx

# 3. Deploy (build + reinicio backend)
cd /var/www/tickets/schettini-tickets
git pull
bash scripts/deploy.sh

# 4. (Opcional) HTTPS
certbot --nginx -d sch-soporte.com.ar -d www.sch-soporte.com.ar
pm2 restart tickets-api
```

---

## Checklist

- [ ] DNS: registros A para `@` y `www` apuntando a `200.58.127.173`
- [ ] Nginx: `server_name` actualizado
- [ ] Deploy ejecutado (`git pull` + `bash scripts/deploy.sh`)
- [ ] (Opcional) Certbot para HTTPS
- [ ] Probar: `http://sch-soporte.com.ar` y `https://sch-soporte.com.ar`
