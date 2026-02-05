import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCheck, FaTimes, FaSave, FaCalendarAlt, FaCreditCard, FaFileInvoice, FaFileDownload } from 'react-icons/fa';

interface Payment {
    id: number;
    amount: number;
    created_at: string;
    status: 'pending' | 'approved' | 'rejected';
    method: string;
    description: string;
    receipt_url?: string;
}

interface UserPlan {
    plan_name: string;
    plan_expiry: string;
    price: number;
}

interface BillingInfo {
    tax_id: string;
    business_name: string;
    address: string;
    fiscal_condition: string;
}

const AdminUserPaymentsPage: React.FC = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [billing, setBilling] = useState<BillingInfo | null>(null);
    const [plan, setPlan] = useState<UserPlan>({ plan_name: 'Free', plan_expiry: '', price: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) fetchData();
    }, [userId]);

    const fetchData = async () => {
        try {
            const res = await api.get(`/api/payments/admin/${userId}`);
            setPayments(res.data.data.payments);
            setBilling(res.data.data.billing);
            if (res.data.data.userPlan) {
                const rawDate = res.data.data.userPlan.plan_expiry;
                // Formatear para input date (YYYY-MM-DD)
                const formattedDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';
                setPlan({ ...res.data.data.userPlan, plan_expiry: formattedDate });
            }
        } catch (error) { toast.error('Error al cargar datos'); } finally { setLoading(false); }
    };

    const handleUpdatePlan = async () => {
        try {
            await api.put(`/api/payments/admin/plan/${userId}`, plan);
            toast.success('Plan actualizado correctamente');
        } catch (error) { toast.error('Error al guardar plan'); }
    };

    const handlePaymentStatus = async (paymentId: number, status: 'approved' | 'rejected') => {
        if (!window.confirm(`¿Marcar pago como ${status === 'approved' ? 'APROBADO' : 'RECHAZADO'}?`)) return;
        try {
            await api.put(`/api/payments/admin/status/${paymentId}`, { status });
            toast.success('Estado actualizado');
            fetchData();
        } catch (error) { toast.error('Error al actualizar estado'); }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando información financiera...</div>;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <button onClick={() => navigate('/admin/users')} className="flex items-center text-gray-500 hover:text-indigo-600 transition mb-2 font-medium">
                <FaArrowLeft className="mr-2" /> Volver a Lista de Usuarios
            </button>

            <div className="flex justify-between items-center border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800 border-l-4 border-indigo-600 pl-4">Gestión de Pagos y Suscripción</h1>
                <div className="text-sm text-gray-500">ID Usuario: <span className="font-mono font-bold text-gray-700">#{userId}</span></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. EDICIÓN DE PLAN */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-gray-800 font-bold flex items-center gap-2 mb-4 text-lg">
                        <FaCreditCard className="text-orange-500"/> Configuración del Plan
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Plan</label>
                            <select 
                                value={plan.plan_name} 
                                onChange={(e) => setPlan({...plan, plan_name: e.target.value})}
                                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            >
                                <option value="Free">Plan Gratuito</option>
                                <option value="Pro">Plan Pro</option>
                                <option value="Enterprise">Plan Enterprise</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vencimiento</label>
                                <div className="relative">
                                    <FaCalendarAlt className="absolute left-3 top-3 text-gray-400"/>
                                    <input 
                                        type="date" 
                                        value={plan.plan_expiry} 
                                        onChange={(e) => setPlan({...plan, plan_expiry: e.target.value})}
                                        className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio ($)</label>
                                <input 
                                    type="number" 
                                    value={plan.price} 
                                    onChange={(e) => setPlan({...plan, price: Number(e.target.value)})}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <button onClick={handleUpdatePlan} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition flex justify-center items-center gap-2 font-medium shadow-md">
                            <FaSave /> Guardar Cambios
                        </button>
                    </div>
                </div>

                {/* 2. DATOS DE FACTURACIÓN (Visualización) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                    <h3 className="text-gray-800 font-bold flex items-center gap-2 mb-4 text-lg">
                        <FaFileInvoice className="text-gray-400"/> Datos Fiscales del Cliente
                    </h3>
                    {billing?.tax_id ? (
                        <div className="space-y-4 text-sm flex-1">
                            <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Razón Social:</span> <span className="font-semibold text-gray-800">{billing.business_name}</span></div>
                            <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">CUIT/RUT:</span> <span className="font-semibold text-gray-800">{billing.tax_id}</span></div>
                            <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Condición:</span> <span className="font-semibold text-gray-800">{billing.fiscal_condition}</span></div>
                            <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Dirección:</span> <span className="font-semibold text-gray-800">{billing.address}</span></div>
                        </div>
                    ) : (
                        <div className="bg-yellow-50 text-yellow-800 p-6 rounded-lg text-center text-sm border border-yellow-100 flex-1 flex items-center justify-center">
                            <p>⚠️ El cliente aún no ha cargado sus datos de facturación.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. HISTORIAL DE PAGOS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Historial de Pagos</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Monto</th>
                                <th className="p-4">Método</th>
                                <th className="p-4">Comprobante</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payments.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Este usuario no tiene pagos registrados.</td></tr>
                            ) : (
                                payments.map(pay => (
                                    <tr key={pay.id} className="hover:bg-gray-50 transition">
                                        <td className="p-4 text-sm text-gray-600">{new Date(pay.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 font-bold text-gray-800">${pay.amount}</td>
                                        <td className="p-4 text-sm text-gray-600 capitalize">{pay.method}</td>
                                        <td className="p-4">
                                            {pay.receipt_url ? (
                                                <a href={`http://${window.location.hostname}:5050${pay.receipt_url}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-bold bg-indigo-50 px-2 py-1 rounded w-fit">
                                                    <FaFileDownload/> Ver Archivo
                                                </a>
                                            ) : <span className="text-gray-400 text-xs">-</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                pay.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                                pay.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                                            }`}>
                                                {pay.status === 'approved' ? 'Aprobado' : pay.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-center gap-2">
                                            {pay.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handlePaymentStatus(pay.id, 'approved')} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 shadow-sm transition" title="Aprobar"><FaCheck/></button>
                                                    <button onClick={() => handlePaymentStatus(pay.id, 'rejected')} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 shadow-sm transition" title="Rechazar"><FaTimes/></button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUserPaymentsPage;