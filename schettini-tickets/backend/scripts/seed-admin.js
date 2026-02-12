/**
 * Crea el usuario administrador inicial (si no existe).
 * Ejecutar desde la raíz del backend: node scripts/seed-admin.js
 * Requiere: .env con DB_* y que las tablas ya existan (ej. después de schema.sql).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@local',
  password: 'admin123', // Cambiar después del primer login
  role: 'admin'
};

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets',
    port: process.env.DB_PORT || 3306
  });

  try {
    const [rows] = await pool.query(
      "SELECT id FROM Users WHERE email = ? OR username = ? LIMIT 1",
      [DEFAULT_ADMIN.email, DEFAULT_ADMIN.username]
    );
    if (rows.length > 0) {
      console.log('Ya existe un usuario admin. No se crea otro.');
      process.exit(0);
      return;
    }

    const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    await pool.query(
      `INSERT INTO Users (username, email, password, role, is_active, status, plan, last_login)
       VALUES (?, ?, ?, ?, 1, 'active', 'Free', NOW())`,
      [DEFAULT_ADMIN.username, DEFAULT_ADMIN.email, hash, DEFAULT_ADMIN.role]
    );
    console.log('Usuario admin creado correctamente.');
    console.log('  Usuario: ' + DEFAULT_ADMIN.username + ' (o correo: ' + DEFAULT_ADMIN.email + ')');
    console.log('  Contraseña: ' + DEFAULT_ADMIN.password);
    console.log('  Cambiá la contraseña después del primer acceso.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
