/**
 * Migración: Crear resource_sections y agregar section_id, system_id a knowledge_base
 * Ejecutar: node scripts/migrate-resource-sections.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'schettini_tickets'
    });

    try {
        console.log('>>> Creando tabla resource_sections...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS resource_sections (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                icon VARCHAR(50) DEFAULT NULL,
                sort_order INT DEFAULT 0,
                description VARCHAR(500) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Insertar secciones por defecto
        const [existing] = await conn.execute('SELECT COUNT(*) as c FROM resource_sections');
        if (existing[0].c === 0) {
            console.log('>>> Insertando secciones por defecto...');
            await conn.execute(`
                INSERT INTO resource_sections (name, icon, sort_order, description) VALUES
                ('Tutoriales', 'FaVideo', 1, 'Videos y guías paso a paso para aprender a usar los sistemas.'),
                ('Drivers', 'FaDownload', 2, 'Descargá los controladores necesarios para tu equipo.'),
                ('Programas de soporte', 'FaHeadset', 3, 'Herramientas de acceso remoto y programas de asistencia.')
            `);
        }

        try {
            await conn.execute('ALTER TABLE resource_sections ADD COLUMN description VARCHAR(500) NULL');
            console.log('>>> Columna description en resource_sections agregada.');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) throw e;
            console.log('>>> description en resource_sections ya existe.');
        }

        // Actualizar descripciones por defecto para secciones existentes
        await conn.execute("UPDATE resource_sections SET description = 'Videos y guías paso a paso para aprender a usar los sistemas.' WHERE name LIKE '%Tutorial%' AND (description IS NULL OR description = '')");
        await conn.execute("UPDATE resource_sections SET description = 'Descargá los controladores necesarios para tu equipo.' WHERE name LIKE '%Driver%' AND (description IS NULL OR description = '')");
        await conn.execute("UPDATE resource_sections SET description = 'Herramientas de acceso remoto y programas de asistencia técnica.' WHERE name LIKE '%soporte%' AND (description IS NULL OR description = '')");

        // Agregar columnas a knowledge_base si no existen
        try {
            await conn.execute('ALTER TABLE knowledge_base ADD COLUMN section_id INT UNSIGNED NULL');
            console.log('>>> Columna section_id agregada.');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) throw e;
            console.log('>>> section_id ya existe.');
        }

        try {
            await conn.execute('ALTER TABLE knowledge_base ADD COLUMN system_id INT UNSIGNED NULL');
            console.log('>>> Columna system_id agregada.');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) throw e;
            console.log('>>> system_id ya existe.');
        }

        try {
            await conn.execute('ALTER TABLE knowledge_base ADD COLUMN description VARCHAR(500) NULL');
            console.log('>>> Columna description agregada.');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) throw e;
            console.log('>>> description ya existe.');
        }

        console.log('>>> Migración completada.');
    } finally {
        await conn.end();
    }
}

migrate().catch(e => { console.error(e); process.exit(1); });
