/**
 * Migración: Agregar folder_name e image_url a knowledge_base (Descargas/Drivers)
 * Ejecutar desde raíz del backend: node scripts/migrate-drivers-folders-images.js
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
        try {
            await conn.execute("ALTER TABLE knowledge_base ADD COLUMN folder_name VARCHAR(255) NOT NULL DEFAULT 'General'");
            console.log('>>> Columna folder_name agregada a knowledge_base.');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) throw e;
            console.log('>>> folder_name ya existe.');
        }

        try {
            await conn.execute('ALTER TABLE knowledge_base ADD COLUMN image_url VARCHAR(255) NULL');
            console.log('>>> Columna image_url agregada a knowledge_base.');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) throw e;
            console.log('>>> image_url ya existe.');
        }

        console.log('>>> Migración finalizada.');
    } finally {
        await conn.end();
    }
}

migrate().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
