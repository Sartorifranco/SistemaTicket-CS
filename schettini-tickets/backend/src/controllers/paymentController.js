const pool = require('../config/db');

// ==========================================
// LÓGICA DEL CLIENTE
// ==========================================

// --- Obtener Historial, Datos Facturación y PLAN ACTUAL ---
const getPaymentInfo = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Obtener Historial
        const [payments] = await pool.query(
            'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        // 2. Obtener Datos Facturación
        const [billing] = await pool.query(
            'SELECT * FROM billing_details WHERE user_id = ?',
            [userId]
        );

        // 3. ✅ CORREGIDO: Usamos 'plan' en lugar de 'plan_name'
        const [userProfile] = await pool.query(
            'SELECT plan, plan_expiry, price FROM Users WHERE id = ?', 
            [userId]
        );

        // Mapeamos 'plan' a 'plan_name' para que el frontend no se rompa si espera ese nombre
        const userPlanData = userProfile[0] || {};
        const normalizedPlan = {
            plan_name: userPlanData.plan || 'Free', // Mapeo clave
            plan_expiry: userPlanData.plan_expiry,
            price: userPlanData.price
        };

        res.json({
            success: true,
            data: {
                payments,
                billing: billing[0] || {},
                userPlan: normalizedPlan
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener pagos' });
    }
};

// --- Informar Nuevo Pago ---
const reportPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;
        const { amount, method, description } = req.body;
        const file = req.file;

        if (!amount || !file) {
            return res.status(400).json({ message: 'Monto y comprobante son obligatorios' });
        }

        const receiptUrl = `/uploads/${file.filename}`;

        // 1. Guardar Pago
        const [paymentResult] = await pool.query(
            `INSERT INTO payments (user_id, amount, payment_method, receipt_url, description, status) 
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [userId, amount, method, receiptUrl, description]
        );

        // 2. Notificar a Admins
        const [admins] = await pool.query("SELECT id FROM Users WHERE role IN ('admin', 'agent')");

        if (admins.length > 0 && req.io) {
            const msg = `Nuevo pago de $${amount} informado por ${username}`;
            
            for (const admin of admins) {
                const [notifResult] = await pool.query(
                    `INSERT INTO notifications (user_id, type, message, related_id, related_type, is_read) 
                     VALUES (?, 'info', ?, ?, 'payment', 0)`,
                    [admin.id, msg, paymentResult.insertId]
                );

                req.io.to(`user-${admin.id}`).emit('notification', {
                    id: notifResult.insertId,
                    type: 'info',
                    message: msg,
                    related_id: paymentResult.insertId,
                    related_type: 'payment',
                    is_read: false,
                    created_at: new Date()
                });
            }
        }

        res.json({ success: true, message: 'Pago informado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al registrar pago' });
    }
};

// --- Actualizar Datos de Facturación ---
const updateBillingDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tax_id, business_name, address, fiscal_condition, email_invoice } = req.body;

        const [exists] = await pool.query('SELECT id FROM billing_details WHERE user_id = ?', [userId]);

        if (exists.length > 0) {
            await pool.query(
                `UPDATE billing_details SET tax_id=?, business_name=?, address=?, fiscal_condition=?, email_invoice=? WHERE user_id=?`,
                [tax_id, business_name, address, fiscal_condition, email_invoice, userId]
            );
        } else {
            await pool.query(
                `INSERT INTO billing_details (user_id, tax_id, business_name, address, fiscal_condition, email_invoice) VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, tax_id, business_name, address, fiscal_condition, email_invoice]
            );
        }

        res.json({ success: true, message: 'Datos actualizados' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al guardar datos' });
    }
};

// ==========================================
// LÓGICA DEL ADMINISTRADOR
// ==========================================

// --- Obtener toda la info de un cliente específico ---
const getAdminClientPayments = async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Historial
        const [payments] = await pool.query('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        
        // 2. Datos Facturación
        const [billing] = await pool.query('SELECT * FROM billing_details WHERE user_id = ?', [userId]);

        // 3. ✅ CORREGIDO: Usamos 'plan'
        const [userPlan] = await pool.query('SELECT plan, plan_expiry, price FROM Users WHERE id = ?', [userId]);

        // Normalizamos
        const userPlanData = userPlan[0] || {};
        const normalizedPlan = {
            plan_name: userPlanData.plan || 'Free',
            plan_expiry: userPlanData.plan_expiry,
            price: userPlanData.price
        };

        res.json({
            success: true,
            data: {
                payments,
                billing: billing[0] || {},
                userPlan: normalizedPlan
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener datos del cliente' });
    }
};

// --- Cambiar estado de un pago (Aprobar/Rechazar) ---
const updatePaymentStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { status } = req.body; 

        await pool.query('UPDATE payments SET status = ? WHERE id = ?', [status, paymentId]);

        const [payment] = await pool.query('SELECT user_id, amount FROM payments WHERE id = ?', [paymentId]);
        
        if (payment.length > 0) {
            const userId = payment[0].user_id;
            const msg = status === 'approved' 
                ? `Tu pago de $${payment[0].amount} ha sido APROBADO ✅` 
                : `Tu pago de $${payment[0].amount} ha sido RECHAZADO ❌`;

            const [notifResult] = await pool.query(
                `INSERT INTO notifications (user_id, type, message, related_id, related_type, is_read) 
                 VALUES (?, ?, ?, ?, 'payment', 0)`,
                [userId, status === 'approved' ? 'success' : 'error', msg, paymentId]
            );

            if (req.io) {
                req.io.to(`user-${userId}`).emit('notification', {
                    id: notifResult.insertId,
                    type: status === 'approved' ? 'success' : 'error',
                    message: msg,
                    related_id: paymentId,
                    related_type: 'payment',
                    is_read: false,
                    created_at: new Date()
                });
            }
        }

        res.json({ success: true, message: `Pago marcado como ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar pago' });
    }
};

// --- Modificar Plan y Vencimiento Manualmente ---
const updateUserPlan = async (req, res) => {
    try {
        const { userId } = req.params;
        // El frontend puede enviar 'plan_name' o 'plan', lo manejamos:
        const plan = req.body.plan || req.body.plan_name; 
        const { plan_expiry, price } = req.body;

        // ✅ CORREGIDO: Actualizamos la columna 'plan'
        await pool.query(
            'UPDATE Users SET plan = ?, plan_expiry = ?, price = ? WHERE id = ?',
            [plan, plan_expiry || null, price || 0, userId]
        );

        res.json({ success: true, message: 'Plan del usuario actualizado' });
    } catch (error) {
        console.error("Error al actualizar plan:", error); // Log para ver detalles si falla
        res.status(500).json({ success: false, message: 'Error al actualizar plan' });
    }
};

module.exports = { 
    getPaymentInfo, 
    reportPayment, 
    updateBillingDetails,
    getAdminClientPayments, 
    updatePaymentStatus,    
    updateUserPlan          
};