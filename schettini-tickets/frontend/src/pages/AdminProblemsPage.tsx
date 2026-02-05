import React, { useEffect, useState } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaTrash, FaPlus, FaLayerGroup, FaDesktop, FaServer, FaBug } from 'react-icons/fa';

const AdminProblemsPage = () => {
    const [data, setData] = useState<any>({ systems: [], equipment: [], categories: [], problems: [] });
    
    // Inputs temporales
    const [newSystem, setNewSystem] = useState('');
    const [newEquipment, setNewEquipment] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newProblem, setNewProblem] = useState('');
    const [selectedCatForProblem, setSelectedCatForProblem] = useState('');

    const fetchData = async () => {
        try {
            const res = await api.get('/api/ticket-config/options');
            setData(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar la configuración');
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Función genérica para agregar
    const handleAdd = async (table: string, name: string, category_id?: number) => {
        if (!name.trim()) return toast.warning('Escribe un nombre');
        if (table === 'specific_problems' && !category_id) return toast.warning('Selecciona una categoría');

        try {
            await api.post('/api/ticket-config/options', { table, name, category_id });
            toast.success('Agregado correctamente');
            // Limpiar inputs
            setNewSystem(''); setNewEquipment(''); setNewCategory(''); setNewProblem('');
            fetchData();
        } catch (error) {
            toast.error('Error al guardar');
        }
    };

    // Función genérica para borrar
    const handleDelete = async (table: string, id: number) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta opción?')) return;
        try {
            await api.delete(`/api/ticket-config/options/${table}/${id}`);
            toast.success('Eliminado');
            fetchData();
        } catch (error) {
            toast.error('No se puede eliminar (quizás esté en uso)');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 border-l-4 border-blue-600 pl-4">Configuración de Tickets</h1>
            <p className="text-gray-500 mb-8 pl-5 text-sm">Gestiona las opciones desplegables que verán los clientes al crear un ticket.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. SISTEMAS AFECTADOS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FaServer className="text-blue-500"/> Sistemas Afectados</h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                            value={newSystem} onChange={e => setNewSystem(e.target.value)} 
                            placeholder="Nuevo Sistema (ej: Facturación)" 
                            className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={() => handleAdd('ticket_systems', newSystem)} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"><FaPlus/></button>
                    </div>
                    <ul className="max-h-60 overflow-y-auto divide-y">
                        {data.systems.map((s:any) => (
                            <li key={s.id} className="flex justify-between py-2 px-1 hover:bg-gray-50">
                                <span>{s.name}</span>
                                <button onClick={() => handleDelete('ticket_systems', s.id)} className="text-red-400 hover:text-red-600"><FaTrash/></button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 2. EQUIPOS AFECTADOS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FaDesktop className="text-purple-500"/> Equipos Afectados</h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                            value={newEquipment} onChange={e => setNewEquipment(e.target.value)} 
                            placeholder="Nuevo Equipo (ej: Impresora)" 
                            className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button onClick={() => handleAdd('ticket_equipment', newEquipment)} className="bg-purple-600 text-white px-4 rounded hover:bg-purple-700"><FaPlus/></button>
                    </div>
                    <ul className="max-h-60 overflow-y-auto divide-y">
                        {data.equipment.map((e:any) => (
                            <li key={e.id} className="flex justify-between py-2 px-1 hover:bg-gray-50">
                                <span>{e.name}</span>
                                <button onClick={() => handleDelete('ticket_equipment', e.id)} className="text-red-400 hover:text-red-600"><FaTrash/></button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 3. CATEGORÍAS DE PROBLEMA */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FaLayerGroup className="text-orange-500"/> Categorías</h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                            value={newCategory} onChange={e => setNewCategory(e.target.value)} 
                            placeholder="Nueva Categoría (ej: Redes)" 
                            className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button onClick={() => handleAdd('problem_categories', newCategory)} className="bg-orange-600 text-white px-4 rounded hover:bg-orange-700"><FaPlus/></button>
                    </div>
                    <ul className="max-h-60 overflow-y-auto divide-y">
                        {data.categories.map((c:any) => (
                            <li key={c.id} className="flex justify-between py-2 px-1 hover:bg-gray-50">
                                <span>{c.name}</span>
                                <button onClick={() => handleDelete('problem_categories', c.id)} className="text-red-400 hover:text-red-600"><FaTrash/></button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 4. PROBLEMAS ESPECÍFICOS (Dependientes de Categoría) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FaBug className="text-red-500"/> Problemas Específicos</h3>
                    <div className="flex flex-col gap-2 mb-4">
                        <select 
                            value={selectedCatForProblem} 
                            onChange={e => setSelectedCatForProblem(e.target.value)}
                            className="border p-2 rounded outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        >
                            <option value="">-- Selecciona Categoría --</option>
                            {data.categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <input 
                                value={newProblem} onChange={e => setNewProblem(e.target.value)} 
                                placeholder="Problema (ej: No conecta wifi)" 
                                disabled={!selectedCatForProblem}
                                className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                            />
                            <button 
                                onClick={() => handleAdd('specific_problems', newProblem, Number(selectedCatForProblem))} 
                                disabled={!selectedCatForProblem}
                                className="bg-red-600 text-white px-4 rounded hover:bg-red-700 disabled:bg-gray-300"
                            >
                                <FaPlus/>
                            </button>
                        </div>
                    </div>
                    <ul className="max-h-60 overflow-y-auto divide-y">
                        {data.problems
                            .filter((p:any) => !selectedCatForProblem || p.category_id === Number(selectedCatForProblem))
                            .map((p:any) => (
                            <li key={p.id} className="flex justify-between py-2 px-1 hover:bg-gray-50">
                                <div>
                                    <span className="text-gray-800 font-medium">{p.name}</span>
                                    {/* Mostrar nombre de categoría si no hay filtro activo */}
                                    {!selectedCatForProblem && (
                                        <span className="text-xs text-gray-400 block italic">
                                            {data.categories.find((c:any) => c.id === p.category_id)?.name}
                                        </span>
                                    )}
                                </div>
                                <button onClick={() => handleDelete('specific_problems', p.id)} className="text-red-400 hover:text-red-600"><FaTrash/></button>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default AdminProblemsPage;