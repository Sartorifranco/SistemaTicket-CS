# Por qué no ves los cambios del frontend (Modelos, Eliminar foto, etc.)

Si hiciste `git pull` y `bash scripts/deploy.sh` y en el navegador **siguen sin verse** los cambios (botón Eliminar foto, pestaña Modelos, etc.), suele ser por **build viejo**, **Nginx sirviendo otra carpeta** o **caché del navegador**.

## Checklist rápido (en el VPS)

```bash
cd /var/www/tickets/schettini-tickets

# 1. ¿El build actual incluye el código nuevo?
bash scripts/verificar-build-incluye-cambios.sh

# 2. ¿Qué build ve el backend?
curl -s http://localhost:5050/api/build-info

# 3. Si usás Nginx, ¿desde dónde sirve el HTML/JS?
bash scripts/verificar-frontend-nginx.sh
```

- **Deploy correcto**: el script de deploy ahora hace `rm -rf frontend/build` antes de `npm run build`, así no quedan archivos `main.*.js` viejos. Después de `deploy.sh --pull` debe aparecer un solo `main.XXXXX.js` nuevo.
- Si **Node** devuelve el `mainJs` nuevo pero en el navegador no ves cambios → **Nginx** está sirviendo otro frontend (ver sección 2).
- Si en el navegador seguís viendo lo viejo → **Ctrl+F5** o ventana de incógnito para evitar caché.

---

Si hiciste `git pull` y `bash scripts/deploy.sh` y el build se genera bien, pero en el navegador **siguen sin verse** los cambios, casi siempre es porque **el frontend que ves no lo sirve Node**, sino **Nginx** (o Apache) desde **otra carpeta** (una copia vieja).

---

## 1. Comprobar que Node sí sirve el build nuevo

En el VPS ejecutá:

```bash
# ¿Node devuelve HTML que menciona el JS nuevo?
curl -s http://localhost:5050/ | grep -o 'main\.[a-z0-9]*\.js'

# Debería salir: main.4a09f6e9.js
```

Y también:

```bash
curl -s http://localhost:5050/api/build-info
```

Deberías ver algo como: `{"frontendPath":"...","mainJs":"main.4a09f6e9.js","exists":true}`.

- Si **sí** ves `main.4a09f6e9.js` y `mainJs` en build-info → Node está sirviendo el build correcto. Entonces el problema es que **cuando entrás por el dominio (ej. https://sch-soporte.com.ar) Nginx está sirviendo otro frontend** (otra carpeta). Hay que corregir Nginx (paso 2).
- Si **no** → algo falla en Node o en la ruta del build; pero con el deploy que mostraste, lo normal es que Node esté bien y el problema sea Nginx.

---

## 2. Revisar Nginx: ¿desde dónde sirve el frontend?

En el VPS buscá la config de Nginx del sitio:

```bash
# Configs de Nginx
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/conf.d/

# Ver contenido del que use tu dominio (sch-soporte, api.sch-soporte, etc.)
cat /etc/nginx/sites-enabled/default
# o
grep -r "server_name\|root\|proxy_pass" /etc/nginx/sites-enabled/
```

Fijate:

- Si hay un **`root /var/www/...`** (o similar) que **no** sea `/var/www/tickets/schettini-tickets/frontend/build` → Nginx está sirviendo esa carpeta como frontend. Esa es la versión vieja que ves.  
- Si hay un **`proxy_pass http://127.0.0.1:5050`** (o el puerto de Node) para **todas** las rutas (o para `/` y todo lo que no sea solo `/api`), entonces Nginx solo reenvía a Node y Node sirve el build; en ese caso no deberías tener este problema.

---

## 3. Cómo corregirlo

**Opción A – Que Nginx no sirva frontend y deje todo a Node (recomendado)**

Que Nginx haga **proxy** de todo el tráfico del sitio hacia Node (puerto 5050), por ejemplo:

```nginx
server {
    listen 80;
    server_name sch-soporte.com.ar www.sch-soporte.com.ar;   # o el que uses

    location / {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Así, **todo** (HTML, JS, API) lo sirve Node desde `/var/www/tickets/schettini-tickets/frontend/build` y siempre verás el último deploy.

**Opción B – Que Nginx sirva el build que genera el deploy**

Si preferís que Nginx sirva los estáticos, el `root` tiene que apuntar **exactamente** a la carpeta del build:

```nginx
root /var/www/tickets/schettini-tickets/frontend/build;
index index.html;
location / {
    try_files $uri $uri/ /index.html;
}
```

Y las peticiones a la API (`/api/...`) mandarlas a Node con `proxy_pass`.  
Cada vez que hagas deploy, el mismo script ya actualiza esa carpeta; no hace falta copiar a otro lado.

---

## 4. Después de tocar Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Luego probá de nuevo en el navegador (recarga forzada o ventana de incógnito). Si Nginx quedó apuntando a Node (Opción A) o al `frontend/build` correcto (Opción B), deberías ver la pestaña **Modelos** y el resto de los cambios.
