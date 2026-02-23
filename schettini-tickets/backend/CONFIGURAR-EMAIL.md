# Configuración del correo para recuperación de contraseña

Para que funcione **"Recuperar contraseña"** y el envío de emails del sistema, Tenes que configurar un servidor SMTP en el back.

## Variables necesarias

En el archivo `backend/.env` (o en las variables de entorno del VPS), debes definir:

```
EMAIL_HOST=smtp.tu-proveedor.com
EMAIL_PORT=587
EMAIL_USER=tu_correo@dominio.com
EMAIL_PASS=tu_contraseña_o_app_password
FRONTEND_URL=https://tu-dominio.com
```

- **EMAIL_HOST**: Servidor SMTP (ver ejemplos abajo).
- **EMAIL_PORT**: Generalmente `587` (TLS) o `465` (SSL).
- **EMAIL_USER**: Correo desde el cual se enviarán los emails.
- **EMAIL_PASS**: Contraseña del correo o **contraseña de aplicación**.
- **FRONTEND_URL**: URL pública de tu app (ej.: `https://tickets.tudominio.com`), usada en el enlace de recuperación.

---

## Ejemplos según proveedor

### Gmail
1. Activa la verificación en 2 pasos en tu cuenta de Google.
2. Crea una **Contraseña de aplicación**: Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones.
3. En `.env`:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=tu_correo@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```

### Outlook / Hotmail
```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=tu_correo@outlook.com
EMAIL_PASS=tu_contraseña
```

### DonWeb (hosting)
DonWeb suele ofrecer SMTP. En el panel de control busca "Correo" o "Email" y usa:
- Host: `mail.tudominio.com` o el que te indique DonWeb
- Puerto: `587` o `465`
- Usuario y contraseña del correo del dominio



---

## En el VPS (producción)

Si corres el back en un VPS (ej. DonWeb):

1. Edita las variables de entorno del proceso (PM2 o ), o
2. Crea/edita el archivo `backend/.env` en el servidor con los valores correctos.
3. Reinicia el back: `pm2 restart tickets-api`

---

## Verificación

Si al solicitar recuperar contraseña ves *"No se pudo enviar el correo. Verifica la configuración de email del servidor"*:

1. Confirma que las 4 variables (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS) están definidas.
2. En Gmail, usa siempre una **Contraseña de aplicación**, no la contraseña normal.
3. Revisa el puerto (587 o 465 según tu proveedor).
4. Revisa los logs del back (`pm2 logs tickets-api`) para más detalle del error.
