import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../config/axiosConfig';
import { FaVideo, FaFileAlt, FaDownload, FaLink, FaSearch, FaPlay, FaTimes } from 'react-icons/fa';

interface Resource {
    id: number;
    title: string;
    type: string;
    content: string;
    category: string;
}

const ClientResourcesPage: React.FC = () => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [filter, setFilter] = useState('');
    const [modalResource, setModalResource] = useState<Resource | null>(null);

    useEffect(() => {
        api.get('/api/resources').then(res => setResources(res.data.data));
    }, []);

    const filtered = resources.filter(r => r.title.toLowerCase().includes(filter.toLowerCase()));

    const getResourceUrl = (content: string) => content.startsWith('/') ? `${API_BASE_URL}${content}` : content;

    const getThumbnail = (res: Resource) => {
        const url = getResourceUrl(res.content);
        if (res.type === 'image') return url;
        if (res.type === 'video') return null;
        return null;
    };

    const handleCardClick = (res: Resource) => {
        if (res.type === 'video' || res.type === 'image') {
            setModalResource(res);
        } else {
            window.open(getResourceUrl(res.content), '_blank');
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Centro de Ayuda y Capacitación</h1>
                <p className="text-gray-500">Encuentra tutoriales, manuales y herramientas para sacar el máximo provecho.</p>
                
                <div className="max-w-md mx-auto mt-6 relative">
                    <FaSearch className="absolute left-4 top-3.5 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="¿Qué estás buscando?" 
                        className="w-full pl-10 p-3 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(res => {
                    const thumb = getThumbnail(res);
                    return (
                        <div 
                            key={res.id} 
                            onClick={() => handleCardClick(res)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition overflow-hidden cursor-pointer group"
                        >
                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                {thumb ? (
                                    <img src={thumb} alt={res.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                        {res.type === 'video' ? (
                                            <div className="bg-red-500/90 rounded-full p-6 text-white group-hover:scale-110 transition-transform">
                                                <FaPlay size={32} className="ml-1" />
                                            </div>
                                        ) : (
                                            <FaFileAlt className="text-gray-400 text-5xl" />
                                        )}
                                    </div>
                                )}
                                {res.type === 'video' && thumb && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                                        <div className="bg-red-500 rounded-full p-4 text-white">
                                            <FaPlay size={24} className="ml-1" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition">{res.title}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{res.category}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Video/Imagen */}
            {modalResource && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setModalResource(null)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setModalResource(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 z-10">
                            <FaTimes size={28} />
                        </button>
                        {modalResource.type === 'video' ? (
                            <video 
                                src={getResourceUrl(modalResource.content)} 
                                controls 
                                autoPlay 
                                className="w-full rounded-lg shadow-2xl bg-black"
                            />
                        ) : (
                            <img 
                                src={getResourceUrl(modalResource.content)} 
                                alt={modalResource.title} 
                                className="w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                        )}
                        <p className="text-white text-center mt-2 font-medium">{modalResource.title}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientResourcesPage;