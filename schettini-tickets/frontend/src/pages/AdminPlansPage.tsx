import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { FaTrash, FaPlus, FaTag, FaList, FaDollarSign, FaEdit, FaTimes } from 'react-icons/fa';
import { Plan } from '../types';

const AdminPlansPage: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    
    // Estado del formulario
    const [formData, setFormData] = useState<{ name: string; color: string; price: string; features: string }>({ 
        name: '', 
        color: 'gray',
        price: '',
        features: ''
    });
    
    // Estado para saber si estamos editando
    const [editingId, setEditingId] = useState<number | null>(null);

    const fetchPlans = async () => {
        try {
            const res = await api.get('/api/plans');
            setPlans(res.data.data);
        } catch (error) { toast.error('Error al cargar planes'); }
    };

    useEffect(() => { fetchPlans(); }, []);

    // Cargar datos en el formulario para editar
    const handleEditClick = (plan: Plan) => {
        setEditingId(plan.id);
        setFormData({
            name: plan.name,
            color: plan.color,
            price: plan.price ? String(plan.price) : '',
            features: plan.features || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', color: 'gray', price: '', features: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, price: parseFloat(formData.price) || 0 };

            if (editingId) {
                // MODO EDICIÓN
                await api.put(`/api/plans/${editingId}`, payload);
                toast.success('Plan actualizado correctamente');
            } else {
                // MODO CREACIÓN
                await api.post('/api/plans', payload);
                toast.success('Plan creado exitosamente');
            }
            
            handleCancelEdit(); // Limpiar form
            fetchPlans(); // Recargar lista
        } catch (error) { toast.error('Error al guardar el plan'); }
    };

    const handleDelete = async (id: number) => {
        if(!window.confirm('¿Borrar plan? Los usuarios volverán al plan por defecto.')) return;
        try {
            await api.delete(`/api/plans/${id}`);
            toast.success('Plan eliminado');
            fetchPlans();
        } catch (error) { toast.error('Error al eliminar'); }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Planes de Suscripción</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- LISTA DE PLANES --- */}
                <div className="bg-white p-6 rounded-lg shadow h-fit">
                    <h2 className="text-xl font-semibold mb-4">Planes Activos</h2>
                    <ul className="space-y-4">
                        {plans.map(plan => (
                            <li key={plan.id} className={`relative p-4 rounded-lg border-l-4 border shadow-sm transition ${editingId === plan.id ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'bg-gray-50'}`} style={{ borderLeftColor: plan.color }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{plan.name} {editingId === plan.id && <span className="text-xs text-indigo-600 font-normal">(Editando...)</span>}</h3>
                                        <p className="text-indigo-600 font-semibold text-sm mt-1">
                                            ${plan.price?.toLocaleString()} / mes
                                        </p>
                                        <div className="mt-2 text-xs text-gray-500 whitespace-pre-line max-h-20 overflow-y-auto">
                                            {plan.features}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEditClick(plan)} 
                                            className="text-blue-500 hover:text-blue-700 p-2 bg-white rounded shadow-sm hover:shadow"
                                            title="Editar Plan"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(plan.id)} 
                                            className="text-red-500 hover:text-red-700 p-2 bg-white rounded shadow-sm hover:shadow"
                                            title="Eliminar Plan"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* --- FORMULARIO --- */}
                <div className="bg-white p-6 rounded-lg shadow h-fit border border-gray-100 sticky top-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        {editingId ? <FaEdit className="text-orange-500"/> : <FaPlus className="text-indigo-600"/>} 
                        {editingId ? 'Editar Plan' : 'Nuevo Plan'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <div className="relative">
                                    <FaTag className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        className="w-full pl-9 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder="Ej: PLAN GOLD"
                                        required 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <select 
                                    value={formData.color} 
                                    onChange={e => setFormData({...formData, color: e.target.value})} 
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="gray">Gris</option>
                                    <option value="gold">Dorado</option>
                                    <option value="blue">Azul</option>
                                    <option value="green">Verde</option>
                                    <option value="purple">Violeta</option>
                                    <option value="red">Rojo</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mensual ($)</label>
                            <div className="relative">
                                <FaDollarSign className="absolute left-3 top-3 text-gray-400" />
                                <input 
                                    type="number" 
                                    value={formData.price} 
                                    onChange={e => setFormData({...formData, price: e.target.value})} 
                                    className="w-full pl-9 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Características (Lista)</label>
                            <div className="relative">
                                <FaList className="absolute left-3 top-3 text-gray-400" />
                                <textarea 
                                    value={formData.features} 
                                    onChange={e => setFormData({...formData, features: e.target.value})} 
                                    className="w-full pl-9 p-2 border border-gray-300 rounded h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                                    placeholder={`- Soporte 24/7\n- Múltiples usuarios`}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {editingId && (
                                <button 
                                    type="button" 
                                    onClick={handleCancelEdit}
                                    className="w-1/3 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition flex justify-center items-center gap-2"
                                >
                                    <FaTimes /> Cancelar
                                </button>
                            )}
                            <button 
                                type="submit" 
                                className={`flex-1 text-white py-3 rounded-lg font-bold transition shadow-md flex justify-center items-center gap-2 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {editingId ? <><FaEdit /> Guardar Cambios</> : <><FaPlus /> Crear Plan</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminPlansPage;