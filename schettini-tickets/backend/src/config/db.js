const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const {
    resolveRepairOrderPaymentsColumnTypes,
    buildCreateRepairOrderPaymentsTableSql
} = require('../utils/repairOrderPaymentsSchema');

dotenv.config();

// Configuración de SSL: Necesario para Railway/Render/Azure
// Si la variable DB_SSL es 'true', activamos la seguridad. Si no (localhost), no.
const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: sslConfig, // ✅ CRÍTICO PARA LA NUBE
    // Argentina (UTC-3): NOW() y created_at se guardan como hora local. El frontend interpreta
    // "YYYY-MM-DD HH:mm:ss" sin Z como -03:00 (ver frontend/utils/dateFormatter.ts).
    timezone: '-03:00',
    dateStrings: true
});

pool.getConnection()
    .then(connection => {
        console.log('✅ Conectado a la base de datos MySQL!');
        // Verificamos la zona horaria
        connection.query("SELECT @@session.time_zone AS tz;")
            .then(([rows]) => {
                console.log(`🕒 Zona horaria DB: ${rows[0].tz}`);
                connection.release();
            })
            .catch(err => {
                console.error('⚠️ Error verificando zona horaria:', err);
                connection.release();
            });
    })
    .catch(err => {
        console.error('❌ Error FATAL conectando a la BD:', err.message);
        // No matamos el proceso (process.exit) para que Railway pueda reintentar
    });

/**
 * Auto-migración forzada: asegura que repair_orders tenga is_warranty y warranty_status.
 * Se ejecuta al arranque del servidor (antes de listen) para corregir entornos donde
 * la app se conecta a un MySQL que no tiene esas columnas.
 */
async function syncDatabase() {
    let conn;
    try {
        conn = await pool.getConnection();
        const [isWarrantyCols] = await conn.query("SHOW COLUMNS FROM repair_orders LIKE 'is_warranty'");
        if (isWarrantyCols.length === 0) {
            await conn.query('ALTER TABLE repair_orders ADD COLUMN is_warranty TINYINT(1) NOT NULL DEFAULT 0');
            console.log('[syncDatabase] Columna repair_orders.is_warranty creada.');
        } else {
            console.log('[syncDatabase] Columna repair_orders.is_warranty ya existe.');
        }

        const [warrantyStatusCols] = await conn.query("SHOW COLUMNS FROM repair_orders LIKE 'warranty_status'");
        if (warrantyStatusCols.length === 0) {
            await conn.query('ALTER TABLE repair_orders ADD COLUMN warranty_status VARCHAR(50) NULL');
            console.log('[syncDatabase] Columna repair_orders.warranty_status creada.');
        } else {
            console.log('[syncDatabase] Columna repair_orders.warranty_status ya existe.');
        }

        const [createdByCols] = await conn.query("SHOW COLUMNS FROM repair_orders LIKE 'created_by_user_id'");
        if (createdByCols.length === 0) {
            await conn.query(
                'ALTER TABLE repair_orders ADD COLUMN created_by_user_id INT UNSIGNED NULL COMMENT "Usuario que dio de alta la orden"'
            );
            console.log('[syncDatabase] Columna repair_orders.created_by_user_id creada.');
            try {
                await conn.query(
                    'ALTER TABLE repair_orders ADD CONSTRAINT fk_ro_created_by FOREIGN KEY (created_by_user_id) REFERENCES Users(id) ON DELETE SET NULL'
                );
                console.log('[syncDatabase] FK fk_ro_created_by creada.');
            } catch (fkErr) {
                console.warn('[syncDatabase] No se pudo crear FK fk_ro_created_by (puede existir o faltar índice):', fkErr.message);
            }
        } else {
            console.log('[syncDatabase] Columna repair_orders.created_by_user_id ya existe.');
        }

        const [ropTables] = await conn.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repair_order_payments'"
        );
        if (ropTables.length === 0) {
            const ropTypes = await resolveRepairOrderPaymentsColumnTypes(conn);
            await conn.query(buildCreateRepairOrderPaymentsTableSql(ropTypes));
            console.log('[syncDatabase] Tabla repair_order_payments creada.');
        } else {
            console.log('[syncDatabase] Tabla repair_order_payments ya existe.');
        }

        const [sfTables] = await conn.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_forms'"
        );
        if (sfTables.length === 0) {
            await conn.query(`
CREATE TABLE system_forms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  external_url VARCHAR(2048) NOT NULL,
  action_type VARCHAR(32) NOT NULL DEFAULT 'iframe',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_system_forms_active (is_active),
  KEY idx_system_forms_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('[syncDatabase] Tabla system_forms creada.');
        } else {
            const [sfActionCol] = await conn.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_forms' AND COLUMN_NAME = 'action_type'`
            );
            if (sfActionCol.length === 0) {
                await conn.query(`
                    ALTER TABLE system_forms
                    ADD COLUMN action_type VARCHAR(32) NOT NULL DEFAULT 'iframe'
                    COMMENT 'iframe | external_link'
                    AFTER external_url
                `);
                console.log('[syncDatabase] Columna system_forms.action_type agregada.');
            } else {
                console.log('[syncDatabase] Tabla system_forms ya existe.');
            }
        }
    } catch (err) {
        if (err.message && (err.message.includes("doesn't exist") || err.message.includes('Unknown table'))) {
            console.warn('[syncDatabase] Tabla repair_orders no existe en este esquema, omitiendo columnas is_warranty/warranty_status.');
        } else {
            console.error('[syncDatabase] Error:', err.message);
        }
    } finally {
        if (conn) conn.release();
    }
}

module.exports = pool;
module.exports.syncDatabase = syncDatabase;