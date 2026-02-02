import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [companyName, setCompanyName] = useState<string>('No asignada');
    const [departmentName, setDepartmentName] = useState<string>('No asignado');
    const [loadingDetails, setLoadingDetails] = useState<boolean>(true);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const fetchDetails = useCallback(async () => {
        if (!user) return;
        setLoadingDetails(true);
        try {
            if (user.company_id) {
                const companyRes = await api.get(`/api/companies/${user.company_id}`);
                setCompanyName(companyRes.data.data.name || 'No asignada');
            }
            if (user.department_id) {
                const deptRes = await api.get(`/api/departments/${user.department_id}`);
                setDepartmentName(deptRes.data.data.name || 'No asignado');
            }
        } catch (error) {
            console.error("Error al cargar detalles del perfil:", error);
        } finally {
            setLoadingDetails(false);
        }
    }, [user]);
    
    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Las nuevas contraseñas no coinciden.");
            return;
        }
        setIsUpdatingPassword(true);
        try {
            const response = await api.put('/api/users/change-password', {
                currentPassword,
                newPassword,
                confirmPassword
            });
            toast.success(response.data.message);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const message = err.response?.data?.message || "Error al cambiar la contraseña.";
            toast.error(message);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    if (!user) {
        return <div className="text-center p-8">Cargando perfil...</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Mi Perfil</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Detalles de la Cuenta</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
                    <div><strong>Nombre de Usuario:</strong> {user.username}</div>
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>Rol:</strong> {user.role}</div>
                    <div><strong>Empresa:</strong> {loadingDetails ? 'Cargando...' : companyName}</div>
                    <div><strong>Departamento:</strong> {loadingDetails ? 'Cargando...' : departmentName}</div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Cambiar Contraseña</h2>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña Actual</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmar Nueva Contraseña</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div className="text-right pt-2">
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md" disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;