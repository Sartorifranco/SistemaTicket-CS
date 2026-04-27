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

    // Tabla-marcador de categorías ya inicializadas (blindaje: el admin manda).
    // protect-system-options.js la crea y la pre-popula en el deploy; acá aseguramos
    // que exista por si alguien ejecuta este script de forma aislada.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_options_seeded (
        category VARCHAR(50) NOT NULL,
        seeded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [seededRows] = await conn.query('SELECT category FROM system_options_seeded');
    const seeded = new Set(seededRows.map((r) => r.category));

    const DEFAULTS_BY_CATEGORY = {
      equipment_type: [
        ['Impresora', 1], ['PC / Notebook', 2], ['Monitor', 3], ['Otro', 99]
      ],
      brand: [
        ['HP', 1], ['Epson', 2], ['Canon', 3], ['Otro', 99]
      ],
      model: [
        ['Genérico', 1], ['ThinkPad', 2], ['Pavilion', 3], ['Inspiron', 4], ['Otro', 99]
      ],
      labor_price: [
        ['5000', 1], ['10000', 2], ['15000', 3]
      ],
      payment_method: [
        ['Efectivo', 1], ['Transferencia', 2], ['Tarjeta', 3], ['Mercado Pago', 4]
      ],
      accessories: [
        ['Cargador', 1], ['Mouse', 2], ['Bolso', 3], ['Cable', 4], ['Ninguno', 99]
      ],
      remote_platform: [
        ['TeamViewer', 1], ['AnyDesk', 2], ['Google Meet', 3]
      ]
    };

    // Por cada categoría: sólo se seedea si (a) NO está marcada como protegida y
    // (b) la categoría no tiene ni una sola fila todavía. Una vez seedeada se
    // marca como protegida y nunca más se inyectan defaults (aunque el admin los borre).
    for (const [category, items] of Object.entries(DEFAULTS_BY_CATEGORY)) {
      if (seeded.has(category)) {
        console.log(`  · ${category}: protegida, se respeta la configuración del admin.`);
        continue;
      }
      const [existing] = await conn.query(
        'SELECT COUNT(*) AS n FROM system_options WHERE category = ?',
        [category]
      );
      if (existing[0].n > 0) {
        // Ya había datos: el cliente probablemente ya configuró esta categoría en
        // un deploy anterior; la marcamos protegida y no tocamos nada.
        await conn.query('INSERT IGNORE INTO system_options_seeded (category) VALUES (?)', [category]);
        console.log(`  · ${category}: tenía ${existing[0].n} items preexistentes → se marca como protegida.`);
        seeded.add(category);
        continue;
      }
      for (const [val, ord] of items) {
        await conn.query(
          'INSERT INTO system_options (category, value, sort_order) VALUES (?, ?, ?)',
          [category, val, ord]
        );
      }
      await conn.query('INSERT IGNORE INTO system_options_seeded (category) VALUES (?)', [category]);
      seeded.add(category);
      console.log(`  ✓ ${category}: defaults insertados (${items.length}) y protegida para futuros deploys.`);
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
    const [colsRows] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repair_orders'
    `);
    const existingCols = new Set(colsRows.map(r => r.COLUMN_NAME));
    const wantedCols = ['id', 'equipment_type', 'model', 'serial_number', 'reported_fault', 'included_accessories', 'is_warranty'];
    const selectCols = wantedCols.filter(c => existingCols.has(c));
    if (!selectCols.includes('id')) {
      console.log('  (repair_orders sin columna id, omitiendo migración de items)');
    } else {
      const [orders] = await conn.query(`
        SELECT ${selectCols.join(', ')}
        FROM repair_orders
      `);
      const [existingItems] = await conn.query('SELECT COUNT(*) as n FROM repair_order_items');
      if (existingItems[0].n === 0 && orders.length > 0) {
        for (const o of orders) {
          const equipment_type = selectCols.includes('equipment_type') ? (o.equipment_type || null) : null;
          const model = selectCols.includes('model') ? (o.model || null) : null;
          const serial_number = selectCols.includes('serial_number') ? (o.serial_number || null) : null;
          const reported_fault = selectCols.includes('reported_fault') ? (o.reported_fault || null) : null;
          const included_accessories = selectCols.includes('included_accessories') ? (o.included_accessories || null) : null;
          const is_warranty = selectCols.includes('is_warranty') ? (o.is_warranty || 0) : 0;
          await conn.query(
            `INSERT INTO repair_order_items (repair_order_id, equipment_type, model, serial_number, reported_fault, included_accessories, is_warranty)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [o.id, equipment_type, model, serial_number, reported_fault, included_accessories, is_warranty]
          );
        }
        console.log('✓ Migrados', orders.length, 'registros a repair_order_items');
      } else if (existingItems[0].n > 0) {
        console.log('  (repair_order_items ya tiene datos, omitiendo)');
      } else if (orders.length === 0) {
        console.log('  (no hay órdenes en repair_orders)');
      }
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
      if (!existingCols.has(col)) {
        console.log('  (columna', col, 'no existe, omitiendo)');
        continue;
      }
      try {
        await conn.query(`ALTER TABLE repair_orders DROP COLUMN \`${col}\``);
        console.log('✓ Eliminada columna', col);
      } catch (e) {
        if (e.code === 'ER_CANT_DROP_FIELD' || e.code === 'ER_BAD_FIELD_ERROR') console.log('  (columna', col, 'no existe)');
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
