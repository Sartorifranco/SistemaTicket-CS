import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import {
  FaSave,
  FaBuilding,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaPercent,
  FaFileAlt,
  FaPalette,
  FaImage,
  FaTicketAlt,
  FaTrash,
  FaPlus,
  FaCalculator,
  FaFileExcel,
  FaBalanceScale,
  FaCog,
  FaTags,
  FaToolbox,
  FaList,
  FaCube,
  FaCloud,
  FaUpload
} from 'react-icons/fa';

interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string | null;
  legal_footer_text: string;
  tax_percentage: number;
  quote_footer_text: string;
  primary_color: string;
  usd_exchange_rate?: number | null;
  default_iva_percent?: number | null;
  list_price_surcharge_percent?: number | null;
  profit_margin_percent?: number | null;
  recycling_days_abandonment?: number | null;
  default_warranty_months?: number | null;
  legal_terms_ticket?: string | null;
  agents_can_view_movements?: boolean | number | null;
}

const defaultSettings: CompanySettings = {
  company_name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo_url: null,
  legal_footer_text: '',
  tax_percentage: 21,
  quote_footer_text: '',
  primary_color: '#000000',
  usd_exchange_rate: null,
  default_iva_percent: 21,
  list_price_surcharge_percent: null,
  profit_margin_percent: 30,
  recycling_days_abandonment: null,
  default_warranty_months: null,
  legal_terms_ticket: null,
  agents_can_view_movements: false,
};

type TabId = 'general' | 'finanzas' | 'taller' | 'accesorios' | 'marcas' | 'tipos-equipo' | 'modelos' | 'categorias-tickets' | 'cloud-contracts';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <FaBuilding /> },
  { id: 'finanzas', label: 'Finanzas y Cotizador', icon: <FaCalculator /> },
  { id: 'taller', label: 'Taller y Órdenes', icon: <FaToolbox /> },
  { id: 'accesorios', label: 'Accesorios', icon: <FaToolbox /> },
  { id: 'marcas', label: 'Marcas', icon: <FaTags /> },
  { id: 'tipos-equipo', label: 'Tipos de Equipo', icon: <FaList /> },
  { id: 'modelos', label: 'Modelos', icon: <FaCube /> },
  { id: 'categorias-tickets', label: 'Categorías de Tickets', icon: <FaTicketAlt /> },
  { id: 'cloud-contracts', label: 'Gestor Contratos Cloud', icon: <FaCloud /> },
];

/** Componente genérico para gestionar listas de system_options por categoría */
const OptionsListManager: React.FC<{
  category: string;
  title: string;
  description: string;
  placeholder?: string;
}> = ({ category, title, description, placeholder = 'Escribir y agregar...' }) => {
  const [items, setItems] = useState<{ id: number; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { id: number; category: string; value: string }[] }>(
        `/api/settings/system-options?category=${encodeURIComponent(category)}`
      );
      setItems((res.data.data || []).map((o) => ({ id: o.id, value: o.value })));
    } catch {
      toast.error(`No se pudieron cargar los datos de ${title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category]);

  const handleAdd = async () => {
    const val = newValue.trim();
    if (!val) {
      toast.warn('Ingresá un valor');
      return;
    }
    try {
      await api.post('/api/settings/system-options', { category, value: val });
      toast.success('Agregado correctamente');
      setNewValue('');
      fetchItems();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al agregar';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este elemento?')) return;
    try {
      await api.delete(`/api/settings/system-options/${id}`);
      toast.success('Eliminado');
      fetchItems();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al eliminar';
      toast.error(msg);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <FaPlus /> Agregar
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 italic">No hay elementos. Agregá uno nuevo arriba.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-medium text-gray-800">{item.value}</span>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Eliminar"
              >
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AGENT_ALLOWED_TABS: TabId[] = ['accesorios', 'marcas', 'tipos-equipo', 'modelos'];

const AdminCompanySettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAgent = user?.role === 'agent';
  const visibleTabs = isAgent ? TABS.filter((t) => AGENT_ALLOWED_TABS.includes(t.id)) : TABS;
  const defaultTabForAgent: TabId = 'accesorios';
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    user?.role === 'agent' ? defaultTabForAgent : 'general'
  );
  const [formData, setFormData] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [ticketCategories, setTicketCategories] = useState<{ id: number; name: string }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [sparePartsUploading, setSparePartsUploading] = useState(false);
  const sparePartsInputRef = useRef<HTMLInputElement>(null);

  const [cloudContracts, setCloudContracts] = useState<{ filename: string; label: string; url: string }[]>([]);
  const [cloudContractsLoading, setCloudContractsLoading] = useState(false);
  const [cloudContractUploading, setCloudContractUploading] = useState(false);
  const cloudContractInputRef = useRef<HTMLInputElement>(null);

  const fetchCloudContracts = async () => {
    setCloudContractsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { filename: string; label: string; url: string }[] }>('/api/settings/cloud-contracts');
      setCloudContracts(res.data.data || []);
    } catch {
      toast.error('No se pudieron cargar los contratos Cloud');
    } finally {
      setCloudContractsLoading(false);
    }
  };

  const handleUploadCloudContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se permiten archivos PDF');
      return;
    }
    setCloudContractUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/api/settings/cloud-contracts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Contrato subido correctamente');
      fetchCloudContracts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al subir';
      toast.error(msg);
    } finally {
      setCloudContractUploading(false);
      if (cloudContractInputRef.current) cloudContractInputRef.current.value = '';
    }
  };

  const handleDeleteCloudContract = async (filename: string) => {
    if (!window.confirm('¿Eliminar este contrato?')) return;
    try {
      await api.delete(`/api/settings/cloud-contracts/${encodeURIComponent(filename)}`);
      toast.success('Contrato eliminado');
      fetchCloudContracts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al eliminar';
      toast.error(msg);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud-contracts') fetchCloudContracts();
  }, [activeTab]);

  const fetchTicketCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.get('/api/settings/ticket-categories');
      setTicketCategories(res.data.data || []);
    } catch {
      toast.error('No se pudieron cargar las categorías de tickets');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketCategories();
  }, []);

  useEffect(() => {
    if (isAgent && !AGENT_ALLOWED_TABS.includes(activeTab)) {
      setActiveTab(defaultTabForAgent);
    }
  }, [isAgent, activeTab]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.warn('Ingresá un nombre para la categoría');
      return;
    }
    try {
      await api.post('/api/settings/ticket-categories', { name: newCategoryName.trim() });
      toast.success('Categoría agregada');
      setNewCategoryName('');
      fetchTicketCategories();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al agregar';
      toast.error(msg);
    }
  };

  const handleSparePartsExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Solo se aceptan archivos Excel (.xlsx, .xls)');
      return;
    }
    setSparePartsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];
      const items: { nombre: string; precio_usd?: number; precio_ars?: number }[] = [];
      const toNum = (v: unknown): number | undefined => {
        if (v == null || v === '') return undefined;
        if (typeof v === 'number' && !isNaN(v)) return v;
        const s = String(v).replace(/[^\d.,-]/g, '').replace(',', '.');
        const n = parseFloat(s);
        return isNaN(n) ? undefined : n;
      };
      const headers = (rows[0] as unknown[])?.map((h) => String(h ?? '').toLowerCase()) || [];
      const idxNombre = headers.findIndex((h) => h.includes('nombre') || h.includes('descripcion') || h.includes('repuesto'));
      const idxUsd = headers.findIndex((h) => h.includes('usd') || h.includes('dolar') || h.includes('dólar'));
      const idxArs = headers.findIndex((h) => h.includes('ars') || h.includes('pesos'));
      const colNombre = idxNombre >= 0 ? idxNombre : 0;
      const colUsd = idxUsd >= 0 ? idxUsd : 1;
      const colArs = idxArs >= 0 ? idxArs : 2;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as unknown[];
        const nombre = String(row[colNombre] ?? '').trim();
        if (!nombre) continue;
        items.push({
          nombre,
          precio_usd: toNum(row[colUsd]),
          precio_ars: toNum(row[colArs])
        });
      }
      if (items.length === 0) {
        toast.warn('No se encontraron filas válidas. Use columnas: nombre, precio_usd, precio_ars');
        return;
      }
      await api.post('/api/settings/spare-parts-catalog/bulk', { items });
      toast.success(`${items.length} repuestos importados correctamente`);
      if (sparePartsInputRef.current) sparePartsInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al importar';
      toast.error(msg);
    } finally {
      setSparePartsUploading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.delete(`/api/settings/ticket-categories/${id}`);
      toast.success('Categoría eliminada');
      fetchTicketCategories();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al eliminar';
      toast.error(msg);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/api/settings/company');
        const data = res.data.data || res.data;
        setFormData({
          company_name: data.company_name ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          website: data.website ?? '',
          logo_url: data.logo_url ?? null,
          legal_footer_text: data.legal_footer_text ?? '',
          tax_percentage: data.tax_percentage != null ? Number(data.tax_percentage) : 21,
          quote_footer_text: data.quote_footer_text ?? '',
          primary_color: data.primary_color ?? '#000000',
          usd_exchange_rate: data.usd_exchange_rate != null ? Number(data.usd_exchange_rate) : null,
          default_iva_percent: data.default_iva_percent != null ? Number(data.default_iva_percent) : 21,
          list_price_surcharge_percent: data.list_price_surcharge_percent != null ? Number(data.list_price_surcharge_percent) : null,
          profit_margin_percent: data.profit_margin_percent != null ? Number(data.profit_margin_percent) : 30,
          recycling_days_abandonment: data.recycling_days_abandonment != null ? Number(data.recycling_days_abandonment) : null,
          default_warranty_months: data.default_warranty_months != null ? Number(data.default_warranty_months) : null,
          legal_terms_ticket: data.legal_terms_ticket ?? null,
          agents_can_view_movements: data.agents_can_view_movements === 1 || data.agents_can_view_movements === true,
        });
        if (data.logo_url) {
          setLogoPreview(getImageUrl(data.logo_url));
        }
      } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar la configuración de la empresa');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoFile(null);
      setLogoPreview(formData.logo_url ? getImageUrl(formData.logo_url) : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData();
      form.append('company_name', formData.company_name);
      form.append('address', formData.address);
      form.append('phone', formData.phone);
      form.append('email', formData.email);
      form.append('website', formData.website);
      form.append('tax_percentage', String(formData.tax_percentage));
      form.append('quote_footer_text', formData.quote_footer_text);
      form.append('legal_footer_text', formData.legal_footer_text);
      form.append('primary_color', formData.primary_color);
      form.append('usd_exchange_rate', formData.usd_exchange_rate != null ? String(formData.usd_exchange_rate) : '');
      form.append('default_iva_percent', formData.default_iva_percent != null ? String(formData.default_iva_percent) : '');
      form.append('list_price_surcharge_percent', formData.list_price_surcharge_percent != null ? String(formData.list_price_surcharge_percent) : '');
      form.append('profit_margin_percent', formData.profit_margin_percent != null ? String(formData.profit_margin_percent) : '');
      form.append('recycling_days_abandonment', formData.recycling_days_abandonment != null ? String(formData.recycling_days_abandonment) : '');
      form.append('default_warranty_months', formData.default_warranty_months != null ? String(formData.default_warranty_months) : '');
      form.append('legal_terms_ticket', formData.legal_terms_ticket ?? '');
      form.append('agents_can_view_movements', formData.agents_can_view_movements ? '1' : '0');

      if (logoFile) {
        form.append('logo', logoFile);
      }

      const res = await api.put('/api/settings/company', form);

      toast.success('Datos de la empresa actualizados correctamente');
      setLogoFile(null);
      const updated = res.data.data || res.data;
      if (updated) {
        setFormData((prev) => ({
          ...prev,
          logo_url: updated.logo_url ?? prev.logo_url,
          legal_footer_text: updated.legal_footer_text ?? prev.legal_footer_text,
        }));
        setLogoPreview(updated.logo_url ? getImageUrl(updated.logo_url) : null);
      }
      if (logoInputRef.current) logoInputRef.current.value = '';
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        <p className="mt-2 text-gray-500">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 animate-fade-in-up max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3 border-l-4 border-indigo-600 pl-4">
        <FaCog className="text-indigo-600" /> Configuración Central
      </h1>

      <p className="text-gray-500 mb-6">
        Centralizá todas las configuraciones, listas desplegables y datos de tu empresa en un solo lugar.
      </p>

      {/* Pestañas (agente solo ve Accesorios, Marcas, Tipos de Equipo, Modelos) */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: General (Datos de la Empresa y más) */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FaImage className="text-blue-600" /> Logo de la Empresa
            </label>
            <div className="flex flex-wrap items-start gap-4">
              {(logoPreview || logoFile) && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-32 h-20 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img src={logoPreview || ''} alt="Logo actual" className="max-w-full max-h-full object-contain" />
                  </div>
                  <span className="text-xs text-gray-500">Vista previa</span>
                </div>
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100 cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF o WebP. Máx. 5 MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FaBuilding className="text-indigo-600" /> Nombre de la Empresa
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej: Tu Empresa S.A."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FaMapMarkerAlt className="text-red-500" /> Dirección
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej: Av. Corrientes 1234, CABA"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <FaPhone className="text-green-600" /> Teléfono
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej: (011) 1234-5678"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <FaEnvelope className="text-orange-500" /> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="contacto@tuempresa.com"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FaGlobe className="text-blue-500" /> Sitio Web
            </label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej: www.tuempresa.com.ar"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FaBalanceScale className="text-indigo-600" /> Términos y Condiciones Legales
            </label>
            <textarea
              value={formData.legal_footer_text}
              onChange={(e) => setFormData({ ...formData, legal_footer_text: e.target.value })}
              rows={8}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
              placeholder="Términos y condiciones que aparecerán en los PDFs de órdenes de taller y cotizaciones..."
            />
            <p className="text-xs text-gray-400 mt-1">Aparece en el pie de los PDFs. Podés usar saltos de línea.</p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaCalculator className="text-amber-600" /> Cotizador Integrado (Órdenes de Taller)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Estos valores se usan en la edición de órdenes para calcular precios. El técnico no puede modificarlos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cotización USD</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.usd_exchange_rate ?? ''}
                  onChange={(e) => setFormData({ ...formData, usd_exchange_rate: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej: 1200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IVA por defecto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={formData.default_iva_percent ?? ''}
                  onChange={(e) => setFormData({ ...formData, default_iva_percent: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="21"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Margen de Ganancia (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.profit_margin_percent ?? ''}
                  onChange={(e) => setFormData({ ...formData, profit_margin_percent: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">Calculadora manual: costo × (1 + margen)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recargo Lista (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.list_price_surcharge_percent ?? ''}
                  onChange={(e) => setFormData({ ...formData, list_price_surcharge_percent: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Tarjetas/Link"
                />
                <p className="text-xs text-gray-500 mt-1">Recargo para precio de lista (tarjetas, link)</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-amber-200">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <FaFileExcel className="text-green-600" /> Catálogo de Repuestos (Excel)
              </label>
              <p className="text-xs text-gray-500 mb-2">Subí un archivo Excel con columnas: nombre, precio_usd (opcional), precio_ars (opcional)</p>
              <div className="flex gap-2 items-center">
                <input
                  ref={sparePartsInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleSparePartsExcel}
                  disabled={sparePartsUploading}
                  className="block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-100 file:text-green-700 file:font-medium hover:file:bg-green-200 cursor-pointer disabled:opacity-50"
                />
                {sparePartsUploading && <span className="text-sm text-gray-500">Importando...</span>}
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FaPercent className="text-purple-600" /> Porcentaje IVA / Impuesto (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={formData.tax_percentage}
              onChange={(e) => setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) || 0 })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none max-w-[120px]"
              placeholder="21"
            />
            <p className="text-xs text-gray-400 mt-1">Usado en presupuestos y cotizaciones (ej: 21 o 0).</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FaPalette className="text-pink-500" /> Color Principal (encabezados PDF)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer p-1"
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-28 p-2 border border-gray-300 rounded-lg font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FaFileAlt className="text-teal-600" /> Texto legal (pie de página del presupuesto)
            </label>
            <textarea
              value={formData.quote_footer_text}
              onChange={(e) => setFormData({ ...formData, quote_footer_text: e.target.value })}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej: Presupuesto válido por 15 días. Precios sujetos a variación del dólar."
            />
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md transition"
            >
              <FaSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Finanzas y Cotizador */}
      {activeTab === 'finanzas' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaCalculator className="text-amber-600" /> Finanzas y Cotizador
          </h2>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Dólar Actual</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={formData.usd_exchange_rate ?? ''}
              onChange={(e) => setFormData({ ...formData, usd_exchange_rate: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none max-w-[200px]"
              placeholder="Ej: 1200"
            />
            <p className="text-xs text-blue-600 mt-1">ℹ️ Este valor base se usará para convertir costos en USD a pesos en el cotizador y órdenes de taller.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Margen de Ganancia (%)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={formData.profit_margin_percent ?? ''}
              onChange={(e) => setFormData({ ...formData, profit_margin_percent: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none max-w-[120px]"
              placeholder="30"
            />
            <p className="text-xs text-blue-600 mt-1">ℹ️ Porcentaje que se aplica sobre el costo para obtener el precio de venta en la calculadora manual del cotizador.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Porcentaje de IVA</label>
            <input
              type="number"
              step="0.01"
              min={0}
              max={100}
              value={formData.default_iva_percent ?? ''}
              onChange={(e) => setFormData({ ...formData, default_iva_percent: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none max-w-[120px]"
              placeholder="21"
            />
            <p className="text-xs text-blue-600 mt-1">ℹ️ IVA por defecto aplicado en cotizaciones y órdenes de taller (ej: 21% o 0 si es exento).</p>
          </div>
          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md transition"
            >
              <FaSave /> {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Taller y Órdenes */}
      {activeTab === 'taller' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaToolbox className="text-indigo-600" /> Taller y Órdenes
          </h2>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Días para Abandono (Área Reciclaje)</label>
            <input
              type="number"
              min={1}
              value={formData.recycling_days_abandonment ?? ''}
              onChange={(e) => setFormData({ ...formData, recycling_days_abandonment: e.target.value ? parseInt(e.target.value, 10) : null })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none max-w-[120px]"
              placeholder="Ej: 90"
            />
            <p className="text-xs text-blue-600 mt-1">ℹ️ Cantidad de días tras los cuales un equipo en Área de Reciclaje puede considerarse abandonado.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Garantía por defecto (Meses)</label>
            <input
              type="number"
              min={0}
              value={formData.default_warranty_months ?? ''}
              onChange={(e) => setFormData({ ...formData, default_warranty_months: e.target.value ? parseInt(e.target.value, 10) : null })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none max-w-[120px]"
              placeholder="Ej: 3"
            />
            <p className="text-xs text-blue-600 mt-1">ℹ️ Meses de garantía que se aplican por defecto al registrar una orden en garantía.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Términos Legales (Ticket)</label>
            <textarea
              value={formData.legal_terms_ticket ?? ''}
              onChange={(e) => setFormData({ ...formData, legal_terms_ticket: e.target.value || null })}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
              placeholder="Términos y condiciones que acepta el cliente al abrir un ticket..."
            />
            <p className="text-xs text-blue-600 mt-1">ℹ️ Texto legal que puede mostrarse al cliente al crear o gestionar un ticket.</p>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="agents_can_view_movements"
              checked={!!formData.agents_can_view_movements}
              onChange={(e) => setFormData({ ...formData, agents_can_view_movements: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="agents_can_view_movements" className="text-sm font-medium text-gray-800 cursor-pointer">
              Permitir a los agentes ver los Movimientos de Artículos
            </label>
          </div>
          <p className="text-xs text-blue-600 -mt-2">ℹ️ Si está activo, los usuarios con rol Agente podrán ver el listado de repuestos utilizados en las órdenes de taller.</p>
          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md transition"
            >
              <FaSave /> {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Accesorios */}
      {activeTab === 'accesorios' && (
        <OptionsListManager
          category="accessories"
          title="Accesorios"
          description="Lista de accesorios que se ofrecen en las órdenes de taller (ej: Cargador, Mouse, Bolso, Cable). Se muestran en el selector de accesorios incluidos."
          placeholder="Ej: Cargador, Mouse..."
        />
      )}

      {/* Tab: Marcas */}
      {activeTab === 'marcas' && (
        <OptionsListManager
          category="brand"
          title="Marcas"
          description="Marcas de equipos que podés seleccionar al crear órdenes de reparación."
          placeholder="Ej: HP, Epson, Canon..."
        />
      )}

      {/* Tab: Tipos de Equipo */}
      {activeTab === 'tipos-equipo' && (
        <OptionsListManager
          category="equipment_type"
          title="Tipos de Equipo"
          description="Tipos de equipo (Impresora, PC, Monitor, etc.) que aparecen en los formularios de órdenes de taller y remotas."
          placeholder="Ej: Impresora, Monitor..."
        />
      )}

      {/* Tab: Modelos */}
      {activeTab === 'modelos' && (
        <OptionsListManager
          category="model"
          title="Modelos"
          description="Modelos de equipos que podés seleccionar o escribir al crear órdenes de reparación."
          placeholder="Ej: LaserJet Pro, ThinkPad X1..."
        />
      )}

      {/* Tab: Categorías de Tickets */}
      {activeTab === 'categorias-tickets' && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FaTicketAlt className="text-teal-600" /> Categorías de Tickets
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Estas categorías se muestran como &quot;Tipo de Problema&quot; cuando el cliente crea un ticket. El título del ticket se genera automáticamente a partir de la categoría seleccionada.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
              placeholder="Ej: Consulta de Precios"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 flex items-center gap-2"
            >
              <FaPlus /> Agregar
            </button>
          </div>
          {categoriesLoading ? (
            <p className="text-gray-500">Cargando categorías...</p>
          ) : ticketCategories.length === 0 ? (
            <p className="text-gray-500 italic">No hay categorías. Agregá al menos una para que los clientes puedan crear tickets.</p>
          ) : (
            <ul className="space-y-2">
              {ticketCategories.map((cat) => (
                <li key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-medium text-gray-800">{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </li>
              )          )}
        </ul>
          )}
        </div>
      )}

      {activeTab === 'cloud-contracts' && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FaCloud className="text-indigo-600" /> Gestor de Contratos Cloud
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Subí las plantillas PDF de contratos Cloud Nube (ej. Sysoft, StarPOS). Los clientes verán un enlace de descarga por cada contrato al completar la planilla.
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              ref={cloudContractInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleUploadCloudContract}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cloudContractInputRef.current?.click()}
              disabled={cloudContractUploading}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
            >
              <FaUpload /> {cloudContractUploading ? 'Subiendo...' : 'Subir nuevo PDF'}
            </button>
          </div>
          {cloudContractsLoading ? (
            <p className="text-gray-500">Cargando contratos...</p>
          ) : cloudContracts.length === 0 ? (
            <p className="text-gray-500 italic">No hay contratos subidos. Subí al menos un PDF para que los clientes puedan descargarlo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Contrato</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cloudContracts.map((c) => (
                    <tr key={c.filename} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <a href={getImageUrl(c.url)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">
                          {c.label || c.filename}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteCloudContract(c.filename)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCompanySettingsPage;
