import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { User, Department, Company, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import { toast } from 'react-toastify';
import UserFormModal from '../components/Users/UserFormModal';
import ResetPasswordModal from '../components/Users/ResetPasswordModal';

const AdminUsersPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);

    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, deptsRes, companiesRes] = await Promise.all([
                api.get('/api/users'),
                api.get('/api/departments'),
                api.get('/api/companies')
            ]);
            
            setUsers(usersRes.data.data || []);
            setAllDepartments(deptsRes.data.data || []);
            setAllCompanies(companiesRes.data.data || []);

        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) 
                ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar los datos.' 
                : 'Ocurrió un error inesperado.';
            setError(message);
            addNotification(message, 'error');
        } finally {
            setLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchData();
        }
    }, [user, fetchData]);

    const filteredUsers = useMemo(() => {
        if (!selectedCompanyId) {
            return users;
        }
        return users.filter(user => user.company_id === parseInt(selectedCompanyId, 10));
    }, [users, selectedCompanyId]);

    const handleCreateUser = () => {
        setCurrentUser(null);
        setIsUserModalOpen(true);
    };

    const handleEditUser = (userToEdit: User) => {
        setCurrentUser(userToEdit);
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (userData: Partial<User>) => {
        const url = currentUser ? `/api/users/${currentUser.id}` : '/api/users';
        const method = currentUser ? 'put' : 'post';
        const action = currentUser ? 'actualizado' : 'creado';

        try {
            await api[method](url, userData);
            addNotification(`Usuario ${action} exitosamente.`, 'success');
            setIsUserModalOpen(false);
            fetchData();
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || `Error al guardar usuario.` : 'Error inesperado.';
            addNotification(message, 'error');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm('¿Estás seguro? Esta acción es irreversible.')) return;
        try {
            await api.delete(`/api/users/${userId}`);
            addNotification('Usuario eliminado exitosamente.', 'success');
            fetchData();
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al eliminar usuario.' : 'Error inesperado.';
            addNotification(message, 'error');
        }
    };

    const handleOpenResetModal = (userToReset: User) => {
        setSelectedUserForReset(userToReset);
        setIsResetModalOpen(true);
    };

    const handleConfirmResetPassword = async (newPassword: string) => {
        if (!selectedUserForReset) return;
        try {
            await api.put(`/api/users/${selectedUserForReset.id}/reset-password`, { newPassword });
            toast.success(`Contraseña para ${selectedUserForReset.username} actualizada.`);
        } catch (err: any) {
            const message = err.response?.data?.message || "Error al resetear la contraseña.";
            toast.error(message);
        }
    };

    if (loading) return <div className="text-center p-8">Cargando usuarios...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
                    <button onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md self-start sm:self-center">
                        Crear Nuevo Usuario
                    </button>
                </div>

                <div className="mb-6">
                    <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Empresa:</label>
                    <select
                        id="company-filter"
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="w-full max-w-xs p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Todas las Empresas</option>
                        {allCompanies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                    {filteredUsers.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">No hay usuarios que coincidan con el filtro.</p>
                    ) : (
                        <>
                            {/* ✅ VISTA DE TABLA PARA ESCRITORIO (md y superior) */}
                            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                               <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map((userItem) => (
                                        <tr key={userItem.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{userItem.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{userItem.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{userItem.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{allCompanies.find(c => c.id === userItem.company_id)?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEditUser(userItem)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                                <button onClick={() => handleOpenResetModal(userItem)} className="text-yellow-600 hover:text-yellow-900 mr-4">Resetear</button>
                                                <button onClick={() => handleDeleteUser(userItem.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* ✅ VISTA DE TARJETAS PARA MÓVILES (hasta md) */}
                            <div className="md:hidden space-y-4">
                                {filteredUsers.map((userItem) => (
                                    <div key={userItem.id} className="bg-gray-50 p-4 rounded-lg border">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800">{userItem.username}</p>
                                                <p className="text-sm text-gray-600">{userItem.email}</p>
                                            </div>
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0 ml-2">{userItem.role}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-2">
                                            <p><strong>Empresa:</strong> {allCompanies.find(c => c.id === userItem.company_id)?.name || 'N/A'}</p>
                                        </div>
                                        <div className="mt-4 pt-2 border-t flex justify-end gap-4 text-sm">
                                            <button onClick={() => handleEditUser(userItem)} className="text-indigo-600 font-semibold hover:underline">Editar</button>
                                            <button onClick={() => handleOpenResetModal(userItem)} className="text-yellow-600 font-semibold hover:underline">Resetear</button>
                                            <button onClick={() => handleDeleteUser(userItem.id)} className="text-red-600 font-semibold hover:underline">Eliminar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isUserModalOpen && (
                <UserFormModal
                    isOpen={isUserModalOpen}
                    onClose={() => setIsUserModalOpen(false)}
                    onSave={handleSaveUser}
                    initialData={currentUser}
                    departments={allDepartments}
                    companies={allCompanies}
                />
            )}
            
            <ResetPasswordModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleConfirmResetPassword}
                user={selectedUserForReset}
            />
        </>
    );
};

export default AdminUsersPage;