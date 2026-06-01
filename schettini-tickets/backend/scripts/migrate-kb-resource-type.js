/**
 * Asegura columnas de carpetas/portada y tipo flexible para videos e imágenes en knowledge_base.
 * No mueve ni borra recursos existentes.
 * Uso: cd backend && node scripts/migrate-kb-resource-type.js
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
            console.log('>>> folder_name agregada.');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) throw e;
        }

        try {
            await conn.execute('ALTER TABLE knowledge_base ADD COLUMN image_url VARCHAR(255) NULL');
            console.log('>>> image_url agregada.');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) throw e;
        }

        const [typeCol] = await conn.execute("SHOW COLUMNS FROM knowledge_base WHERE Field = 'type'");
        if (typeCol.length > 0) {
            const colType = String(typeCol[0].Type || '');
            if (colType.startsWith('enum') && (!colType.includes('image') || !colType.includes('video'))) {
                await conn.execute(
                    "ALTER TABLE knowledge_base MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'video'"
                );
                console.log('>>> type ampliado a VARCHAR(50) (video, image, link, etc.).');
            } else if (colType.startsWith('enum') && !colType.includes('image')) {
                await conn.execute(
                    "ALTER TABLE knowledge_base MODIFY COLUMN type ENUM('video','article','link','download','image') NOT NULL DEFAULT 'video'"
                );
                console.log('>>> ENUM type actualizado con image.');
            } else {
                console.log('>>> type ya compatible:', colType);
            }
        }

        console.log('>>> migrate-kb-resource-type finalizado.');
    } finally {
        await conn.end();
    }
}

migrate().catch((e) => {
    console.error(e);
    process.exit(1);
});
