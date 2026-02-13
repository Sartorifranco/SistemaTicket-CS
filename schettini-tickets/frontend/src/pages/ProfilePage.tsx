import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaUser, FaBoxOpen, FaStore, FaMoneyBillWave, FaClock, FaCheck, FaArrowRight, FaPuzzlePiece, FaCheckSquare, FaSquare, FaHistory, FaCreditCard } from 'react-icons/fa';
import { Plan, SystemSettings, Module, ActivityLog } from '../types';
import { translateActionType, translateDescription } from '../utils/activityTranslations';
import ClientPaymentsPage from './ClientPaymentsPage';

// --- SUB-COMPONENTE: Tarjeta de Plan ---
const PlanCard: React.FC<{ plan: Plan, currentPlanId?: number, onRequestChange: (itemName: string, type: 'plan'|'module') => void }> = ({ plan, currentPlanId, onRequestChange }) => {
    const isCurrent = plan.id === currentPlanId;
    const featuresList = plan.features ? plan.features.split('\n') : [];

    return (
        <div className={`border rounded-xl p-6 flex flex-col h-full relative transition-all ${isCurrent ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50/50' : 'border-gray-200 bg-white hover:shadow-lg'}`}>
            {isCurrent && <span className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">ACTUAL</span>}
            <div className="mb-4"><h3 className="text-xl font-bold text-gray-800">{plan.name}</h3></div>
            <div className="mb-6 border-b border-gray-100 pb-4"><span className="text-3xl font-bold text-gray-900">${plan.price?.toLocaleString()}</span><span className="text-gray-500 text-sm"> /mes</span></div>
            <ul className="space-y-3 mb-8 flex-grow">{featuresList.map((f, i) => (<li key={i} className="flex items-start text-sm text-gray-600"><FaCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" size={12} /><span>{f}</span></li>))}</ul>
            <button onClick={() => !isCurrent && onRequestChange(plan.name, 'plan')} className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${isCurrent ? 'bg-green-100 text-green-700 cursor-default border border-green-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`} disabled={isCurrent}>{isCurrent ? 'Plan Activo' : 'Solicitar Cambio'}</button>
        </div>
    );
};

// --- NUEVO SUB-COMPONENTE: Tarjeta de Módulo ---
const ModuleCard: React.FC<{ module: Module, onRequestModule: (moduleName: string) => void }> = ({ module, onRequestModule }) => {
    const [selected, setSelected] = useState(false);

    const handleRequest = () => {
        onRequestModule(module.name);
        setSelected(false);
    };

    return (
        <div className="border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <div className="bg-orange-100 p-2 rounded-md text-orange-600"><FaPuzzlePiece size={20}/></div>
                    <button onClick={() => setSelected(!selected)} className="text-gray-400 hover:text-orange-500 transition-colors">
                        {selected ? <FaCheckSquare size={24} className="text-orange-500"/> : <FaSquare size={24}/>}
                    </button>
                </div>
                <h4 className="font-bold text-gray-800 text-lg mb-1">{module.name}</h4>
                <p className="text-xl font-bold text-gray-900 mb-2">${module.price.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/mes</span></p>
                <p className="text-sm text-gray-600 mb-4">{module.description}</p>
            </div>
            {selected && (
                <button onClick={handleRequest} className="w-full bg-orange-600 text-white py-2 rounded-md text-sm font-bold hover:bg-orange-700 transition animate-fade-in">
                    Solicitar Activación
                </button>
            )}
            {!selected && (
                <div className="text-center py-2 text-sm text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => setSelected(true)}>
                    Seleccionar
                </div>
            )}
        </div>
    );
};

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'plans' | 'costs' | 'payments' | 'activity'>('profile');
    
    // Datos
    const [plans, setPlans] = useState<Plan[]>([]);
    const [modules, setModules] = useState<Module[]>([]); 
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [companyName, setCompanyName] = useState<string>('No asignada');
    const [loadingDetails, setLoadingDetails] = useState<boolean>(true);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [activityFilters, setActivityFilters] = useState({ ticket_id: '', date_from: '', date_to: '' });
    
    // Contraseña
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansRes, modRes, configRes] = await Promise.all([
                    api.get('/api/plans'),
                    api.get('/api/modules'),
                    api.get('/api/config')
                ]);
                setPlans(plansRes.data.data);
                setModules(modRes.data.data);
                setSettings(configRes.data.data);
            } catch (error) { console.error(error); }
        };
        fetchData();
    }, []);

    const fetchUserDetails = useCallback(async () => {
        if (!user) return;
        setLoadingDetails(true);
        try {
            if (user.company_id) {
                const companyRes = await api.get(`/api/companies/${user.company_id}`);
                setCompanyName(companyRes.data.data.name || 'No asignada');
            }
        } catch (error) { console.error(error); } finally { setLoadingDetails(false); }
    }, [user]);

    useEffect(() => { fetchUserDetails(); }, [fetchUserDetails]);

    useEffect(() => {
        const fetchActivityLogs = async () => {
            if (activeTab !== 'activity') return;
            try {
                const params = new URLSearchParams({ limit: '30' });
                if (activityFilters.ticket_id) params.append('ticket_id', activityFilters.ticket_id);
                if (activityFilters.date_from) params.append('date_from', activityFilters.date_from);
                if (activityFilters.date_to) params.append('date_to', activityFilters.date_to);
                const res = await api.get(`/api/activity-logs?${params.toString()}`);
                setActivityLogs(res.data.data || []);
            } catch (e) { console.error(e); }
        };
        fetchActivityLogs();
    }, [activeTab, activityFilters.ticket_id, activityFilters.date_from, activityFilters.date_to]);

    const handleRequestChange = async (itemName: string, type: 'plan' | 'module') => {
        const action = type === 'plan' ? 'cambio al plan' : 'activación del módulo';
        if (!window.confirm(`¿Deseas generar un ticket solicitando la ${action}: ${itemName}?`)) return;
        
        try {
            const formData = new FormData();
            formData.append('title', `Solicitud de ${type === 'plan' ? 'Cambio de Plan' : 'Módulo'}: ${itemName}`);
            formData.append('description', `El cliente solicita formalmente la ${action}: ${itemName}.`);
            formData.append('priority', 'medium');
            
            await api.post('/api/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Solicitud enviada. Ticket generado.');
        } catch (error) { toast.error('Error al enviar la solicitud.'); }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return toast.error("No coinciden.");
        setIsUpdatingPassword(true);
        try {
            await api.put('/api/users/change-password', { currentPassword, newPassword, confirmPassword });
            toast.success("Contraseña actualizada.");
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err: any) { toast.error(err.response?.data?.message || "Error."); } 
        finally { setIsUpdatingPassword(false); }
    };

    if (!user) return <div className="p-8 text-center">Cargando perfil...</div>;

    // --- CONTENIDOS ---
    const ProfileContent = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Cuenta</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-gray-500 font-bold uppercase">Usuario</label><p>{user.username}</p></div>
                    <div><label className="text-xs text-gray-500 font-bold uppercase">Email</label><p>{user.email}</p></div>
                    <div><label className="text-xs text-gray-500 font-bold uppercase">Empresa</label><p>{loadingDetails ? '...' : companyName}</p></div>
                </div>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Seguridad</h2>
                <form onSubmit={handleChangePassword} className="max-w-lg space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña Actual</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirmar</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" required />
                        </div>
                    </div>
                    <div className="text-right">
                        <button type="submit" className="bg-gray-900 hover:bg-black text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors text-sm" disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? 'Guardando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const PlansContent = () => (
        <div className="space-y-10 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Planes de Suscripción</h2>
                <p className="text-gray-500 mb-6">Elige el plan que mejor se adapte a tu negocio.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <PlanCard key={plan.id} plan={plan} currentPlanId={user.plan_id} onRequestChange={(name) => handleRequestChange(name, 'plan')} />
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                    Agregá todos los módulos que necesites
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                    {modules.map(mod => (
                        <ModuleCard key={mod.id} module={mod} onRequestModule={(name) => handleRequestChange(name, 'module')} />
                    ))}
                </div>
            </div>
        </div>
    );

    const PaymentsContent = () => <ClientPaymentsPage />;

    const ActivityContent = () => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                <FaHistory className="text-indigo-500"/> Mi Actividad
            </h2>
            <p className="text-sm text-gray-500 mb-4">Registro de tus acciones: tickets creados, comentarios agregados, etc.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ticket #</label>
                    <input type="number" placeholder="Ej: 5" value={activityFilters.ticket_id} onChange={e => setActivityFilters(f => ({ ...f, ticket_id: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" min="1" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                    <input type="date" value={activityFilters.date_from} onChange={e => setActivityFilters(f => ({ ...f, date_from: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                    <input type="date" value={activityFilters.date_to} onChange={e => setActivityFilters(f => ({ ...f, date_to: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" />
                </div>
            </div>
            {activityLogs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay actividad registrada. Se registrarán cuando crees tickets, agregues comentarios, etc.</p>
            ) : (
                <div className="space-y-3">
                    {activityLogs.map((log) => (
                        <div key={log.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-start">
                            <div>
                                <p className="font-medium text-gray-800">{translateActionType((log as any).action_type || '')}</p>
                                <p className="text-sm text-gray-600 mt-1">{translateDescription(log.description || '')}</p>
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {new Date((log as any).created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const CostsContent = () => (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <FaMoneyBillWave className="text-green-600"/> Tarifario de Servicios Adicionales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 text-center flex flex-col justify-center items-center">
                    <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center shadow-sm text-indigo-600 mb-4"><FaClock size={36} /></div>
                    <h3 className="text-lg font-semibold text-gray-600 uppercase tracking-wide">Valor Hora Técnica</h3>
                    <p className="text-sm text-gray-500 mb-4">Soporte fuera de plan o presencial</p>
                    <div className="text-5xl font-extrabold text-gray-900 tracking-tight">${Number(settings?.tech_hour_cost || 0).toLocaleString()}</div>
                    <span className="inline-block bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded mt-2 font-bold">+ IVA</span>
                </div>
                <div className="flex flex-col justify-center">
                    <h4 className="font-bold text-gray-800 mb-2 text-lg">Información de Pago</h4>
                    <p className="text-gray-600 mb-6">Datos bancarios para transferencias:</p>
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase">Alias CBU</span>
                            <div className="mt-1 bg-blue-50 border border-blue-100 text-blue-800 font-mono font-bold text-xl px-4 py-3 rounded-lg w-full text-center shadow-sm">{settings?.payment_alias || 'CONSULTAR'}</div>
                        </div>
                        <p className="text-xs text-gray-400 italic text-center">* Enviar comprobante a administración tras el pago.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-gray-100">
            <div className="w-full md:w-72 bg-white border-r border-gray-200 flex-shrink-0 md:min-h-screen">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Mi Cuenta</h2>
                    <p className="text-lg font-bold text-gray-800 truncate mt-1">{user.username}</p>
                </div>
                <nav className="p-4 space-y-1">
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}><span className="flex items-center gap-3"><FaUser className={activeTab === 'profile' ? 'text-indigo-500' : 'text-gray-400'} /> Mis Datos</span>{activeTab === 'profile' && <FaArrowRight size={12} />}</button>
                    <button onClick={() => setActiveTab('plans')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'plans' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}><span className="flex items-center gap-3"><FaBoxOpen className={activeTab === 'plans' ? 'text-indigo-500' : 'text-gray-400'} /> Planes y Módulos</span>{activeTab === 'plans' && <FaArrowRight size={12} />}</button>
                    <button onClick={() => setActiveTab('costs')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'costs' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}><span className="flex items-center gap-3"><FaStore className={activeTab === 'costs' ? 'text-indigo-500' : 'text-gray-400'} /> Costos Técnicos</span>{activeTab === 'costs' && <FaArrowRight size={12} />}</button>
                    {user?.role === 'client' && (
                        <button onClick={() => setActiveTab('payments')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'payments' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}><span className="flex items-center gap-3"><FaCreditCard className={activeTab === 'payments' ? 'text-indigo-500' : 'text-gray-400'} /> Mis Pagos</span>{activeTab === 'payments' && <FaArrowRight size={12} />}</button>
                    )}
                    <button onClick={() => setActiveTab('activity')} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'activity' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}><span className="flex items-center gap-3"><FaHistory className={activeTab === 'activity' ? 'text-indigo-500' : 'text-gray-400'} /> Mi Actividad</span>{activeTab === 'activity' && <FaArrowRight size={12} />}</button>
                </nav>
            </div>
            <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                {activeTab === 'profile' && <ProfileContent />}
                {activeTab === 'plans' && <PlansContent />}
                {activeTab === 'costs' && <CostsContent />}
                {activeTab === 'payments' && <PaymentsContent />}
                {activeTab === 'activity' && <ActivityContent />}
            </div>
        </div>
    );
};

export default ProfilePage;