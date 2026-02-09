import React, { useEffect, useState } from 'react';
import api from '../../config/axiosConfig';

// Modal interno simple para ver lista
const ListModal: React.FC<{ title: string; items: any[]; onClose: () => void }> = ({ title, items, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-red-50">
                <h3 className="font-bold text-red-800">{title}</h3>
                <button onClick={onClose} className="text-gray-500 font-bold">✕</button>
            </div>
            <div className="p-4 overflow-y-auto">
                {items.length === 0 ? <p>Nada por aquí.</p> : (
                    <ul className="space-y-2">
                        {items.map((item: any, idx) => (
                            <li key={idx} className="border-b pb-2">
                                <p className="font-bold text-gray-800">{item.alias}</p>
                                <p className="text-xs text-gray-500">{item.company_name} - {item.last_maint ? new Date(item.last_maint).toLocaleDateString() : 'Nunca mantenido'}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    </div>
);

const DepositariosWidget: React.FC = () => {
    const [metrics, setMetrics] = useState({ 
        total: 0, // Ajustado para coincidir con tu backend (total, activos, alertas)
        activos: 0, 
        alertas: 0,
        criticalList: [] 
    });
    const [loading, setLoading] = useState(true);
    const [showCriticalModal, setShowCriticalModal] = useState(false);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                // ✅ URL CORREGIDA: Debe incluir '/dashboard'
                const res = await api.get('/api/dashboard/depositarios/metrics');
                if (res.data && res.data.data) {
                    setMetrics(res.data.data);
                }
            } catch (error) {
                console.error("Error cargando métricas", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    if (loading) return <div className="bg-white p-6 rounded-lg shadow-md animate-pulse h-48"></div>;

    return (
        <>
            {/* Tarjeta 1: Total Activos */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                <p className="text-xs text-gray-500 font-medium uppercase">Total Equipos</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{metrics.total || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Activos en sistema</p>
            </div>

            {/* Tarjeta 2: Activos/Mantenidos */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow">
                <p className="text-xs text-gray-500 font-medium uppercase">Activos</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{metrics.activos || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Funcionando correctamente</p>
            </div>

            {/* Tarjeta 3: Alertas (Clickeable) */}
            <div 
                className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => metrics.alertas > 0 && setShowCriticalModal(true)}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Alertas</p>
                        <p className="text-3xl font-bold text-red-600 mt-2">{metrics.alertas || 0}</p>
                    </div>
                    {metrics.alertas > 0 && <span className="text-red-400 text-xs">Ver lista →</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1">Requieren atención</p>
            </div>

            {showCriticalModal && (
                <ListModal 
                    title="Equipos en Alerta" 
                    items={metrics.criticalList || []} 
                    onClose={() => setShowCriticalModal(false)} 
                />
            )}
        </>
    );
};

export default DepositariosWidget;