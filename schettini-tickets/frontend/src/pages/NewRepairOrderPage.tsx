import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import SectionCard from '../components/Common/SectionCard';
import WebcamCapture, { CapturedPhoto } from '../components/RepairOrders/WebcamCapture';
import { User } from '../types';
import { FaSave, FaSearch } from 'react-icons/fa';

const NewRepairOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';

  const [clients, setClients] = useState<User[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [orderType, setOrderType] = useState<'taller' | 'domicilio'>('taller');
  const [equipmentType, setEquipmentType] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [reportedFault, setReportedFault] = useState('');
  const [includedAccessories, setIncludedAccessories] = useState('');
  const [isWarranty, setIsWarranty] = useState(false);

  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [technicianId, setTechnicianId] = useState<string>('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) setShowClientDropdown(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    api
      .get<{ success: boolean; data: User[] }>('/api/users')
      .then((res) => {
        const list = res.data.data || [];
        setClients(list.filter((u) => u.role === 'client'));
      })
      .catch(() => toast.error('Error al cargar clientes'));
  }, []);

  useEffect(() => {
    api
      .get<{ success: boolean; data: User[] }>('/api/users/technicians')
      .then((res) => {
        setTechnicians(res.data.data || []);
      })
      .catch(() => toast.error('Error al cargar técnicos'));
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 10);
    const q = clientSearch.toLowerCase();
    return clients
      .filter(
        (c) =>
          (c.username && c.username.toLowerCase().includes(q)) ||
          (c.full_name && c.full_name.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.business_name && c.business_name.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [clients, clientSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error('Seleccioná un cliente');
      return;
    }
    if (!technicianId) {
      toast.error('Seleccioná un técnico asignado');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('clientId', String(selectedClient.id));
    formData.append('status', 'ingresado');
    formData.append('entryDate', new Date().toISOString().slice(0, 19).replace('T', ' '));
    formData.append('equipmentType', equipmentType);
    formData.append('model', model);
    formData.append('serialNumber', serialNumber);
    formData.append('reportedFault', reportedFault);
    formData.append('includedAccessories', includedAccessories);
    formData.append('isWarranty', String(isWarranty));

    const tipoTexto = orderType === 'taller' ? 'Orden de Taller' : 'Visita a Domicilio';
    formData.append('internalNotes', `Tipo: ${tipoTexto}`);
    formData.append('technicianId', technicianId);

    photos.forEach((p, i) => {
      formData.append('photos', p.file);
    });
    formData.append('perspectiveLabels', JSON.stringify(photos.map((p) => p.label)));

    try {
      const res = await api.post<{ success: boolean; data: { id: number; orderNumber: string } }>(
        '/api/repair-orders',
        formData
      );
      toast.success(`Orden ${res.data.data.orderNumber} creada correctamente`);
      navigate(`${basePath}/${res.data.data.id}`);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
        ? (err.response.data as { message?: string })?.message
        : 'Error al crear la orden';
      toast.error(msg || 'Error al crear la orden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 overflow-visible">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Nueva Orden de Taller</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos del Cliente */}
        <SectionCard title="Datos del Cliente" overflowVisible>
          <div className="relative" ref={clientDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o razón social..."
                  value={selectedClient ? `${selectedClient.username}${selectedClient.business_name ? ` (${selectedClient.business_name})` : ''}` : clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    if (selectedClient) setSelectedClient(null);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                {selectedClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearch('');
                      setShowClientDropdown(true);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    Cambiar
                  </button>
                )}
                {showClientDropdown && !selectedClient && (
                  <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">Sin resultados</p>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClient(c);
                            setClientSearch('');
                            setShowClientDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                        >
                          <span className="font-medium">{c.username}</span>
                          {c.business_name && <span className="text-gray-500"> — {c.business_name}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Asignado <span className="text-red-500">*</span></label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar técnico...</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.username} {t.role && `(${t.role})`}
                </option>
              ))}
            </select>
          </div>
        </SectionCard>

        {/* Tipo de Orden */}
        <SectionCard title="Tipo de Orden">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orderType"
                checked={orderType === 'taller'}
                onChange={() => setOrderType('taller')}
                className="w-4 h-4 text-indigo-600"
              />
              <span>Orden de Taller</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orderType"
                checked={orderType === 'domicilio'}
                onChange={() => setOrderType('domicilio')}
                className="w-4 h-4 text-indigo-600"
              />
              <span>Visita a Domicilio</span>
            </label>
          </div>
        </SectionCard>

        {/* Datos del Equipo */}
        <SectionCard title="Datos del Equipo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Equipo</label>
              <input
                type="text"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                placeholder="Ej: Notebook, PC, Monitor..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej: ThinkPad T14"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serie N°</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Número de serie"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Falla / Problema Reportado</label>
            <textarea
              value={reportedFault}
              onChange={(e) => setReportedFault(e.target.value)}
              placeholder="Describa la falla o problema reportado por el cliente..."
              rows={5}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>
        </SectionCard>

        {/* Detalles */}
        <SectionCard title="Detalles">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios Incluidos</label>
              <textarea
                value={includedAccessories}
                onChange={(e) => setIncludedAccessories(e.target.value)}
                placeholder="Ej: Cargador, mouse, bolso..."
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isWarranty}
                onChange={(e) => setIsWarranty(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>En Garantía</span>
            </label>
          </div>
        </SectionCard>

        {/* Fotos con Webcam */}
        <SectionCard title="Fotos del Equipo">
          <WebcamCapture photos={photos} onPhotosChange={setPhotos} />
        </SectionCard>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <FaSave /> {loading ? 'Guardando...' : 'Crear Orden'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewRepairOrderPage;
