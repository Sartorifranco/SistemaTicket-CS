/**
 * Crea la tabla company_settings y el registro por defecto.
 * Uso: cd backend && node scripts/add-company-settings.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

(async () => {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS company_settings (
          id INT UNSIGNED NOT NULL,
          company_name VARCHAR(255) DEFAULT '',
          address VARCHAR(500) DEFAULT '',
          phone VARCHAR(100) DEFAULT '',
          email VARCHAR(255) DEFAULT '',
          website VARCHAR(255) DEFAULT '',
          logo_url VARCHAR(500) DEFAULT NULL,
          tax_percentage DECIMAL(5,2) DEFAULT 0,
          quote_footer_text TEXT,
          primary_color VARCHAR(20) DEFAULT '#000000',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Tabla company_settings creada o ya existe.');

      const [rows] = await conn.query('SELECT 1 FROM company_settings WHERE id = 1 LIMIT 1');
      if (rows.length === 0) {
        await conn.query(`
          INSERT INTO company_settings (id, company_name, address, phone, email, website, logo_url, tax_percentage, quote_footer_text, primary_color)
          VALUES (1, 'Tu Empresa S.A.', 'Av. Ejemplo 1234, CABA', '(011) 1234-5678', 'contacto@tuempresa.com', 'www.tuempresa.com.ar', NULL, 21.00, 'Presupuesto válido por 15 días. Precios sujetos a variación del dólar.', '#000000')
        `);
        console.log('✓ Registro por defecto (ID 1) insertado.');
      } else {
        console.log('  Registro ID 1 ya existe.');
      }
    } finally {
      conn.release();
    }
    console.log('✅ Migración completada.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
