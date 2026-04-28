import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { getImageUrl, getImageUrlFallback } from '../utils/imageUrl';
import { toast } from 'react-toastify';
import { FaTrash, FaPlus, FaTable, FaBullhorn } from 'react-icons/fa';

/** 200MB — debe coincidir con Multer en promotionRoutes.js */
const PROMO_IMAGE_MAX_BYTES = 200 * 1024 * 1024;

type OfferLeadRow = {
    id: number;
    offer_id: number;
    client_id: number;
    interest_date: string | null;
    username: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    offer_title: string;
};

const AdminPromotionsPage = () => {
    const [panelTab, setPanelTab] = useState<'promotions' | 'leads'>('promotions');
    const [promos, setPromos] = useState([]);
    const [leads, setLeads] = useState<OfferLeadRow[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(false);
    // Agregamos is_popup al estado
    const [formData, setFormData] = useState({ title: '', description: '', type: 'offer', is_popup: false });
    const [image, setImage] = useState<File | null>(null);

    const fetchPromos = async () => {
        const res = await api.get('/api/promotions');
        setPromos(res.data.data);
    };

    const fetchLeads = async () => {
        setLeadsLoading(true);
        try {
            const res = await api.get('/api/promotions/leads');
            setLeads(Array.isArray(res.data.data) ? res.data.data : []);
        } catch {
            toast.error('No se pudieron cargar los interesados');
            setLeads([]);
        } finally {
            setLeadsLoading(false);
        }
    };

    useEffect(() => { fetchPromos(); }, []);

    useEffect(() => {
        if (panelTab === 'leads') fetchLeads();
    }, [panelTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) return toast.warn('Debes subir una imagen');

        if (image.size > PROMO_IMAGE_MAX_BYTES) {
            toast.error('La imagen supera el límite de 200MB. Por favor, comprímela antes de subirla.');
            return;
        }

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('type', formData.type);
        // Enviamos el valor del checkbox
        data.append('is_popup', String(formData.is_popup));
        data.append('image', image);

        try {
            await api.post('/api/promotions', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Creado exitosamente y clientes notificados');
            setFormData({ title: '', description: '', type: 'offer', is_popup: false });
            setImage(null);
            
            const fileInput = document.getElementById('fileInput') as HTMLInputElement;
            if(fileInput) fileInput.value = '';

            fetchPromos();
        } catch (error: unknown) {
            console.error(error);
            const msg =
                error &&
                typeof error === 'object' &&
                'response' in error &&
                error.response &&
                typeof error.response === 'object' &&
                'data' in error.response &&
                error.response.data &&
                typeof error.response.data === 'object' &&
                'message' in error.response.data &&
                typeof (error.response.data as { message?: string }).message === 'string'
                    ? (error.response.data as { message: string }).message
                    : 'Error al subir';
            toast.error(msg);
        }
    };

    const handleDelete = async (id: number) => {
        if(!window.confirm('¿Borrar?')) return;
        try { await api.delete(`/api/promotions/${id}`); fetchPromos(); } catch { toast.error('Error'); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Gestión de Marketing</h1>

            <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => setPanelTab('promotions')}
                    className={`px-4 py-2 font-medium rounded-t-lg flex items-center gap-2 border-b-2 -mb-px ${
                        panelTab === 'promotions'
                            ? 'border-blue-600 text-blue-700 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FaBullhorn /> Publicaciones
                </button>
                <button
                    type="button"
                    onClick={() => setPanelTab('leads')}
                    className={`px-4 py-2 font-medium rounded-t-lg flex items-center gap-2 border-b-2 -mb-px ${
                        panelTab === 'leads'
                            ? 'border-blue-600 text-blue-700 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FaTable /> Leads / Interesados
                </button>
            </div>

            {panelTab === 'leads' && (
                <div className="bg-white p-6 rounded shadow mb-8 overflow-x-auto">
                    <h3 className="font-bold mb-4 text-gray-800">Interesados en ofertas (Me interesa)</h3>
                    {leadsLoading ? (
                        <p className="text-gray-500">Cargando...</p>
                    ) : leads.length === 0 ? (
                        <p className="text-gray-500">Todavía no hay registros de interés.</p>
                    ) : (
                        <table className="min-w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2 border border-gray-200">Fecha</th>
                                    <th className="p-2 border border-gray-200">Oferta</th>
                                    <th className="p-2 border border-gray-200">Cliente</th>
                                    <th className="p-2 border border-gray-200">Contacto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="p-2 border border-gray-200 whitespace-nowrap">
                                            {row.interest_date
                                                ? new Date(row.interest_date).toLocaleString('es-AR')
                                                : '—'}
                                        </td>
                                        <td className="p-2 border border-gray-200">{row.offer_title}</td>
                                        <td className="p-2 border border-gray-200">
                                            {(row.full_name && row.full_name.trim()) || row.username}
                                            <span className="text-gray-400 text-xs block">ID {row.client_id}</span>
                                        </td>
                                        <td className="p-2 border border-gray-200">
                                            {row.email && <div>{row.email}</div>}
                                            {row.phone && <div className="text-gray-600">{row.phone}</div>}
                                            {!row.email && !row.phone && <span className="text-gray-400">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {panelTab === 'promotions' && (
            <>
            <div className="bg-white p-6 rounded shadow mb-8">
                <h3 className="font-bold mb-4 flex items-center gap-2"><FaPlus/> Nueva Publicación</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        type="text" placeholder="Título (Ej: 20% de descuento en Toner)" required
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                        className="border p-2 rounded"
                    />
                    <select 
                        value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                        className="border p-2 rounded"
                    >
                        <option value="offer">Módulo Ofertas (Cuadrado)</option>
                        <option value="banner">Banner del panel (apaisado)</option>
                    </select>
                    <textarea 
                        placeholder="Descripción corta..."
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                        className="border p-2 rounded md:col-span-2"
                    />
                    
                    {/* CHECKBOX POPUP */}
                    <div className="md:col-span-2 bg-yellow-50 p-3 rounded border border-yellow-200 flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="popupCheck"
                            checked={formData.is_popup}
                            onChange={e => setFormData({...formData, is_popup: e.target.checked})}
                            className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="popupCheck" className="text-gray-800 font-bold cursor-pointer select-none">
                            ⚡ Mostrar como ventana emergente al inicio
                        </label>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm text-gray-500 mb-1" htmlFor="fileInput">
                            Imagen:
                        </label>
                        {/* Input group: control nativo (botón «Elegir archivo» / nombre según navegador) */}
                        <div className="mt-1">
                            <input
                                id="fileInput"
                                type="file"
                                onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
                                accept="image/png,image/jpeg,image/webp"
                                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
                            />
                        </div>
                        <small className="block mt-2 text-sm text-gray-500 leading-snug">
                            Formatos aceptados: JPG, PNG, WEBP. Tamaño máximo: 200MB.
                        </small>
                    </div>
                    <button type="submit" className="bg-blue-600 text-white py-2 rounded md:col-span-2 hover:bg-blue-700 font-bold shadow-md">Publicar</button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {promos.map((p: any) => (
                    <div key={p.id} className="bg-white rounded shadow overflow-hidden relative group">
                        <img 
                            src={p.image_url ? getImageUrl(p.image_url) : ''} 
                            alt={p.title} 
                            className="w-full h-40 object-cover"
                            onError={(e) => {
                                const img = e.currentTarget;
                                if (p.image_url && !img.dataset.retried) {
                                    img.dataset.retried = '1';
                                    img.src = getImageUrlFallback(p.image_url);
                                }
                            }}
                        />
                        <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition">
                            <FaTrash/>
                        </button>
                        {/* Etiqueta Popup */}
                        {(p.is_popup === 1 || p.is_popup === true) && (
                            <span className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded shadow">VENTANA EMERGENTE ACTIVA</span>
                        )}
                        <div className="p-4">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold">{p.title}</h4>
                                <span className={`text-xs px-2 py-1 rounded ${p.type === 'banner' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                    {p.type === 'banner' ? 'Banner' : 'Oferta'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                        </div>
                    </div>
                ))}
            </div>
            </>
            )}
        </div>
    );
};

export default AdminPromotionsPage;