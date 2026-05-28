const pool = require('../config/db');

const VALID_ACTION_TYPES = new Set(['iframe', 'external_link']);

/** Registros legacy sin columna o NULL → iframe */
const normalizeActionType = (raw) => {
  const v = raw != null ? String(raw).trim().toLowerCase() : '';
  if (v === 'external_link') return 'external_link';
  return 'iframe';
};

const parseActionTypeInput = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { value: undefined };
  }
  const v = String(raw).trim().toLowerCase();
  if (!VALID_ACTION_TYPES.has(v)) {
    return { error: "action_type debe ser 'iframe' o 'external_link'" };
  }
  return { value: v };
};

const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  external_url: row.external_url,
  action_type: normalizeActionType(row.action_type),
  is_active: !!row.is_active,
  sort_order: row.sort_order ?? 0,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const isValidUrl = (url) => {
  if (!url || !String(url).trim()) return false;
  try {
    const u = new URL(String(url).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

/** GET /api/admin/forms */
const listAdminForms = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM system_forms ORDER BY sort_order ASC, id ASC'
    );
    res.json({ success: true, data: rows.map(mapRow) });
  } catch (error) {
    if (error.message && error.message.includes("doesn't exist")) {
      return res.status(500).json({
        success: false,
        message: 'Falta la tabla system_forms. Ejecutá: node backend/scripts/migrate-system-forms.js'
      });
    }
    console.error('Error listAdminForms:', error);
    res.status(500).json({ success: false, message: 'Error al listar planillas' });
  }
};

/** POST /api/admin/forms */
const createAdminForm = async (req, res) => {
  try {
    const {
      title,
      description,
      external_url,
      externalUrl,
      is_active,
      isActive,
      sort_order,
      sortOrder,
      action_type,
      actionType
    } = req.body || {};
    const t = title != null ? String(title).trim() : '';
    const d = description != null ? String(description).trim() : '';
    const url = (external_url ?? externalUrl ?? '').trim();
    if (!t) return res.status(400).json({ success: false, message: 'El título es obligatorio' });
    if (!d) return res.status(400).json({ success: false, message: 'La descripción / advertencia es obligatoria' });
    if (!isValidUrl(url)) {
      return res.status(400).json({ success: false, message: 'La URL externa debe ser http o https válida' });
    }
    const active = is_active !== undefined ? (is_active === true || is_active === 1 || is_active === '1') : (isActive !== false && isActive !== 0 && isActive !== '0');
    const sort = sort_order !== undefined ? parseInt(sort_order, 10) : parseInt(sortOrder, 10);
    const sortVal = Number.isNaN(sort) ? 0 : sort;
    const parsedAction = parseActionTypeInput(action_type ?? actionType);
    if (parsedAction.error) {
      return res.status(400).json({ success: false, message: parsedAction.error });
    }
    const actionTypeVal = parsedAction.value !== undefined ? parsedAction.value : 'iframe';

    const [result] = await pool.query(
      `INSERT INTO system_forms (title, description, external_url, action_type, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [t, d, url, actionTypeVal, active ? 1 : 0, sortVal]
    );
    const [rows] = await pool.query('SELECT * FROM system_forms WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Planilla creada', data: mapRow(rows[0]) });
  } catch (error) {
    console.error('Error createAdminForm:', error);
    res.status(500).json({ success: false, message: 'Error al crear planilla' });
  }
};

/** PUT /api/admin/forms/:id */
const updateAdminForm = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'ID inválido' });

    const [existing] = await pool.query('SELECT id FROM system_forms WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Planilla no encontrada' });
    }

    const {
      title,
      description,
      external_url,
      externalUrl,
      is_active,
      isActive,
      sort_order,
      sortOrder,
      action_type,
      actionType
    } = req.body || {};
    const updates = [];
    const params = [];

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ success: false, message: 'El título no puede estar vacío' });
      updates.push('title = ?');
      params.push(t);
    }
    if (description !== undefined) {
      const d = String(description).trim();
      if (!d) return res.status(400).json({ success: false, message: 'La descripción no puede estar vacía' });
      updates.push('description = ?');
      params.push(d);
    }
    if (external_url !== undefined || externalUrl !== undefined) {
      const url = String(external_url ?? externalUrl ?? '').trim();
      if (!isValidUrl(url)) {
        return res.status(400).json({ success: false, message: 'La URL externa debe ser http o https válida' });
      }
      updates.push('external_url = ?');
      params.push(url);
    }
    if (is_active !== undefined || isActive !== undefined) {
      const raw = is_active !== undefined ? is_active : isActive;
      const active = raw === true || raw === 1 || raw === '1' || raw === 'true';
      updates.push('is_active = ?');
      params.push(active ? 1 : 0);
    }
    if (sort_order !== undefined || sortOrder !== undefined) {
      const sort = parseInt(sort_order !== undefined ? sort_order : sortOrder, 10);
      updates.push('sort_order = ?');
      params.push(Number.isNaN(sort) ? 0 : sort);
    }
    if (action_type !== undefined || actionType !== undefined) {
      const parsedAction = parseActionTypeInput(action_type ?? actionType);
      if (parsedAction.error) {
        return res.status(400).json({ success: false, message: parsedAction.error });
      }
      updates.push('action_type = ?');
      params.push(parsedAction.value);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    params.push(id);
    await pool.query(`UPDATE system_forms SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM system_forms WHERE id = ?', [id]);
    res.json({ success: true, message: 'Planilla actualizada', data: mapRow(rows[0]) });
  } catch (error) {
    console.error('Error updateAdminForm:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar planilla' });
  }
};

/** DELETE /api/admin/forms/:id */
const deleteAdminForm = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'ID inválido' });
    const [result] = await pool.query('DELETE FROM system_forms WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Planilla no encontrada' });
    }
    res.json({ success: true, message: 'Planilla eliminada' });
  } catch (error) {
    console.error('Error deleteAdminForm:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar planilla' });
  }
};

/** GET /api/client/forms — solo activas, cliente autenticado */
const listClientForms = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, description, external_url, action_type, sort_order
       FROM system_forms WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        external_url: r.external_url,
        action_type: normalizeActionType(r.action_type),
        sort_order: r.sort_order ?? 0
      }))
    });
  } catch (error) {
    if (error.message && error.message.includes("doesn't exist")) {
      return res.json({ success: true, data: [] });
    }
    console.error('Error listClientForms:', error);
    res.status(500).json({ success: false, message: 'Error al cargar planillas' });
  }
};

module.exports = {
  listAdminForms,
  createAdminForm,
  updateAdminForm,
  deleteAdminForm,
  listClientForms
};
