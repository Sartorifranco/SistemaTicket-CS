/**
 * Migración idempotente: Área de Reciclaje en repair_orders.
 *  - recycling_notes (TEXT)
 *  - recycling_photos (JSON)
 *  - status incluye 'abandonado' (ya cubierto por run-alter-status-enum.js, acá solo
 *    se asegura por si se ejecuta en un entorno que no lo tenga).
 *
 * También agrega 'viewer' al ENUM role de Users si hace falta.
 *
 * Uso: cd backend && node scripts/add-recycling-columns.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'schettini_tickets',
    });
    try {
        const ensureColumn = async (table, column, ddl) => {
            const [rows] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
            if (rows.length === 0) {
                await conn.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
                console.log(`✓ ${table}.${column} agregada.`);
            } else {
                console.log(`= ${table}.${column} ya existe.`);
            }
        };

        await ensureColumn(
            'repair_orders',
            'recycling_notes',
            "recycling_notes TEXT NULL COMMENT 'Observaciones internas de reciclaje'"
        );
        await ensureColumn(
            'repair_orders',
            'recycling_photos',
            "recycling_photos JSON NULL COMMENT 'URLs de fotos del estado del equipo al reciclar'"
        );

        // Hacer client_id NULLABLE y asegurar que la FK hacia Users exista con el tipo correcto.
        // DISEÑO SEGURO:
        //   - Sólo tocamos la FK si realmente hay que cambiar NULL/tipo; si ya está bien, no hacemos nada.
        //   - Antes de recrear la FK, detectamos huérfanos (client_id que NO existen en Users) y los
        //     dejamos en NULL (equivalente a ON DELETE SET NULL que es la semántica deseada). Esto
        //     evita que la FK falle por datos sucios heredados de migraciones viejas.
        //   - Todo va protegido con try/catch por bloque: si una parte falla, el resto igual
        //     se intenta y el deploy no se cae (el controller tolera client_id NULL sin FK).
        try {
            const [ccol] = await conn.query("SHOW COLUMNS FROM repair_orders LIKE 'client_id'");
            const [uidCol] = await conn.query("SHOW COLUMNS FROM Users LIKE 'id'");
            const refType = uidCol[0]?.Type || 'int(10) unsigned';

            const [totalRows] = await conn.query('SELECT COUNT(*) AS c FROM repair_orders');
            console.log(`  · repair_orders tiene ${totalRows[0].c} filas antes de la migración.`);

            if (ccol.length > 0) {
                const isNullable = String(ccol[0].Null).toUpperCase() === 'YES';
                const typeMatches = (ccol[0].Type || '').toLowerCase() === refType.toLowerCase();

                if (!isNullable || !typeMatches) {
                    // Dropear TODAS las FK que existan sobre client_id (sin importar nombre).
                    const [fks] = await conn.query(
                        `SELECT rc.CONSTRAINT_NAME AS name FROM information_schema.REFERENTIAL_CONSTRAINTS rc
                         JOIN information_schema.KEY_COLUMN_USAGE kcu
                           ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
                         WHERE rc.CONSTRAINT_SCHEMA = DATABASE() AND kcu.TABLE_NAME = 'repair_orders' AND kcu.COLUMN_NAME = 'client_id'`
                    );
                    for (const fk of fks) {
                        await conn.query(`ALTER TABLE repair_orders DROP FOREIGN KEY \`${fk.name}\``);
                        console.log(`  - FK ${fk.name} dropeada temporalmente.`);
                    }
                    await conn.query(`ALTER TABLE repair_orders MODIFY COLUMN client_id ${refType} NULL`);
                    console.log(`✓ repair_orders.client_id → ${refType} NULL.`);
                } else {
                    console.log(`= repair_orders.client_id ya es ${refType} NULL.`);
                }
            }

            // Limpiar huérfanos ANTES de recrear la FK (evita fallo por datos sucios legados).
            const [orphans] = await conn.query(
                `SELECT COUNT(*) AS c FROM repair_orders ro
                 LEFT JOIN Users u ON u.id = ro.client_id
                 WHERE ro.client_id IS NOT NULL AND u.id IS NULL`
            );
            if (orphans[0].c > 0) {
                console.log(`  · ${orphans[0].c} orden(es) con client_id huérfano → se van a dejar en NULL.`);
                await conn.query(
                    `UPDATE repair_orders ro LEFT JOIN Users u ON u.id = ro.client_id
                     SET ro.client_id = NULL WHERE ro.client_id IS NOT NULL AND u.id IS NULL`
                );
                console.log('  ✓ Huérfanos saneados (client_id = NULL).');
            } else {
                console.log('  · Sin huérfanos en client_id.');
            }

            // Asegurar que exista UNA FK válida sobre client_id → Users.id con ON DELETE SET NULL.
            const [existingFks] = await conn.query(
                `SELECT rc.CONSTRAINT_NAME AS name, rc.DELETE_RULE AS onDelete
                 FROM information_schema.REFERENTIAL_CONSTRAINTS rc
                 JOIN information_schema.KEY_COLUMN_USAGE kcu
                   ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
                 WHERE rc.CONSTRAINT_SCHEMA = DATABASE() AND kcu.TABLE_NAME = 'repair_orders' AND kcu.COLUMN_NAME = 'client_id'`
            );
            if (existingFks.length === 0) {
                try {
                    await conn.query(
                        "ALTER TABLE repair_orders ADD CONSTRAINT fk_ro_client FOREIGN KEY (client_id) REFERENCES Users(id) ON DELETE SET NULL"
                    );
                    console.log('  + FK fk_ro_client creada con ON DELETE SET NULL.');
                } catch (e2) {
                    console.warn(`  [WARN] No se pudo crear fk_ro_client: ${e2.message}`);
                    console.warn('         La app seguirá funcionando porque client_id ya acepta NULL.');
                }
            } else {
                console.log(`= FK existente sobre client_id: ${existingFks.map((f) => `${f.name}(${f.onDelete})`).join(', ')}`);
            }
        } catch (e) {
            console.warn(`[WARN] No se pudo ajustar client_id: ${e.message}`);
        }

        // Asegurar rol viewer en Users (si el ENUM aún no lo tiene). Idempotente: modifica
        // si falta; si ya está la columna es VARCHAR (tras fix-role-varchar.js), skip.
        try {
            const [colInfo] = await conn.query("SHOW COLUMNS FROM Users LIKE 'role'");
            if (colInfo.length > 0) {
                const type = (colInfo[0].Type || '').toLowerCase();
                if (type.startsWith('enum(') && !type.includes("'viewer'")) {
                    await conn.query(
                        "ALTER TABLE Users MODIFY COLUMN role ENUM('admin','supervisor','agent','viewer','client') NOT NULL DEFAULT 'client'"
                    );
                    console.log(`✓ Users.role ENUM ampliado con 'viewer'.`);
                } else {
                    console.log(`= Users.role ya soporta 'viewer' (o es VARCHAR).`);
                }
            }
        } catch (e) {
            console.warn(`[WARN] No se pudo ajustar Users.role: ${e.message}`);
        }

        console.log('\n✅ Migración recycling/viewer completada.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
}

run();
