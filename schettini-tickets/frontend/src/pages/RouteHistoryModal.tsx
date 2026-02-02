import React, { useEffect, useState } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { Depositario } from '../../src/types';

// Definimos la estructura de lo que guardamos en el JSON
interface StoredStop {
    companyName: string;
    arrivalTime: string;
    departureTime: string;
    items: Depositario[]; // Aquí está la info de los equipos
    serviceTime: number;
}

interface RouteRecord {
    id: number;
    created_at: string;
    username: string;
    total_distance_km: string;
    total_time_minutes: number;
    stops_json: string | StoredStop[]; // Puede venir como string o ya parseado
    status: string;
}

interface Props {
    onClose: () => void;
}

const RouteHistoryModal: React.FC<Props> = ({ onClose }) => {
    const [routes, setRoutes] = useState<RouteRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null); // Para ver el detalle

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/api/depositarios/route');
            setRoutes(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar el historial de rutas.");
        } finally {
            setLoading(false);
        }
    };

    // Helper para parsear el JSON de forma segura
    const getStops = (json: string | StoredStop[]): StoredStop[] => {
        if (Array.isArray(json)) return json;
        try {
            return JSON.parse(json);
        } catch (e) {
            return [];
        }
    };

    // Helper para determinar el objetivo (Mantenimiento o Falla)
    const getObjective = (dep: any) => {
        const tickets = dep.open_tickets_count || 0;
        return tickets > 0 ? 
            <span className="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded border border-red-200">FALLA (Reparación)</span> : 
            <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded border border-green-200">MANTENIMIENTO</span>;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden transition-all">
                
                {/* HEADER */}
                <div className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {selectedRoute && (
                            <button onClick={() => setSelectedRoute(null)} className="hover:bg-slate-700 p-1 rounded-full transition-colors mr-2">
                                ⬅ Volver
                            </button>
                        )}
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {selectedRoute ? `📍 Detalle de Ruta #${selectedRoute.id}` : '📂 Historial de Hojas de Ruta'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
                </div>

                {/* BODY */}
                <div className="flex-grow overflow-auto p-6 bg-gray-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800"></div>
                        </div>
                    ) : selectedRoute ? (
                        // --- VISTA DETALLE ---
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-6 text-sm text-gray-600">
                                <div><strong>Fecha:</strong> {new Date(selectedRoute.created_at).toLocaleDateString()} {new Date(selectedRoute.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                <div><strong>Generada por:</strong> {selectedRoute.username || 'Sistema'}</div>
                                <div><strong>Distancia:</strong> {selectedRoute.total_distance_km} km</div>
                                <div><strong>Tiempo Est.:</strong> {Math.floor(selectedRoute.total_time_minutes / 60)}h {selectedRoute.total_time_minutes % 60}m</div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-700 border-b pb-2">Itinerario de Visitas</h3>
                                {getStops(selectedRoute.stops_json).map((stop, idx) => (
                                    <div key={idx} className="bg-white border-l-4 border-blue-500 rounded shadow-sm p-4 relative">
                                        <div className="absolute -left-3 top-4 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow">{idx + 1}</div>
                                        
                                        <div className="flex justify-between items-start mb-2 pl-4">
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-800">{stop.companyName}</h4>
                                                <div className="text-sm text-gray-500">Llegada aprox: {stop.arrivalTime} - Salida: {stop.departureTime}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">{stop.items.length} Equipos</span>
                                            </div>
                                        </div>

                                        <div className="pl-4 mt-3 space-y-2">
                                            {stop.items.map((item: any, i) => (
                                                <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-700">{item.alias}</span>
                                                        <span className="text-xs text-gray-400">{item.serial_number || 'S/N'}</span>
                                                    </div>
                                                    <div>
                                                        {getObjective(item)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // --- VISTA LISTA (TABLA) ---
                        <>
                            {routes.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">No hay rutas guardadas todavía.</div>
                            ) : (
                                <table className="w-full text-sm text-left text-gray-500 shadow-md rounded-lg overflow-hidden">
                                    <thead className="text-xs text-white uppercase bg-slate-600">
                                        <tr>
                                            <th className="px-6 py-3">ID</th>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3">Generada Por</th>
                                            <th className="px-6 py-3">Distancia</th>
                                            <th className="px-6 py-3">Tiempo Total</th>
                                            <th className="px-6 py-3 text-center">Paradas</th>
                                            <th className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {routes.map((route) => (
                                            <tr key={route.id} className="bg-white border-b hover:bg-gray-100 transition-colors">
                                                <td className="px-6 py-4 font-bold text-blue-600">#{route.id}</td>
                                                <td className="px-6 py-4">
                                                    {new Date(route.created_at).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(route.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {route.username || 'Sistema'}
                                                </td>
                                                <td className="px-6 py-4">{route.total_distance_km} km</td>
                                                <td className="px-6 py-4">
                                                    {Math.floor(route.total_time_minutes / 60)}h {route.total_time_minutes % 60}m
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-400">
                                                        {getStops(route.stops_json).length} Destinos
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setSelectedRoute(route)} 
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow transition-transform active:scale-95 flex items-center gap-1 ml-auto"
                                                    >
                                                        👁️ Ver Detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div className="bg-gray-100 p-4 flex justify-end border-t">
                    <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded shadow transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RouteHistoryModal;