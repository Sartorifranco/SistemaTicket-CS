/**
 * kb-restore.js — restaura la estructura del Centro de Ayuda desde el backup.
 *
 * Para cada recurso cuyo folder_id quedó en NULL (pero tenía carpeta en el backup),
 * intenta restaurarlo en este orden:
 *   1. Si la carpeta original (por id) sigue existiendo → la asigna.
 *   2. Si no, busca una carpeta con el mismo folder_path (ej. "Drivers > Epson")
 *      y la asigna.
 *   3. Si tampoco existe esa ruta, la recrea carpeta por carpeta y asigna.
 *
 * Se ejecuta automáticamente como ÚLTIMO paso del deploy para garantizar que
 * los drivers/tutoriales/videos NUNCA queden mezclados en la raíz tras un deploy.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'schettini_tickets',
        port: process.env.DB_PORT || 3306,
    });

    try {
        const [kbExists] = await conn.query("SHOW TABLES LIKE 'knowledge_base'");
        if (kbExists.length === 0) {
            console.log('[kb-restore] Tabla knowledge_base no existe. Skip.');
            return;
        }
        const [bkExists] = await conn.query("SHOW TABLES LIKE 'kb_structure_backup'");
        if (bkExists.length === 0) {
            console.log('[kb-restore] Sin tabla de backup (primer deploy). Skip.');
            return;
        }
        const [kbCols] = await conn.query('SHOW COLUMNS FROM knowledge_base');
        if (!kbCols.some(c => c.Field === 'folder_id')) {
            console.log('[kb-restore] knowledge_base.folder_id no existe. Skip.');
            return;
        }
        const [foldersExists] = await conn.query("SHOW TABLES LIKE 'kb_folders'");
        if (foldersExists.length === 0) {
            console.log('[kb-restore] Tabla kb_folders no existe. Skip.');
            return;
        }

        // Recursos que PERDIERON su folder_id (ahora NULL/0, pero backup lo tenía)
        const [lost] = await conn.query(`
            SELECT b.resource_id, b.folder_id AS backup_folder_id, b.folder_path, b.section_id AS backup_section_id
            FROM kb_structure_backup b
            JOIN knowledge_base kb ON kb.id = b.resource_id
            WHERE b.folder_id IS NOT NULL
              AND (kb.folder_id IS NULL OR kb.folder_id = 0)
        `);

        if (lost.length === 0) {
            console.log('[kb-restore] OK · Todos los recursos conservan su carpeta. Nada que restaurar.');
            return;
        }

        console.log(`[kb-restore] Detectados ${lost.length} recursos sin carpeta que sí la tenían en backup. Restaurando...`);

        const findOrCreateFolderByPath = async (path) => {
            if (!path) return null;
            const parts = path.split(' > ').map(s => s.trim()).filter(Boolean);
            if (parts.length === 0) return null;
            let parentId = null;
            for (const name of parts) {
                let rows;
                if (parentId === null) {
                    [rows] = await conn.query(
                        'SELECT id FROM kb_folders WHERE name = ? AND parent_id IS NULL LIMIT 1',
                        [name]
                    );
                } else {
                    [rows] = await conn.query(
                        'SELECT id FROM kb_folders WHERE name = ? AND parent_id = ? LIMIT 1',
                        [name, parentId]
                    );
                }
                if (rows.length > 0) {
                    parentId = rows[0].id;
                } else {
                    // Recrear la carpeta faltante para preservar la jerarquía
                    const [ins] = await conn.query(
                        'INSERT INTO kb_folders (name, parent_id, sort_order) VALUES (?, ?, 0)',
                        [name, parentId]
                    );
                    parentId = ins.insertId;
                    console.log(`[kb-restore]   ↳ recreada carpeta faltante "${name}" (id=${parentId})`);
                }
            }
            return parentId;
        };

        let restored = 0;
        for (const row of lost) {
            let targetFolderId = null;

            // 1. ¿Sigue existiendo la carpeta original por id?
            const [byId] = await conn.query(
                'SELECT id FROM kb_folders WHERE id = ? LIMIT 1',
                [row.backup_folder_id]
            );
            if (byId.length > 0) {
                targetFolderId = row.backup_folder_id;
            } else {
                // 2. Buscar (o recrear) por ruta textual
                targetFolderId = await findOrCreateFolderByPath(row.folder_path);
            }

            if (targetFolderId) {
                await conn.query(
                    'UPDATE knowledge_base SET folder_id = ? WHERE id = ?',
                    [targetFolderId, row.resource_id]
                );
                restored++;
            }
        }

        console.log(`[kb-restore] OK · ${restored}/${lost.length} recursos restaurados a sus carpetas.`);
        if (restored < lost.length) {
            console.log(`[kb-restore] WARN · ${lost.length - restored} recursos no pudieron restaurarse (backup sin folder_path válido).`);
        }
    } catch (err) {
        console.error('[kb-restore] Error:', err.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
}

if (require.main === module) {
    run();
} else {
    module.exports = run;
}
