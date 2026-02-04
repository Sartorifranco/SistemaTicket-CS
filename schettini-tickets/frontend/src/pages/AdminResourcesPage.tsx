import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaTrash, FaVideo, FaLink, FaFileAlt, FaPlus } from 'react-icons/fa';

const AdminResourcesPage: React.FC = () => {
    const [resources, setResources] = useState<any[]>([]);
    const [newRes, setNewRes] = useState({ title: '', type: 'video', content: '', category: 'General' });

    useEffect(() => { fetchResources(); }, []);

    const fetchResources = async () => {
        try {
            const res = await api.get('/api/resources');
            setResources(res.data.data);
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/resources', newRes);
            toast.success('Recurso agregado');
            setNewRes({ title: '', type: 'video', content: '', category: 'General' });
            fetchResources();
        } catch (error) { toast.error('Error al agregar'); }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('¿Borrar?')) return;
        try {
            await api.delete(`/api/resources/${id}`);
            toast.success('Eliminado');
            fetchResources();
        } catch (error) { toast.error('Error al eliminar'); }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Base de Conocimientos y Tutoriales</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Formulario */}
                <div className="bg-white p-6 rounded-lg shadow h-fit">
                    <h2 className="text-lg font-bold mb-4">Agregar Nuevo</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" placeholder="Título" className="w-full p-2 border rounded" value={newRes.title} onChange={e => setNewRes({...newRes, title: e.target.value})} required />
                        <select className="w-full p-2 border rounded" value={newRes.type} onChange={e => setNewRes({...newRes, type: e.target.value})}>
                            <option value="video">Video (URL Embed)</option>
                            <option value="article">Artículo (Texto)</option>
                            <option value="link">Link Externo / Descarga</option>
                        </select>
                        <input type="text" placeholder="Categoría" className="w-full p-2 border rounded" value={newRes.category} onChange={e => setNewRes({...newRes, category: e.target.value})} />
                        <textarea placeholder="Contenido o URL" className="w-full p-2 border rounded h-24" value={newRes.content} onChange={e => setNewRes({...newRes, content: e.target.value})} required />
                        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 flex justify-center items-center gap-2"><FaPlus/> Agregar</button>
                    </form>
                </div>

                {/* Lista */}
                <div className="md:col-span-2 space-y-4">
                    {resources.map(res => (
                        <div key={res.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="text-indigo-600 text-xl">
                                    {res.type === 'video' && <FaVideo/>}
                                    {res.type === 'article' && <FaFileAlt/>}
                                    {(res.type === 'link' || res.type === 'download') && <FaLink/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{res.title}</h4>
                                    <p className="text-xs text-gray-500">{res.category} • {res.type}</p>
                                    <p className="text-sm text-gray-600 truncate max-w-md">{res.content}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(res.id)} className="text-red-500 hover:text-red-700 p-2"><FaTrash/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminResourcesPage;