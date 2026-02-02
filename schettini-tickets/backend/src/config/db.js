const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
host: process.env.DB_HOST,
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
port: process.env.DB_PORT,
waitForConnections: true,
connectionLimit: 10,
queueLimit: 0,

// ✅ --- CORRECCIÓN DE ZONA HORARIA ---
// 'Z' significa UTC. Cambiamos a '-03:00' (UTC-3)
// para que todas las funciones de SQL como NOW() o CURRENT_TIMESTAMP
// se inserten directamente con la hora de Argentina.
timezone: '-03:00' 
});

pool.getConnection()
.then(connection => {
console.log('Conectado a la base de datos MySQL!');
    
    // Verificamos la zona horaria de la sesión para confirmar
connection.query("SELECT @@session.time_zone AS tz;")
.then(([rows]) => {
console.log(`Zona horaria de la conexión MySQL establecida en: ${rows[0].tz}`);
connection.release();
})
.catch(err => {
console.error('Error al obtener la zona horaria:', err);
connection.release();
});
})
.catch(err => {
console.error('Error al conectar con la base de datos:', err);
process.exit(1);
});

module.exports = pool;

