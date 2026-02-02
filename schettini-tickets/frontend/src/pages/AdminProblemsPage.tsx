import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';

// --- Interfaces ---
interface Department {
    id: number;
    name: string;
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
}

// --- Componente Principal ---
const AdminProblemsPage: React.FC = () => {
    // --- Estados ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // --- Carga de datos ---
    const fetchData = async () => {
        try {
            const [dataRes, deptsRes] = await Promise.all([
                api.get('/api/admin/problems-all'),
                api.get('/api/departments')
            ]);
            setCategories(dataRes.data.data.categories || []);
            setProblems(dataRes.data.data.problems || []);
            setDepartments(deptsRes.data.data || []);
        } catch (error) {
            toast.error('No se pudieron cargar los datos.');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const problemsForSelectedCategory = problems.filter(p => p.category_id === selectedCategoryId);

    return (
        <div className="container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Administrar Problemas</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Columna Izquierda: Lista de Categorías --- */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Categorías</h2>
                    <ul className="space-y-2">
                        {categories.map(cat => (
                            <li key={cat.id}>
                                <button 
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={`w-full text-left p-3 rounded-md transition-colors ${selectedCategoryId === cat.id ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                                >
                                    {cat.name}
                                    <span className="block text-xs opacity-70">{cat.company_id ? `(ID Comp: ${cat.company_id})` : '(Genérico)'}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* --- Columna Derecha: Detalles de la Categoría Seleccionada --- */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedCategory ? (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold text-gray-700 mb-4">{selectedCategory.name}</h2>
                            <ul className="space-y-3 mb-6">
                                {problemsForSelectedCategory.map(prob => (
                                    <ProblemItem key={prob.id} problem={prob} departments={departments} onSave={fetchData} />
                                ))}
                            </ul>
                            <CreateProblemForm categoryId={selectedCategory.id} departments={departments} onCreate={fetchData} />
                        </div>
                    ) : (
                        <div className="bg-white p-10 rounded-lg shadow-md text-center text-gray-500">
                            <p>Selecciona una categoría de la lista para ver sus problemas y administrarlos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Componente para un Problema Individual (con modo edición) ---
const ProblemItem: React.FC<{ problem: Problem, departments: Department[], onSave: () => void }> = ({ problem, departments, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [values, setValues] = useState({ title: problem.title, description: problem.description, department_id: problem.department_id });

    const handleSave = async () => {
        try {
            await api.put(`/api/admin/problems/${problem.id}`, values);
            toast.success('Problema actualizado!');
            setIsEditing(false);
            onSave();
        } catch (error) {
            toast.error('Error al actualizar.');
        }
    };

    if (isEditing) {
        return (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <input value={values.title} onChange={e => setValues({...values, title: e.target.value})} className="w-full p-2 border rounded-md" />
                <input value={values.description} onChange={e => setValues({...values, description: e.target.value})} className="w-full p-2 border rounded-md" />
                <select value={values.department_id} onChange={e => setValues({...values, department_id: parseInt(e.target.value)})} className="w-full p-2 border rounded-md">
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-green-600 text-white px-3 py-1 text-sm rounded-md">Guardar</button>
                    <button onClick={() => setIsEditing(false)} className="bg-gray-500 text-white px-3 py-1 text-sm rounded-md">Cancelar</button>
                </div>
            </div>
        );
    }

    return (
        <li className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <div>
                <p className="font-semibold text-gray-800">{problem.title}</p>
                <p className="text-xs text-gray-500">Dirigido a: {departments.find(d => d.id === problem.department_id)?.name || 'N/A'}</p>
            </div>
            <button onClick={() => setIsEditing(true)} className="text-blue-600 text-sm font-medium">Editar</button>
        </li>
    );
};

// --- Componente para el Formulario de Creación de Problema ---
const CreateProblemForm: React.FC<{ categoryId: number, departments: Department[], onCreate: () => void }> = ({ categoryId, departments, onCreate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [departmentId, setDepartmentId] = useState<number | ''>(departments[0]?.id || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/problems', { title, description, category_id: categoryId, department_id: departmentId });
            toast.success('Problema creado!');
            setTitle(''); setDescription('');
            onCreate();
        } catch (error) {
            toast.error('Error al crear el problema.');
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="border-t pt-4 mt-6">
            <h4 className="font-semibold mb-2 text-gray-600">Añadir Nuevo Problema</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del problema" className="p-2 border rounded-md" required />
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" className="p-2 border rounded-md" />
            </div>
            <div className="mt-4">
                <select value={departmentId} onChange={e => setDepartmentId(parseInt(e.target.value))} className="w-full p-2 border rounded-md">
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
            <button type="submit" className="mt-4 w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700">Añadir Problema</button>
        </form>
    );
};

export default AdminProblemsPage;