import React, { useEffect, useState } from 'react';
import api from '../../config/axiosConfig';
import { toast } from 'react-toastify';

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
        totalDepositarios: 0, 
        maintainedThisMonth: 0, 
        criticalCount: 0,
        criticalList: [] 
    });
    const [showCriticalModal, setShowCriticalModal] = useState(false);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await api.get('/api/depositarios/metrics');
                if (res.data && res.data.data) {
                    setMetrics(res.data.data);
                }
            } catch (error) {
                console.error("Error cargando métricas", error);
            }
        };
        fetchMetrics();
    }, []);

    return (
        <>
            {/* Tarjeta 1: Total Activos */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <p className="text-xs text-gray-500 font-medium uppercase">Total Equipos</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{metrics.totalDepositarios}</p>
                <p className="text-xs text-gray-400 mt-1">Activos en sistema</p>
            </div>

            {/* Tarjeta 2: Mantenimientos Mes */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <p className="text-xs text-gray-500 font-medium uppercase">Mantenimientos (Mes)</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{metrics.maintainedThisMonth}</p>
                <p className="text-xs text-gray-400 mt-1">Trabajo realizado este mes</p>
            </div>

            {/* Tarjeta 3: Críticos (Clickeable) */}
            <div 
                className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => metrics.criticalCount > 0 && setShowCriticalModal(true)}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Pendientes (+30 días)</p>
                        <p className="text-3xl font-bold text-red-600 mt-2">{metrics.criticalCount}</p>
                    </div>
                    {metrics.criticalCount > 0 && <span className="text-red-400 text-xs">Ver lista →</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1">Requieren atención urgente</p>
            </div>

            {showCriticalModal && (
                <ListModal 
                    title="Equipos sin mantenimiento reciente" 
                    items={metrics.criticalList} 
                    onClose={() => setShowCriticalModal(false)} 
                />
            )}
        </>
    );
};

export default DepositariosWidget;