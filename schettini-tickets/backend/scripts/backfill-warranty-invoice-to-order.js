/**
 * Copia warranty_invoice de repair_order_items a repair_orders.purchase_invoice_number
 * cuando la orden es garantía y el Nº a nivel orden está vacío.
 * Uso: cd backend && node scripts/backfill-warranty-invoice-to-order.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

async function run() {
  const [result] = await pool.query(`
    UPDATE repair_orders ro
    INNER JOIN (
      SELECT repair_order_id, MIN(warranty_invoice) AS inv
      FROM repair_order_items
      WHERE warranty_invoice IS NOT NULL AND TRIM(warranty_invoice) <> ''
      GROUP BY repair_order_id
    ) x ON x.repair_order_id = ro.id
    SET ro.purchase_invoice_number = TRIM(x.inv)
    WHERE (ro.purchase_invoice_number IS NULL OR TRIM(ro.purchase_invoice_number) = '')
      AND COALESCE(ro.is_warranty, 0) = 1
  `);
  console.log(`>>> Órdenes actualizadas con Nº de factura desde equipos: ${result.affectedRows ?? 0}`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
