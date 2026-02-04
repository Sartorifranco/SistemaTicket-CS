import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import { FaTrash, FaEdit, FaCheckCircle, FaExclamationTriangle, FaHistory, FaTimes, FaSave } from 'react-icons/fa';
import { User, Plan } from '../../types'; 

// --- UTILIDADES ---
const getTimeSince = (dateString?: string) => {
    if (!dateString) return 'Reciente';
    const created = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `${diffDays} días`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`;
    return `${Math.floor(diffDays / 365)} años`;
};

const needsReview = (dateString?: string) => {
    if (!dateString) return false;
    const created = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return created < sixMonthsAgo;
};

// --- MODAL DE EDICIÓN DE USUARIO (Nuevo) ---
const EditUserModal: React.FC<{ user: User, plans: Plan[], onClose: () => void, onSave: () => void }> = ({ user, plans, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status || 'active',
        plan_id: user.plan_id || 1
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/api/users/${user.id}`, formData);
            toast.success('Usuario actualizado');
            onSave();
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Editar Usuario</h3>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Nombre</label>
                        <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Email</label>
                        <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Rol</label>
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full p-2 border rounded">
                                <option value="client">Cliente</option>
                                <option value="agent">Agente</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Estado</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-2 border rounded">
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* SELECCIÓN DE PLAN (Solo si es cliente) */}
                    {formData.role === 'client' && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <label className="block text-sm font-bold text-blue-800 mb-1">Plan de Suscripción</label>
                            <select 
                                value={formData.plan_id} 
                                onChange={e => setFormData({...formData, plan_id: parseInt(e.target.value)})} 
                                className="w-full p-2 border border-blue-300 rounded"
                            >
                                {plans.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                        <FaSave /> Guardar Cambios
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---
const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditUsers, setAuditUsers] = useState<User[]>([]);
    const [showAuditModal, setShowAuditModal] = useState(false);
    
    // Estado para edición
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchData = async () => {
        try {
            const [usersRes, plansRes] = await Promise.all([
                api.get('/api/users'),
                api.get('/api/plans')
            ]);
            
            setUsers(usersRes.data.data);
            setPlans(plansRes.data.data);
            
            // Auditoría
            const oldUsers = usersRes.data.data.filter((u: User) => 
                u.role === 'client' && u.status !== 'inactive' && needsReview(u.created_at)
            );
            if (oldUsers.length > 0) {
                setAuditUsers(oldUsers);
                setShowAuditModal(true);
            }
        } catch (error) {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar usuario?')) return;
        try {
            await api.delete(`/api/users/${id}`);
            toast.success('Eliminado');
            fetchData();
        } catch (error) { toast.error('Error al eliminar'); }
    };

    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
                {auditUsers.length > 0 && !showAuditModal && (
                    <button onClick={() => setShowAuditModal(true)} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold flex gap-2 items-center">
                        <FaExclamationTriangle /> {auditUsers.length} Revisiones
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol / Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FaHistory className="inline mr-1"/> Antigüedad</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mb-1 ${
                                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                        user.role === 'agent' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                        {user.role}
                                    </span>
                                    {/* MOSTRAR PLAN SI ES CLIENTE */}
                                    {user.role === 'client' && (
                                        <div className="text-xs font-bold mt-1 px-2 py-0.5 rounded w-fit" 
                                             style={{ backgroundColor: user.plan_color === 'gold' ? '#fef3c7' : '#f3f4f6', color: user.plan_color === 'gold' ? '#d97706' : '#4b5563' }}>
                                            {user.plan_name || 'PLAN FREE'}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {user.status === 'active' ? <span className="text-green-600 text-sm flex items-center gap-1"><FaCheckCircle/> Activo</span> : <span className="text-gray-400 text-sm">Inactivo</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                    {getTimeSince(user.created_at)}
                                    {needsReview(user.created_at) && user.role === 'client' && <span className="block text-xs text-yellow-600 font-bold">⚠️ Revisar</span>}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <button onClick={() => setEditingUser(user)} className="text-blue-600 hover:text-blue-900 mr-3"><FaEdit /></button>
                                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900"><FaTrash /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modales */}
            {editingUser && (
                <EditUserModal 
                    user={editingUser} 
                    plans={plans} 
                    onClose={() => setEditingUser(null)} 
                    onSave={() => { setEditingUser(null); fetchData(); }} 
                />
            )}
        </div>
    );
};

export default UsersPage;