import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { toast } from 'react-toastify';
import UserFormModal from '../components/Users/UserFormModal';
import ResetPasswordModal from '../components/Users/ResetPasswordModal';
import { FaCreditCard, FaSearch, FaBuilding, FaWhatsapp, FaCircle, FaUserClock, FaTrash } from 'react-icons/fa';

// ✅ CORRECCIÓN 1: Definir 'role' como unión de strings (no solo string) para compatibilidad
// ✅ CORRECCIÓN 2: Mantener department_id para compatibilidad con UserFormModal
interface User {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'agent' | 'client'; // 👈 CAMBIO CLAVE: Tipo específico
    company_id: number | null;
    department_id: number | null; 
    is_active: boolean;
    phone?: string;
    cuit?: string;
    business_name?: string;
    fantasy_name?: string;
    last_login?: string;
}

const AdminUsersPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modales
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);

    // Listas auxiliares para el modal
    const [allDepartments] = useState([]); 
    const [allCompanies] = useState([]);

    // Cargar Usuarios
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/users');
            // ✅ CORRECCIÓN 3: Forzar el tipo de la respuesta de la API a nuestra interfaz User[]
            setUsers((res.data.data as User[]) || []);
        } catch (err: any) {
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'admin') fetchData();
    }, [user, fetchData]);

    // Filtrado
    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.business_name && u.business_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- LÓGICA DE ESTADO DE ACTIVIDAD ---
    const getUserStatusBadge = (lastLogin: string | undefined, isActive: boolean) => {
        if (!isActive) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">BLOQUEADO</span>;
        
        if (!lastLogin) return <span className="text-gray-400 text-xs italic">Nunca ingresó</span>;

        const last = new Date(lastLogin).getTime();
        const now = new Date().getTime();
        const daysDiff = Math.floor((now - last) / (1000 * 60 * 60 * 24));

        if (daysDiff > 180) { 
            return <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">INACTIVO (+6m)</span>;
        } 
        if (daysDiff > 30) {
            return <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold border border-yellow-200">AUSENTE ({daysDiff}d)</span>;
        }
        return <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200 flex items-center gap-1"><FaCircle size={6}/> ACTIVO</span>;
    };

    // Funciones de Manejo
    const handleCreateUser = () => { setCurrentUser(null); setIsUserModalOpen(true); };
    
    const handleEditUser = (u: User) => { 
        // @ts-ignore
        setCurrentUser(u); 
        setIsUserModalOpen(true); 
    };

    const handleDeleteUser = async (id: number) => {
        if(!window.confirm('Se eliminará permanentemente.')) return;
        try { await api.delete(`/api/users/${id}`); toast.success('Eliminado'); fetchData(); } catch { toast.error('Error al eliminar'); }
    };

    const handleSaveUser = async (data: any) => { 
        try {
            const url = currentUser ? `/api/users/${currentUser.id}` : '/api/users';
            const method = currentUser ? 'put' : 'post';
            await api[method](url, data);
            toast.success('Guardado correctamente');
            setIsUserModalOpen(false);
            fetchData();
        } catch { toast.error('Error al guardar'); }
    };

    const handleConfirmResetPassword = async (newPassword: string) => {
        if (!selectedUserForReset) return;
        try {
            await api.put(`/api/users/${selectedUserForReset.id}/reset-password`, { newPassword });
            toast.success(`Contraseña actualizada.`);
            setIsResetModalOpen(false);
        } catch (err: any) {
            toast.error("Error al resetear la contraseña.");
        }
    };

    const handleOpenResetModal = (u: User) => { 
        // Al tener el tipo correcto en 'role', ya no dará error aquí
        setSelectedUserForReset(u); 
        setIsResetModalOpen(true); 
    };
    
    const handleGoToPayments = (id: number) => navigate(`/admin/users/${id}/payments`);

    if (loading) return <div className="text-center p-10 text-gray-500">Cargando usuarios...</div>;

    return (
        <>
            <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 border-l-4 border-indigo-600 pl-4">Gestión de Usuarios</h1>
                    <button onClick={handleCreateUser} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow transition">
                        + Nuevo Usuario
                    </button>
                </div>

                {/* Buscador */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3">
                    <FaSearch className="text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, email o empresa..." 
                        className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                                    <th className="px-6 py-4">Usuario / Contacto</th>
                                    <th className="px-6 py-4">Empresa (Representación)</th>
                                    <th className="px-6 py-4">Datos Fiscales</th>
                                    <th className="px-6 py-4">Actividad</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{u.username}</div>
                                            <div className="text-xs text-gray-500">{u.email}</div>
                                            {u.phone && (
                                                <a href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-green-600 text-xs flex items-center gap-1 mt-1 font-semibold hover:underline">
                                                    <FaWhatsapp/> {u.phone}
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.business_name ? (
                                                <>
                                                    <div className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FaBuilding className="text-gray-400"/> {u.business_name}</div>
                                                    <div className="text-xs text-gray-500 italic">{u.fantasy_name}</div>
                                                </>
                                            ) : <span className="text-xs text-gray-400">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                            {u.cuit || <span className="text-gray-300">S/D</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getUserStatusBadge(u.last_login, u.is_active)}
                                            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                <FaUserClock/> {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                                            {u.role === 'client' && (
                                                <button onClick={() => handleGoToPayments(u.id)} className="text-orange-500 hover:bg-orange-50 p-2 rounded transition" title="Pagos">
                                                    <FaCreditCard size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleEditUser(u)} className="text-indigo-600 hover:underline text-sm font-medium px-2">Editar</button>
                                            <button onClick={() => handleOpenResetModal(u)} className="text-yellow-600 hover:underline text-sm font-medium px-2">Pass</button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition" title="Eliminar">
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modales */}
            {isUserModalOpen && (
                <UserFormModal
                    isOpen={isUserModalOpen}
                    onClose={() => setIsUserModalOpen(false)}
                    onSave={handleSaveUser}
                    // @ts-ignore
                    initialData={currentUser} 
                    departments={allDepartments}
                    companies={allCompanies}
                />
            )}

            <ResetPasswordModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleConfirmResetPassword}
                // @ts-ignore (Por si el modal espera la interfaz global exacta, aunque ya debería ser compatible)
                user={selectedUserForReset} 
            />
        </>
    );
};

export default AdminUsersPage;