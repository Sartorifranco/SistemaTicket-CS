// src/components/Users/Users.tsx
// Este es el componente que lista usuarios, no el modal en sí.

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Department, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { userRoleTranslations } from '../../utils/traslations';

interface UsersProps {
    onEditUser: (user: User | null) => void; // Prop para abrir el modal de edición de usuario
}

const Users: React.FC<UsersProps> = ({ onEditUser }) => {
    const { token, user: currentUser } = useAuth();
    const { addNotification } = useNotification();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<{ users: User[] }>('/api/users', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data.users);
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar usuarios.');
                addNotification(`Error al cargar usuarios: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los usuarios.');
                addNotification('Ocurrió un error inesperado al cargar los usuarios.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción es irreversible.')) {
            return;
        }
        try {
            await api.delete(`/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Usuario eliminado exitosamente.', 'success');
            fetchUsers(); // Recargar la lista
        } catch (err: unknown) {
            console.error('Error deleting user:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar el usuario.', 'error');
            }
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><span className="text-lg">Cargando usuarios...</span></div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Gestión de Usuarios</h1>
            <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Nombre de Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Departamento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userRoleTranslations[user.role]}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.department_id || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => onEditUser(user)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-3 transition duration-150 ease-in-out"
                                        title="Editar Usuario"
                                    >
                                        <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-red-600 hover:text-red-900 transition duration-150 ease-in-out"
                                        title="Eliminar Usuario"
                                    >
                                        <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                onClick={() => onEditUser(null)} // Llama con null para indicar creación
                className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
            >
                Añadir Nuevo Usuario
            </button>
        </div>
    );
};

export default Users;
