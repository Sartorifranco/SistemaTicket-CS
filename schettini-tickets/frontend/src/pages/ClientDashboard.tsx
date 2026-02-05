import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { TicketData } from '../types'; // Ajusta la ruta si es necesario
// ✅ IMPORTAR WIDGET GLOBAL
import InfoWidget from '../components/Common/InfoWidget'; // Ajusta ruta si es necesario

interface ClientMetrics {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
}

// Interfaz para los banners
interface Promotion {
    id: number;
    title: string;
    description: string;
    image_url: string;
    type: 'banner' | 'offer';
}

const DetailsModal: React.FC<{ title: string; items: Partial<TicketData>[]; onClose: () => void; loading: boolean }> = ({ title, items, onClose, loading }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <div className="max-h-96 overflow-y-auto border-t border-b py-2">
                    {loading ? (
                        <p className="text-center text-gray-500 py-4">Cargando...</p>
                    ) : items.length > 0 ? (
                        <ul className="space-y-2">
                            {items.map((ticket) => (
                                <li key={ticket.id} className="p-3 border-b flex justify-between items-center hover:bg-gray-50">
                                    <span className="font-medium text-gray-700">#{ticket.id} - {ticket.title}</span>
                                    <Link to={`/client/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-sm">Ver Detalle</Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No hay tickets para mostrar en esta categoría.</p>
                    )}
                </div>
                <button onClick={onClose} className="mt-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded w-full transition">Cerrar</button>
            </div>
        </div>
    );
};

const ClientDashboard: React.FC = () => {
    const { user } = useAuth();
    
    // Estados de Métricas
    const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados de Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; items: TicketData[] }>({ title: '', items: [] });
    const [modalLoading, setModalLoading] = useState(false);

    // ✅ Estado para Banners de Publicidad
    const [banners, setBanners] = useState<Promotion[]>([]);

    // Cargar Métricas
    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/dashboard/client');
            setMetrics(response.data.data);
        } catch (err) {
            setError('No se pudieron cargar las estadísticas.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar Banners (Solo banners, no ofertas)
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = await api.get('/api/promotions?type=banner');
                setBanners(res.data.data);
            } catch (e) {
                console.error("Error cargando banners", e);
            }
        };
        fetchBanners();
    }, []);

    useEffect(() => {
        if (user?.role === 'client') fetchMetrics();
    }, [user, fetchMetrics]);

    const handleCardClick = async (status: 'open' | 'in-progress' | 'resolved' | 'closed') => {
        setModalLoading(true);
        setIsModalOpen(true);
        const titleMap = { open: 'Tickets Abiertos', 'in-progress': 'En Progreso', resolved: 'Resueltos', closed: 'Cerrados' };
        try {
            const response = await api.get(`/api/tickets?status=${status}`);
            setModalContent({ title: titleMap[status], items: response.data.data || [] });
        } catch (error) {
            toast.error('Error al cargar tickets.');
            setIsModalOpen(false);
        } finally {
            setModalLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando dashboard...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                
                {/* ✅ WIDGET GLOBAL DE AVISOS */}
                <InfoWidget />

                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Tu Dashboard</h1>
                    <p className="text-md sm:text-lg text-gray-500">
                        Bienvenido, <span className="font-semibold text-gray-700">{user?.username}</span>. Aquí tienes el resumen de tu cuenta.
                    </p>
                </div>

                {metrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <button onClick={() => handleCardClick('open')} className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition-all transform hover:-translate-y-1 group">
                            <p className="text-3xl sm:text-4xl font-bold text-blue-600 group-hover:scale-110 transition-transform">{metrics.open}</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-2">Abiertos</p>
                        </button>
                        <button onClick={() => handleCardClick('in-progress')} className="bg-white p-6 rounded-xl shadow-sm border border-yellow-100 hover:shadow-md transition-all transform hover:-translate-y-1 group">
                            <p className="text-3xl sm:text-4xl font-bold text-yellow-500 group-hover:scale-110 transition-transform">{metrics.inProgress}</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-2">En Progreso</p>
                        </button>
                        <button onClick={() => handleCardClick('resolved')} className="bg-white p-6 rounded-xl shadow-sm border border-green-100 hover:shadow-md transition-all transform hover:-translate-y-1 group">
                            <p className="text-3xl sm:text-4xl font-bold text-green-600 group-hover:scale-110 transition-transform">{metrics.resolved}</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-2">Resueltos</p>
                        </button>
                        <button onClick={() => handleCardClick('closed')} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all transform hover:-translate-y-1 group">
                            <p className="text-3xl sm:text-4xl font-bold text-gray-600 group-hover:scale-110 transition-transform">{metrics.closed}</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-2">Cerrados</p>
                        </button>
                    </div>
                )}
                
                <div className="text-center mb-12">
                    <Link to="/client/tickets" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 inline-flex items-center gap-2">
                        <span>🎫</span> Ver Todos Mis Tickets
                    </Link>
                </div>

                {/* ✅ SECCIÓN DE PUBLICIDAD / BANNERS */}
                {banners.length > 0 && (
                    <div className="mt-12 border-t pt-8">
                        <h3 className="text-xl font-bold text-gray-700 mb-6 px-1 flex items-center gap-2">
                            ✨ Novedades y Servicios
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {banners.map((banner) => (
                                <div key={banner.id} className="relative rounded-2xl overflow-hidden shadow-lg group h-48 md:h-64 cursor-pointer">
                                    <img 
                                        // Usamos la URL base del env + la ruta de la imagen
                                        src={`${import.meta.env.VITE_API_URL}${banner.image_url}`} 
                                        alt={banner.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6">
                                        <h4 className="text-white text-xl font-bold mb-1">{banner.title}</h4>
                                        <p className="text-gray-200 text-sm line-clamp-2">{banner.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
            {isModalOpen && <DetailsModal title={modalContent.title} items={modalContent.items} onClose={() => setIsModalOpen(false)} loading={modalLoading} />}
        </>
    );
};

export default ClientDashboard;