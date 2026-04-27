import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { getImageUrl, getImageUrlFallback } from '../utils/imageUrl';
import { toast } from 'react-toastify';
import { FaTrash, FaPlus } from 'react-icons/fa';

/** 200MB — debe coincidir con Multer en promotionRoutes.js */
const PROMO_IMAGE_MAX_BYTES = 200 * 1024 * 1024;

const AdminPromotionsPage = () => {
    const [promos, setPromos] = useState([]);
    // Agregamos is_popup al estado
    const [formData, setFormData] = useState({ title: '', description: '', type: 'offer', is_popup: false });
    const [image, setImage] = useState<File | null>(null);

    const fetchPromos = async () => {
        const res = await api.get('/api/promotions');
        setPromos(res.data.data);
    };

    useEffect(() => { fetchPromos(); }, []);

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
            <h1 className="text-2xl font-bold mb-6">Gestión de Marketing</h1>

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
                        <label className="block text-sm text-gray-500 mb-1">Imagen:</label>
                        <input
                            id="fileInput"
                            type="file"
                            onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
                            accept="image/png,image/jpeg,image/webp"
                        />
                        <small className="block mt-1 text-gray-500 text-sm">
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
        </div>
    );
};

export default AdminPromotionsPage;