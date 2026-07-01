/**
 * Parseo y claves canónicas de spare_parts_detail (texto legacy o JSON).
 * Evita duplicar movimientos cuando cambia el formato o el nombre incluye el código.
 */

function extractCodigoFromNombre(nombre) {
  const n = String(nombre || '').trim();
  if (!n) return '';
  const patterns = [
    /\|\s*c[oó]d\.?\s*:\s*([A-Za-z0-9\-_.]+)/i,
    /c[oó]d(?:igo)?\.?\s*:\s*([A-Za-z0-9\-_.]+)/i,
    /\bc[oó]digo\s+([A-Za-z0-9\-_.]+)\b/i
  ];
  for (const re of patterns) {
    const m = n.match(re);
    if (m && m[1]) return String(m[1]).trim();
  }
  return '';
}

function normalizeArticleKey(nombre, codigo) {
  const code = String(codigo || '').trim() || extractCodigoFromNombre(nombre);
  if (code) return `c:${code.toLowerCase()}`;
  const n = String(nombre || '').trim().toLowerCase();
  return n ? `n:${n}` : '';
}

function buildArticleDisplayName(nombre, codigo) {
  const n = String(nombre || '').trim();
  const c = String(codigo || '').trim() || extractCodigoFromNombre(nombre);
  if (!n && c) return `CÓDIGO ${c}`;
  if (!c) return n || '—';
  if (n.toLowerCase().includes(c.toLowerCase())) return n;
  return `${n} CÓDIGO ${c}`;
}

function parseSparePartsDetailToItems(sparePartsDetail) {
  if (!sparePartsDetail || !String(sparePartsDetail).trim()) return [];
  const raw = String(sparePartsDetail).trim();
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [{ nombre: raw, cantidad: 1 }];
    }
  }
  if (raw.includes('\n')) {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const sinPrecio = line.replace(/\s*:\s*\$[\d.,]+\s*$/, '').trim();
        return { nombre: sinPrecio || line, cantidad: 1 };
      });
  }
  return [{ nombre: raw.replace(/\s*:\s*\$[\d.,]+\s*$/, '').trim() || raw, cantidad: 1 }];
}

/**
 * @returns {Map<string, { nombre: string, codigo: string|null, qty: number }>}
 */
function aggregateSparePartsDetailQuantities(sparePartsDetail) {
  const map = new Map();
  const items = parseSparePartsDetailToItems(sparePartsDetail);
  for (const it of items) {
    const name = it.nombre || it.name || (typeof it === 'string' ? it : null);
    if (!name || !String(name).trim()) continue;
    const nombre = String(name).trim();
    const codigoRaw = it.codigo != null ? String(it.codigo).trim() : '';
    const codigo = codigoRaw || extractCodigoFromNombre(nombre) || null;
    const qty = Math.max(1, parseInt(it.cantidad || it.quantity || 1, 10) || 1);
    const key = normalizeArticleKey(nombre, codigo);
    if (!key) continue;
    const prev = map.get(key);
    map.set(key, {
      nombre,
      codigo,
      qty: (prev ? prev.qty : 0) + qty
    });
  }
  return map;
}

function computeSparePartsMovementIncrements(oldDetail, newDetail) {
  const oldMap = aggregateSparePartsDetailQuantities(oldDetail);
  const newMap = aggregateSparePartsDetailQuantities(newDetail);
  const out = [];
  for (const [key, nv] of newMap) {
    const oldQty = oldMap.get(key)?.qty || 0;
    const diff = nv.qty - oldQty;
    if (diff > 0) {
      out.push({
        nombre: buildArticleDisplayName(nv.nombre, nv.codigo),
        quantity: diff
      });
    }
  }
  return out;
}

/** Filas agregadas para insertar en article_movements (creación de orden). */
function sparePartsDetailToMovementRows(sparePartsDetail) {
  const map = aggregateSparePartsDetailQuantities(sparePartsDetail);
  const rows = [];
  for (const entry of map.values()) {
    rows.push({
      nombre: buildArticleDisplayName(entry.nombre, entry.codigo),
      quantity: entry.qty
    });
  }
  return rows;
}

function normalizeArticleNameForGrouping(articleName) {
  const name = String(articleName || '').trim();
  const codigo = extractCodigoFromNombre(name);
  return normalizeArticleKey(name, codigo);
}

module.exports = {
  extractCodigoFromNombre,
  normalizeArticleKey,
  buildArticleDisplayName,
  parseSparePartsDetailToItems,
  aggregateSparePartsDetailQuantities,
  computeSparePartsMovementIncrements,
  sparePartsDetailToMovementRows,
  normalizeArticleNameForGrouping
};
