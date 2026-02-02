import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Company, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import { FaEdit, FaTrash, FaPlus, FaBuilding } from 'react-icons/fa';
import { IconType } from 'react-icons';

// ✅ CORRECCIÓN FINAL: Se llama al ícono como una función para evitar el error de tipado.
const IconWrapper: React.FC<{ icon: IconType, className?: string }> = ({ icon, className }) => {
    return <span className={className}>{icon({})}</span>;
};

const AdminCompaniesPage: React.FC = () => {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [currentCompany, setCurrentCompany] = useState<Partial<Company>>({ name: '' });

    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/companies');
            setCompanies(response.data.data || []);
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar empresas.' : 'Error inesperado.';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'admin') fetchCompanies();
    }, [user, fetchCompanies]);

    const handleSaveCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentCompany.name || !currentCompany.name.trim()) {
            toast.warn('El nombre de la empresa no puede estar vacío.');
            return;
        }

        const url = isEditing ? `/api/companies/${currentCompany.id}` : '/api/companies';
        const method = isEditing ? 'put' : 'post';
        
        try {
            await api[method](url, { name: currentCompany.name });
            toast.success(`Empresa ${isEditing ? 'actualizada' : 'creada'} exitosamente.`);
            resetForm();
            fetchCompanies();
        } catch (err) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || `Error al guardar empresa.` : 'Error inesperado.';
            toast.error(message);
        }
    };
    
    const handleDeleteCompany = async (companyId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta empresa?')) {
            try {
                await api.delete(`/api/companies/${companyId}`);
                toast.success('Empresa eliminada exitosamente.');
                fetchCompanies();
            } catch (err) {
                const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al eliminar empresa.' : 'Error inesperado.';
                toast.error(message);
            }
        }
    };
    
    const startEditing = (company: Company) => {
        setIsEditing(true);
        setCurrentCompany(company);
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentCompany({ name: '' });
    };

    if (loading) return <div className="p-8 text-center">Cargando empresas...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8">Gestión de Empresas</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">{isEditing ? 'Editar Empresa' : 'Añadir Nueva Empresa'}</h2>
                <form onSubmit={handleSaveCompany} className="flex flex-col sm:flex-row items-center gap-4">
                    <input
                        type="text"
                        placeholder="Nombre de la empresa"
                        value={currentCompany.name || ''}
                        onChange={(e) => setCurrentCompany({ ...currentCompany, name: e.target.value })}
                        className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 w-full"
                    />
                    <button type="submit" className="w-full sm:w-auto bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                        {isEditing ? 'Guardar Cambios' : <><IconWrapper icon={FaPlus} /> Añadir Empresa</>}
                    </button>
                    {isEditing && (
                        <button type="button" onClick={resetForm} className="w-full sm:w-auto bg-gray-500 text-white py-3 px-6 rounded-md hover:bg-gray-600 transition-colors">
                            Cancelar
                        </button>
                    )}
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Empresas Existentes</h2>
                <div className="space-y-3">
                    {companies.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No hay empresas registradas.</p>
                    ) : (
                        companies.map(company => (
                            <div key={company.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-4">
                                <div className="flex items-center">
                                    <IconWrapper icon={FaBuilding} className="text-gray-400 mr-3" />
                                    <span className="font-medium text-gray-800">{company.name}</span>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                                    <Link to={`/admin/companies/${company.id}/departments`} className="text-red-600 hover:underline text-sm font-semibold whitespace-nowrap">
                                        Gestionar Deptos.
                                    </Link>
                                    <button onClick={() => startEditing(company)} className="p-2 text-gray-600 hover:text-blue-600" title="Editar">
                                        <IconWrapper icon={FaEdit} />
                                    </button>
                                    <button onClick={() => handleDeleteCompany(company.id)} className="p-2 text-gray-600 hover:text-red-600" title="Eliminar">
                                        <IconWrapper icon={FaTrash} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminCompaniesPage;