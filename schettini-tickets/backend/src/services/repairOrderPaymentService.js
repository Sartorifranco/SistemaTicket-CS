/**
 * Pagos detallados a órdenes de reparación (repair_order_payments + tech_cash_movements).
 * deposit_paid en repair_orders es totalizador denormalizado; las filas de pago son la fuente de historial.
 */
const pool = require('../config/db');
const { insertRepairOrderLinkedCashMovement } = require('../controllers/techCashController');
const { buildRepairOrderPaymentNotes } = require('../utils/repairOrderPaymentNotes');

/**
 * @typedef {'increment' | 'none'} DepositUpdateMode
 * - increment: suma `amount` a repair_orders.deposit_paid (POST /api/repair-orders/:id/payments)
 * - none: no toca deposit_paid (creación de orden o PUT legacy donde el UPDATE ya fijó el total)
 */

/**
 * Inserta fila de pago + movimiento de caja. Opcionalmente incrementa deposit_paid.
 * Usar siempre dentro de transacción cuando el caller ya modifica otras tablas.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {object} p
 * @param {number} p.repairOrderId
 * @param {string} p.orderNumber
 * @param {number|null} p.clientId
 * @param {number} p.amount - > 0
 * @param {string} p.paymentMethod
 * @param {number|null} p.userId
 * @param {string|null} p.notes
 * @param {string|null} [p.paymentOperationNumber]
 * @param {0|1} p.isLegacyImport
 * @param {DepositUpdateMode} p.depositUpdateMode
 */
const appendRepairOrderPaymentInConnection = async (conn, p) => {
  const {
    repairOrderId,
    orderNumber,
    clientId,
    amount,
    paymentMethod,
    userId,
    notes,
    paymentOperationNumber,
    isLegacyImport,
    depositUpdateMode
  } = p;
  const amt = parseFloat(amount);
  if (!amt || amt <= 0 || Number.isNaN(amt)) {
    throw new Error('amount inválido');
  }
  const method = paymentMethod && String(paymentMethod).trim() ? String(paymentMethod).trim() : 'Efectivo';
  const opNum =
    paymentOperationNumber != null && String(paymentOperationNumber).trim()
      ? String(paymentOperationNumber).trim()
      : null;
  const notesResolved = notes || null;

  const tcmId = await insertRepairOrderLinkedCashMovement(conn, {
    type: 'ingreso',
    orderNumber,
    orderId: repairOrderId,
    amount: amt,
    paymentMethod: method,
    clientId,
    userId,
    notesConcept: notesResolved || `Pago orden #${orderNumber || repairOrderId}`
  });
  if (!tcmId) throw new Error('No se pudo registrar movimiento de caja');

  await conn.query(
    `INSERT INTO repair_order_payments (
      repair_order_id, amount, payment_method, payment_operation_number, notes, registered_by_user_id, tech_cash_movement_id, is_legacy_import
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [repairOrderId, amt, method, opNum, notesResolved, userId || null, tcmId, isLegacyImport ? 1 : 0]
  );

  if (depositUpdateMode === 'increment') {
    await conn.query(
      'UPDATE repair_orders SET deposit_paid = COALESCE(deposit_paid, 0) + ? WHERE id = ?',
      [amt, repairOrderId]
    );
  }
};

/**
 * Registra un cobro adicional (API nueva). Transacción: caja + pago + incremento de deposit_paid.
 * Valida que el monto no supere el saldo pendiente si total_cost está definido.
 */
const recordRepairOrderPaymentPost = async ({
  repairOrderId,
  amount,
  paymentMethod,
  notes,
  paymentOperationNumber,
  userId
}) => {
  const amt = parseFloat(amount);
  if (!amt || amt <= 0 || Number.isNaN(amt)) {
    const err = new Error('El monto debe ser un número mayor a cero');
    err.statusCode = 400;
    throw err;
  }
  const method = paymentMethod && String(paymentMethod).trim() ? String(paymentMethod).trim() : 'Efectivo';
  const opNum =
    paymentOperationNumber != null && String(paymentOperationNumber).trim()
      ? String(paymentOperationNumber).trim()
      : null;
  const isEfectivo = method.toLowerCase() === 'efectivo';
  if (!isEfectivo && !opNum) {
    const err = new Error('Indicá el Nº de operación para pagos que no son en efectivo');
    err.statusCode = 400;
    throw err;
  }

  const [orders] = await pool.query(
    'SELECT id, order_number, client_id, total_cost, deposit_paid FROM repair_orders WHERE id = ?',
    [repairOrderId]
  );
  if (orders.length === 0) {
    const err = new Error('Orden no encontrada');
    err.statusCode = 404;
    throw err;
  }
  const order = orders[0];
  const total = order.total_cost != null ? parseFloat(order.total_cost) : NaN;
  const paid = parseFloat(order.deposit_paid) || 0;
  if (!Number.isNaN(total)) {
    const balance = Math.max(0, total - paid);
    if (amt > balance + 0.005) {
      const err = new Error(`El monto supera el saldo pendiente (${balance.toFixed(2)})`);
      err.statusCode = 400;
      throw err;
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const notesResolved = buildRepairOrderPaymentNotes({
      userNotes: notes,
      operationNumber: opNum
    });
    await appendRepairOrderPaymentInConnection(conn, {
      repairOrderId,
      orderNumber: order.order_number,
      clientId: order.client_id,
      amount: amt,
      paymentMethod: method,
      userId,
      notes: notesResolved,
      paymentOperationNumber: opNum,
      isLegacyImport: 0,
      depositUpdateMode: 'increment'
    });
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

module.exports = {
  appendRepairOrderPaymentInConnection,
  recordRepairOrderPaymentPost
};
