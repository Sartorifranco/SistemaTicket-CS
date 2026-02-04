import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaClock, FaCrown, FaCalendarAlt } from 'react-icons/fa';

const InfoWidget: React.FC = () => {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const dateString = currentTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeString = currentTime.toLocaleTimeString('es-ES');
    
    // Lógica visual del plan (Solo aplica si el usuario logueado es cliente)
    const isClient = user?.role === 'client';
    const planName = user?.plan_name || 'PLAN FREE';
    const isPro = planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('gold');
    const borderColor = isClient && isPro ? '#d97706' : '#e5e7eb'; // Dorado o Gris

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
            {/* Decoración de borde superior si es PRO */}
            {isClient && <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: borderColor }}></div>}

            {/* SECCIÓN 1: RELOJ (Visible para todos) */}
            <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="bg-indigo-50 p-3 rounded-full text-indigo-600 border border-indigo-100">
                    <FaClock size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 leading-none">{timeString}</h2>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1 capitalize">
                        <FaCalendarAlt size={12}/> {dateString}
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: PLAN (Visible SOLO para Clientes en su propio dashboard) */}
            {isClient && (
                <div className={`flex items-center gap-3 px-5 py-2 rounded-lg border ${isPro ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`p-2 rounded-full ${isPro ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-500'}`}>
                        <FaCrown size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tu Suscripción</p>
                        <p className={`text-lg font-bold leading-none ${isPro ? 'text-yellow-700' : 'text-gray-600'}`}>
                            {planName}
                        </p>
                    </div>
                </div>
            )}
            
            {/* Mensaje de bienvenida para Admins/Agentes en lugar del plan */}
            {!isClient && (
                <div className="hidden md:block text-right">
                    <p className="text-sm text-gray-500">Bienvenido al panel,</p>
                    <p className="text-lg font-bold text-gray-800">{user?.username}</p>
                </div>
            )}
        </div>
    );
};

export default InfoWidget;