const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Configuración de SSL: Necesario para Railway/Render/Azure
// Si la variable DB_SSL es 'true', activamos la seguridad. Si no (localhost), no.
const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: sslConfig, // ✅ CRÍTICO PARA LA NUBE
    timezone: '-03:00' // ✅ Mantenemos horario Argentina
});

pool.getConnection()
    .then(connection => {
        console.log('✅ Conectado a la base de datos MySQL!');
        // Verificamos la zona horaria
        connection.query("SELECT @@session.time_zone AS tz;")
            .then(([rows]) => {
                console.log(`🕒 Zona horaria DB: ${rows[0].tz}`);
                connection.release();
            })
            .catch(err => {
                console.error('⚠️ Error verificando zona horaria:', err);
                connection.release();
            });
    })
    .catch(err => {
        console.error('❌ Error FATAL conectando a la BD:', err.message);
        // No matamos el proceso (process.exit) para que Railway pueda reintentar
    });

module.exports = pool;