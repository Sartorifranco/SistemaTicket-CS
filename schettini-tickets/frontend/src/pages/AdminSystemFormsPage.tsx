import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import SectionCard from '../components/Common/SectionCard';
import { FaEdit, FaPlus, FaTimes, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';

export type SystemFormActionType = 'iframe' | 'external_link';

export interface SystemForm {
  id: number;
  title: string;
  description: string;
  external_url: string;
  action_type?: SystemFormActionType;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

const emptyForm = {
  title: '',
  description: '',
  external_url: '',
  action_type: 'iframe' as SystemFormActionType,
  is_active: true,
  sort_order: '0'
};

const AdminSystemFormsPage: React.FC = () => {
  const [list, setList] = useState<SystemForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SystemForm | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(() => {
    setLoading(true);
    api
      .get<{ success: boolean; data: SystemForm[] }>('/api/admin/forms')
      .then((res) => setList(res.data.data || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Error al cargar planillas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: SystemForm) => {
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description,
      external_url: row.external_url,
      action_type: row.action_type === 'external_link' ? 'external_link' : 'iframe',
      is_active: row.is_active,
      sort_order: String(row.sort_order ?? 0)
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    const external_url = form.external_url.trim();
    if (!title || !description || !external_url) {
      toast.warn('Completá título, advertencia y URL');
      return;
    }
    const payload = {
      title,
      description,
      external_url,
      action_type: form.action_type,
      is_active: form.is_active,
      sort_order: parseInt(form.sort_order, 10) || 0
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/admin/forms/${editing.id}`, payload);
        toast.success('Planilla actualizada');
      } else {
        await api.post('/api/admin/forms', payload);
        toast.success('Planilla creada');
      }
      closeModal();
      fetchList();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
          ? (err.response.data as { message?: string })?.message
          : 'Error al guardar';
      toast.error(msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: SystemForm) => {
    if (!window.confirm(`¿Eliminar la planilla "${row.title}"?`)) return;
    try {
      await api.delete(`/api/admin/forms/${row.id}`);
      toast.success('Planilla eliminada');
      fetchList();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const toggleActive = async (row: SystemForm) => {
    try {
      await api.put(`/api/admin/forms/${row.id}`, { is_active: !row.is_active });
      fetchList();
    } catch {
      toast.error('No se pudo cambiar el estado');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Planillas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Enlaces a formularios externos (Google Forms) que verán los clientes en &quot;Activaciones / Planillas&quot;.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
        >
          <FaPlus /> Nueva planilla
        </button>
      </div>

      <SectionCard title="Planillas configuradas">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay planillas. Creá la primera con el botón superior.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Orden</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Título</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">URL</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Activa</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{row.sort_order}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.title}</td>
                    <td className="px-3 py-2 max-w-xs truncate">
                      <a
                        href={row.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        <FaExternalLinkAlt className="shrink-0" /> Ver enlace
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(row)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          row.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {row.is_active ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded mr-1"
                      >
                        <FaEdit /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Editar planilla' : 'Nueva planilla'}</h2>
              <button type="button" onClick={closeModal} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Advertencia / descripción legal</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Texto de aviso legal que verá el cliente antes de abrir el formulario"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL externa (Google Forms)</label>
                <input
                  type="url"
                  value={form.external_url}
                  onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))}
                  placeholder="https://docs.google.com/forms/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comportamiento del enlace</label>
                <select
                  value={form.action_type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      action_type: e.target.value as SystemFormActionType
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="iframe">
                    Abrir dentro del sistema (Iframe - Recomendado para Google Forms)
                  </option>
                  <option value="external_link">
                    Abrir en nueva pestaña (Recomendado para Descargas de PDF/Drive)
                  </option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible para clientes</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemFormsPage;
