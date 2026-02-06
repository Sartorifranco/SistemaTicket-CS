import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import api from '../../config/axiosConfig';

const PromoPopup = () => {
    const [promo, setPromo] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkPopups = async () => {
            try {
                // Obtenemos promos
                const res = await api.get('/api/promotions');
                
                // Filtramos las que tengan is_popup = 1 (true)
                const popups = res.data.data.filter((p: any) => p.is_popup === 1 || p.is_popup === true);
                
                if (popups.length > 0) {
                    // Tomamos la más reciente (o random)
                    const selected = popups[0];
                    
                    // Verificamos si ya la vio en esta sesión para no ser molestos
                    const seen = sessionStorage.getItem(`seen_promo_${selected.id}`);
                    
                    if (!seen) {
                        setPromo(selected);
                        setIsVisible(true);
                        // Marcar como vista
                        sessionStorage.setItem(`seen_promo_${selected.id}`, 'true');
                    }
                }
            } catch (error) {
                console.error("Error cargando popups", error);
            }
        };

        checkPopups();
    }, []);

    if (!isVisible || !promo) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fade-in">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100 border-4 border-white">
                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute top-3 right-3 bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100 shadow-md z-10 transition"
                >
                    <FaTimes size={20} />
                </button>
                
                <div className="h-64 w-full bg-gray-100 relative">
                    <img 
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}${promo.image_url}`} 
                        alt={promo.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Esto ayuda a saber si falló la carga
                            e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Error+Imagen';
                        }}
                    />
                </div>
                
                <div className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{promo.title}</h2>
                    <p className="text-gray-600 mb-6">{promo.description}</p>
                    <button 
                        onClick={() => setIsVisible(false)} 
                        className="bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition w-full shadow-lg"
                    >
                        Entendido, cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromoPopup;