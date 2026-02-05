import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaSave, FaCogs, FaMoneyBillWave, FaCreditCard, FaEnvelope } from 'react-icons/fa';

const AdminConfigPage: React.FC = () => {
    const [settings, setSettings] = useState({
        tech_hour_cost: '',
        payment_alias: '',
        billing_email: '' // ✅ Campo nuevo agregado
    });
    const [loading, setLoading] = useState(true);

    // Cargar configuración actual al entrar
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/api/config/public');
                // Si la API devuelve datos, los usamos. Si no, quedan vacíos.
                setSettings({
                    tech_hour_cost: res.data.data.tech_hour_cost || '',
                    payment_alias: res.data.data.payment_alias || '',
                    billing_email: res.data.data.billing_email || '' // ✅ Cargar email
                });
            } catch (error) {
                console.error(error);
                toast.error('No se pudo cargar la configuración actual');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // Guardar cambios
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put('/api/config', settings); // ✅ Usar PUT que es lo estándar para updates
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