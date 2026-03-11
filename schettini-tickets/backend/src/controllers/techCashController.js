const pool = require('../config/db');

const TYPES = ['ingreso', 'egreso'];
const CONCEPTS = ['taller', 'remoto', 'repuesto', 'gasto', 'otro'];

const checkClosedPermission = (movement, userRole) => {
  if (movement.is_closed && userRole !== 'admin') {
    return false;
  }
  return true;
};

const createMovement = async (req, res) => {
  try {
    const {
      movementDate,
      type,
      concept,
      linkedReference,
      clientId,
      paymentMethod,
      amount,
      notes,
      isClosed
    } = req.body;

    if (!type || !TYPES.includes(type)) {
      return res.status(400).json({ message: `type inválido. Valores: ${TYPES.join(', ')}` });
    }
    if (!concept || !CONCEPTS.includes(concept)) {
      return res.status(400).json({ message: `concept inválido. Valores: ${CONCEPTS.join(', ')}` });
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'amount debe ser un número positivo' });
    }

    const userId = req.user?.id || null;
    const movementDateVal = movementDate || new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await pool.query(
      `INSERT INTO tech_cash_movements (
        movement_date, type, concept, linked_reference, client_id, payment_method,
        amount, user_id, notes, is_closed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movementDateVal,
        type,
        concept,
        linkedReference?.trim() || null,
        clientId ? parseInt(clientId, 10) : null,
        paymentMethod?.trim() || null,
        amountNum,
        userId,
        notes?.trim() || null,
        isClosed === true || isClosed === 1 ? 1 : 0
      ]
    );

    const [rows] = await pool.query('SELECT * FROM tech_cash_movements WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('createMovement:', error);
    res.status(500).json({ message: 'Error al crear movimiento' });
  }
};

const getMovements = async (req, res) => {
  try {
    const { concept, type, startDate, endDate } = req.query;
    let sql = `
      SELECT tcm.*, uc.username AS client_username, uc.full_name AS client_name,
             uu.username AS user_username, uu.full_name AS user_name
      FROM tech_cash_movements tcm
      LEFT JOIN Users uc ON tcm.client_id = uc.id
      LEFT JOIN Users uu ON tcm.user_id = uu.id
      WHERE 1=1
    `;
    const params = [];
    if (concept && CONCEPTS.includes(concept)) {
      sql += ' AND tcm.concept = ?';
      params.push(concept);
    }
    if (type && TYPES.includes(type)) {
      sql += ' AND tcm.type = ?';
      params.push(type);
    }
    if (startDate) {
      sql += ' AND tcm.movement_date >= ?';
      params.push(startDate + ' 00:00:00');
    }
    if (endDate) {
      sql += ' AND tcm.movement_date <= ?';
      params.push(endDate + ' 23:59:59');
    }
    sql += ' ORDER BY tcm.movement_date DESC, tcm.id DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getMovements:', error);
    res.status(500).json({ message: 'Error al listar movimientos' });
  }
};

const getMovementById = async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query(
      `SELECT tcm.*, uc.username AS client_username, uc.full_name AS client_name,
              uu.username AS user_username, uu.full_name AS user_name
       FROM tech_cash_movements tcm
       LEFT JOIN Users uc ON tcm.client_id = uc.id
       LEFT JOIN Users uu ON tcm.user_id = uu.id
       WHERE tcm.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getMovementById:', error);
    res.status(500).json({ message: 'Error al obtener movimiento' });
  }
};

const updateMovement = async (req, res) => {
  try {
    const id = req.params.id;
    const userRole = req.user?.role || '';

    const [existingRows] = await pool.query('SELECT * FROM tech_cash_movements WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }
    const existing = existingRows[0];

    if (!checkClosedPermission(existing, userRole)) {
      return res.status(403).json({ message: 'Solo administradores pueden modificar movimientos cerrados' });
    }

    const {
      movementDate,
      type,
      concept,
      linkedReference,
      clientId,
      paymentMethod,
      amount,
      notes,
      isClosed
    } = req.body;

    const updates = [];
    const params = [];
    const add = (col, val) => {
      if (val !== undefined) {
        updates.push(`${col} = ?`);
        params.push(val);
      }
    };

    if (movementDate !== undefined) add('movement_date', movementDate);
    if (type !== undefined && TYPES.includes(type)) add('type', type);
    if (concept !== undefined && CONCEPTS.includes(concept)) add('concept', concept);
    if (linkedReference !== undefined) add('linked_reference', linkedReference?.trim() || null);
    if (clientId !== undefined) add('client_id', clientId ? parseInt(clientId, 10) : null);
    if (paymentMethod !== undefined) add('payment_method', paymentMethod?.trim() || null);
    if (amount !== undefined) {
      const n = parseFloat(amount);
      if (!isNaN(n) && n > 0) add('amount', n);
    }
    if (notes !== undefined) add('notes', notes?.trim() || null);
    if (isClosed !== undefined && userRole === 'admin') add('is_closed', isClosed ? 1 : 0);

    updates.push('updated_at = NOW()');
    params.push(id);

    if (updates.length > 1) {
      await pool.query(`UPDATE tech_cash_movements SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [rows] = await pool.query('SELECT * FROM tech_cash_movements WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('updateMovement:', error);
    res.status(500).json({ message: 'Error al actualizar movimiento' });
  }
};

const deleteMovement = async (req, res) => {
  try {
    const id = req.params.id;
    const userRole = req.user?.role || '';

    const [existingRows] = await pool.query('SELECT * FROM tech_cash_movements WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    if (!checkClosedPermission(existingRows[0], userRole)) {
      return res.status(403).json({ message: 'Solo administradores pueden eliminar movimientos cerrados' });
    }

    await pool.query('DELETE FROM tech_cash_movements WHERE id = ?', [id]);
    res.json({ success: true, message: 'Movimiento eliminado' });
  } catch (error) {
    console.error('deleteMovement:', error);
    res.status(500).json({ message: 'Error al eliminar movimiento' });
  }
};

const registerPaymentFromRepairOrder = async (orderId, orderNumber, amount, paymentMethod, clientId, userId) => {
  try {
    if (!amount || amount <= 0) return;
    const notes = orderNumber ? `Seña Orden #${orderNumber}` : `Seña Orden #${orderId}`;
    await pool.query(
      `INSERT INTO tech_cash_movements (movement_date, type, concept, linked_reference, client_id, payment_method, amount, user_id, notes)
       VALUES (NOW(), 'ingreso', 'taller', ?, ?, ?, ?, ?, ?)`,
      [`REP-${orderNumber || orderId}`, clientId, paymentMethod || 'Efectivo', amount, userId, notes]
    );
    console.log(`[TechCash] Ingreso $${amount} registrado por orden REP-${orderNumber || orderId}`);
  } catch (err) {
    console.error('[TechCash] Error registrando pago:', err);
  }
};

/**
 * Registra en Caja Técnica un movimiento vinculado a la seña de una orden de reparación.
 * @param {number} orderId - ID de repair_orders
 * @param {string} orderNumber - Número de orden (ej. "2025-001")
 * @param {number} amount - Monto (siempre positivo)
 * @param {string} type - 'ingreso' o 'egreso'
 * @param {string} paymentMethod - Método de pago (o 'Efectivo')
 * @param {number|null} clientId - client_id de la orden
 * @param {number|null} userId - req.user.id
 * @param {string} notesConcept - Texto para notes (ej. "Seña Orden #2025-001", "Devolución parcial...")
 */
const registerDepositMovementFromRepairOrder = async (orderId, orderNumber, amount, type, paymentMethod, clientId, userId, notesConcept) => {
  try {
    if (!amount || amount <= 0) return;
    if (!type || !['ingreso', 'egreso'].includes(type)) return;
    const linkedRef = `REP-${orderNumber || orderId}`;
    const payment = paymentMethod && String(paymentMethod).trim() ? String(paymentMethod).trim() : 'Efectivo';
    await pool.query(
      `INSERT INTO tech_cash_movements (movement_date, type, concept, linked_reference, client_id, payment_method, amount, user_id, notes)
       VALUES (NOW(), ?, 'taller', ?, ?, ?, ?, ?, ?)`,
      [type, linkedRef, clientId || null, payment, amount, userId || null, notesConcept || linkedRef]
    );
    console.log(`[TechCash] ${type} $${amount} - ${notesConcept || linkedRef}`);
  } catch (err) {
    console.error('[TechCash] Error registrando movimiento por orden:', err);
  }
};

module.exports = {
  createMovement,
  getMovements,
  getMovementById,
  updateMovement,
  deleteMovement,
  registerPaymentFromRepairOrder,
  registerDepositMovementFromRepairOrder
};
