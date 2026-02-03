import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { FaTrash, FaPlus, FaBuilding, FaExclamationTriangle, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

// --- Interfaces ---
interface Department {
    id: number;
    name: string;
    description?: string;
}
interface Category {
    id: number;
    name: string;
    company_id: number | null;
}
interface Problem {
    id: number;
    title: string;
    description: string;
    category_id: number;
    department_id: number;
    priority?: string;
}

// --- Componente Principal ---
const AdminProblemsPage: React.FC = () => {
    // Estados de Datos
    const [categories, setCategories] = useState<Category[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    
    // Estados de UI
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    
    // Estados para Creación Rápida
    const [newCategoryName, setNewCategoryName] = useState('');

    // --- CARGA DE DATOS ---
    const fetchData = async () => {
        try {
            // Hacemos 3 peticiones paralelas a los nuevos endpoints del backend
            const [probsRes, catsRes, deptsRes] = await Promise.all([
                api.get('/api/admin/problems-all'),
                api.get('/api/admin/categories'),
                api.get('/api/admin/departments')
            ]);
            
            setProblems(probsRes.data.data || []);
            setCategories(catsRes.data.data || []);
            setDepartments(deptsRes.data.data || []);
            setLoading(false);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar la configuración.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- GESTIÓN DE CATEGORÍAS ---
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            await api.post('/api/admin/categories', { name: newCategoryName });
            toast.success('Categoría creada');
            setNewCategoryName('');
            fetchData();
        } catch (error) {
            toast.error('Error al crear categoría');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!window.confirm('¿Seguro? Esto podría afectar a los problemas asociados.')) return;
        try {
            await api.delete(`/api/admin/categories/${id}`);
            toast.success('Categoría eliminada');
            if (selectedCategoryId === id) setSelectedCategoryId(null);
            fetchData();
        } catch (error) {
            toast.error('No se puede eliminar (probablemente tenga tickets en uso).');
        }
    };

    // --- FILTRADO ---
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const problemsForSelectedCategory = problems.filter(p => p.category_id === selectedCategoryId);

    if (loading) return <div className="p-10 text-center">Cargando panel de configuración...</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Matriz de Problemas</h1>
                    <p className="text-gray-500 text-sm">Configura qué problemas pueden reportar los usuarios.</p>
                </div>
                <button 
                    onClick={() => setIsDeptModalOpen(true)}
                    className="mt-4 sm:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
                >
                    <FaBuilding /> Gestionar Departamentos
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* --- COLUMNA 1: GESTOR DE CATEGORÍAS (Master) --- */}
                <div className="lg:col-span-1 bg-white p-5 rounded-lg shadow-md h-fit">
                    <h2 className="text-lg font-bold mb-4 text-gray-700 uppercase tracking-wide">Categorías</h2>
                    
                    {/* Lista */}
                    <ul className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto">
                        {categories.map(cat => (
                            <li key={cat.id} className="group flex items-center">
                                <button 
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={`flex-grow text-left p-3 rounded-l-md transition-all border-l-4 ${
                                        selectedCategoryId === cat.id 
                                        ? 'bg-blue-50 border-blue-600 text-blue-800 font-semibold' 
                                        : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                                <button 
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-r-md transition"
                                    title="Eliminar Categoría"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>

                    {/* Formulario Agregar */}
                    <form onSubmit={handleAddCategory} className="flex gap-2 mt-4 border-t pt-4">
                        <input 
                            type="text" 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nueva categoría..." 
                            className="w-full p-2 border rounded text-sm"
                        />
                        <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
                            <FaPlus />
                        </button>
                    </form>
                </div>

                {/* --- COLUMNA 2: GESTOR DE PROBLEMAS (Detail) --- */}
                <div className="lg:col-span-3">
                    {selectedCategory ? (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <span className="text-blue-600">#</span> {selectedCategory.name}
                                </h2>
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                                    {problemsForSelectedCategory.length} Problemas
                                </span>
                            </div>

                            {/* Lista de Problemas */}
                            <div className="space-y-4">
                                {problemsForSelectedCategory.length > 0 ? (
                                    problemsForSelectedCategory.map(prob => (
                                        <ProblemItem key={prob.id} problem={prob} departments={departments} onRefresh={fetchData} />
                                    ))
                                ) : (
                                    <p className="text-gray-400 italic text-center py-8 bg-gray-50 rounded border border-dashed">
                                        No hay problemas definidos en esta categoría.
                                    </p>
                                )}
                            </div>

                            {/* Formulario Crear Problema */}
                            <CreateProblemForm categoryId={selectedCategory.id} departments={departments} onCreate={fetchData} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center items-center text-gray-400 bg-white rounded-lg shadow-sm p-10 min-h-[300px]">
                            <FaExclamationTriangle size={48} className="mb-4 text-gray-200" />
                            <p className="text-lg">Selecciona una categoría para gestionar sus problemas.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Departamentos */}
            {isDeptModalOpen && (
                <DepartmentManagerModal 
                    departments={departments} 
                    onClose={() => setIsDeptModalOpen(false)} 
                    onRefresh={fetchData} 
                />
            )}
        </div>
    );
};

// --- Subcomponente: Item de Problema (Editar/Borrar) ---
const ProblemItem: React.FC<{ problem: Problem, departments: Department[], onRefresh: () => void }> = ({ problem, departments, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ 
        title: problem.title, 
        description: problem.description, 
        department_id: problem.department_id,
        priority: problem.priority || 'medium'
    });

    const handleSave = async () => {
        try {
            await api.put(`/api/admin/problems/${problem.id}`, formData);
            toast.success('Problema actualizado');
            setIsEditing(false);
            onRefresh();
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Eliminar este tipo de problema?')) return;
        try {
            await api.delete(`/api/admin/problems/${problem.id}`);
            toast.success('Problema eliminado');
            onRefresh();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    if (isEditing) {
        return (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        className="p-2 border rounded" placeholder="Título"
                    />
                    <select 
                        value={formData.department_id} 
                        onChange={e => setFormData({...formData, department_id: parseInt(e.target.value)})} 
                        className="p-2 border rounded"
                    >
                        <option value="">Seleccionar Departamento</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                     <input 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        className="p-2 border rounded" placeholder="Descripción"
                    />
                    <select 
                        value={formData.priority} 
                        onChange={e => setFormData({...formData, priority: e.target.value})} 
                        className="p-2 border rounded"
                    >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="critical">Crítica</option>
                    </select>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSave} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-1 hover:bg-green-700">
                        <FaSave /> Guardar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
            <div>
                <h4 className="font-bold text-gray-800">{problem.title}</h4>
                <p className="text-sm text-gray-500">{problem.description}</p>
                <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Dep: {departments.find(d => d.id === problem.department_id)?.name || 'Sin Asignar'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                        problem.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        problem.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                        {problem.priority || 'Normal'}
                    </span>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsEditing(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><FaEdit /></button>
                <button onClick={handleDelete} className="p-2 text-red-600 hover:bg-red-50 rounded"><FaTrash /></button>
            </div>
        </div>
    );
};

// --- Subcomponente: Crear Problema ---
const CreateProblemForm: React.FC<{ categoryId: number, departments: Department[], onCreate: () => void }> = ({ categoryId, departments, onCreate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [departmentId, setDepartmentId] = useState<number | ''>('');
    const [priority, setPriority] = useState('medium');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/problems', { 
                title, description, category_id: categoryId, department_id: departmentId, priority 
            });
            toast.success('Problema añadido');
            setTitle(''); setDescription('');
            onCreate();
        } catch (error) {
            toast.error('Error al crear');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <FaPlus className="text-green-600" /> Nuevo Tipo de Problema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input 
                    required 
                    placeholder="Título (Ej: Error de Impresión)" 
                    value={title} onChange={e => setTitle(e.target.value)}
                    className="p-2 border rounded w-full"
                />
                <select 
                    value={departmentId} onChange={e => setDepartmentId(parseInt(e.target.value))}
                    className="p-2 border rounded w-full"
                    required
                >
                    <option value="">Departamento Responsable...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input 
                    placeholder="Descripción (Ayuda para el usuario)" 
                    value={description} onChange={e => setDescription(e.target.value)}
                    className="p-2 border rounded w-full"
                />
                <select 
                    value={priority} onChange={e => setPriority(e.target.value)}
                    className="p-2 border rounded w-full"
                >
                    <option value="low">Prioridad Baja</option>
                    <option value="medium">Prioridad Media</option>
                    <option value="high">Prioridad Alta</option>
                    <option value="critical">Prioridad Crítica</option>
                </select>
            </div>
            <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded hover:bg-black transition">
                Añadir Problema a esta Categoría
            </button>
        </form>
    );
};

// --- Subcomponente: Modal Gestor de Departamentos ---
const DepartmentManagerModal: React.FC<{ departments: Department[], onClose: () => void, onRefresh: () => void }> = ({ departments, onClose, onRefresh }) => {
    const [newDept, setNewDept] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newDept.trim()) return;
        try {
            await api.post('/api/admin/departments', { name: newDept });
            toast.success('Departamento creado');
            setNewDept('');
            onRefresh();
        } catch (e) { toast.error('Error al crear departamento'); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar departamento?')) return;
        try {
            await api.delete(`/api/admin/departments/${id}`);
            toast.success('Departamento eliminado');
            onRefresh();
        } catch (e) { toast.error('No se puede eliminar (en uso)'); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold">Gestionar Departamentos</h3>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                
                <ul className="max-h-64 overflow-y-auto mb-4 space-y-2">
                    {departments.map(dept => (
                        <li key={dept.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <span>{dept.name}</span>
                            <button onClick={() => handleDelete(dept.id)} className="text-red-500 hover:text-red-700 p-1">
                                <FaTrash />
                            </button>
                        </li>
                    ))}
                </ul>

                <form onSubmit={handleAdd} className="flex gap-2">
                    <input 
                        value={newDept} onChange={e => setNewDept(e.target.value)}
                        placeholder="Nuevo departamento..." 
                        className="flex-grow p-2 border rounded"
                    />
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                        Crear
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminProblemsPage;