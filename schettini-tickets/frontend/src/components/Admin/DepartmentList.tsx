import React, { useState, useEffect, useCallback } from 'react';
import departmentService, { Department } from '../../services/departmentService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { formatLocalDate } from '../../utils/dateFormatter';

const DepartmentList: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [newDepartmentDescription, setNewDepartmentDescription] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [departmentToDeleteId, setDepartmentToDeleteId] = useState<number | null>(null);

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('Not authorized to view departments.', 'error');
                setLoading(false);
                return;
            }
            const data = await departmentService.getAllDepartments(token);
            setDepartments(data);
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error loading departments.' : 'An unexpected error occurred.';
            setError(message);
            addNotification(`Error loading departments: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleCreateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartmentName.trim()) {
            addNotification('Department name cannot be empty.', 'warning');
            return;
        }
        setLoading(true);
        try {
            if (!token) return;
            await departmentService.createDepartment(token, { name: newDepartmentName, description: newDepartmentDescription });
            addNotification('Department created successfully.', 'success');
            setIsModalOpen(false);
            setNewDepartmentName('');
            setNewDepartmentDescription('');
            fetchDepartments();
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error creating department.' : 'An unexpected error occurred.';
            addNotification(`Error creating department: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditDepartment = (department: Department) => {
        setCurrentDepartment(department);
        setNewDepartmentName(department.name);
        setNewDepartmentDescription(department.description);
        setIsModalOpen(true);
    };

    const handleUpdateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentDepartment || !newDepartmentName.trim()) {
            addNotification('Department name cannot be empty.', 'warning');
            return;
        }
        setLoading(true);
        try {
            if (!token) return;
            await departmentService.updateDepartment(token, currentDepartment.id, { name: newDepartmentName, description: newDepartmentDescription });
            addNotification('Department updated successfully.', 'success');
            setIsModalOpen(false);
            setCurrentDepartment(null);
            setNewDepartmentName('');
            setNewDepartmentDescription('');
            fetchDepartments();
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error updating department.' : 'An unexpected error occurred.';
            addNotification(`Error updating department: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteClick = (id: number) => {
        setDepartmentToDeleteId(id);
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteDepartment = async () => {
        if (departmentToDeleteId === null) return;
        setIsConfirmModalOpen(false);
        setLoading(true);
        try {
            if (!token) return;
            await departmentService.deleteDepartment(token, departmentToDeleteId);
            addNotification('Department deleted successfully.', 'success');
            fetchDepartments();
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error deleting department.' : 'An unexpected error occurred.';
            addNotification(`Error deleting department: ${message}`, 'error');
        } finally {
            setLoading(false);
            setDepartmentToDeleteId(null);
        }
    };

    if (loading) return <p className="p-8 text-center text-gray-600">Loading departments...</p>;
    if (error) return <p className="p-8 text-center text-red-500">Error: {error}</p>;

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Departments</h2>
                <button
                    onClick={() => {
                        setCurrentDepartment(null);
                        setNewDepartmentName('');
                        setNewDepartmentDescription('');
                        setIsModalOpen(true);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md self-start sm:self-center"
                >
                    Create New Department
                </button>
            </div>

            {departments.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No departments registered.</p>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {departments.map((department) => (
                                <tr key={department.id}>
                                    <td className="px-6 py-4">{department.id}</td>
                                    <td className="px-6 py-4">{department.name}</td>
                                    <td className="px-6 py-4">{department.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEditDepartment(department)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                        <button onClick={() => handleDeleteClick(department.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {departments.map((department) => (
                            <div key={department.id} className="bg-gray-50 p-4 rounded-lg border">
                                <p className="font-bold text-gray-800">{department.name}</p>
                                <p className="text-sm text-gray-600 mt-2">{department.description}</p>
                                <div className="mt-4 pt-2 border-t flex justify-end gap-4">
                                    <button onClick={() => handleEditDepartment(department)} className="text-indigo-600 font-semibold hover:underline">Edit</button>
                                    <button onClick={() => handleDeleteClick(department.id)} className="text-red-600 font-semibold hover:underline">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {isModalOpen && (
                // Your DepartmentFormModal would be rendered here
                <div /> 
            )}
            
            {isConfirmModalOpen && (
                // Your ConfirmModal would be rendered here
                <div />
            )}
        </div>
    );
};

export default DepartmentList;