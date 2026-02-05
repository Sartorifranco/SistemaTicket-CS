import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaFileInvoiceDollar, FaHistory, FaCloudUploadAlt, FaEdit, FaCheckCircle, FaClock, FaTimesCircle, FaEnvelope } from 'react-icons/fa';

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
    plan_expiry: string | null;
    price: number;
}

interface BillingInfo {
    tax_id: string;
    business_name: string;
    address: string;
    fiscal_condition: string;
}

const ClientPaymentsPage: React.FC = () => {
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [billing, setBilling] = useState<BillingInfo | null>(null);
    const [userPlan, setUserPlan] = useState<UserPlan>({ plan_name: 'Free', plan_expiry: null, price: 0 });
    const [loading, setLoading] = useState(true);
    const [supportEmail, setSupportEmail] = useState('admin@schettini.com'); // Default fallback

    // Modales
    const [showPayModal, setShowPayModal] = useState(false);
    const [showBillingModal, setShowBillingModal] = useState(false);

    // Form states
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('transferencia');
    const [file, setFile] = useState<File | null>(null);

    // Billing Form
    const [billingForm, setBillingForm] = useState<BillingInfo>({
        tax_id: '', business_name: '', address: '', fiscal_condition: 'Consumidor Final'
    });

    useEffect(() => {
        fetchData();
        fetchGlobalConfig(); // ✅ Cargar configuración (email)
    }, []);

    // ✅ Obtener email dinámico
    const fetchGlobalConfig = async () => {
        try {
            const res = await api.get('/api/config/public');
            if (res.data.data.billing_email) {
                setSupportEmail(res.data.data.billing_email);
            }
        } catch (error) { console.error("Error cargando config", error); }
    };

    const fetchData = async () => {
        try {
            const res = await api.get('/api/payments');
            setPayments(res.data.data.payments);
            setBilling(res.data.data.billing);
            if(res.data.data.billing) setBillingForm(res.data.data.billing);
            if(res.data.data.userPlan) setUserPlan(res.data.data.userPlan);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const handleReportPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !amount) return toast.warning('Completa el monto y sube el comprobante');

        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('method', method);
        formData.append('receipt', file);
        formData.append('description', `Pago mensual - ${method}`);

        try {
            await api.post('/api/payments/report', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Pago informado. Pendiente de aprobación.');
            setShowPayModal(false);
            setAmount(''); setFile(null);
            fetchData();
        } catch (error) { toast.error('Error al subir pago'); }
    };

    const handleSaveBilling = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/payments/billing', billingForm);
            toast.success('Datos de facturación actualizados');
            setShowBillingModal(false);
            fetchData();
        } catch (error) { toast.error('Error al guardar datos'); }
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'approved': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><FaCheckCircle/> Aprobado</span>;
            case 'rejected': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><FaTimesCircle/> Rechazado</span>;
            default: return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><FaClock/> Pendiente</span>;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Sin vencimiento';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Mi Suscripción</h1>
                    <p className="text-gray-500 text-sm">Gestiona tus pagos y datos de facturación.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* TARJETA 1: PLAN ACTUAL */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Tu Plan Actual</h3>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2 capitalize">{userPlan.plan_name || 'Free'} <span className="text-sm font-normal text-gray-500">(Mensual)</span></h2>
                            <p className="text-green-600 font-medium text-sm flex items-center gap-2">
                                <FaCheckCircle /> Vence: {formatDate(userPlan.plan_expiry)}
                            </p>
                        </div>
                        <button onClick={() => setShowPayModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-md transition font-medium flex items-center gap-2">
                            <FaCloudUploadAlt /> Informar Pago
                        </button>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100 flex gap-6">
                        <div>
                            <p className="text-xs text-gray-400">Próximo vencimiento</p>
                            <p className="font-semibold text-gray-700">{formatDate(userPlan.plan_expiry)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Importe pactado</p>
                            <p className="font-semibold text-gray-700">${userPlan.price || '0.00'} ARS</p>
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: DATOS FACTURACIÓN */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-800 font-bold flex items-center gap-2"><FaFileInvoiceDollar className="text-orange-500"/> Datos Facturación</h3>
                            <button onClick={() => setShowBillingModal(true)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"><FaEdit/> Editar</button>
                        </div>
                        {billing?.tax_id ? (
                            <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-bold">Razón Social:</span> {billing.business_name}</p>
                                <p><span className="font-bold">CUIT/RUT:</span> {billing.tax_id}</p>
                                <p><span className="font-bold">Condición:</span> {billing.fiscal_condition}</p>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-center">
                                <p className="text-yellow-700 text-xs mb-2">Aún no has cargado tus datos para la factura.</p>
                                <button onClick={() => setShowBillingModal(true)} className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold">Cargar Datos</button>
                            </div>
                        )}
                    </div>
                    
                    {/* ✅ FOOTER DINÁMICO CON EMAIL */}
                    <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center gap-2">
                        <FaEnvelope className="text-indigo-400 flex-shrink-0" />
                        <p className="text-[10px] text-gray-500 leading-tight">
                            ¿Dudas con tu factura? Escribe a <a href={`mailto:${supportEmail}`} className="text-indigo-600 font-bold hover:underline">{supportEmail}</a>
                        </p>
                    </div>
                </div>
            </div>

            {/* TABLA HISTORIAL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><FaHistory className="text-gray-400"/> Historial de Pagos</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Fecha</th>
                                <th className="p-4 font-semibold">ID Pago</th>
                                <th className="p-4 font-semibold">Método</th>
                                <th className="p-4 font-semibold">Monto</th>
                                <th className="p-4 font-semibold">Estado</th>
                                <th className="p-4 font-semibold">Comprobante</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Cargando historial...</td></tr>
                            ) : payments.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay pagos registrados.</td></tr>
                            ) : (
                                payments.map(pay => (
                                    <tr key={pay.id} className="hover:bg-gray-50 transition">
                                        <td className="p-4 text-sm text-gray-600">{new Date(pay.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 text-sm font-mono text-gray-500">#{pay.id}</td>
                                        <td className="p-4 text-sm text-gray-700 capitalize">{pay.method}</td>
                                        <td className="p-4 text-sm font-bold text-gray-800">${pay.amount}</td>
                                        <td className="p-4">{getStatusBadge(pay.status)}</td>
                                        <td className="p-4">
                                            {pay.receipt_url && (
                                                <a href={`http://${window.location.hostname}:5050${pay.receipt_url}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs font-bold">Ver Recibo</a>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL INFORMAR PAGO */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Informar un Pago</h3>
                            <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimesCircle size={24}/></button>
                        </div>
                        <form onSubmit={handleReportPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Pagado</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-8 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                                <select value={method} onChange={e => setMethod(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none">
                                    <option value="transferencia">Transferencia Bancaria</option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante (Foto/PDF)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition relative">
                                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" required />
                                    <FaCloudUploadAlt className="mx-auto text-gray-400 text-3xl mb-2"/>
                                    <p className="text-sm text-gray-600">{file ? file.name : "Click para subir archivo"}</p>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition mt-2">Enviar Informe</button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DATOS FACTURACIÓN */}
            {showBillingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Datos de Facturación</h3>
                            <button onClick={() => setShowBillingModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimesCircle size={24}/></button>
                        </div>
                        <form onSubmit={handleSaveBilling} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CUIT / RUT</label>
                                    <input type="text" value={billingForm.tax_id} onChange={e => setBillingForm({...billingForm, tax_id: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" placeholder="20-12345678-9" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Condición Fiscal</label>
                                    <select value={billingForm.fiscal_condition} onChange={e => setBillingForm({...billingForm, fiscal_condition: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none">
                                        <option>Consumidor Final</option>
                                        <option>Responsable Inscripto</option>
                                        <option>Monotributo</option>
                                        <option>Exento</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razón Social / Nombre</label>
                                <input type="text" value={billingForm.business_name} onChange={e => setBillingForm({...billingForm, business_name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" placeholder="Mi Empresa S.A." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección Fiscal</label>
                                <input type="text" value={billingForm.address} onChange={e => setBillingForm({...billingForm, address: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" placeholder="Av. Siempre Viva 123" />
                            </div>
                            <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition mt-4">Guardar Datos</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientPaymentsPage;