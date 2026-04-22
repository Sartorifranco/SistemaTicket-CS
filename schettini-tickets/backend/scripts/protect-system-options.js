/**
 * SALVAGUARDA de system_options (accesorios, marcas, modelos, medios de pago, etc.)
 *
 * Problema histórico: migrate-repair-orders-advanced.js reinyectaba defaults
 * ("Cargador", "Mouse", "Bolso", etc.) en cada deploy aunque el cliente los hubiese
 * eliminado desde el admin. Esto es el mismo patrón que sufría el Centro de Ayuda.
 *
 * Solución: mantener una tabla `system_options_seeded` con las categorías que ya
 * fueron inicializadas al menos una vez. Una vez marcada una categoría como
 * "seeded", ningún script vuelve a inyectarle defaults. Manda el admin.
 *
 * Este script:
 *   1) Crea system_options_seeded si no existe.
 *   2) Marca como "seeded" cada categoría que YA exista en system_options hoy.
 *      (Para clientes existentes: protege inmediatamente su configuración actual.)
 *
 * Es idempotente y debe ejecutarse ANTES de migrate-repair-orders-advanced.js
 * en el deploy.
 *
 * Uso: cd backend && node scripts/protect-system-options.js
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
        // 1) Crear tabla de marcadores (idempotente).
        await conn.query(`
            CREATE TABLE IF NOT EXISTS system_options_seeded (
                category VARCHAR(50) NOT NULL,
                seeded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ Tabla system_options_seeded lista.');

        // 2) Chequear si system_options existe (en instalaciones 100% nuevas todavía no).
        const [soTable] = await conn.query("SHOW TABLES LIKE 'system_options'");
        if (soTable.length === 0) {
            console.log('= system_options aún no existe. Se blindará cuando se cree.');
            console.log('\n✅ Salvaguarda OK (sin categorías para proteger todavía).');
            return;
        }

        // 3) Marcar como "seeded" cada categoría existente actual. Esto congela la
        //    configuración vigente del cliente: nada de lo que ya configuró se pisa.
        const [cats] = await conn.query(
            'SELECT DISTINCT category FROM system_options WHERE category IS NOT NULL'
        );
        if (cats.length === 0) {
            console.log('= system_options está vacía. El migrate insertará defaults (primer deploy) y los marcará.');
        } else {
            let newMarks = 0;
            for (const { category } of cats) {
                const [res] = await conn.query(
                    'INSERT IGNORE INTO system_options_seeded (category) VALUES (?)',
                    [category]
                );
                if (res.affectedRows > 0) {
                    newMarks += 1;
                    console.log(`  + "${category}" protegida (nunca se volverán a reinyectar defaults).`);
                }
            }
            if (newMarks === 0) {
                console.log('= Todas las categorías ya estaban protegidas.');
            }
        }

        console.log('\n✅ Salvaguarda de system_options completada.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
}

run();
