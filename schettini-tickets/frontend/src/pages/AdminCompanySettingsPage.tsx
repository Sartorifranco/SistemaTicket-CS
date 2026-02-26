import React, { useState, useEffect, useRef } from 'react';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import { toast } from 'react-toastify';
import { FaSave, FaBuilding, FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe, FaPercent, FaFileAlt, FaPalette, FaImage } from 'react-icons/fa';

interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string | null;
  tax_percentage: number;
  quote_footer_text: string;
  primary_color: string;
}

const defaultSettings: CompanySettings = {
  company_name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo_url: null,
  tax_percentage: 21,
  quote_footer_text: '',
  primary_color: '#000000',
};

const AdminCompanySettingsPage: React.FC = () => {
  const [formData, setFormData] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
          tax_percentage: data.tax_percentage != null ? Number(data.tax_percentage) : 21,
          quote_footer_text: data.quote_footer_text ?? '',
          primary_color: data.primary_color ?? '#000000',
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
      form.append('primary_color', formData.primary_color);

      if (logoFile) {
        form.append('logo', logoFile);
      }

      const res = await api.put('/api/settings/company', form);

      toast.success('Datos de la empresa actualizados correctamente');
      setLogoFile(null);
      const updated = res.data.data || res.data;
      if (updated) {
        setFormData((prev) => ({ ...prev, logo_url: updated.logo_url ?? prev.logo_url }));
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
        <FaBuilding className="text-indigo-600" /> Datos de Mi Empresa
      </h1>

      <p className="text-gray-500 mb-6">
        Esta información aparecerá en los PDFs de cotizaciones y órdenes de taller. Personalizala según tu negocio.
      </p>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
        {/* Logo */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
            <FaImage className="text-blue-600" /> Logo de la Empresa
          </label>
          <div className="flex flex-wrap items-start gap-4">
            {(logoPreview || logoFile) && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-20 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={logoPreview || ''}
                    alt="Logo actual"
                    className="max-w-full max-h-full object-contain"
                  />
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

        {/* Nombre */}
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

        {/* Dirección */}
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

        {/* Teléfono y Email */}
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

        {/* Sitio Web */}
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

        {/* IVA / Impuesto */}
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

        {/* Color principal */}
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

        {/* Pie de página presupuesto */}
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
    </div>
  );
};

export default AdminCompanySettingsPage;
