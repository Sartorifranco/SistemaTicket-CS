import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Department, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import DepartmentFormModal from '../components/Departments/DepartmentFormModal';

const AdminCompanyDepartmentsPage: React.FC = () => {
    const { companyId } = useParams<{ companyId: string }>();
    const { token } = useAuth();
    const { addNotification } = useNotification();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [companyName, setCompanyName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);

    const fetchCompanyDepartments = useCallback(async () => {
        if (!token || !companyId) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/api/companies/${companyId}/departments`);
            setDepartments(Array.isArray(response.data.data) ? response.data.data : []);
            if (response.data.data.length > 0 && response.data.data[0].company_name) {
                setCompanyName(response.data.data[0].company_name);
            } else {
                const companyRes = await api.get(`/api/companies/${companyId}`);
                setCompanyName(companyRes.data.data.name);
            }
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar los departamentos.' : 'Ocurrió un error inesperado.';
            setError(message);
            addNotification(message, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, companyId, addNotification]);

    useEffect(() => {
        fetchCompanyDepartments();
    }, [fetchCompanyDepartments]);

    const handleCreate = () => {
        setCurrentDepartment(null);
        setIsModalOpen(true);
    };

    const handleEdit = (department: Department) => {
        setCurrentDepartment(department);
        setIsModalOpen(true);
    };

    const handleSave = async (departmentData: Partial<Department>) => {
        if (!token || !companyId) return;
        
        const dataToSend = { ...departmentData, company_id: parseInt(companyId) };
        const url = currentDepartment ? `/api/departments/${currentDepartment.id}` : '/api/departments';
        const method = currentDepartment ? 'put' : 'post';
        const action = currentDepartment ? 'actualizado' : 'creado';

        try {
            await api[method](url, dataToSend);
            addNotification(`Departamento ${action} exitosamente.`, 'success');
            setIsModalOpen(false);
            fetchCompanyDepartments();
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || `Error al ${action} el departamento.` : 'Error inesperado.';
            addNotification(message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/api/departments/${id}`);
            addNotification('Departamento eliminado exitosamente.', 'success');
            fetchCompanyDepartments();
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al eliminar el departamento.' : 'Error inesperado.';
            addNotification(message, 'error');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando departamentos...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                            Deptos. de {companyName || `Empresa #${companyId}`}
                        </h1>
                        <Link to="/admin/companies" className="text-blue-600 hover:underline text-sm">&larr; Volver a Empresas</Link>
                    </div>
                    <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md self-start sm:self-center">
                        Crear Departamento
                    </button>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                    {departments.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">Esta empresa no tiene departamentos registrados.</p>
                    ) : (
                        <>
                            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {departments.map((dept) => (
                                        <tr key={dept.id}>
                                            <td className="px-6 py-4">{dept.id}</td>
                                            <td className="px-6 py-4">{dept.name}</td>
                                            <td className="px-6 py-4">{dept.description}</td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(dept)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                                <button onClick={() => handleDelete(dept.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="md:hidden space-y-4">
                                {departments.map((dept) => (
                                    <div key={dept.id} className="bg-gray-50 p-4 rounded-lg border">
                                        <p className="font-bold text-gray-800">{dept.name}</p>
                                        <p className="text-sm text-gray-600 mt-2">{dept.description}</p>
                                        <div className="mt-4 pt-2 border-t flex justify-end gap-4">
                                            <button onClick={() => handleEdit(dept)} className="text-indigo-600 font-semibold hover:underline">Editar</button>
                                            <button onClick={() => handleDelete(dept.id)} className="text-red-600 font-semibold hover:underline">Eliminar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <DepartmentFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    initialData={currentDepartment}
                />
            )}
        </>
    );
};

export default AdminCompanyDepartmentsPage;