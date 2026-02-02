import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import DepartmentFormModal from '../components/Departments/DepartmentFormModal';
import { Department, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import { formatLocalDate } from '../utils/dateFormatter';

const AdminDepartmentsPage: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);

    const fetchDepartments = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<{ success: boolean; data: Department[]; count: number }>('/api/departments', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDepartments(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (err: unknown) {
            console.error('Error fetching departments:', err);
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar los departamentos.' : 'Ocurrió un error inesperado al cargar los departamentos.';
            setError(message);
            addNotification(message, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleCreateDepartment = () => {
        setCurrentDepartment(null);
        setIsModalOpen(true);
    };

    const handleEditDepartment = (department: Department) => {
        setCurrentDepartment(department);
        setIsModalOpen(true);
    };

    const handleDeleteDepartment = async (id: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este departamento?')) return;
        if (!token) return;
        try {
            await api.delete(`/api/departments/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Departamento eliminado exitosamente.', 'success');
            fetchDepartments();
        } catch (err: unknown) {
            console.error('Error deleting department:', err);
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al eliminar departamento.' : 'Ocurrió un error inesperado al eliminar el departamento.';
            addNotification(message, 'error');
        }
    };

    const handleSaveDepartment = async (departmentData: Partial<Department>) => {
        if (!token) return;
        const url = currentDepartment ? `/api/departments/${currentDepartment.id}` : '/api/departments';
        const method = currentDepartment ? 'put' : 'post';
        try {
            await api[method](url, departmentData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification(`Departamento ${currentDepartment ? 'actualizado' : 'creado'} exitosamente.`, 'success');
            setIsModalOpen(false);
            fetchDepartments();
        } catch (err: unknown) {
            console.error('Error saving department:', err);
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al guardar departamento.' : 'Ocurrió un error inesperado al guardar el departamento.';
            addNotification(message, 'error');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando departamentos...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestión de Departamentos</h1>
                    <button onClick={handleCreateDepartment} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md self-start sm:self-center">
                        Crear Nuevo Departamento
                    </button>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                    {departments.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">No hay departamentos registrados.</p>
                    ) : (
                        <>
                            {/* VISTA DE TABLA PARA ESCRITORIO */}
                            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Creación</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {departments.map((dept) => (
                                        <tr key={dept.id}>
                                            <td className="px-6 py-4">{dept.id}</td>
                                            <td className="px-6 py-4">{dept.name}</td>
                                            <td className="px-6 py-4">{dept.company_name || 'N/A'}</td>
                                            <td className="px-6 py-4">{formatLocalDate(dept.created_at)}</td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <button onClick={() => handleEditDepartment(dept)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                                <button onClick={() => handleDeleteDepartment(dept.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* VISTA DE TARJETAS PARA MÓVILES */}
                            <div className="md:hidden space-y-4">
                                {departments.map((dept) => (
                                    <div key={dept.id} className="bg-gray-50 p-4 rounded-lg border">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-gray-800">{dept.name}</p>
                                            <p className="text-xs text-gray-500">ID: {dept.id}</p>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-2 space-y-1">
                                            <p><strong>Empresa:</strong> {dept.company_name || 'N/A'}</p>
                                            <p>{dept.description}</p>
                                        </div>
                                        <div className="mt-4 pt-2 border-t flex justify-end gap-4">
                                            <button onClick={() => handleEditDepartment(dept)} className="text-indigo-600 font-semibold hover:underline">Editar</button>
                                            <button onClick={() => handleDeleteDepartment(dept.id)} className="text-red-600 font-semibold hover:underline">Eliminar</button>
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
                    onSave={handleSaveDepartment}
                    initialData={currentDepartment}
                />
            )}
        </>
    );
};

export default AdminDepartmentsPage;