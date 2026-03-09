import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import SectionCard from '../components/Common/SectionCard';
import HelpTooltip from '../components/Common/HelpTooltip';
import WebcamCapture, { CapturedPhoto } from '../components/RepairOrders/WebcamCapture';
import NewClientModal from '../components/RepairOrders/NewClientModal';
import { User } from '../types';
import { FaSave, FaSearch, FaPlus, FaTrash } from 'react-icons/fa';

type OrderType = 'Taller' | 'Domicilio' | 'Remoto';
type Priority = 'Normal' | 'Urgente' | 'Critico';

const WARRANTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'oficial_fabricante', label: 'Oficial fabricante' },
  { value: 'garantia_propia', label: 'Garantía propia' },
  { value: 'garantia_proveedor', label: 'Garantía proveedor' }
];

const WARRANTY_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ingresado_garantia', label: 'Ingresado en garantía' },
  { value: 'en_diagnostico', label: 'En diagnóstico' },
  { value: 'espera_aprobacion_proveedor', label: 'En espera aprobación proveedor' },
  { value: 'enviado_fabrica', label: 'Enviado a fábrica' },
  { value: 'aprobado_cambio', label: 'Aprobado cambio' },
  { value: 'reparado_garantia', label: 'Reparado en garantía' },
  { value: 'rechazado_mal_uso', label: 'Rechazado por mal uso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'entregado', label: 'Entregado' }
];

interface SystemOption {
  id: number;
  category: string;
  value: string;
  sort_order: number;
}

interface RepairOrderItem {
  equipment_type: string;
  brand: string;
  model: string;
  serial_number: string;
  reported_fault: string;
  included_accessories: string;
  is_warranty: boolean;
  warranty_invoice: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  Normal: 'bg-gray-100 text-gray-800 border-gray-300',
  Urgente: 'bg-amber-100 text-amber-800 border-amber-400',
  Critico: 'bg-red-100 text-red-800 border-red-500'
};

const DEFAULT_ITEM: RepairOrderItem = {
  equipment_type: '',
  brand: '',
  model: '',
  serial_number: '',
  reported_fault: '',
  included_accessories: '',
  is_warranty: false,
  warranty_invoice: ''
};

const NewRepairOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';

  // Cliente
  const [clients, setClients] = useState<User[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Tipo de orden
  const [orderType, setOrderType] = useState<OrderType>('Taller');
  const [requiresCourier, setRequiresCourier] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [remotePlatform, setRemotePlatform] = useState('');

  // Garantía (orden completa)
  const [isWarranty, setIsWarranty] = useState(false);
  const [warrantyType, setWarrantyType] = useState('');
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [originalSupplier, setOriginalSupplier] = useState('');
  const [requiresFactoryShipping, setRequiresFactoryShipping] = useState(false);
  const [warrantyStatus, setWarrantyStatus] = useState('');

  // Equipos
  const [items, setItems] = useState<RepairOrderItem[]>([{ ...DEFAULT_ITEM }]);

  // Seña
  const [depositPaid, setDepositPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentOperationNumber, setPaymentOperationNumber] = useState('');

  // Asignación
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [technicianId, setTechnicianId] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('Normal');

  // Fotos: siempre iniciar vacío. No usar valor por defecto ni mock para evitar que aparezca una imagen en todas las órdenes.
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  // System options (selects dinámicos)
  const [systemOptions, setSystemOptions] = useState<SystemOption[]>([]);
  // Input "Otro" accesorio por equipo (índice -> valor)
  const [otherAccessoryByIdx, setOtherAccessoryByIdx] = useState<Record<number, string>>({});

  const optionsByCategory = useMemo(() => {
    const map: Record<string, SystemOption[]> = {};
    for (const o of systemOptions) {
      if (!map[o.category]) map[o.category] = [];
      map[o.category].push(o);
    }
    return map;
  }, [systemOptions]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) setShowClientDropdown(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: User[] }>('/api/users').then((res) => {
      setClients((res.data.data || []).filter((u) => u.role === 'client'));
    }).catch(() => toast.error('Error al cargar clientes'));
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: User[] }>('/api/users/technicians').then((res) => {
      setTechnicians(res.data.data || []);
    }).catch(() => toast.error('Error al cargar técnicos'));
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: SystemOption[] }>('/api/settings/system-options').then((res) => {
      setSystemOptions(res.data.data || []);
    }).catch(() => toast.error('Error al cargar opciones'));
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

  const handleClientCreated = (client: User) => {
    setClients((prev) => [client, ...prev]);
    setSelectedClient(client);
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const updateItem = (idx: number, field: keyof RepairOrderItem, value: string | boolean) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...DEFAULT_ITEM }]);
  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const simularAgenda = () => toast.info('Simulación de agenda: próximamente');

  const isEfectivo = paymentMethod.toLowerCase() === 'efectivo';
  const hasDeposit = depositPaid !== '' && parseFloat(depositPaid) > 0;

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
    const validItems = items.filter((it) => it.equipment_type || it.model || it.serial_number || it.reported_fault);
    if (validItems.length === 0) {
      toast.error('Agregá al menos un equipo con tipo, modelo, serie o falla');
      return;
    }
    if (isWarranty) {
      if (!warrantyType?.trim()) {
        toast.error('Seleccioná el tipo de garantía');
        return;
      }
      if (!purchaseInvoiceNumber?.trim()) {
        toast.error('Ingresá el número de factura de compra');
        return;
      }
      if (!purchaseDate?.trim()) {
        toast.error('Ingresá la fecha de compra');
        return;
      }
      if (!originalSupplier?.trim()) {
        toast.error('Ingresá el proveedor original');
        return;
      }
      const hasSerial = validItems.some((it) => it.serial_number?.trim());
      if (!hasSerial) {
        toast.error('En garantía al menos un equipo debe tener Nº de serie');
        return;
      }
    }
    for (let i = 0; i < validItems.length; i++) {
      if (validItems[i].is_warranty && !validItems[i].warranty_invoice?.trim()) {
        toast.error(`Equipo ${i + 1}: Si es garantía, indicá el Nº de Comprobante/Factura`);
        return;
      }
    }
    if (hasDeposit && !isEfectivo && !paymentOperationNumber?.trim()) {
      toast.error('Si la seña no es en efectivo, indicá el Nº de Operación');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('clientId', String(selectedClient.id));
    formData.append('status', 'ingresado');
    formData.append('entryDate', new Date().toISOString().slice(0, 19).replace('T', ' '));
    formData.append('technicianId', technicianId);
    const finalOrderType = requiresCourier ? 'Cadeteria' : orderType;
    formData.append('orderType', finalOrderType);
    formData.append('priority', priority);

    if (orderType === 'Domicilio' || finalOrderType === 'Cadeteria') {
      const dt = visitDate && visitTime ? `${visitDate}T${visitTime}:00` : '';
      if (dt) formData.append('visitDate', dt);
      if (deliveryAddress) formData.append('deliveryAddress', deliveryAddress);
    }
    if (orderType === 'Remoto') {
      const dt = visitDate && visitTime ? `${visitDate}T${visitTime}:00` : '';
      if (dt) formData.append('visitDate', dt);
      if (remotePlatform) formData.append('remotePlatform', remotePlatform);
    }
    if (depositPaid) {
      formData.append('depositPaid', depositPaid);
      if (paymentMethod) formData.append('paymentMethod', paymentMethod);
      if (paymentOperationNumber) formData.append('paymentOperationNumber', paymentOperationNumber);
    }
    if (isWarranty) {
      formData.append('isWarranty', 'true');
      formData.append('warrantyType', warrantyType);
      formData.append('purchaseInvoiceNumber', purchaseInvoiceNumber.trim());
      formData.append('purchaseDate', purchaseDate);
      formData.append('originalSupplier', originalSupplier.trim());
      formData.append('requiresFactoryShipping', requiresFactoryShipping ? 'true' : 'false');
      if (warrantyStatus) formData.append('warrantyStatus', warrantyStatus);
    }

    formData.append('items', JSON.stringify(validItems));
    photos.forEach((p) => formData.append('photos', p.file));
    formData.append('perspectiveLabels', JSON.stringify(photos.map((p) => p.label)));

    try {
      const res = await api.post<{ success: boolean; data: { id: number; orderNumber: string } }>('/api/repair-orders', formData);
      toast.success(`Orden ${res.data.data.orderNumber} creada correctamente`);
      navigate(`${basePath}/${res.data.data.id}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
          ? (err.response.data as { message?: string })?.message
          : 'Error al crear la orden';
      toast.error(msg || 'Error al crear la orden');
    } finally {
      setLoading(false);
    }
  };

  const SelectOption = ({ category, value, onChange, placeholder }: { category: string; value: string; onChange: (v: string) => void; placeholder?: string }) => {
    const opts = optionsByCategory[category] || [];
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">{placeholder || 'Seleccionar...'}</option>
        {opts.map((o) => (
          <option key={o.id} value={o.value}>{o.value}</option>
        ))}
      </select>
    );
  };

  /** Input creatable: elegir de la lista o escribir texto libre (valor se envía tal cual en submit). */
  const CreatableOption = ({ category, itemIndex, value, onChange, placeholder }: { category: string; itemIndex: number; value: string; onChange: (v: string) => void; placeholder?: string }) => {
    const opts = (optionsByCategory[category] || []).map((o) => o.value);
    const listId = `creatable-${category}-${itemIndex}`;
    return (
      <>
        <input
          type="text"
          list={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Seleccionar o escribir...'}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
        <datalist id={listId}>
          {opts.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </>
    );
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
                  <button type="button" onClick={() => { setSelectedClient(null); setClientSearch(''); setShowClientDropdown(true); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">Cambiar</button>
                )}
                {showClientDropdown && !selectedClient && (
                  <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">Sin resultados</p>
                    ) : (
                      filteredClients.map((c) => (
                        <button key={c.id} type="button" onClick={() => { setSelectedClient(c); setClientSearch(''); setShowClientDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-0">
                          <span className="font-medium">{c.username}</span>
                          {c.business_name && <span className="text-gray-500"> — {c.business_name}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setShowNewClientModal(true)} className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 whitespace-nowrap">
                Nuevo Cliente
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Tipo de Orden */}
        <SectionCard title="Tipo de Orden">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              {(['Taller', 'Domicilio', 'Remoto'] as OrderType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="orderType" checked={orderType === t} onChange={() => setOrderType(t)} className="w-4 h-4 text-indigo-600" />
                  <span>{t}</span>
                </label>
              ))}
            </div>
            {orderType === 'Domicilio' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de visita</label>
                  <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Calle, número, localidad..." className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <button type="button" onClick={simularAgenda} className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    Simular agenda
                  </button>
                </div>
              </div>
            )}
            {orderType === 'Remoto' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma</label>
                  <SelectOption category="remote_platform" value={remotePlatform} onChange={setRemotePlatform} placeholder="TeamViewer, AnyDesk..." />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={requiresCourier}
                onChange={(e) => setRequiresCourier(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
                aria-describedby="courier-address-field"
              />
              <span>Requiere Cadetería (Retiro/Envío)</span>
            </label>
            <div
              id="courier-address-field"
              className={requiresCourier && orderType !== 'Domicilio' ? 'mt-3' : 'hidden'}
              aria-hidden={!(requiresCourier && orderType !== 'Domicilio')}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de entrega</label>
              <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Para retiro/envío" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </SectionCard>

        {/* ¿Es Garantía? + Datos de Garantía */}
        <SectionCard title="Garantía">
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isWarranty} onChange={(e) => setIsWarranty(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded border-gray-300" />
              <span className="font-medium text-gray-800">¿Es un ingreso por Garantía?</span>
              <HelpTooltip text="Si se tilda, no se podrá facturar la orden y se requerirá número de serie obligatorio." />
            </label>
            {isWarranty && (
              <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50/80 space-y-4">
                <h4 className="font-bold text-gray-800">Datos de Garantía</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de garantía <span className="text-red-500">*</span></label>
                    <select value={warrantyType} onChange={(e) => setWarrantyType(e.target.value)} required={isWarranty} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="">Seleccionar...</option>
                      {WARRANTY_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nº de factura de compra <span className="text-red-500">*</span></label>
                    <input type="text" value={purchaseInvoiceNumber} onChange={(e) => setPurchaseInvoiceNumber(e.target.value)} required={isWarranty} placeholder="Ej: 001-00001234" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de compra <span className="text-red-500">*</span></label>
                    <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required={isWarranty} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor original <span className="text-red-500">*</span></label>
                    <input type="text" value={originalSupplier} onChange={(e) => setOriginalSupplier(e.target.value)} required={isWarranty} placeholder="Nombre del proveedor o fabricante" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">¿Requiere envío a fábrica?</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={requiresFactoryShipping} onChange={(e) => setRequiresFactoryShipping(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                      <span>Sí</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado de garantía</label>
                    <select value={warrantyStatus} onChange={(e) => setWarrantyStatus(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="">Seleccionar...</option>
                      {WARRANTY_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {isWarranty && (
                  <p className="text-sm text-amber-700 font-medium">Al menos un equipo debe tener Nº de serie para órdenes por garantía.</p>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Equipos (múltiples) */}
        <SectionCard title="Equipos">
          <div className="space-y-6">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-gray-700">Equipo {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1">
                      <FaTrash /> Quitar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Equipo</label>
                    <CreatableOption category="equipment_type" itemIndex={idx} value={item.equipment_type} onChange={(v) => updateItem(idx, 'equipment_type', v)} placeholder="Seleccionar o escribir..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                    <CreatableOption category="brand" itemIndex={idx} value={item.brand} onChange={(v) => updateItem(idx, 'brand', v)} placeholder="Seleccionar o escribir..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                    <CreatableOption category="model" itemIndex={idx} value={item.model} onChange={(v) => updateItem(idx, 'model', v)} placeholder="Seleccionar o escribir..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serie N° {isWarranty && <span className="text-red-500">* (obligatorio en garantía)</span>}
                    </label>
                    <input type="text" value={item.serial_number} onChange={(e) => updateItem(idx, 'serial_number', e.target.value)} placeholder="Texto libre" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Falla / Problema Reportado</label>
                  <textarea value={item.reported_fault} onChange={(e) => updateItem(idx, 'reported_fault', e.target.value)} placeholder="Descripción de la falla..." rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-y" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios Incluidos</label>
                  {(() => {
                    const accessoryOpts = (optionsByCategory['accessory'] || optionsByCategory['accessories'] || []).map((o) => o.value);
                    const arr = (item.included_accessories || '').split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
                    const toggleAccessory = (value: string) => {
                      const next = arr.includes(value) ? arr.filter((a) => a !== value) : [...arr, value];
                      updateItem(idx, 'included_accessories', next.join(', '));
                    };
                    const addOther = () => {
                      const val = (otherAccessoryByIdx[idx] ?? '').trim();
                      if (!val) return;
                      if (arr.includes(val)) return;
                      updateItem(idx, 'included_accessories', [...arr, val].join(', '));
                      setOtherAccessoryByIdx((p) => ({ ...p, [idx]: '' }));
                    };
                    return (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                          {accessoryOpts.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 p-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={arr.includes(opt)}
                                onChange={() => toggleAccessory(opt)}
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                          {accessoryOpts.length === 0 && (
                            <p className="text-xs text-gray-500 col-span-full py-1">Sin opciones. Agregá manualmente abajo.</p>
                          )}
                        </div>
                        {arr.filter((a) => !accessoryOpts.includes(a)).length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="text-xs text-gray-500 font-medium">Otros:</span>
                            {arr
                              .filter((a) => !accessoryOpts.includes(a))
                              .map((a) => (
                                <span
                                  key={a}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm"
                                >
                                  {a}
                                  <button type="button" onClick={() => toggleAccessory(a)} className="text-indigo-600 hover:text-indigo-800 ml-0.5">×</button>
                                </span>
                              ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={otherAccessoryByIdx[idx] ?? ''}
                            onChange={(e) => setOtherAccessoryByIdx((p) => ({ ...p, [idx]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOther())}
                            placeholder="Otro (especificar)..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button type="button" onClick={addOther} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 text-sm flex items-center gap-1">
                            <FaPlus size={12} /> Agregar
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={item.is_warranty} onChange={(e) => updateItem(idx, 'is_warranty', e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span>Es Garantía</span>
                  </label>
                  {item.is_warranty && (
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={item.warranty_invoice}
                        onChange={(e) => updateItem(idx, 'warranty_invoice', e.target.value)}
                        placeholder="Nº de Comprobante / Factura *"
                        required={item.is_warranty}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-indigo-400 text-indigo-600 rounded-lg hover:bg-indigo-50">
              <FaPlus /> Agregar otro equipo a esta orden
            </button>
          </div>
        </SectionCard>

        {/* Seña */}
        <SectionCard title="Seña">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                Monto de seña ($)
                <HelpTooltip text="Monto que dejó el cliente por adelantado. Se restará automáticamente del total final." />
              </label>
              <input type="number" step="0.01" min="0" value={depositPaid} onChange={(e) => setDepositPaid(e.target.value)} placeholder="0" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            {hasDeposit && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
                  <SelectOption category="payment_method" value={paymentMethod} onChange={setPaymentMethod} />
                </div>
                {!isEfectivo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nº Operación *</label>
                    <input type="text" value={paymentOperationNumber} onChange={(e) => setPaymentOperationNumber(e.target.value)} placeholder="Nº de operación o referencia" required={hasDeposit && !isEfectivo} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </>
            )}
          </div>
        </SectionCard>

        {/* Asignación y Prioridad */}
        <SectionCard title="Asignación y Prioridad">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Asignado <span className="text-red-500">*</span></label>
              <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar técnico...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name || t.username} {t.role && `(${t.role})`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                {(Object.keys(PRIORITY_COLORS) as Priority[]).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs border ${PRIORITY_COLORS[priority]}`}>{priority}</span>
            </div>
          </div>
        </SectionCard>

        {/* Fotos */}
        <SectionCard title="Fotos del Equipo">
          <WebcamCapture photos={photos} onPhotosChange={setPhotos} />
        </SectionCard>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(basePath)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            <FaSave /> {loading ? 'Guardando...' : 'Crear Orden'}
          </button>
        </div>
      </form>

      <NewClientModal isOpen={showNewClientModal} onClose={() => setShowNewClientModal(false)} onClientCreated={handleClientCreated} />
    </div>
  );
};

export default NewRepairOrderPage;
