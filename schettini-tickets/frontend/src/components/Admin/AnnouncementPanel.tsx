import React, { useState } from 'react';
import api from '../../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaPaperPlane, FaBullhorn } from 'react-icons/fa';

const AdminAnnouncementsPage: React.FC = () => {
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        targetRole: 'client',
        type: 'promotion'
    });
    const [loading, setLoading] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.message.trim()) return toast.error('El mensaje es obligatorio');

        setLoading(true);
        try {
            await api.post('/api/notifications/announce', formData);
            toast.success('¡Notificación enviada con éxito!');
            setFormData({ title: '', message: '', targetRole: 'client', type: 'promotion' });
        } catch (error) {
            toast.error('Error al enviar el anuncio.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <FaBullhorn className="text-indigo-600" /> Centro de Novedades y Ofertas
            </h1>

            <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 max-w-3xl">
                <form onSubmit={handleSend} className="space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Destinatarios</label>
                            <select 
                                value={formData.targetRole} 
                                onChange={(e) => setFormData({...formData, targetRole: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="client">Solo Clientes</option>
                                <option value="agent">Solo Agentes</option>
                                <option value="all">Todos los Usuarios</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Aviso</label>
                            <select 
                                value={formData.type} 
                                onChange={(e) => setFormData({...formData, type: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="promotion">🎁 Oferta / Promo (Pop-up)</option>
                                <option value="alert">⚠️ Alerta Importante (Pop-up)</option>
                                <option value="info">ℹ️ Información (Solo Campanita)</option>
                            </select>
                        </div>
                    </div>

                    {(formData.type === 'promotion' || formData.type === 'alert') && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Título del Pop-up</label>
                            <input 
                                type="text" 
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ej: ¡Descuento Exclusivo!"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje</label>
                        <textarea 
                            value={formData.message}
                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-indigo-500 resize-none"
                            placeholder="Escribe aquí el contenido de la notificación..."
                        ></textarea>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-3 px-6 rounded-lg text-white font-bold text-lg transition-all flex justify-center items-center gap-2 ${
                            loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
                        }`}
                    >
                        <FaPaperPlane /> {loading ? 'Enviando...' : 'Enviar Anuncio'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminAnnouncementsPage;