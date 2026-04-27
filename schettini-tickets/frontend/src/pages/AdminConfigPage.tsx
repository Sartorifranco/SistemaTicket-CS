import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaSave, FaCogs, FaMoneyBillWave, FaCreditCard, FaEnvelope, FaFileSignature, FaBalanceScale } from 'react-icons/fa';

const DEFAULT_AGREEMENT = `Acuerdo de Confidencialidad

El presente Acuerdo de Confidencialidad establece los términos bajo los cuales la información proporcionada por el usuario será tratada por nuestra empresa.

1. Información Confidencial

Se considerará Información Confidencial toda aquella información técnica, comercial, financiera, operativa o de cualquier otra naturaleza que el usuario proporcione a través de nuestro sitio web, formularios de registro, consultas o cualquier otro medio de contacto.

2. Uso de la Información

La información recopilada será utilizada exclusivamente para fines comerciales, administrativos, técnicos o de contacto vinculados con los servicios y productos ofrecidos por nuestra empresa. No será utilizada con fines distintos a los aquí establecidos.

3. Protección y Resguardo

Nos comprometemos a adoptar las medidas técnicas y organizativas necesarias para proteger la información contra accesos no autorizados, alteración, divulgación o destrucción indebida.

4. No Divulgación

La Información Confidencial no será divulgada a terceros, salvo obligación legal o cuando resultare necesario para la correcta prestación del servicio (por ejemplo, proveedores técnicos o administrativos), quienes estarán sujetos a iguales obligaciones de confidencialidad.

5. Vigencia

Las obligaciones de confidencialidad se mantendrán vigentes aun después de finalizada la relación comercial entre las partes.

6. Aceptación

El registro en nuestro sitio web implica la aceptación expresa de los términos del presente Acuerdo de Confidencialidad.`;

const AdminConfigPage: React.FC = () => {
    const [settings, setSettings] = useState({
        tech_hour_cost: '',
        payment_alias: '',
        billing_email: '',
        confidentiality_agreement: ''
    });
    const [termsAndConditions, setTermsAndConditions] = useState('');
    /** Si hubo GET /terms correcto, al guardar también persistimos términos (evita borrar BD si ese GET falló). */
    const [termsReadyToSave, setTermsReadyToSave] = useState(false);
    const [loading, setLoading] = useState(true);

    // Cargar configuración actual al entrar
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const resConfig = await api.get('/api/config/public');
                setSettings({
                    tech_hour_cost: resConfig.data.data.tech_hour_cost || '',
                    payment_alias: resConfig.data.data.payment_alias || '',
                    billing_email: resConfig.data.data.billing_email || '',
                    confidentiality_agreement: resConfig.data.data.confidentiality_agreement || DEFAULT_AGREEMENT,
                });
            } catch (error) {
                console.error(error);
                toast.error('No se pudo cargar la configuración actual');
            } finally {
                setLoading(false);
            }
        };
        const fetchTerms = async () => {
            try {
                const resTerms = await api.get('/api/settings/terms');
                if (resTerms.data?.data?.text != null) {
                    setTermsAndConditions(resTerms.data.data.text);
                    setTermsReadyToSave(true);
                }
            } catch {
                toast.warn('No se pudieron cargar los Términos de Garantía. Podés editar el resto de la configuración; reintentá recargando la página para editar términos.');
                setTermsReadyToSave(false);
            }
        };
        fetchSettings();
        fetchTerms();
    }, []);

    // Guardar cambios
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const ops: Promise<unknown>[] = [api.put('/api/config', settings)];
            if (termsReadyToSave) {
                ops.push(api.put('/api/settings/terms', { text: termsAndConditions }));
            }
            await Promise.all(ops);
            toast.success('Configuración global actualizada correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar la configuración');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando configuración...</div>;

    return (
        <div className="container mx-auto p-6 animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3 border-l-4 border-indigo-600 pl-4">
                <FaCogs className="text-gray-600" /> Configuración Global del Sistema
            </h1>
            
            <div className="bg-white p-8 rounded-xl shadow-md max-w-3xl border border-gray-200">
                <p className="text-gray-500 mb-6 border-b pb-4">
                    Define aquí los valores que verán todos los clientes en su perfil (costos, datos de pago y contacto).
                </p>

                <form onSubmit={handleSave} className="space-y-6">
                    
                    {/* COSTO HORA TÉCNICA */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <FaMoneyBillWave className="text-green-600"/> Costo de Hora Técnica ($)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">$</span>
                            <input 
                                type="number" 
                                value={settings.tech_hour_cost} 
                                onChange={e => setSettings({...settings, tech_hour_cost: e.target.value})} 
                                className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                                placeholder="Ej: 15000"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Este valor se mostrará en la sección "Costos Técnicos" del perfil del cliente.</p>
                    </div>

                    {/* ALIAS CBU */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <FaCreditCard className="text-blue-600"/> Alias / CBU / Datos de Pago
                        </label>
                        <input 
                            type="text" 
                            value={settings.payment_alias} 
                            onChange={e => setSettings({...settings, payment_alias: e.target.value})} 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono text-blue-900 bg-blue-50" 
                            placeholder="Ej: EMPRESA.PAGOS.CBU"
                        />
                        <p className="text-xs text-gray-400 mt-1">El dato bancario para que los clientes realicen transferencias.</p>
                    </div>

                    {/* EMAIL DE CONTACTO FACTURACIÓN */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <FaEnvelope className="text-orange-500"/> Email de Soporte / Facturación
                        </label>
                        <input 
                            type="email" 
                            value={settings.billing_email} 
                            onChange={e => setSettings({...settings, billing_email: e.target.value})} 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                            placeholder="Ej: admin@tuempresa.com"
                        />
                        <p className="text-xs text-gray-400 mt-1">Este correo aparecerá en la sección "Mis Pagos" para consultas.</p>
                    </div>

                    {/* ACUERDO DE CONFIDENCIALIDAD */}
                    <div className="border-t pt-6 mt-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <FaFileSignature className="text-purple-600"/> Acuerdo de Confidencialidad
                        </label>
                        <p className="text-xs text-gray-400 mb-2">Texto que debe aceptar el cliente al registrarse. Editable.</p>
                        <textarea 
                            value={settings.confidentiality_agreement} 
                            onChange={e => setSettings({...settings, confidentiality_agreement: e.target.value})} 
                            rows={14}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono text-sm"
                            placeholder="Acuerdo de Confidencialidad..."
                        />
                    </div>

                    {/* TÉRMINOS Y CONDICIONES DE GARANTÍA (panel cliente — modal dinámico) */}
                    <div className="border-t pt-6 mt-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <FaBalanceScale className="text-indigo-600"/> Términos y Condiciones de Garantía
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Texto que verán los clientes al abrir &quot;Términos y Condiciones de Garantía&quot; en su panel.
                            Los saltos de línea se respetan al visualizar.
                        </p>
                        <textarea
                            value={termsAndConditions}
                            onChange={(e) => setTermsAndConditions(e.target.value)}
                            rows={18}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono text-sm"
                            placeholder="Edite aquí los términos legales de garantía..."
                        />
                    </div>

                    <div className="pt-4 border-t mt-6">
                        <button 
                            type="submit" 
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex justify-center items-center gap-2 shadow-md transition-transform transform active:scale-95"
                        >
                            <FaSave /> Guardar Cambios Globales
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminConfigPage;