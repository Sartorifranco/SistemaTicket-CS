import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { getImageUrl, getImageUrlFallback } from '../utils/imageUrl';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { TicketData } from '../types';
// 🗑️ InfoWidget ELIMINADO

interface ClientMetrics {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    plan: string;
}

interface Promotion {
    id: number;
    title: string;
    description: string;
    image_url: string;
    type: 'banner' | 'offer';
}

const DetailsModal: React.FC<{ title: string; items: Partial<TicketData>[]; onClose: () => void; loading: boolean }> = ({ title, items, onClose, loading }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[9999] p-4 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 font-bold text-xl">&times;</button>
                </div>
                <div className="overflow-y-auto py-2 flex-1">
                    {loading ? <p className="text-center text-gray-500 py-8">Cargando...</p> : items.length > 0 ? (
                        <ul className="space-y-3">
                            {items.map((ticket) => (
                                <li key={ticket.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:bg-gray-50 transition">
                                    <div>
                                        <span className="font-bold text-gray-800 block">Ticket #{ticket.id}</span>
                                        <span className="text-sm text-gray-500">{ticket.title}</span>
                                        <span className="text-xs px-2 py-0.5 rounded ml-2 bg-gray-100 text-gray-800">{ticket.status}</span>
                                    </div>
                                    <Link to={`/client/tickets/${ticket.id}`} className="px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium text-sm">Ver Detalle</Link>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center text-gray-400 text-lg py-8">No hay tickets.</p>}
                </div>
                <button onClick={onClose} className="mt-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded w-full">Cerrar</button>
            </div>
        </div>
    );
};

const ClientDashboard: React.FC = () => {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState<ClientMetrics>({ open: 0, inProgress: 0, resolved: 0, closed: 0, plan: 'Free' });
    const [loading, setLoading] = useState(true);
    const [banners, setBanners] = useState<Promotion[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; items: TicketData[] }>({ title: '', items: [] });
    const [modalLoading, setModalLoading] = useState(false);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/dashboard/client');
            if(response.data.data) setMetrics(response.data.data);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = await api.get('/api/promotions?type=banner');
                setBanners(res.data.data);
            } catch (e) { console.error(e); }
        };
        if (user?.role === 'client') { fetchMetrics(); fetchBanners(); }
    }, [user, fetchMetrics]);

    const handleCardClick = async (statusGroup: string) => {
        setIsModalOpen(true);
        setModalLoading(true);
        let title = 'Tickets';
        if(statusGroup === 'open') title = 'Tickets Abiertos';
        if(statusGroup === 'in-progress') title = 'En Progreso';
        if(statusGroup === 'resolved') title = 'Resueltos';
        if(statusGroup === 'closed') title = 'Cerrados';
        setModalContent({ title, items: [] });

        try {
            const response = await api.get(`/api/tickets?status=${statusGroup}`);
            setModalContent({ title, items: response.data.data || [] });
        } catch (error) { console.error(error); } 
        finally { setModalLoading(false); }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Cargando tu panel...</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                
                {/* ❌ InfoWidget ELIMINADO DE AQUÍ */}

                <div className="mb-8 border-b pb-4 mt-2">
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">Tu Dashboard</h1>
                    <p className="text-gray-500 text-lg">Bienvenido de nuevo, <span className="font-semibold text-gray-700">{user?.username}</span>.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <button onClick={() => handleCardClick('open')} className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 hover:shadow-lg transition-all text-center group">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Abiertos</p>
                        <p className="text-5xl font-extrabold text-blue-600 group-hover:scale-110 transition-transform">{metrics.open}</p>
                    </button>
                    <button onClick={() => handleCardClick('in-progress')} className="bg-white p-6 rounded-xl shadow-sm border border-yellow-100 hover:shadow-lg transition-all text-center group">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">En Progreso</p>
                        <p className="text-5xl font-extrabold text-yellow-500 group-hover:scale-110 transition-transform">{metrics.inProgress}</p>
                    </button>
                    <button onClick={() => handleCardClick('resolved')} className="bg-white p-6 rounded-xl shadow-sm border border-green-100 hover:shadow-lg transition-all text-center group">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Resueltos</p>
                        <p className="text-5xl font-extrabold text-green-600 group-hover:scale-110 transition-transform">{metrics.resolved}</p>
                    </button>
                    <button onClick={() => handleCardClick('closed')} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all text-center group">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cerrados</p>
                        <p className="text-5xl font-extrabold text-gray-600 group-hover:scale-110 transition-transform">{metrics.closed}</p>
                    </button>
                </div>

                <div className="text-center mb-16">
                    <Link to="/client/tickets" className="bg-gray-900 hover:bg-black text-white font-bold py-4 px-10 rounded-full shadow-xl transition hover:scale-105 inline-flex items-center gap-2">Ver Todos Mis Tickets</Link>
                </div>

                {banners.length > 0 && (
                    <div className="mt-8 border-t border-gray-200 pt-10">
                        <h3 className="text-xl font-bold text-gray-700 mb-6">✨ Novedades y Servicios</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {banners.map((banner) => (
                                <div key={banner.id} className="relative rounded-2xl overflow-hidden shadow-lg group h-56 cursor-pointer bg-gray-100">
                                    <img 
                                        src={getImageUrl(banner.image_url)} 
                                        alt={banner.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        onError={(e) => {
                                            const img = e.currentTarget;
                                            if (banner.image_url && !img.dataset.retried) {
                                                img.dataset.retried = '1';
                                                img.src = getImageUrlFallback(banner.image_url);
                                            }
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-8">
                                        <h4 className="text-white text-2xl font-bold">{banner.title}</h4>
                                        <p className="text-gray-300 text-sm line-clamp-2">{banner.description}</p>
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