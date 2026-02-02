import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Department, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import DepartmentFormModal from '../../components/Departments/DepartmentFormModal';
import DepartmentsList from '../../components/Departments/Departments'; // Importamos el componente de lista corregido

const DepartmentsPage: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/departments');
            setDepartments(response.data.data || []);
        } catch (err) {
            addNotification('Error al cargar los departamentos.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleCreate = () => {
        setCurrentDepartment(null);
        setIsModalOpen(true);
    };
    
    const handleEdit = (department: Department) => {
        setCurrentDepartment(department);
        setIsModalOpen(true);
    };

    const handleSave = async (departmentData: Partial<Department>) => {
        const url = currentDepartment ? `/api/departments/${currentDepartment.id}` : '/api/departments';
        const method = currentDepartment ? 'put' : 'post';
        try {
            await api[method](url, departmentData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification(`Departamento ${currentDepartment ? 'actualizado' : 'creado'} con éxito.`, 'success');
            setIsModalOpen(false);
            fetchDepartments();
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al guardar.' : 'Error inesperado.';
            addNotification(message, 'error');
        }
    };
    
    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar este departamento?')) {
            try {
                await api.delete(`/api/departments/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addNotification('Departamento eliminado con éxito.', 'success');
                fetchDepartments();
            } catch (err) {
                 addNotification('Error al eliminar el departamento.', 'error');
            }
        }
    };

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestión de Departamentos</h1>
                    <button
                        onClick={handleCreate}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg self-start sm:self-center"
                    >
                        Crear Departamento
                    </button>
                </div>

                {/* ✅ Se le pasan las props correctas al componente hijo */}
                <DepartmentsList
                    departments={departments}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    loading={loading}
                />
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

export default DepartmentsPage;