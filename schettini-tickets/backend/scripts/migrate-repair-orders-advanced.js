/**
 * Migración avanzada: Refactor del módulo Órdenes de Taller
 * - system_options (opciones dinámicas)
 * - Users (campos cliente)
 * - repair_orders (logística, financiero, gestión)
 * - repair_order_items (multiequipo)
 * - company_settings (nuevos campos)
 *
 * Uso: cd backend && node scripts/migrate-repair-orders-advanced.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const run = async (conn, sql, label) => {
  try {
    await conn.query(sql);
    console.log('✓', label || sql.substring(0, 60) + '...');
    return true;
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_TABLE' || e.code === 'ER_DUP_COLNAME') {
      console.log('  (ya existe, omitiendo)');
      return false;
    }
    throw e;
  }
};

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets'
  });

  try {
    console.log('\n=== 1. Tabla system_options ===\n');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_options (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        category VARCHAR(50) NOT NULL,
        value VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Tabla system_options creada');

    const [optCount] = await conn.query('SELECT COUNT(*) as n FROM system_options');
    if (optCount[0].n === 0) {
      const defaults = [
        ['equipment_type', 'Impresora', 1],
        ['equipment_type', 'PC / Notebook', 2],
        ['equipment_type', 'Monitor', 3],
        ['equipment_type', 'Otro', 99],
        ['brand', 'HP', 1],
        ['brand', 'Epson', 2],
        ['brand', 'Canon', 3],
        ['brand', 'Otro', 99],
        ['model', 'Genérico', 1],
        ['labor_price', '5000', 1],
        ['labor_price', '10000', 2],
        ['labor_price', '15000', 3],
        ['payment_method', 'Efectivo', 1],
        ['payment_method', 'Transferencia', 2],
        ['payment_method', 'Tarjeta', 3],
        ['payment_method', 'Mercado Pago', 4]
      ];
      for (const [cat, val, ord] of defaults) {
        await conn.query('INSERT INTO system_options (category, value, sort_order) VALUES (?, ?, ?)', [cat, val, ord]);
      }
      console.log('✓ Datos por defecto en system_options');
    }

    console.log('\n=== 2. Users: nuevos campos cliente ===\n');
    const userCols = [
      ['iva_condition', "VARCHAR(50) NULL COMMENT 'Inscripto, Monotributista, Exento'"],
      ['address', 'VARCHAR(500) NULL'],
      ['city', 'VARCHAR(100) NULL'],
      ['province', 'VARCHAR(100) NULL'],
      ['zip_code', 'VARCHAR(20) NULL']
    ];
    for (const [col, def] of userCols) {
      await run(conn, `ALTER TABLE Users ADD COLUMN ${col} ${def}`, `Users.${col}`);
    }

    console.log('\n=== 3. repair_order_items (multiequipo) ===\n');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS repair_order_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        repair_order_id INT UNSIGNED NOT NULL,
        equipment_type VARCHAR(255) NULL,
        brand VARCHAR(255) NULL,
        model VARCHAR(255) NULL,
        serial_number VARCHAR(255) NULL,
        reported_fault TEXT NULL,
        included_accessories TEXT NULL,
        is_warranty TINYINT(1) NOT NULL DEFAULT 0,
        warranty_invoice VARCHAR(500) NULL,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_repair_order_id (repair_order_id),
        CONSTRAINT fk_roi_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Tabla repair_order_items creada');

    console.log('\n=== 4. Migrar datos de equipos a repair_order_items ===\n');
    const [orders] = await conn.query(`
      SELECT id, equipment_type, model, serial_number, reported_fault, included_accessories, is_warranty
      FROM repair_orders
    `);
    const [existingItems] = await conn.query('SELECT COUNT(*) as n FROM repair_order_items');
    if (existingItems[0].n === 0 && orders.length > 0) {
      for (const o of orders) {
        await conn.query(
          `INSERT INTO repair_order_items (repair_order_id, equipment_type, model, serial_number, reported_fault, included_accessories, is_warranty)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            o.id,
            o.equipment_type || null,
            o.model || null,
            o.serial_number || null,
            o.reported_fault || null,
            o.included_accessories || null,
            o.is_warranty || 0
          ]
        );
      }
      console.log('✓ Migrados', orders.length, 'registros a repair_order_items');
    }

    console.log('\n=== 5. repair_orders: nuevos campos ===\n');
    const roCols = [
      ['order_type', "VARCHAR(50) NULL DEFAULT 'Taller' COMMENT 'Taller, Domicilio, Remoto, Cadeteria'"],
      ['visit_date', 'DATETIME NULL'],
      ['remote_platform', 'VARCHAR(255) NULL'],
      ['delivery_address', 'TEXT NULL'],
      ['payment_method', 'VARCHAR(100) NULL'],
      ['payment_operation_number', 'VARCHAR(100) NULL'],
      ['priority', "VARCHAR(20) NULL DEFAULT 'Normal' COMMENT 'Normal, Urgente, Critico'"]
    ];
    for (const [col, def] of roCols) {
      await run(conn, `ALTER TABLE repair_orders ADD COLUMN ${col} ${def}`, `repair_orders.${col}`);
    }

    console.log('\n=== 6. repair_orders: eliminar columnas de equipo (migradas a items) ===\n');
    const dropCols = ['equipment_type', 'model', 'serial_number', 'reported_fault', 'included_accessories', 'is_warranty'];
    for (const col of dropCols) {
      try {
        await conn.query(`ALTER TABLE repair_orders DROP COLUMN \`${col}\``);
        console.log('✓ Eliminada columna', col);
      } catch (e) {
        if (e.code === 'ER_CANT_DROP_FIELD') console.log('  (columna', col, 'no existe)');
        else throw e;
      }
    }

    console.log('\n=== 7. company_settings: nuevos campos ===\n');
    const csCols = [
      ['usd_exchange_rate', 'DECIMAL(12,4) NULL'],
      ['list_price_surcharge_percent', 'DECIMAL(5,2) NULL COMMENT "Recargo % para tarjetas"'],
      ['default_iva_percent', 'DECIMAL(5,2) NULL'],
      ['legal_footer_text', 'TEXT NULL COMMENT "Términos y condiciones PDF"']
    ];
    for (const [col, def] of csCols) {
      await run(conn, `ALTER TABLE company_settings ADD COLUMN ${col} ${def}`, `company_settings.${col}`);
    }

    console.log('\n✅ Migración completada.\n');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
