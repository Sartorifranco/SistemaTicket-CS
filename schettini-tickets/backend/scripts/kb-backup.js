/**
 * kb-backup.js — snapshot seguro de la estructura del Centro de Ayuda.
 *
 * Guarda en la tabla `kb_structure_backup` el estado actual de cada recurso:
 *   - folder_id (id de carpeta)
 *   - folder_path (ruta textual tipo "Drivers > Epson"; útil si los IDs cambian)
 *   - folder_name (legacy)
 *   - section_id (sección)
 *
 * Este script es IDEMPOTENTE y NO-DESTRUCTIVO: actualiza entradas existentes
 * y agrega las nuevas, pero nunca borra el backup histórico. Se ejecuta:
 *   - ANTES de cada deploy (manual)
 *   - Automáticamente cada 10 min desde el cron del backend (src/services/cronJobs.js)
 *
 * Junto con kb-restore.js garantiza que los drivers/tutoriales/videos NUNCA
 * pierdan su carpeta tras un deploy o migración.
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
        // 1. knowledge_base debe existir
        const [kbExists] = await conn.query("SHOW TABLES LIKE 'knowledge_base'");
        if (kbExists.length === 0) {
            console.log('[kb-backup] Tabla knowledge_base no existe. Skip.');
            return;
        }

        // 2. Asegurar tabla de backup
        await conn.query(`
            CREATE TABLE IF NOT EXISTS kb_structure_backup (
                resource_id INT UNSIGNED NOT NULL PRIMARY KEY,
                folder_id INT UNSIGNED NULL,
                folder_name VARCHAR(255) NULL,
                folder_path VARCHAR(1024) NULL,
                section_id INT UNSIGNED NULL,
                backed_up_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                KEY idx_folder_id (folder_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 3. Detectar columnas disponibles en knowledge_base (compat con esquemas viejos)
        const [kbCols] = await conn.query('SHOW COLUMNS FROM knowledge_base');
        const colNames = kbCols.map(c => c.Field);
        const hasFolderId = colNames.includes('folder_id');
        const hasFolderName = colNames.includes('folder_name');
        const hasSectionId = colNames.includes('section_id');

        if (!hasFolderId) {
            console.log('[kb-backup] knowledge_base.folder_id no existe aún. Skip (correr migrate-kb-folders.js primero).');
            return;
        }

        // 4. Construir mapa de carpetas para calcular rutas
        let folders = [];
        try {
            const [rows] = await conn.query('SELECT id, name, parent_id FROM kb_folders');
            folders = rows;
        } catch (e) {
            if (!e.message.includes('kb_folders')) throw e;
        }
        const foldersMap = new Map(folders.map(f => [f.id, f]));
        const pathOf = (folderId) => {
            if (!folderId) return null;
            const parts = [];
            const seen = new Set();
            let cur = folderId;
            while (cur && !seen.has(cur)) {
                seen.add(cur);
                const f = foldersMap.get(cur);
                if (!f) break;
                parts.unshift(f.name);
                cur = f.parent_id;
            }
            return parts.length > 0 ? parts.join(' > ') : null;
        };

        // 5. Snapshot: una entrada por recurso existente
        const selectCols = ['id', 'folder_id'];
        if (hasFolderName) selectCols.push('folder_name');
        if (hasSectionId) selectCols.push('section_id');
        const [resources] = await conn.query(`SELECT ${selectCols.join(', ')} FROM knowledge_base`);

        let updated = 0;
        for (const r of resources) {
            const folderPath = pathOf(r.folder_id);
            await conn.query(
                `INSERT INTO kb_structure_backup (resource_id, folder_id, folder_name, folder_path, section_id, backed_up_at)
                 VALUES (?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                   folder_id = VALUES(folder_id),
                   folder_name = VALUES(folder_name),
                   folder_path = VALUES(folder_path),
                   section_id = VALUES(section_id),
                   backed_up_at = NOW()`,
                [r.id, r.folder_id || null, r.folder_name || null, folderPath, r.section_id || null]
            );
            updated++;
        }
        console.log(`[kb-backup] OK · ${updated} recursos respaldados en kb_structure_backup.`);
    } catch (err) {
        console.error('[kb-backup] Error:', err.message);
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
