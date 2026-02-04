import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaSave, FaCogs, FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';

const AdminConfigPage: React.FC = () => {
    const [settings, setSettings] = useState({
        tech_hour_cost: '',
        payment_alias: ''
    });
    const [loading, setLoading] = useState(true);

    // Cargar configuración actual al entrar
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/api/config');
                // Si la API devuelve datos, los usamos. Si no, quedan vacíos.
                setSettings({
                    tech_hour_cost: res.data.data.tech_hour_cost || '',
                    payment_alias: res.data.data.payment_alias || ''
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
            await api.post('/api/config', settings);
            toast.success('Configuración global actualizada correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar la configuración');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando configuración...</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                <FaCogs className="text-gray-600" /> Configuración Global del Sistema
            </h1>
            
            <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl border border-gray-200">
                <p className="text-gray-500 mb-6 border-b pb-4">
                    Define aquí los valores que verán todos los clientes en su perfil (costos y datos de pago).
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

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex justify-center items-center gap-2 shadow-md transition-transform transform active:scale-95"
                        >
                            <FaSave /> Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminConfigPage;