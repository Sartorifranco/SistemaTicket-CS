/**
 * Campos para centralizar planillas (PDF + Google Forms) en activations.
 * Uso: cd backend && node scripts/migrate-activations-planilla-fields.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

async function columnExists(name) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activations' AND COLUMN_NAME = ?`,
    [name]
  );
  return rows.length > 0;
}

async function run() {
  const [tables] = await pool.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activations'"
  );
  if (tables.length === 0) {
    console.log('⚠️  Tabla activations no existe. Ejecutá primero: node scripts/create-activations.js o el SQL create-activations.sql');
    process.exit(1);
  }

  if (!(await columnExists('attachment_url'))) {
    await pool.query(`ALTER TABLE activations ADD COLUMN attachment_url VARCHAR(2048) NULL AFTER form_data`);
    console.log('✅ Columna attachment_url agregada.');
  }

  if (!(await columnExists('raw_data'))) {
    await pool.query(`ALTER TABLE activations ADD COLUMN raw_data JSON NULL COMMENT 'Respuestas Google Forms' AFTER attachment_url`);
    console.log('✅ Columna raw_data agregada.');
  }

  if (!(await columnExists('equipment'))) {
    await pool.query(`ALTER TABLE activations ADD COLUMN equipment VARCHAR(255) NULL COMMENT 'Producto/Equipo o título planilla' AFTER invoice_number`);
    console.log('✅ Columna equipment agregada.');
  }

  if (!(await columnExists('guest_email'))) {
    await pool.query(`ALTER TABLE activations ADD COLUMN guest_email VARCHAR(255) NULL AFTER client_id`);
    console.log('✅ Columna guest_email agregada.');
  }

  const [clientCol] = await pool.query(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activations' AND COLUMN_NAME = 'client_id'`
  );
  if (clientCol[0] && clientCol[0].IS_NULLABLE === 'NO') {
    await pool.query(`ALTER TABLE activations MODIFY client_id INT UNSIGNED NULL`);
    console.log('✅ client_id ahora permite NULL (webhooks sin usuario registrado).');
  }

  console.log('✅ Migración activations (planillas) completada.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
