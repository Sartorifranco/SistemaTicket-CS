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

// Estados que SÍ se consideran "trabajo activo del técnico" y pueden caer en demora.
// Excluimos: listo/entregado/entregado_sin_reparacion/abandonado (fin de flujo),
// en_espera (esperando repuesto/cliente, pausa legítima),
// no_aceptado (cliente rechazó presupuesto → la orden está frenada por él, no por el técnico),
// sin_reparacion (decidido no reparar, pausa legítima).
const ACTIVE_STATUSES_FOR_DELAY = ['ingresado', 'cotizado', 'aceptado'];

// Memoria del último "estado alertado" por técnico. Permite emitir count=0 cuando
// un técnico deja de tener demoradas, así el banner del frontend se limpia solo.
const lastAlertedByTech = new Map(); // technicianId (string) -> count

const checkDelayedOrdersAndNotify = async (io) => {
    if (!io) return;
    let connection;
    try {
        connection = await pool.getConnection();
        const placeholders = ACTIVE_STATUSES_FOR_DELAY.map(() => '?').join(',');
        const [rows] = await connection.execute(
            `SELECT id, order_number, technician_id, promised_date, entry_date, status
             FROM repair_orders
             WHERE status IN (${placeholders})
               AND technician_id IS NOT NULL
               AND (
                 (promised_date IS NOT NULL AND promised_date < CURDATE())
                 OR (status IN ('ingresado', 'cotizado') AND entry_date < DATE_SUB(NOW(), INTERVAL ? DAY))
               )`,
            [...ACTIVE_STATUSES_FOR_DELAY, DELAYED_DAYS_THRESHOLD]
        );
        const byTech = {};
        for (const row of rows) {
            const tid = String(row.technician_id);
            if (!byTech[tid]) byTech[tid] = [];
            byTech[tid].push(row);
        }

        // 1) Emitir el estado actual (count real) a cada técnico con demoras activas.
        const currentTechs = new Set();
        for (const [technicianId, orders] of Object.entries(byTech)) {
            currentTechs.add(technicianId);
            io.to(`user-${technicianId}`).emit('delayed_orders_alert', {
                message: '¡Atención! Tenés equipos demorados que revisar.',
                count: orders.length,
                orderNumbers: orders.map((o) => o.order_number)
            });
            lastAlertedByTech.set(technicianId, orders.length);
        }

        // 2) Limpiar banner de quienes ANTES tenían demoras y ahora ya no.
        for (const technicianId of Array.from(lastAlertedByTech.keys())) {
            if (!currentTechs.has(technicianId) && (lastAlertedByTech.get(technicianId) || 0) > 0) {
                io.to(`user-${technicianId}`).emit('delayed_orders_alert', {
                    message: '',
                    count: 0,
                    orderNumbers: []
                });
                lastAlertedByTech.set(technicianId, 0);
            }
        }
    } catch (error) {
        console.error('[Cron Job] Error al revisar órdenes demoradas:', error);
    } finally {
        if (connection) connection.release();
    }
};

let delayedOrdersTask = null;

// Backup periódico de la estructura del Centro de Ayuda.
// Corre cada 10 min para mantener snapshot fresco; así si un deploy accidentalmente
// borra/resetea folder_id, kb-restore.js puede recuperarlo desde el último backup.
let kbBackupTask = null;
const runKbBackup = async () => {
    try {
        const kbBackup = require('../../scripts/kb-backup');
        if (typeof kbBackup === 'function') {
            await kbBackup();
        }
    } catch (error) {
        console.error('[Cron Job] Error en kb-backup:', error.message);
    }
};

const startCronJobs = (io) => {
    console.log('Iniciando tareas programadas...');
    cronTask.start();
    if (io) {
        checkDelayedOrdersAndNotify(io);
        delayedOrdersTask = cron.schedule('*/5 * * * *', () => checkDelayedOrdersAndNotify(io));
        delayedOrdersTask.start();
    }
    // kb-backup: primer snapshot al arrancar + cada 10 minutos
    runKbBackup();
    kbBackupTask = cron.schedule('*/10 * * * *', runKbBackup);
    kbBackupTask.start();
};

module.exports = { startCronJobs };