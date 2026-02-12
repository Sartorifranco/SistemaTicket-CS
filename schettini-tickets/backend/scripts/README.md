# Scripts de base de datos

## Primera vez (base vacía)

1. **Crear las tablas**  
   Desde la carpeta `backend` (o desde la raíz del proyecto con la base ya creada en MySQL):

   ```bash
   mysql -u TUS_USUARIO -p schettini_tickets < scripts/schema.sql
   ```

   Reemplazá `TUS_USUARIO` por el usuario de MySQL (ej. `tickets` o `root`). Te pedirá la contraseña.

2. **Crear el usuario admin inicial**  
   Con el `.env` del backend configurado (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME):

   ```bash
   npm run seed
   ```

   Se crea el usuario:
   - **Usuario/correo:** `admin` o `admin@local`
   - **Contraseña:** `admin123`  
   Cambiá la contraseña después del primer acceso.

## Archivos

- **schema.sql**: crea todas las tablas (Users, Companies, Departments, Tickets, notifications, etc.).
- **seed-admin.js**: crea el usuario admin si no existe (se ejecuta con `npm run seed`).
