import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { FaTrash, FaPlus, FaBox, FaEdit, FaTimes, FaDollarSign } from 'react-icons/fa';
import { Module } from '../types';

const AdminModulesPage: React.FC = () => {
    const [modules, setModules] = useState<Module[]>([]);
    const [formData, setFormData] = useState({ name: '', description: '', price: '' });
    const [editingId, setEditingId] = useState<number | null>(null);

    const fetchModules = async () => {
        try {
            const res = await api.get('/api/modules');
            setModules(res.data.data);
        } catch (error) { toast.error('Error al cargar módulos'); }
    };

    useEffect(() => { fetchModules(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, price: parseFloat(formData.price) || 0 };
            if (editingId) {
                await api.put(`/api/modules/${editingId}`, payload);
                toast.success('Módulo actualizado');
            } else {
                await api.post('/api/modules', payload);
                toast.success('Módulo creado');
            }
            setEditingId(null);
            setFormData({ name: '', description: '', price: '' });
            fetchModules();
        } catch (error) { toast.error('Error al guardar'); }
    };

    const handleEdit = (mod: Module) => {
        setEditingId(mod.id);
        setFormData({ name: mod.name, description: mod.description, price: String(mod.price) });
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar módulo?')) return;
        try {
            await api.delete(`/api/modules/${id}`);
            toast.success('Eliminado');
            fetchModules();
        } catch (error) { toast.error('Error al eliminar'); }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <FaBox className="text-orange-600"/> Gestión de Módulos Extras
            </h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LISTA */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {modules.map(mod => (
                        <div key={mod.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-800">{mod.name}</h3>
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                                        ${mod.price.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">{mod.description}</p>
                            </div>
                            <div className="flex justify-end gap-2 border-t pt-2">
                                <button onClick={() => handleEdit(mod)} className="text-blue-600 hover:text-blue-800 p-2"><FaEdit /></button>
                                <button onClick={() => handleDelete(mod.id)} className="text-red-600 hover:text-red-800 p-2"><FaTrash /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FORMULARIO */}
                <div className="bg-white p-6 rounded-lg shadow h-fit border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">{editingId ? 'Editar Módulo' : 'Nuevo Módulo'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" required placeholder="Ej: Gestión de Mesas"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Precio ($)</label>
                            <div className="relative">
                                <FaDollarSign className="absolute left-3 top-3 text-gray-400" />
                                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full pl-8 p-2 border rounded" required placeholder="0.00"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Descripción</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded h-24" placeholder="Breve descripción del módulo..."/>
                        </div>
                        <div className="flex gap-2">
                            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'',description:'',price:''})}} className="w-1/3 bg-gray-200 text-gray-700 py-2 rounded">Cancelar</button>}
                            <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded hover:bg-orange-700 font-bold">{editingId ? 'Guardar' : 'Crear'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminModulesPage;