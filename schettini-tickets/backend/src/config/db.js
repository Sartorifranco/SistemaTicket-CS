const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

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
    timezone: 'Z', // UTC: las fechas se guardan y leen en UTC; el frontend convierte a America/Argentina/Cordoba
    dateStrings: false // devolver fechas como Date cuando el driver lo permita (mysql2 suele devolver strings igual)
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