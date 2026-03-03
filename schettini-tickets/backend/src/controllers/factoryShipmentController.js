const pool = require('../config/db');

const SEND_TYPES = ['garantia', 'reparacion', 'cambio', 'evaluacion_tecnica'];
const STATUSES = ['en_transito', 'recibido_fabrica', 'en_diagnostico', 'aprobado_cambio', 'reparado', 'en_retorno', 'recibido_empresa', 'cerrado'];
const FINAL_RESULTS = ['reparado', 'cambio_nuevo', 'nota_credito', 'rechazado'];
const ACTIVE_STATUSES = ['en_transito', 'recibido_fabrica', 'en_diagnostico', 'aprobado_cambio', 'reparado', 'en_retorno'];

async function updateEquipmentInventoryToFactory(serialNumber, brand, model) {
  if (!serialNumber || !String(serialNumber).trim()) return false;
  const sn = String(serialNumber).trim();
  const [rows] = await pool.query('SELECT id FROM equipment_inventory WHERE serial_number = ?', [sn]);
  if (rows.length === 0) return false;
  await pool.query(
    "UPDATE equipment_inventory SET status = 'en_fabrica', location = 'Stock en fábrica', available_for_sale = 0, updated_at = NOW() WHERE serial_number = ?",
    [sn]
  );
  return true;
}

async function reingresarEquipoAlStock(serialNumber) {
  if (!serialNumber || !String(serialNumber).trim()) return false;
  const sn = String(serialNumber).trim();
  const [rows] = await pool.query('SELECT id FROM equipment_inventory WHERE serial_number = ?', [sn]);
  if (rows.length === 0) return false;
  await pool.query(
    "UPDATE equipment_inventory SET status = 'disponible', location = 'Almacén', available_for_sale = 1, updated_at = NOW() WHERE serial_number = ?",
    [sn]
  );
  return true;
}

async function registrarNuevoSerieAlStock(serialNumber, brand, model) {
  if (!serialNumber || !String(serialNumber).trim()) return false;
  const sn = String(serialNumber).trim();
  const [existing] = await pool.query('SELECT id FROM equipment_inventory WHERE serial_number = ?', [sn]);
  if (existing.length > 0) {
    await pool.query(
      "UPDATE equipment_inventory SET status = 'disponible', location = 'Almacén', available_for_sale = 1, updated_at = NOW() WHERE serial_number = ?",
      [sn]
    );
    return true;
  }
  await pool.query(
    'INSERT INTO equipment_inventory (serial_number, brand, model, status, location, available_for_sale) VALUES (?, ?, ?, ?, ?, 1)',
    [sn, brand || null, model || null, 'disponible', 'Almacén']
  );
  return true;
}

const createFactoryShipment = async (req, res) => {
  try {
    const {
      sendDate,
      sendType,
      destinationCompany,
      trackingNumber,
      transport,
      brand,
      model,
      serialNumber,
      reason,
      linkedOrderId,
      estimatedValue,
      status,
      internalObservations
    } = req.body;

    if (!sendType || !SEND_TYPES.includes(sendType)) {
      return res.status(400).json({ message: `send_type inválido. Valores: ${SEND_TYPES.join(', ')}` });
    }

    const sendDateVal = sendDate || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const authorizedBy = req.user?.id || null;

    const [result] = await pool.query(
      `INSERT INTO factory_shipments (
        send_date, send_type, destination_company, tracking_number, transport,
        brand, model, serial_number, reason, linked_order_id, estimated_value,
        authorized_by, status, internal_observations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sendDateVal,
        sendType,
        destinationCompany?.trim() || null,
        trackingNumber?.trim() || null,
        transport?.trim() || null,
        brand?.trim() || null,
        model?.trim() || null,
        serialNumber?.trim() || null,
        reason?.trim() || null,
        linkedOrderId ? parseInt(linkedOrderId, 10) : null,
        estimatedValue != null && estimatedValue !== '' ? parseFloat(estimatedValue) : null,
        authorizedBy,
        status && STATUSES.includes(status) ? status : 'en_transito',
        internalObservations?.trim() || null
      ]
    );

    const id = result.insertId;

    if (serialNumber && String(serialNumber).trim()) {
      const updated = await updateEquipmentInventoryToFactory(serialNumber.trim(), brand, model);
      if (updated) {
        console.log(`[FactoryShipment] Equipo ${serialNumber} movido a Stock en fábrica`);
      }
    }

    const [rows] = await pool.query('SELECT * FROM factory_shipments WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('createFactoryShipment:', error);
    res.status(500).json({ message: 'Error al crear envío' });
  }
};

const getFactoryShipments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fs.*, ro.order_number
       FROM factory_shipments fs
       LEFT JOIN repair_orders ro ON fs.linked_order_id = ro.id
       ORDER BY fs.send_date DESC, fs.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getFactoryShipments:', error);
    res.status(500).json({ message: 'Error al listar envíos' });
  }
};

const getFactoryShipmentById = async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query(
      `SELECT fs.*, ro.order_number
       FROM factory_shipments fs
       LEFT JOIN repair_orders ro ON fs.linked_order_id = ro.id
       WHERE fs.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Envío no encontrado' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getFactoryShipmentById:', error);
    res.status(500).json({ message: 'Error al obtener envío' });
  }
};

const updateFactoryShipment = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      sendDate,
      sendType,
      destinationCompany,
      trackingNumber,
      transport,
      brand,
      model,
      serialNumber,
      reason,
      linkedOrderId,
      estimatedValue,
      status,
      returnDate,
      finalResult,
      internalObservations,
      replacementSerialNumber
    } = req.body;

    const [existingRows] = await pool.query('SELECT * FROM factory_shipments WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Envío no encontrado' });
    }
    const existing = existingRows[0];
    const oldStatus = existing.status;
    const newStatus = status && STATUSES.includes(status) ? status : existing.status;

    const updates = [];
    const params = [];
    const add = (col, val) => {
      if (val !== undefined) {
        updates.push(`${col} = ?`);
        params.push(val);
      }
    };

    if (sendDate !== undefined) add('send_date', sendDate);
    if (sendType !== undefined && SEND_TYPES.includes(sendType)) add('send_type', sendType);
    if (destinationCompany !== undefined) add('destination_company', destinationCompany?.trim() || null);
    if (trackingNumber !== undefined) add('tracking_number', trackingNumber?.trim() || null);
    if (transport !== undefined) add('transport', transport?.trim() || null);
    if (brand !== undefined) add('brand', brand?.trim() || null);
    if (model !== undefined) add('model', model?.trim() || null);
    if (serialNumber !== undefined) add('serial_number', serialNumber?.trim() || null);
    if (reason !== undefined) add('reason', reason?.trim() || null);
    if (linkedOrderId !== undefined) add('linked_order_id', linkedOrderId ? parseInt(linkedOrderId, 10) : null);
    if (estimatedValue !== undefined) add('estimated_value', estimatedValue != null && estimatedValue !== '' ? parseFloat(estimatedValue) : null);
    if (status !== undefined && STATUSES.includes(status)) add('status', status);
    if (returnDate !== undefined) add('return_date', returnDate || null);
    if (finalResult !== undefined && FINAL_RESULTS.includes(finalResult)) add('final_result', finalResult);
    if (internalObservations !== undefined) add('internal_observations', internalObservations?.trim() || null);

    updates.push('updated_at = NOW()');
    params.push(id);

    if (updates.length > 1) {
      await pool.query(`UPDATE factory_shipments SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if ((newStatus === 'recibido_empresa' || newStatus === 'cerrado') && (oldStatus !== 'recibido_empresa' && oldStatus !== 'cerrado')) {
      const final = finalResult || existing.final_result;
      const sn = serialNumber?.trim() || existing.serial_number;
      if (final === 'reparado' && sn) {
        await reingresarEquipoAlStock(sn);
        console.log(`[FactoryShipment] Equipo ${sn} reingresado al stock (reparado)`);
      } else if (final === 'cambio_nuevo') {
        const newSn = replacementSerialNumber?.trim();
        if (newSn) {
          await registrarNuevoSerieAlStock(newSn, brand || existing.brand, model || existing.model);
          console.log(`[FactoryShipment] Nuevo serial ${newSn} dado de alta (cambio)`);
        }
      }
    }

    const [rows] = await pool.query('SELECT * FROM factory_shipments WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('updateFactoryShipment:', error);
    res.status(500).json({ message: 'Error al actualizar envío' });
  }
};

const deleteFactoryShipment = async (req, res) => {
  try {
    const id = req.params.id;
    const [existing] = await pool.query('SELECT * FROM factory_shipments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Envío no encontrado' });
    }
    const row = existing[0];
    if (row.status !== 'recibido_empresa' && row.status !== 'cerrado' && row.serial_number) {
      await reingresarEquipoAlStock(row.serial_number);
    }
    await pool.query('DELETE FROM factory_shipments WHERE id = ?', [id]);
    res.json({ success: true, message: 'Envío eliminado' });
  } catch (error) {
    console.error('deleteFactoryShipment:', error);
    res.status(500).json({ message: 'Error al eliminar envío' });
  }
};

const getDashboard = async (req, res) => {
  try {
    const delayDays = parseInt(process.env.FACTORY_SHIPMENT_DELAY_DAYS || '30', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - delayDays);
    const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

    const placeholders = ACTIVE_STATUSES.map(() => '?').join(',');
    const [activeCount] = await pool.query(
      `SELECT COUNT(*) AS total FROM factory_shipments WHERE status IN (${placeholders})`,
      ACTIVE_STATUSES
    );

    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM factory_shipments GROUP BY status`
    );

    const [byDestination] = await pool.query(
      `SELECT destination_company, AVG(DATEDIFF(COALESCE(return_date, NOW()), send_date)) AS avg_days, COUNT(*) AS count
       FROM factory_shipments
       WHERE destination_company IS NOT NULL AND destination_company != ''
       GROUP BY destination_company`
    );

    const delayedPlaceholders = ACTIVE_STATUSES.map(() => '?').join(',');
    const [delayed] = await pool.query(
      `SELECT fs.*, ro.order_number
       FROM factory_shipments fs
       LEFT JOIN repair_orders ro ON fs.linked_order_id = ro.id
       WHERE fs.send_date < ? AND fs.status IN (${delayedPlaceholders})
       ORDER BY fs.send_date ASC`,
      [cutoffStr, ...ACTIVE_STATUSES]
    );

    const statusCounts = {};
    byStatus.forEach((r) => { statusCounts[r.status] = r.count; });

    res.json({
      success: true,
      data: {
        totalActiveInFactory: activeCount[0]?.total ?? 0,
        avgDelayByDestination: byDestination.map((d) => ({
          destination_company: d.destination_company,
          avg_days: Math.round(d.avg_days) || 0,
          count: d.count
        })),
        countByStatus: statusCounts,
        delayed_equipments: delayed
      }
    });
  } catch (error) {
    console.error('getFactoryShipmentDashboard:', error);
    res.status(500).json({ message: 'Error al obtener dashboard' });
  }
};

const createDraftFromRepairOrder = async (repairOrderId, orderData) => {
  try {
    const sn = orderData.serial_number || orderData.serialNumber;
    const [existing] = await pool.query(
      'SELECT id FROM factory_shipments WHERE linked_order_id = ? AND status IN (?)',
      [repairOrderId, ['en_transito', 'recibido_fabrica', 'en_diagnostico', 'aprobado_cambio', 'reparado', 'en_retorno']]
    );
    if (existing.length > 0) return;

    await pool.query(
      `INSERT INTO factory_shipments (
        send_date, send_type, destination_company, brand, model, serial_number,
        reason, linked_order_id, status, internal_observations
      ) VALUES (NOW(), 'garantia', ?, ?, ?, ?, 'Borrador automático por requires_factory_shipping', ?, 'en_transito', ?)`,
      [
        orderData.originalSupplier || orderData.original_supplier || null,
        orderData.brand || orderData.equipment_type || null,
        orderData.model || null,
        sn || null,
        repairOrderId,
        `Creado automáticamente desde Orden ${orderData.order_number || repairOrderId}`
      ]
    );
    console.log(`[FactoryShipment] Borrador creado para orden ${repairOrderId}`);
  } catch (err) {
    console.error('[FactoryShipment] Error creando borrador:', err);
  }
};

module.exports = {
  createFactoryShipment,
  getFactoryShipments,
  getFactoryShipmentById,
  updateFactoryShipment,
  deleteFactoryShipment,
  getDashboard,
  createDraftFromRepairOrder
};
