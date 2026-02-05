import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaTrash, FaPlus } from 'react-icons/fa';

const AdminPromotionsPage = () => {
    const [promos, setPromos] = useState([]);
    const [formData, setFormData] = useState({ title: '', description: '', type: 'offer' });
    const [image, setImage] = useState<File | null>(null);

    const fetchPromos = async () => {
        const res = await api.get('/api/promotions');
        setPromos(res.data.data);
    };

    useEffect(() => { fetchPromos(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) return toast.warn('Debes subir una imagen');

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('type', formData.type);
        data.append('image', image); // Asegúrate que esto sea 'image'

        try {
            // 👇 CAMBIO AQUÍ: Agregamos el tercer parámetro con los headers
            await api.post('/api/promotions', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            toast.success('Creado exitosamente');
            setFormData({ title: '', description: '', type: 'offer' });
            setImage(null);
            
            // Resetear el input file visualmente
            const fileInput = document.getElementById('fileInput') as HTMLInputElement;
            if(fileInput) fileInput.value = '';

            fetchPromos();
        } catch (error) { 
            console.error(error);
            toast.error('Error al subir la promoción'); 
        }
    };

    const handleDelete = async (id: number) => {
        if(!window.confirm('¿Borrar?')) return;
        try { await api.delete(`/api/promotions/${id}`); fetchPromos(); } catch { toast.error('Error'); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Gestión de Marketing (Banners y Ofertas)</h1>

            {/* Formulario */}
            <div className="bg-white p-6 rounded shadow mb-8">
                <h3 className="font-bold mb-4 flex items-center gap-2"><FaPlus/> Nueva Publicación</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        type="text" placeholder="Título (Ej: 20% Off en Toner)" required
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                        className="border p-2 rounded"
                    />
                    <select 
                        value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                        className="border p-2 rounded"
                    >
                        <option value="offer">Módulo Ofertas (Cuadrado)</option>
                        <option value="banner">Banner Dashboard (Apaisado)</option>
                    </select>
                    <textarea 
                        placeholder="Descripción corta..."
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                        className="border p-2 rounded md:col-span-2"
                    />
                    <div className="md:col-span-2">
                        <label className="block text-sm text-gray-500 mb-1">Imagen:</label>
                        <input type="file" onChange={e => setImage(e.target.files ? e.target.files[0] : null)} accept="image/*" />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white py-2 rounded md:col-span-2 hover:bg-blue-700">Publicar</button>
                </form>
            </div>

            {/* Lista */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {promos.map((p: any) => (
                    <div key={p.id} className="bg-white rounded shadow overflow-hidden relative group">
                        <img src={`${import.meta.env.VITE_API_URL}${p.image_url}`} alt={p.title} className="w-full h-40 object-cover" />
                        <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition">
                            <FaTrash/>
                        </button>
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