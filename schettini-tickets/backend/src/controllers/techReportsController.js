const pool = require('../config/db');

const getDebtsTaller = async (req, res) => {
  try {
    const { onlyWithBalance } = req.query;
    const withBalance = onlyWithBalance === 'true' || onlyWithBalance === '1';
    let sql = `
      SELECT ro.id, ro.order_number, ro.entry_date, ro.status, ro.total_cost, ro.deposit_paid,
             COALESCE(ro.total_cost, 0) - COALESCE(ro.deposit_paid, 0) AS saldo,
             uc.username AS client_username, uc.full_name AS client_name, uc.business_name AS client_business,
             ut.username AS tech_username, ut.full_name AS tech_name
      FROM repair_orders ro
      LEFT JOIN Users uc ON ro.client_id = uc.id
      LEFT JOIN Users ut ON ro.technician_id = ut.id
      WHERE (LOWER(COALESCE(ro.order_type, '')) IN ('taller', '') OR ro.order_type IS NULL)
    `;
    if (withBalance) sql += ' HAVING saldo > 0';
    sql += ' ORDER BY ro.entry_date DESC';

    const [rows] = await pool.query(sql);

    const data = rows
      .filter((r) => (!withBalance || parseFloat(r.saldo) > 0))
      .map((r) => {
        const saldo = parseFloat(r.saldo) || 0;
        const total = parseFloat(r.total_cost) || 0;
        const deposit = parseFloat(r.deposit_paid) || 0;
        let estado = 'Pendiente';
        if (saldo <= 0) estado = 'Cancelado';
        else if (deposit > 0) estado = 'Parcial';
        return {
          ...r,
          saldo,
          estado,
          client_display: r.client_name || r.client_business || r.client_username || 'Sin nombre',
          tech_display: r.tech_name || r.tech_username || 'Sin asignar'
        };
      });

    res.json({ success: true, data });
  } catch (error) {
    console.error('getDebtsTaller:', error);
    res.status(500).json({ message: 'Error al obtener deudas de taller' });
  }
};

const getDebtsRemoto = async (req, res) => {
  try {
    const { onlyWithBalance } = req.query;
    const withBalance = onlyWithBalance === 'true' || onlyWithBalance === '1';
    let sql = `
      SELECT ro.id, ro.order_number, ro.entry_date, ro.status, ro.total_cost, ro.deposit_paid,
             COALESCE(ro.total_cost, 0) - COALESCE(ro.deposit_paid, 0) AS saldo,
             uc.username AS client_username, uc.full_name AS client_name, uc.business_name AS client_business,
             ut.username AS tech_username, ut.full_name AS tech_name
      FROM repair_orders ro
      LEFT JOIN Users uc ON ro.client_id = uc.id
      LEFT JOIN Users ut ON ro.technician_id = ut.id
      WHERE LOWER(COALESCE(ro.order_type, '')) = 'remoto'
    `;
    if (withBalance) sql += ' HAVING saldo > 0';
    sql += ' ORDER BY ro.entry_date DESC';

    const [rows] = await pool.query(sql);

    const data = rows
      .filter((r) => (withBalance ? parseFloat(r.saldo) > 0 : true))
      .map((r) => {
        const saldo = parseFloat(r.saldo) || 0;
        const deposit = parseFloat(r.deposit_paid) || 0;
        let estado = 'Pendiente';
        if (saldo <= 0) estado = 'Cancelado';
        else if (deposit > 0) estado = 'Parcial';
        return {
          ...r,
          saldo,
          estado,
          client_display: r.client_name || r.client_business || r.client_username || 'Sin nombre',
          tech_display: r.tech_name || r.tech_username || 'Sin asignar'
        };
      });

    res.json({ success: true, data });
  } catch (error) {
    console.error('getDebtsRemoto:', error);
    res.status(500).json({ message: 'Error al obtener deudas remotas' });
  }
};

const getDebtsTotals = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? startDate + ' 00:00:00' : '2020-01-01 00:00:00';
    const end = endDate ? endDate + ' 23:59:59' : new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [tallerRows] = await pool.query(
      `SELECT
         COALESCE(SUM(ro.total_cost), 0) AS total_facturado,
         COALESCE(SUM(ro.deposit_paid), 0) AS total_cobrado,
         COALESCE(SUM(COALESCE(ro.total_cost, 0) - COALESCE(ro.deposit_paid, 0)), 0) AS total_pendiente
       FROM repair_orders ro
       WHERE (COALESCE(ro.order_type, 'Taller') IN ('Taller', 'taller', '') OR ro.order_type IS NULL)
         AND ro.entry_date >= ? AND ro.entry_date <= ?`,
      [start, end]
    );

    const [remotoRows] = await pool.query(
      `SELECT
         COALESCE(SUM(ro.total_cost), 0) AS total_facturado,
         COALESCE(SUM(ro.deposit_paid), 0) AS total_cobrado,
         COALESCE(SUM(COALESCE(ro.total_cost, 0) - COALESCE(ro.deposit_paid, 0)), 0) AS total_pendiente
       FROM repair_orders ro
       WHERE LOWER(COALESCE(ro.order_type, '')) = 'remoto'
         AND ro.entry_date >= ? AND ro.entry_date <= ?`,
      [start, end]
    );

    res.json({
      success: true,
      data: {
        taller: {
          total_facturado: parseFloat(tallerRows[0]?.total_facturado || 0),
          total_cobrado: parseFloat(tallerRows[0]?.total_cobrado || 0),
          total_pendiente: parseFloat(tallerRows[0]?.total_pendiente || 0)
        },
        remoto: {
          total_facturado: parseFloat(remotoRows[0]?.total_facturado || 0),
          total_cobrado: parseFloat(remotoRows[0]?.total_cobrado || 0),
          total_pendiente: parseFloat(remotoRows[0]?.total_pendiente || 0)
        },
        startDate: start.slice(0, 10),
        endDate: end.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('getDebtsTotals:', error);
    res.status(500).json({ message: 'Error al obtener totales de deudas' });
  }
};

module.exports = { getDebtsTaller, getDebtsRemoto, getDebtsTotals };
