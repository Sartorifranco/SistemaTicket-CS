import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { 
    FaEdit, FaTrash, FaUserPlus, FaSearch, FaBuilding, 
    FaCreditCard, FaUserShield, FaEye, FaCheckCircle, FaTimesCircle, FaEnvelope, FaIdBadge 
} from 'react-icons/fa';

// Interfaces
interface User {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'agent' | 'client';
    status: 'active' | 'inactive'; // Aseguramos que existe status
    company_name?: string;
    department_name?: string;
    company_id?: number;
    department_id?: number;
    plan?: string;
}

interface Company {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

const AdminUsersPage: React.FC = () => {
    const navigate = useNavigate();
    
    // Datos
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modales
    const [isModalOpen, setIsModalOpen] = useState(false); // Crear/Editar
    const [viewUser, setViewUser] = useState<User | null>(null); // ✅ NUEVO: Para ver tarjeta de detalle
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // Formulario
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'client',
        status: 'active', // Agregamos status al formulario
        company_id: '',
        department_id: ''
    });

    const fetchData = async () => {
        try {
            const [usersRes, companiesRes, deptsRes] = await Promise.all([
                api.get('/api/users'),
                api.get('/api/companies'),
                api.get('/api/departments')
            ]);

            setUsers(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
            setCompanies(Array.isArray(companiesRes.data.data) ? companiesRes.data.data : []);
            setDepartments(Array.isArray(deptsRes.data.data) ? deptsRes.data.data : []);

        } catch (error) {
            console.error("Error cargando datos:", error);
            toast.error('Error al cargar datos del sistema');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- MANEJADORES ---

    const handleManagePlan = (userId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Evita abrir el modal de ver detalle
        navigate(`/admin/users/${userId}/payments`);
    };

    const handleOpenCreate = () => {
        setFormData({ username: '', email: '', password: '', role: 'client', status: 'active', company_id: '', department_id: '' });
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user: User, e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setFormData({
            username: user.username,
            email: user.email,
            password: '', 
            role: user.role,
            status: user.status || 'active',
            company_id: user.company_id ? user.company_id.toString() : '',
            department_id: user.department_id ? user.department_id.toString() : ''
        });
        setCurrentUserId(user.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // ✅ NUEVO: Abrir tarjeta de detalle
    const handleViewDetails = (user: User) => {
        setViewUser(user);
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await api.delete(`/api/users/${id}`);
            toast.success('Usuario eliminado');
            fetchData();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.username || !formData.email) return toast.warn('Completa los campos obligatorios');
        if (formData.role === 'client' && !formData.company_id) return toast.warn('Asigna una empresa al cliente');

        try {
            const payload = {
                ...formData,
                company_id: formData.company_id ? parseInt(formData.company_id) : null,
                department_id: formData.department_id ? parseInt(formData.department_id) : null
            };

            if (isEditMode && currentUserId) {
                await api.put(`/api/users/${currentUserId}`, payload);
                toast.success('Usuario actualizado');
            } else {
                await api.post('/api/auth/register', payload);
                toast.success('Usuario creado');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al guardar');
        }
    };

    const safeUsers = Array.isArray(users) ? users : [];
    const filteredUsers = safeUsers.filter(u => 
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando gestión de usuarios...</div>;

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <FaUserShield className="text-indigo-600"/> Gestión de Usuarios
                    </h1>
                    <p className="text-gray-500 mt-1">Administra accesos, roles y estados.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o email..." 
                            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={handleOpenCreate} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition font-bold shadow-md flex items-center justify-center gap-2">
                        <FaUserPlus /> Nuevo Usuario
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-5 font-bold">Usuario</th>
                                <th className="p-5 font-bold">Estado & Rol</th>
                                <th className="p-5 font-bold">Empresa</th>
                                <th className="p-5 font-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <tr 
                                        key={user.id} 
                                        className="hover:bg-indigo-50/40 transition duration-150 cursor-pointer"
                                        onClick={() => handleViewDetails(user)} // ✅ CLIC EN LA FILA ABRE EL DETALLE
                                    >
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                                    user.role === 'admin' ? 'bg-red-500' : user.role === 'agent' ? 'bg-purple-500' : 'bg-blue-500'
                                                }`}>
                                                    {(user.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{user.username}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="p-5">
                                            <div className="flex flex-col gap-1 items-start">
                                                {/* Badge de Estado */}
                                                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                                    user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {user.status === 'active' ? <FaCheckCircle/> : <FaTimesCircle/>}
                                                    {user.status === 'active' ? 'Activo' : 'Inactivo'}
                                                </span>
                                                
                                                {/* Badge de Rol */}
                                                <span className="text-xs font-semibold uppercase text-gray-500 tracking-wide mt-1">
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-5">
                                            {user.role === 'client' ? (
                                                <div className="text-sm">
                                                    <div className="text-gray-800 font-medium flex items-center gap-2">
                                                        <FaBuilding className="text-gray-400"/> 
                                                        {user.company_name || 'Sin Empresa Asignada'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm italic">Interno (Schettini)</span>
                                            )}
                                        </td>

                                        <td className="p-5">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Botón Ver Detalle (Ojo) */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleViewDetails(user); }}
                                                    className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition border border-gray-200"
                                                    title="Ver Ficha Completa"
                                                >
                                                    <FaEye />
                                                </button>

                                                {user.role === 'client' && (
                                                    <button 
                                                        onClick={(e) => handleManagePlan(user.id, e)}
                                                        className="bg-yellow-50 text-yellow-600 p-2 rounded-lg hover:bg-yellow-100 transition border border-yellow-200"
                                                        title="Pagos y Suscripción"
                                                    >
                                                        <FaCreditCard />
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={(e) => handleOpenEdit(user, e)} 
                                                    className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition border border-blue-200" 
                                                    title="Editar"
                                                >
                                                    <FaEdit />
                                                </button>

                                                <button 
                                                    onClick={(e) => handleDelete(user.id, e)} 
                                                    className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition border border-red-200" 
                                                    title="Eliminar"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        No se encontraron usuarios.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ✅ MODAL DE TARJETA DE USUARIO (POP-UP DE DETALLE) */}
            {viewUser && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">
                        {/* Header del Modal */}
                        <div className={`h-24 w-full flex items-center justify-center ${
                            viewUser.role === 'admin' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                            viewUser.role === 'agent' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' :
                            'bg-gradient-to-r from-blue-500 to-cyan-500'
                        }`}>
                            <button onClick={() => setViewUser(null)} className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
                        </div>

                        {/* Avatar y Datos Principales */}
                        <div className="px-8 pb-8 -mt-12 text-center">
                            <div className="bg-white p-2 rounded-full inline-block shadow-lg">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white ${
                                    viewUser.role === 'admin' ? 'bg-red-500' : viewUser.role === 'agent' ? 'bg-purple-500' : 'bg-blue-500'
                                }`}>
                                    {viewUser.username.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-gray-800 mt-3">{viewUser.username}</h2>
                            <p className="text-gray-500 flex items-center justify-center gap-2">
                                <FaEnvelope className="text-gray-400"/> {viewUser.email}
                            </p>

                            <div className="flex justify-center gap-3 mt-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    viewUser.role === 'admin' ? 'bg-red-100 text-red-700' :
                                    viewUser.role === 'agent' ? 'bg-purple-100 text-purple-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {viewUser.role}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                                    viewUser.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {viewUser.status === 'active' ? <FaCheckCircle/> : <FaTimesCircle/>} {viewUser.status || 'Desconocido'}
                                </span>
                            </div>

                            {/* Detalles Técnicos */}
                            <div className="mt-8 grid grid-cols-2 gap-4 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Organización</p>
                                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mt-1">
                                        <FaBuilding className="text-gray-400"/>
                                        {viewUser.role === 'client' ? (viewUser.company_name || 'Sin asignar') : 'Interno Schettini'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Departamento</p>
                                    <p className="text-sm font-semibold text-gray-700 mt-1">
                                        {viewUser.department_name || 'General'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">ID Sistema</p>
                                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mt-1">
                                        <FaIdBadge className="text-gray-400"/> #{viewUser.id}
                                    </p>
                                </div>
                                {viewUser.role === 'client' && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Plan Actual</p>
                                        <p className="text-sm font-semibold text-indigo-600 mt-1">
                                            {viewUser.plan || 'Free'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setViewUser(null)}
                                className="mt-6 w-full bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-900 transition shadow-lg"
                            >
                                Cerrar Ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CREAR / EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                        
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
                            {isEditMode ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                                <input 
                                    type="text" required
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    value={formData.username}
                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
                                <input 
                                    type="email" required
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    {isEditMode ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                                </label>
                                <input 
                                    type="password" 
                                    required={!isEditMode}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    placeholder={isEditMode ? "Dejar en blanco para mantener actual" : "••••••"}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Rol</label>
                                    <select 
                                        className="w-full border border-gray-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value as any})}
                                    >
                                        <option value="client">Cliente</option>
                                        <option value="agent">Agente</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Estado</label>
                                    <select 
                                        className="w-full border border-gray-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                                    >
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Empresa {formData.role === 'client' && <span className="text-red-500">*</span>}
                                </label>
                                <select 
                                    className={`w-full border p-2.5 rounded-lg bg-white outline-none transition ${formData.role === 'client' ? 'border-gray-300 focus:ring-2 focus:ring-indigo-500' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                    value={formData.company_id}
                                    onChange={e => setFormData({...formData, company_id: e.target.value})}
                                    required={formData.role === 'client'}
                                    disabled={formData.role !== 'client'}
                                >
                                    <option value="">Seleccionar...</option>
                                    {Array.isArray(companies) && companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Departamento (Opcional)</label>
                                <select 
                                    className="w-full border border-gray-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.department_id}
                                    onChange={e => setFormData({...formData, department_id: e.target.value})}
                                >
                                    <option value="">Ninguno</option>
                                    {Array.isArray(departments) && departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 mt-8 pt-4 border-t">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition font-bold"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-bold shadow-lg"
                                >
                                    {isEditMode ? 'Guardar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;