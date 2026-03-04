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

const DELAYED_DAYS_THRESHOLD = 3;

const checkDelayedOrdersAndNotify = async (io) => {
    if (!io) return;
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(
            `SELECT id, order_number, technician_id, promised_date, entry_date, status
             FROM repair_orders
             WHERE status NOT IN ('listo', 'entregado', 'entregado_sin_reparacion', 'abandonado')
               AND (
                 (promised_date IS NOT NULL AND promised_date < CURDATE())
                 OR (status IN ('ingresado', 'cotizado') AND entry_date < DATE_SUB(NOW(), INTERVAL ? DAY))
               )
             AND technician_id IS NOT NULL`,
            [DELAYED_DAYS_THRESHOLD]
        );
        const byTech = {};
        for (const row of rows) {
            const tid = row.technician_id;
            if (!byTech[tid]) byTech[tid] = [];
            byTech[tid].push(row);
        }
        for (const [technicianId, orders] of Object.entries(byTech)) {
            io.to(`user-${technicianId}`).emit('delayed_orders_alert', {
                message: '¡Atención! Tenés equipos demorados que revisar.',
                count: orders.length,
                orderNumbers: orders.map((o) => o.order_number)
            });
        }
    } catch (error) {
        console.error('[Cron Job] Error al revisar órdenes demoradas:', error);
    } finally {
        if (connection) connection.release();
    }
};

let delayedOrdersTask = null;

const startCronJobs = (io) => {
    console.log('Iniciando tareas programadas...');
    cronTask.start();
    if (io) {
        checkDelayedOrdersAndNotify(io);
        delayedOrdersTask = cron.schedule('*/5 * * * *', () => checkDelayedOrdersAndNotify(io));
        delayedOrdersTask.start();
    }
};

module.exports = { startCronJobs };