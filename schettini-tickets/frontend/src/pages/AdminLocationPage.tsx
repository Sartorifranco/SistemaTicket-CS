import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig'; // Asegúrate que la ruta sea correcta

interface Company {
    id: number;
    name: string;
}

interface Location {
    id: number;
    name: string;
    type: string;
    company_id: number;
    company_name: string;
}

const AdminLocationsPage: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState({ name: '', type: 'Ubicación', company_id: '' });
    const [editingId, setEditingId] = useState<number | null>(null);

    // ✅ 1. NUEVO: Estado para el término de búsqueda
    const [searchTerm, setSearchTerm] = useState('');

    // ✅ 2. NUEVO: Referencia para hacer scroll al formulario
    const formRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [locRes, compRes] = await Promise.all([
                api.get('/api/admin/locations'),
                api.get('/api/companies')
            ]);
            setLocations(locRes.data.data || []);
            setCompanies(compRes.data.data || []);
        } catch (error) {
            toast.error('No se pudieron cargar los datos.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.company_id) {
            toast.warn('Por favor, selecciona una empresa.');
            return;
        }
        const apiCall = editingId 
            ? api.put(`/api/admin/locations/${editingId}`, formData)
            : api.post('/api/admin/locations', formData);
        
        try {
            await apiCall;
            toast.success(`Ubicación ${editingId ? 'actualizada' : 'creada'}!`);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error('Error al guardar la ubicación.');
        }
    };

    const handleEdit = (location: Location) => {
        setEditingId(location.id);
        setFormData({ name: location.name, type: location.type, company_id: String(location.company_id) });
        // ✅ 3. MEJORA: Scroll hacia el formulario al editar
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Seguro que quieres eliminar esta ubicación?')) {
            try {
                await api.delete(`/api/admin/locations/${id}`);
                toast.success('Ubicación eliminada.');
                fetchData();
            } catch (error) {
                toast.error('Error al eliminar.');
            }
        }
    };
    
    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', type: 'Ubicación', company_id: '' });
    };
    
    // ✅ 4. NUEVO: Lógica para filtrar las ubicaciones
    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <p>Cargando...</p>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Administrar Ubicaciones</h1>

            <div ref={formRef} className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">{editingId ? 'Editando Ubicación' : 'Crear Nueva Ubicación'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md" required />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                        <input name="type" value={formData.type} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md" required />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Empresa</label>
                        <select name="company_id" value={formData.company_id} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md" required>
                            <option value="">Seleccione...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-md w-full">{editingId ? 'Guardar' : 'Crear'}</button>
                        {editingId && <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 py-2 rounded-md w-full">Cancelar</button>}
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* ✅ 5. NUEVO: Campo de búsqueda */}
                <div className="p-4 border-b">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o empresa..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    />
                </div>

                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* ✅ 6. MEJORA: Mapeamos sobre la lista filtrada */}
                        {filteredLocations.map(loc => (
                            <tr key={loc.id}>
                                <td className="px-6 py-4">{loc.name}</td>
                                <td className="px-6 py-4">{loc.type}</td>
                                <td className="px-6 py-4">{loc.company_name}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleEdit(loc)} className="text-blue-600 hover:underline mr-4">Editar</button>
                                    <button onClick={() => handleDelete(loc.id)} className="text-red-600 hover:underline">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminLocationsPage;