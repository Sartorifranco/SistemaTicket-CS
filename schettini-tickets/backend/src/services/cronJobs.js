const cron = require('node-cron');
const pool = require('../config/db'); // ✅ CORRECCIÓN APLICADA AQUÍ

console.log('Módulo de tareas programadas (cron) inicializado.');

const closeOldResolvedTickets = async () => {
    console.log('[Cron Job] Ejecutando tarea: "Cerrar tickets resueltos antiguos"...');
    let connection;
    try {
        connection = await pool.getConnection();

        const [ticketsToClose] = await connection.execute(
            `SELECT id, user_id FROM Tickets WHERE status = 'resolved' AND updated_at < NOW() - INTERVAL 48 HOUR`
        );

        if (ticketsToClose.length === 0) {
            console.log('[Cron Job] No se encontraron tickets para cerrar.');
            return;
        }

        console.log(`[Cron Job] Se encontraron ${ticketsToClose.length} tickets para cerrar.`);

        for (const ticket of ticketsToClose) {
            // ✅ CORRECCIÓN: Se añade 'closure_reason' a la consulta UPDATE.
            await connection.execute(
                `UPDATE Tickets SET status = 'closed', closure_reason = 'AUTO_INACTIVITY' WHERE id = ?`,
                [ticket.id]
            );

            const commentText = 'Este ticket ha sido cerrado automáticamente después de 48 horas sin actividad en estado "Resuelto".';
            await connection.execute(
                'INSERT INTO comments (ticket_id, user_id, comment_text, is_internal) VALUES (?, ?, ?, ?)',
                [ticket.id, null, commentText, false]
            );
        }

        console.log(`[Cron Job] Tarea completada. Se cerraron ${ticketsToClose.length} tickets.`);

    } catch (error) {
        console.error('[Cron Job] Error al ejecutar la tarea de cierre de tickets:', error);
    } finally {
        if (connection) connection.release();
    }
};

const cronTask = cron.schedule('* * * * *', closeOldResolvedTickets);

const startCronJobs = () => {
    console.log('Iniciando tareas programadas...');
    cronTask.start();
};

module.exports = { startCronJobs };