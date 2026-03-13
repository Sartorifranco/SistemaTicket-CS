/**
 * Script de reparación: limpia tickets donde assigned_to_user_id apunta a un cliente.
 * Esto corrige datos corruptos creados por el bug previo en activationController.
 *
 * Uso: node scripts/fix-ticket-assigned-clients.js
 * Se puede ejecutar múltiples veces sin riesgo (es idempotente).
 */
const pool = require('../src/config/db');

async function run() {
  let conn;
  try {
    conn = await pool.getConnection();

    // Contar tickets afectados antes de limpiar
    const [preview] = await conn.query(`
      SELECT COUNT(*) AS affected
      FROM Tickets t
      JOIN Users u ON t.assigned_to_user_id = u.id
      WHERE u.role IN ('client', 'viewer')
    `);
    const count = preview[0].affected;

    if (count === 0) {
      console.log('✅ No hay tickets con clientes asignados. Nada que corregir.');
      return;
    }

    console.log(`⚠️  Se encontraron ${count} ticket(s) con un cliente como agente asignado. Corrigiendo...`);

    // Limpiar: poner NULL en assigned_to_user_id para esos tickets
    const [result] = await conn.query(`
      UPDATE Tickets t
      JOIN Users u ON t.assigned_to_user_id = u.id
      SET t.assigned_to_user_id = NULL
      WHERE u.role IN ('client', 'viewer')
    `);

    console.log(`✅ ${result.affectedRows} ticket(s) corregidos. Campo assigned_to_user_id puesto en NULL.`);
    console.log('   Estos tickets aparecerán ahora como "Sin asignar" en el panel.');
  } catch (err) {
    console.error('❌ Error en el script de reparación:', err.message);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

run();
