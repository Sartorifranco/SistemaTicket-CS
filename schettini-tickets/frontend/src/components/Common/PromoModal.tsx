import React, { useEffect, useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { FaGift, FaTimes, FaBullhorn, FaSpinner } from 'react-icons/fa'; // Agregué FaSpinner
import { Notification } from '../../types';
import api from '../../config/axiosConfig'; // Importar API
import { toast } from 'react-toastify';     // Importar Toast

const PromoModal: React.FC = () => {
    const { notifications, markNotificationAsRead } = useNotification();
    const [activePromo, setActivePromo] = useState<Notification | null>(null);
    const [loading, setLoading] = useState(false); // Estado para evitar doble click

    useEffect(() => {
        const promoNotification = notifications.find(
            n => !n.is_read && (n.type === 'promotion' || n.type === 'alert')
        );

        if (promoNotification) {
            setActivePromo(promoNotification);
        }
    }, [notifications]);

    // Función para Cerrar/Marcar como Leído
    const handleDismiss = async () => {
        if (activePromo) {
            await markNotificationAsRead(activePromo.id);
            setActivePromo(null);
        }
    };

    // Función Principal: Aprovechar Oferta
    const handleAction = async () => {
        if (!activePromo) return;

        const isPromo = activePromo.type === 'promotion';

        // Si es solo una alerta informativa, cerramos y listo
        if (!isPromo) {
            handleDismiss();
            return;
        }

        // Si es PROMOCIÓN, generamos el ticket
        setLoading(true);
        try {
            // Extraemos el título limpio para el ticket
            let titleClean = 'Oferta Especial';
            if (activePromo.message.includes('|||')) {
                titleClean = activePromo.message.split('|||')[0];
            }

            // Crear el Ticket Automático
            const formData = new FormData();
            formData.append('title', `Cliente interesado en: ${titleClean}`);
            formData.append('description', `El cliente ha hecho clic en "Aprovechar Oferta" desde el aviso emergente.\n\nContenido de la promo: ${activePromo.message.replace('|||', ' - ')}\n\nPor favor contactar para concretar.`);
            formData.append('priority', 'high'); // Prioridad Alta para ventas

            await api.post('/api/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            toast.success('¡Solicitud enviada! Un agente te contactará a la brevedad.');
            
            // Una vez creado el ticket, marcamos la notificación como leída y cerramos
            handleDismiss();

        } catch (error) {
            console.error(error);
            toast.error('Hubo un error al procesar la solicitud. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!activePromo) return null;

    const isPromo = activePromo.type === 'promotion';
    
    // Separar Título y Mensaje visualmente
    let displayTitle = isPromo ? '¡Tenemos una Oferta!' : 'Aviso Importante';
    let displayMessage = activePromo.message;

    if (activePromo.message.includes('|||')) {
        const parts = activePromo.message.split('|||');
        displayTitle = parts[0];
        displayMessage = parts[1];
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 relative">
                
                {/* Botón X para cerrar sin aceptar */}
                <button 
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-white/80 hover:text-white z-10 transition-colors bg-black/20 hover:bg-black/40 rounded-full p-1"
                    disabled={loading}
                >
                    <FaTimes size={16} />
                </button>

                {/* Cabecera */}
                <div className={`p-8 text-white text-center ${isPromo ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-orange-500 to-red-600'}`}>
                    <div className="flex justify-center mb-3">
                        <div className="bg-white/20 p-4 rounded-full backdrop-blur-md shadow-inner">
                            {isPromo ? <FaGift size={40} className="text-white animate-bounce" /> : <FaBullhorn size={40} className="text-white" />}
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold tracking-wide">{displayTitle}</h2>
                </div>
                
                {/* Cuerpo */}
                <div className="p-8 text-center">
                    <p className="text-gray-700 text-lg leading-relaxed mb-8 font-medium">
                        {displayMessage}
                    </p>
                    
                    <button 
                        onClick={handleAction}
                        disabled={loading}
                        className={`w-full text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg flex justify-center items-center gap-2 ${
                            isPromo ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-800 hover:bg-gray-900'
                        } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <><FaSpinner className="animate-spin" /> Procesando...</>
                        ) : (
                            isPromo ? '¡Aprovechar Oferta!' : 'Entendido'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromoModal;