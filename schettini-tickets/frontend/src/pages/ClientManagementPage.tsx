import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import {
    FaEdit, FaTrash, FaUserPlus, FaSearch, FaBuilding,
    FaCheckCircle, FaTimesCircle, FaEnvelope, FaIdBadge,
    FaBan, FaChevronDown, FaEye, FaUsers, FaPhone, FaFileInvoice
} from 'react-icons/fa';
import HelpTooltip from '../components/Common/HelpTooltip';

interface Client {
    id: number;
    username: string;
    full_name?: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    company_name?: string;
    company_id?: number;
    department_id?: number;
    department_name?: string;
    plan?: string;
    phone?: string | null;
    cuit?: string | null;
    business_name?: string;
    fantasy_name?: string;
}

interface Company {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

const ClientManagementPage: React.FC = () => {
    const { user: loggedUser } = useAuth();
    const isAgent = loggedUser?.role === 'agent';

    const [clients, setClients] = useState<Client[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewClient, setViewClient] = useState<Client | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentClientId, setCurrentClientId] = useState<number | null>(null);
    const [deleteMenuId, setDeleteMenuId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        cuit: '',
        phone: '',
        business_name: '',
        fantasy_name: '',
        company_id: '',
        department_id: '',
        status: 'active' as 'active' | 'inactive',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, companiesRes, deptsRes] = await Promise.all([
                api.get('/api/users'),
                api.get('/api/companies'),
                api.get('/api/departments'),
            ]);
            const allUsers: Client[] = Array.isArray(usersRes.data.data) ? usersRes.data.data : [];
            setClients(allUsers.filter(u => u.role === 'client'));
            setCompanies(Array.isArray(companiesRes.data.data) ? companiesRes.data.data : []);
            setDepartments(Array.isArray(deptsRes.data.data) ? deptsRes.data.data : []);
        } catch {
            toast.error('Error al cargar los clientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreate = () => {
        setFormData({
            username: '', full_name: '', email: '', password: '',
            cuit: '', phone: '', business_name: '', fantasy_name: '',
            company_id: '', department_id: '', status: 'active',
        });
        setIsEditMode(false);
        setCurrentClientId(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (client: Client, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setFormData({
            username: client.username,
            full_name: client.full_name ?? '',
            email: client.email,
            password: '',
            cuit: client.cuit ?? '',
            phone: client.phone ?? '',
            business_name: client.business_name ?? '',
            fantasy_name: client.fantasy_name ?? '',
            company_id: client.company_id ? String(client.company_id) : '',
            department_id: client.department_id ? String(client.department_id) : '',
            status: client.status || 'active',
        });
        setCurrentClientId(client.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleViewDetails = (client: Client) => {
        setDeleteMenuId(null);
        setViewClient(client);
    };

    const handleDeactivate = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteMenuId(null);
        if (!window.confirm('¿Desactivar este cliente? No podrá iniciar sesión.')) return;
        try {
            await api.delete(`/api/users/${id}`);
            toast.success('Cliente desactivado');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al desactivar');
        }
    };

    const handlePermanentDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteMenuId(null);
        if (!window.confirm('¿Eliminar PERMANENTEMENTE este cliente? Solo es posible si no tiene tickets ni comentarios.')) return;
        try {
            await api.delete(`/api/users/${id}?permanent=1`);
            toast.success('Cliente eliminado permanentemente');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al eliminar');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.email) return toast.warn('Completá los campos obligatorios');

        try {
            const payload: Record<string, unknown> = {
                ...formData,
                role: 'client',
                full_name: (formData.full_name || '').trim() || null,
                company_id: formData.company_id ? parseInt(formData.company_id) : null,
                department_id: formData.department_id ? parseInt(formData.department_id) : null,
            };
            if (!isEditMode) payload.accepted_confidentiality_agreement = true;

            if (isEditMode && currentClientId) {
                await api.put(`/api/users/${currentClientId}`, payload);
                toast.success('Cliente actualizado correctamente');
            } else {
                await api.post('/api/auth/register', payload);
                toast.success('Cliente creado correctamente');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Error al guardar', { autoClose: 8000 });
        }
    };

    const filtered = clients.filter(c =>
        (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cuit || '').includes(searchTerm)
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando clientes...</div>;

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <FaUsers className="text-indigo-600" /> Clientes / Empresas
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {clients.length} cliente{clients.length !== 1 ? 's' : ''} registrado{clients.length !== 1 ? 's' : ''}.
                        {isAgent && <span className="ml-2 text-xs text-amber-600 font-semibold">(Podés crear y editar. Eliminar y cambiar estado requiere Admin.)</span>}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email, empresa o CUIT..."
                            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition font-bold shadow-md flex items-center justify-center gap-2"
                    >
                        <FaUserPlus /> Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-4 font-bold">Cliente</th>
                                <th className="p-4 font-bold">Nombre / Razón Social</th>
                                <th className="p-4 font-bold">Estado</th>
                                <th className="p-4 font-bold">Empresa Vinculada</th>
                                <th className="p-4 font-bold">CUIT / Teléfono</th>
                                <th className="p-4 font-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length > 0 ? (
                                filtered.map(client => (
                                    <tr
                                        key={client.id}
                                        className="hover:bg-indigo-50/40 transition duration-150 cursor-pointer"
                                        onClick={() => handleViewDetails(client)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {(client.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{client.username}</div>
                                                    <div className="text-xs text-gray-500">{client.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-gray-800 font-medium">
                                                {(client.full_name || client.username || '—').trim() || '—'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                                                client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                            }`}>
                                                {client.status === 'active' ? <FaCheckCircle /> : <FaTimesCircle />}
                                                {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-gray-700 flex items-center gap-2">
                                                <FaBuilding className="text-gray-400" />
                                                {client.company_name || 'Sin empresa asignada'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-gray-600 space-y-0.5">
                                                {client.cuit && <div className="flex items-center gap-1"><FaFileInvoice className="text-gray-400" />{client.cuit}</div>}
                                                {client.phone && <div className="flex items-center gap-1"><FaPhone className="text-gray-400" />{client.phone}</div>}
                                                {!client.cuit && !client.phone && <span className="text-gray-400 italic">—</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Ver detalle */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleViewDetails(client); }}
                                                    className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition border border-gray-200"
                                                    title="Ver ficha"
                                                >
                                                    <FaEye />
                                                </button>

                                                {/* Editar — visible para todos (admin, supervisor, agent) */}
                                                <button
                                                    onClick={e => handleOpenEdit(client, e)}
                                                    className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                                                    title="Editar"
                                                >
                                                    <FaEdit />
                                                </button>

                                                {/* Eliminar / Desactivar — SOLO admin y supervisor */}
                                                {!isAgent && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setDeleteMenuId(deleteMenuId === client.id ? null : client.id); }}
                                                            className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition border border-red-200 flex items-center gap-1"
                                                            title="Eliminar / Desactivar"
                                                        >
                                                            <FaTrash /><FaChevronDown size={10} />
                                                        </button>
                                                        {deleteMenuId === client.id && (
                                                            <div className="absolute right-0 top-full mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]">
                                                                <button onClick={e => handleDeactivate(client.id, e)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-amber-600">
                                                                    <FaBan /> Desactivar
                                                                </button>
                                                                <button onClick={e => handlePermanentDelete(client.id, e)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600">
                                                                    <FaTrash /> Eliminar permanentemente
                                                                </button>
                                                                <button onClick={e => { e.stopPropagation(); setDeleteMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-500">
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center">
                                        <div className="text-gray-600 font-medium mb-1">
                                            {searchTerm ? 'Sin resultados para esa búsqueda.' : 'Aún no hay clientes registrados.'}
                                        </div>
                                        <div className="text-gray-500 text-sm">
                                            {!searchTerm && 'Hacé clic en «Nuevo Cliente» para comenzar.'}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DETALLE */}
            {viewClient && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">
                        <div className="h-24 w-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                            <button onClick={() => setViewClient(null)} className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
                        </div>
                        <div className="px-8 pb-8 -mt-12 text-center">
                            <div className="bg-white p-2 rounded-full inline-block shadow-lg">
                                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-4xl font-bold text-white">
                                    {(viewClient.full_name || viewClient.username || '?').charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mt-3">
                                {((viewClient.full_name || '').trim() || viewClient.username || '').trim() || '—'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">Usuario: {viewClient.username}</p>
                            <p className="text-gray-500 flex items-center justify-center gap-2 mt-2">
                                <FaEnvelope className="text-gray-400" /> {viewClient.email}
                            </p>
                            <div className="flex justify-center gap-3 mt-4">
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                                    Cliente
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                                    viewClient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {viewClient.status === 'active' ? <FaCheckCircle /> : <FaTimesCircle />}
                                    {viewClient.status || 'Desconocido'}
                                </span>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-4 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Empresa</p>
                                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mt-1">
                                        <FaBuilding className="text-gray-400" />
                                        {viewClient.company_name || 'Sin asignar'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">ID Sistema</p>
                                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mt-1">
                                        <FaIdBadge className="text-gray-400" /> #{viewClient.id}
                                    </p>
                                </div>
                                {viewClient.cuit && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">CUIT</p>
                                        <p className="text-sm font-semibold text-gray-700 mt-1">{viewClient.cuit}</p>
                                    </div>
                                )}
                                {viewClient.phone && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Teléfono</p>
                                        <p className="text-sm font-semibold text-gray-700 mt-1">{viewClient.phone}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => { setViewClient(null); handleOpenEdit(viewClient); }}
                                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                                >
                                    <FaEdit /> Editar
                                </button>
                                <button
                                    onClick={() => setViewClient(null)}
                                    className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg font-bold hover:bg-gray-900 transition"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CREAR / EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative my-8">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                        <h2 className="text-2xl font-bold mb-2 text-gray-800 border-b pb-3">
                            {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </h2>
                        <p className="text-sm text-gray-500 mb-5">
                            Los campos con <span className="text-red-500">*</span> son obligatorios.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                        Usuario <span className="text-red-500">*</span>
                                        <HelpTooltip text="Nombre de usuario para iniciar sesión. Sin espacios. Debe ser único." />
                                    </label>
                                    <input
                                        type="text" required
                                        placeholder="ej. agusortega"
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                        Nombre y Apellido / Razón Social
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Agustín Ortega o Empresa S.A."
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email" required
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                        Teléfono / WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+54 9 11 1234-5678"
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                        CUIT
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="20-12345678-9"
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.cuit}
                                        onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                        {isEditMode ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}{!isEditMode && <span className="text-red-500">*</span>}
                                        <HelpTooltip text={isEditMode ? 'Dejá en blanco para no cambiar.' : 'Contraseña de acceso al portal de clientes.'} />
                                    </label>
                                    <input
                                        type="password"
                                        required={!isEditMode}
                                        placeholder={isEditMode ? 'Dejar en blanco para mantener' : '••••••'}
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Estado — solo visible para admin/supervisor */}
                            {!isAgent && (
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                        Estado
                                        <HelpTooltip text="Inactivo: el cliente no podrá iniciar sesión." />
                                    </label>
                                    <select
                                        className="w-full border border-gray-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                    >
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                    Empresa
                                    <HelpTooltip text="Empresa a la que pertenece el cliente." />
                                </label>
                                <select
                                    className="w-full border border-gray-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.company_id}
                                    onChange={e => setFormData({ ...formData, company_id: e.target.value })}
                                >
                                    <option value="">Sin empresa / Seleccionar...</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                    Departamento (Opcional)
                                </label>
                                <select
                                    className="w-full border border-gray-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.department_id}
                                    onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                >
                                    <option value="">Ninguno</option>
                                    {departments.map(d => (
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
                                    {isEditMode ? 'Guardar Cambios' : 'Crear Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientManagementPage;
