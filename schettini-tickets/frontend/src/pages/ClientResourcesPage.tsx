import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { FaVideo, FaFileAlt, FaDownload, FaLink, FaSearch } from 'react-icons/fa';

const ClientResourcesPage: React.FC = () => {
    const [resources, setResources] = useState<any[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        api.get('/api/resources').then(res => setResources(res.data.data));
    }, []);

    const filtered = resources.filter(r => r.title.toLowerCase().includes(filter.toLowerCase()));

    const getIcon = (type: string) => {
        switch(type) {
            case 'video': return <FaVideo className="text-red-500 text-3xl"/>;
            case 'download': return <FaDownload className="text-green-500 text-3xl"/>;
            default: return <FaFileAlt className="text-blue-500 text-3xl"/>;
        }
    };

    // Función para corregir URLs relativas
    const getLink = (url: string) => url.startsWith('/') ? `http://localhost:5050${url}` : url;

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
                {filtered.map(res => (
                    <a 
                        key={res.id} 
                        href={getLink(res.content)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition flex flex-col items-center text-center group"
                    >
                        <div className="bg-gray-50 p-4 rounded-full mb-4 group-hover:bg-indigo-50 transition">
                            {getIcon(res.type)}
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg mb-2 group-hover:text-indigo-600 transition">{res.title}</h3>
                        <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">{res.category}</p>
                        <span className="text-xs text-indigo-500 mt-auto font-semibold">Ver Recurso &rarr;</span>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default ClientResourcesPage;