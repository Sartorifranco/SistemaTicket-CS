import React, { useState } from 'react';
import api from '../../config/axiosConfig';
import { User } from '../../types';
import { toast } from 'react-toastify';
import { FaSearch } from 'react-icons/fa';

const IVA_OPTIONS = ['Inscripto', 'Monotributista', 'Exento'];

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: User) => void;
}

const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose, onClientCreated }) => {
  const [loading, setLoading] = useState(false);
  const [loadingAfip, setLoadingAfip] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    cuit: '',
    iva_condition: '',
    business_name: '',
    address: '',
    city: '',
    province: '',
    zip_code: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const fetchAfip = async () => {
    const cuitDigits = (form.cuit || '').replace(/\D/g, '');
    if (cuitDigits.length !== 11) {
      toast.error('Ingresá un CUIT de 11 dígitos para buscar en AFIP');
      return;
    }
    setLoadingAfip(true);
    try {
      const res = await api.get<{ success: boolean; data: { razonSocial?: string; domicilio?: string; condicionIVA?: string } }>(`/api/clients/afip/${cuitDigits}`);
      const d = res.data?.data;
      if (d) {
        setForm((p) => ({
          ...p,
          username: d.razonSocial || p.username,
          business_name: d.razonSocial || p.business_name,
          address: d.domicilio || p.address,
          iva_condition: d.condicionIVA || p.iva_condition
        }));
        toast.success('Datos de AFIP cargados');
      }
    } catch {
      toast.error('No se pudieron obtener datos para ese CUIT. Verificá el número o intentá más tarde.');
    } finally {
      setLoadingAfip(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setForm((p) => ({ ...p, password: pwd }));
    toast.info('Contraseña generada. El cliente podrá cambiarla luego.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username?.trim()) {
      toast.error('Nombre o razón social es obligatorio');
      return;
    }
    if (!form.email?.trim()) {
      toast.error('Email es obligatorio');
      return;
    }
    if (!form.password?.trim()) {
      toast.error('Contraseña es obligatoria');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; userId: number }>('/api/users', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'client',
        phone: form.phone?.trim() || '',
        cuit: form.cuit?.trim() || '',
        business_name: form.business_name?.trim() || '',
        iva_condition: form.iva_condition || null,
        address: form.address?.trim() || '',
        city: form.city?.trim() || '',
        province: form.province?.trim() || '',
        zip_code: form.zip_code?.trim() || ''
      });
      const client: User = {
        id: res.data.userId,
        username: form.username.trim(),
        email: form.email.trim(),
        role: 'client',
        department_id: null,
        company_id: null,
        business_name: form.business_name?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        cuit: form.cuit?.trim() || undefined
      };
      toast.success('Cliente creado. Puede iniciar sesión con su email y contraseña.');
      onClientCreated(client);
      onClose();
      setForm({ username: '', email: '', password: '', phone: '', cuit: '', iva_condition: '', business_name: '', address: '', city: '', province: '', zip_code: '' });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
          ? (err.response.data as { message?: string })?.message
          : 'Error al crear cliente';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800">Nuevo Cliente</h2>
          <p className="text-sm text-gray-500">Se creará su cuenta para ingresar al sistema</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre o Razón Social *</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Juan Pérez / Empresa SRL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
              <div className="flex gap-2">
                <input
                  name="password"
                  type="text"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Se enviará al cliente"
                />
                <button type="button" onClick={generatePassword} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Generar
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
              <div className="flex gap-2">
                <input name="cuit" value={form.cuit} onChange={handleChange} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="20-12345678-9" />
                <button type="button" onClick={fetchAfip} disabled={loadingAfip || !form.cuit?.replace(/\D/g, '').trim()} className="px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2 shrink-0" title="Buscar en AFIP">
                  <FaSearch /> {loadingAfip ? 'Buscando...' : 'Buscar AFIP'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición IVA</label>
              <select name="iva_condition" value={form.iva_condition} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar...</option>
                {IVA_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social (fiscal)</label>
              <input name="business_name" value={form.business_name} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Calle y número</label>
                <input name="address" value={form.address} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input name="city" value={form.city} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                <input name="province" value={form.province} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                <input name="zip_code" value={form.zip_code} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Crear y seleccionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClientModal;
