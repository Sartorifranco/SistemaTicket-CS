// backend/test-db-query.js
    const pool = require('./src/config/db'); // Asegúrate de que esta ruta sea correcta
    require('dotenv').config({ path: './.env' }); // Carga las variables de entorno desde .env

    async function testQuery() {
        try {
            console.log('Intentando conectar a la base de datos...');
            const connection = await pool.getConnection();
            console.log('Conexión a la base de datos exitosa.');
            connection.release(); // Libera la conexión inmediatamente

            const pageNum = 1;
            const limitNum = 10;
            const offset = (pageNum - 1) * limitNum;

            let query = 'SELECT id, username, email, role, created_at, updated_at FROM users';
            query += ' ORDER BY created_at DESC';
            const finalQuery = `${query} LIMIT ${limitNum} OFFSET ${offset}`;
            const whereParams = []; // No hay parámetros WHERE para esta prueba simple

            console.log('Ejecutando consulta de prueba:');
            console.log('SQL:', finalQuery);
            console.log('Parámetros (solo WHERE):', whereParams);

            const [users] = await pool.query(finalQuery, whereParams);
            console.log('¡Consulta exitosa! Usuarios obtenidos:', users.length);
            if (users.length > 0) {
                console.log('Primer usuario:', users[0]);
            }

            // Prueba de consulta de conteo
            let countQuery = 'SELECT COUNT(id) AS count FROM users';
            console.log('Ejecutando consulta de conteo:');
            console.log('SQL:', countQuery);
            console.log('Parámetros (conteo):', []);
            const [countResult] = await pool.query(countQuery, []);
            console.log('¡Consulta de conteo exitosa! Total:', countResult[0].count);

        } catch (error) {
            console.error('Ocurrió un error durante la prueba de la base de datos:', error);
        } finally {
            // Asegura que el proceso se cierre después de la prueba
            process.exit();
        }
    }

    testQuery();
    