import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaPercentage } from 'react-icons/fa';

const OffersPage = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                // Solo traemos las de tipo 'offer'
                const res = await api.get('/api/promotions?type=offer');
                setOffers(res.data.data);
            } catch (error) { console.error(error); } 
            finally { setLoading(false); }
        };
        fetchOffers();
    }, []);

    // Función "Me Interesa"
    const handleInterest = async (promoId: number) => {
        try {
            await api.post(`/api/promotions/${promoId}/interest`);
            toast.success('¡Genial! Hemos notificado a un asesor. Te contactaremos pronto.');
        } catch (error: any) {
            toast.info(error.response?.data?.message || 'Ya registraste interés en esto.');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando beneficios...</div>;

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-red-100 text-red-600 rounded-full"><FaPercentage size={24}/></div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Ofertas y Beneficios</h1>
                    <p className="text-gray-500">Descuentos exclusivos para clientes Schettini.</p>
                </div>
            </div>

            {offers.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-400">No hay ofertas vigentes en este momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offers.map((offer: any) => (
                        <div key={offer.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100 flex flex-col">
                            <div className="h-48 overflow-hidden bg-gray-100 relative">
                                <img 
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}${offer.image_url}`} 
                                    alt={offer.title} 
                                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" 
                                />
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                    PROMO
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{offer.title}</h3>
                                <p className="text-gray-600 text-sm flex-1">{offer.description}</p>
                                
                                {/* Botón conectado */}
                                <button 
                                    onClick={() => handleInterest(offer.id)}
                                    className="mt-4 w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
                                >
                                    Me interesa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OffersPage;