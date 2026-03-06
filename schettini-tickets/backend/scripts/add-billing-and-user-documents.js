/**
 * Migración Fase 2 Clientes: billing_type, contracted_services en Users y tabla user_documents.
 * Ejecutar: node backend/scripts/add-billing-and-user-documents.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'schettini_tickets',
        port: process.env.DB_PORT || 3306
    });
    try {
        const conn = await pool.getConnection();
        console.log('Conectado a la base de datos.');

        const [cols] = await conn.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME IN ('billing_type','contracted_services')`
        );
        const hasBilling = cols.some(c => c.COLUMN_NAME === 'billing_type');
        const hasContracted = cols.some(c => c.COLUMN_NAME === 'contracted_services');

        if (!hasBilling) {
            await conn.query("ALTER TABLE Users ADD COLUMN billing_type VARCHAR(100) NULL DEFAULT NULL AFTER zip_code");
            console.log('Columna Users.billing_type agregada.');
        } else console.log('Users.billing_type ya existe.');
        if (!hasContracted) {
            await conn.query("ALTER TABLE Users ADD COLUMN contracted_services TEXT NULL DEFAULT NULL COMMENT 'JSON array o string' AFTER billing_type");
            console.log('Columna Users.contracted_services agregada.');
        } else console.log('Users.contracted_services ya existe.');

        const [tables] = await conn.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_documents'"
        );
        if (tables.length === 0) {
            await conn.query(`
                CREATE TABLE user_documents (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    user_id INT UNSIGNED NOT NULL,
                    document_name VARCHAR(255) NOT NULL,
                    document_type VARCHAR(80) NOT NULL DEFAULT 'other',
                    file_path VARCHAR(500) NOT NULL,
                    uploaded_by INT UNSIGNED NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    KEY idx_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('Tabla user_documents creada.');
        } else console.log('Tabla user_documents ya existe.');

        conn.release();
        console.log('Migración completada.');
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
run();
