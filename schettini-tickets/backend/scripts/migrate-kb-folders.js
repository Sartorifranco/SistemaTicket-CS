/**
 * Migración: Crear tabla kb_folders (carpetas jerárquicas) y agregar folder_id a knowledge_base.
 * Ejecutar: node scripts/migrate-kb-folders.js
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'tickets_db'
        });

        console.log('>>> Creando tabla kb_folders...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS kb_folders (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                parent_id INT UNSIGNED NULL,
                sort_order INT NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_parent (parent_id),
                CONSTRAINT fk_kb_folders_parent FOREIGN KEY (parent_id) REFERENCES kb_folders(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('>>> Tabla kb_folders creada o ya existía.');

        const [cols] = await conn.execute("SHOW COLUMNS FROM knowledge_base LIKE 'folder_id'");
        if (cols.length === 0) {
            await conn.execute('ALTER TABLE knowledge_base ADD COLUMN folder_id INT UNSIGNED NULL AFTER section_id');
            await conn.execute('ALTER TABLE knowledge_base ADD KEY idx_folder_id (folder_id)');
            await conn.execute('ALTER TABLE knowledge_base ADD CONSTRAINT fk_kb_folder FOREIGN KEY (folder_id) REFERENCES kb_folders(id) ON DELETE SET NULL ON UPDATE CASCADE');
            console.log('>>> Columna folder_id agregada a knowledge_base.');
        } else {
            console.log('>>> Columna folder_id en knowledge_base ya existe.');
        }

        console.log('>>> Migración kb_folders finalizada.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

run();
