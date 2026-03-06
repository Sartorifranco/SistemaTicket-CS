import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import SectionCard from '../components/Common/SectionCard';
import { FaEye, FaRecycle, FaSearch, FaPaperclip, FaTimes, FaSave, FaPlus } from 'react-icons/fa';

interface RecyclingOrder {
  id: number;
  order_number: string;
  client_id?: number;
  client_name?: string;
  client_business_name?: string;
  status: string;
  equipment_type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  entry_date?: string | null;
  created_at?: string;
  recycling_notes?: string | null;
  recycling_photos?: string[] | string | null;
  is_external_recycled?: boolean;
  external_order_number?: string | null;
  external_equipment_status?: string | null;
}

function parseRecyclingPhotos(v: RecyclingOrder['recycling_photos']): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const RecyclingAreaPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';

  const [orders, setOrders] = useState<RecyclingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [savingRecycling, setSavingRecycling] = useState(false);
  const [modalExternalOpen, setModalExternalOpen] = useState(false);
  const [externalForm, setExternalForm] = useState({
    external_order_number: '',
    brand: '',
    model: '',
    serial_number: '',
    equipment_status: ''
  });
  const [externalFiles, setExternalFiles] = useState<File[]>([]);
  const [externalSending, setExternalSending] = useState(false);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    api
      .get<{ success: boolean; data: RecyclingOrder[] }>('/api/repair-orders?status=abandonado')
      .then((res) => setOrders(res.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return orders;
    const q = searchText.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (o.order_number && o.order_number.toLowerCase().includes(q)) ||
        (o.external_order_number && o.external_order_number.toLowerCase().includes(q)) ||
        (o.client_name && o.client_name.toLowerCase().includes(q)) ||
        (o.client_business_name && o.client_business_name.toLowerCase().includes(q)) ||
        (o.equipment_type && o.equipment_type.toLowerCase().includes(q)) ||
        (o.brand && o.brand.toLowerCase().includes(q)) ||
        (o.model && o.model.toLowerCase().includes(q)) ||
        (o.serial_number && o.serial_number.toLowerCase().includes(q))
    );
  }, [orders, searchText]);

  const handleSubmitExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    setExternalSending(true);
    try {
      const formData = new FormData();
      formData.append('external_order_number', externalForm.external_order_number.trim());
      formData.append('brand', externalForm.brand.trim());
      formData.append('model', externalForm.model.trim());
      formData.append('serial_number', externalForm.serial_number.trim());
      formData.append('equipment_status', externalForm.equipment_status.trim());
      externalFiles.forEach((f) => formData.append('photos', f));
      await api.post('/api/repair-orders/external-recycled', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Orden externa cargada correctamente.');
      setModalExternalOpen(false);
      setExternalForm({ external_order_number: '', brand: '', model: '', serial_number: '', equipment_status: '' });
      setExternalFiles([]);
      fetchOrders();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cargar orden externa.';
      toast.error(msg);
    } finally {
      setExternalSending(false);
    }
  };

  const openEditRecycling = (o: RecyclingOrder) => {
    setEditOrderId(o.id);
    setEditNotes(o.recycling_notes || '');
    setEditNewFiles([]);
  };

  const closeEditRecycling = () => {
    setEditOrderId(null);
    setEditNotes('');
    setEditNewFiles([]);
  };

  const handleSaveRecycling = async () => {
    if (!editOrderId) return;
    setSavingRecycling(true);
    try {
      const formData = new FormData();
      formData.append('recycling_notes', editNotes);
      editNewFiles.forEach((f) => formData.append('photos', f));
      await api.patch(`/api/repair-orders/${editOrderId}/recycling`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Observaciones y adjuntos actualizados.');
      closeEditRecycling();
      fetchOrders();
    } catch {
      toast.error('Error al guardar. Revisá que los archivos sean imágenes o PDF.');
    } finally {
      setSavingRecycling(false);
    }
  };

  const isPdf = (url: string) => /\.pdf$/i.test(url) || url.toLowerCase().includes('pdf');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaRecycle className="text-amber-600" /> Área de Reciclaje
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setModalExternalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 shadow-md transition"
          >
            <FaPlus /> Agregar Orden Externa
          </button>
          <button
            onClick={() => navigate(isAdmin ? '/admin/repair-orders' : '/agent/repair-orders')}
            className="text-indigo-600 hover:underline flex items-center gap-1"
          >
            ← Volver a Órdenes de Taller
          </button>
        </div>
      </div>

      <p className="text-gray-600 text-sm">
        Órdenes declaradas en estado <strong>Abandonado/Reciclaje</strong>. Observaciones y fotos de reciclaje son de uso interno (no visibles para el cliente).
      </p>

      <SectionCard title="Órdenes abandonadas">
        <div className="mb-4">
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por N° orden, cliente o equipo..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-600 font-medium mb-1">{searchText.trim() ? 'No hay resultados para la búsqueda.' : 'Aún no hay registros aquí.'}</p>
            {!searchText.trim() && (
              <p className="text-gray-500 text-sm">Las órdenes que se envíen a reciclaje aparecerán en esta lista.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Orden</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Equipo / Modelo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha ingreso</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Observaciones reciclaje</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((o) => (
                  <React.Fragment key={o.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">
                        {o.is_external_recycled ? (
                          <span className="flex items-center gap-2">
                            <span>{o.external_order_number || o.order_number}</span>
                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">Externa</span>
                          </span>
                        ) : (
                          o.order_number
                        )}
                      </td>
                      <td className="px-4 py-2">{o.client_name || '—'} {o.client_business_name && <span className="text-gray-500 text-sm">({o.client_business_name})</span>}</td>
                      <td className="px-4 py-2">
                        {o.brand || o.equipment_type || o.model ? (
                          <>
                            {o.brand && <span className="font-medium">{o.brand}</span>}
                            {o.equipment_type && <span className="text-gray-600">{o.brand ? ' ' : ''}{o.equipment_type}</span>}
                            {o.model && <span className="text-gray-500 text-sm"> / {o.model}</span>}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">{formatDate(o.entry_date || o.created_at)}</td>
                      <td className="px-4 py-2 text-sm max-w-xs">
                        {o.recycling_notes ? (
                          <span className="line-clamp-2 text-gray-700">{o.recycling_notes}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Ver detalle y fotos"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => navigate(`${basePath}/${o.id}`)}
                          className="ml-1 p-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                          title="Ver orden completa"
                        >
                          Ver orden
                        </button>
                      </td>
                    </tr>
                    {expandedId === o.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50 border-l border-r border-b">
                          <div className="space-y-3">
                            {o.recycling_notes && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones de reciclaje</p>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{o.recycling_notes}</p>
                              </div>
                            )}
                            {parseRecyclingPhotos(o.recycling_photos).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Adjuntos (fotos / PDFs)</p>
                                <div className="flex flex-wrap gap-4">
                                  {parseRecyclingPhotos(o.recycling_photos).map((url, idx) => (
                                    <div key={idx} className="flex flex-col">
                                      {isPdf(url) ? (
                                        <a href={getImageUrl(url)} target="_blank" rel="noopener noreferrer" className="w-32 h-32 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">
                                          PDF
                                        </a>
                                      ) : (
                                        <img
                                          src={getImageUrl(url)}
                                          alt={`Adjunto ${idx + 1}`}
                                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                                        />
                                      )}
                                      <span className="text-xs text-gray-500 mt-1">{isPdf(url) ? 'PDF' : `Foto ${idx + 1}`}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(!o.recycling_notes || parseRecyclingPhotos(o.recycling_photos).length === 0) && (
                              <p className="text-sm text-gray-400">Sin observaciones ni adjuntos de reciclaje.</p>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditRecycling(o)}
                              className="mt-2 flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                            >
                              <FaPaperclip /> Editar notas / Adjuntar fotos o PDFs
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Modal Editar reciclaje / Adjuntar archivos */}
      {editOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Editar reciclaje / Adjuntar archivos</h2>
              <button type="button" onClick={closeEditRecycling} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de reciclaje</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Notas internas, capturas de chat con el cliente..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuevos adjuntos (fotos o PDFs)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf"
                  onChange={(e) => setEditNewFiles(e.target.files ? Array.from(e.target.files) : [])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700"
                />
                {editNewFiles.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{editNewFiles.length} archivo(s) seleccionado(s)</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button type="button" onClick={closeEditRecycling} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRecycling}
                disabled={savingRecycling}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <FaSave /> {savingRecycling ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cargar Orden Externa (sistema anterior) */}
      {modalExternalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Cargar Orden de Sistema Anterior</h2>
              <button type="button" onClick={() => { setModalExternalOpen(false); setExternalFiles([]); setExternalForm({ external_order_number: '', brand: '', model: '', serial_number: '', equipment_status: '' }); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmitExternal} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° de Orden Externa</label>
                <input
                  type="text"
                  value={externalForm.external_order_number}
                  onChange={(e) => setExternalForm((f) => ({ ...f, external_order_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: EXT-2024-001"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={externalForm.brand}
                    onChange={(e) => setExternalForm((f) => ({ ...f, brand: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: HP, Epson"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={externalForm.model}
                    onChange={(e) => setExternalForm((f) => ({ ...f, model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: LaserJet, L3250"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie</label>
                <input
                  type="text"
                  value={externalForm.serial_number}
                  onChange={(e) => setExternalForm((f) => ({ ...f, serial_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado del Equipo</label>
                <input
                  type="text"
                  value={externalForm.equipment_status}
                  onChange={(e) => setExternalForm((f) => ({ ...f, equipment_status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Con fallas, Completo, Sin tapa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjuntar archivos / fotos</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf"
                  onChange={(e) => setExternalFiles(e.target.files ? Array.from(e.target.files) : [])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700"
                />
                {externalFiles.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{externalFiles.length} archivo(s) seleccionado(s)</p>
                )}
              </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => { setModalExternalOpen(false); setExternalFiles([]); setExternalForm({ external_order_number: '', brand: '', model: '', serial_number: '', equipment_status: '' }); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={externalSending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                <FaSave /> {externalSending ? 'Cargando...' : 'Finalizar Carga'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecyclingAreaPage;
