/**
 * Migración: fecha del lead en promotion_interests (modelo OfferLeads).
 * Ejecutar desde la carpeta backend: node scripts/add-promotion-interests-created-at.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

(async () => {
    try {
        const conn = await pool.getConnection();
        try {
            await conn.query(`
                ALTER TABLE promotion_interests
                ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            `);
            console.log('✓ Columna promotion_interests.created_at agregada.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060 || e.message?.includes('Duplicate column')) {
                console.log('  promotion_interests.created_at ya existe.');
            } else {
                throw e;
            }
        }
        try {
            await conn.query(`
                UPDATE promotion_interests SET created_at = NOW() WHERE created_at IS NULL OR created_at = '0000-00-00 00:00:00'
            `);
        } catch (e) {
            console.warn('  (skip backfill created_at)', e.message);
        }
        console.log('✅ Migración promotion_interests.created_at lista.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
