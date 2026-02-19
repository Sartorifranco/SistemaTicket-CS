/**
 * Diagnóstico de base de datos - verifica tablas y columnas
 * Ejecutar: node backend/scripts/check-db.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets',
    port: process.env.DB_PORT || 3306
  });
  try {
    console.log('Verificando base de datos...\n');
    
    const tables = ['Users', 'Tickets', 'Departments', 'agent_tasks', 'users', 'tickets', 'departments'];
    for (const t of tables) {
      try {
        const [rows] = await pool.query(`SELECT 1 FROM ${t} LIMIT 1`);
        console.log('  OK: Tabla', t, 'existe');
      } catch (e) {
        if (e.message.includes("doesn't exist")) {
          console.log('  FALTA: Tabla', t, 'no existe');
        } else {
          console.log('  Error', t, ':', e.message);
        }
      }
    }

    console.log('\nProbando consulta getAgents...');
    try {
      const [rows] = await pool.query(`
        SELECT id, username, email, role FROM Users 
        WHERE role IN ('agent', 'supervisor', 'admin') AND status = 'active' LIMIT 3
      `);
      console.log('  OK:', rows.length, 'registros');
    } catch (e) {
      console.log('  Error:', e.message);
    }

    console.log('\nProbando consulta getTickets...');
    try {
      const [rows] = await pool.query(`
        SELECT t.id FROM Tickets t
        LEFT JOIN Users u ON t.user_id = u.id
        LEFT JOIN Departments d ON t.department_id = d.id
        LIMIT 1
      `);
      console.log('  OK:', rows.length, 'registros');
    } catch (e) {
      console.log('  Error:', e.message);
    }

    console.log('\nProbando consulta getTasks...');
    try {
      const [rows] = await pool.query(`SELECT 1 FROM agent_tasks LIMIT 1`);
      console.log('  OK: agent_tasks accesible');
    } catch (e) {
      console.log('  Error:', e.message);
    }

    console.log('\nListo.');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
