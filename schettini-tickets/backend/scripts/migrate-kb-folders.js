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

        // Migración de datos: conservar todos los recursos. Los que tienen section_id se asignan a una carpeta por sección; el resto quedan en raíz (folder_id = null).
        try {
            const [sectionCol] = await conn.execute("SHOW COLUMNS FROM knowledge_base LIKE 'section_id'");
            if (sectionCol.length > 0) {
                const [sectionsWithResources] = await conn.execute(
                    'SELECT DISTINCT kb.section_id FROM knowledge_base kb INNER JOIN resource_sections rs ON kb.section_id = rs.id WHERE kb.section_id IS NOT NULL'
                );
                for (const row of sectionsWithResources) {
                    const secId = row.section_id;
                    const [secRows] = await conn.execute('SELECT name FROM resource_sections WHERE id = ?', [secId]);
                    if (secRows.length === 0) continue;
                    const sectionName = (secRows[0].name || '').trim() || `Sección ${secId}`;
                    let [existing] = await conn.execute('SELECT id FROM kb_folders WHERE name = ? AND parent_id IS NULL LIMIT 1', [sectionName]);
                    let folderId;
                    if (existing.length > 0) {
                        folderId = existing[0].id;
                    } else {
                        const [ins] = await conn.execute('INSERT INTO kb_folders (name, parent_id, sort_order) VALUES (?, NULL, 0)', [sectionName]);
                        folderId = ins.insertId;
                    }
                    await conn.execute('UPDATE knowledge_base SET folder_id = ? WHERE section_id = ? AND (folder_id IS NULL OR folder_id = 0)', [folderId, secId]);
                }
                console.log('>>> Recursos existentes asignados a carpetas por sección (sin eliminar datos).');
            }
        } catch (e) {
            if (!e.message.includes('resource_sections') && !e.message.includes('Unknown column')) {
                console.warn('>>> Advertencia migración por sección:', e.message);
            }
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
