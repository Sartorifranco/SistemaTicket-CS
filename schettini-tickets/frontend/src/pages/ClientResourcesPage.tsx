import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../config/axiosConfig';
import { FaVideo, FaFileAlt, FaDownload, FaSearch, FaPlay, FaTimes, FaChevronRight, FaBook, FaCog, FaQuestionCircle } from 'react-icons/fa';

interface Resource {
    id: number;
    title: string;
    type: string;
    content: string;
    category: string;
    section_id?: number | null;
    system_id?: number | null;
    section_name?: string;
    system_name?: string;
}

interface ResourceSection {
    id: number;
    name: string;
    icon: string | null;
    sort_order: number;
    description?: string | null;
}

interface System {
    id: number;
    name: string;
}

const ClientResourcesPage: React.FC = () => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [sections, setSections] = useState<ResourceSection[]>([]);
    const [systems, setSystems] = useState<System[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
    const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
    const [filter, setFilter] = useState('');
    const [modalResource, setModalResource] = useState<Resource | null>(null);

    useEffect(() => {
        api.get('/api/resources').then(res => setResources(res.data.data || []));
        api.get('/api/resource-sections').then(res => setSections(res.data.data || []));
        api.get('/api/ticket-config/options').then(res => setSystems(res.data.data?.systems || []));
    }, []);

    const filtered = resources.filter(r => {
        const matchText = r.title.toLowerCase().includes(filter.toLowerCase()) ||
            (r.category && r.category.toLowerCase().includes(filter.toLowerCase())) ||
            (r.section_name && r.section_name.toLowerCase().includes(filter.toLowerCase()));
        const matchSection = !selectedSectionId || r.section_id === selectedSectionId;
        const matchSystem = !selectedSystemId || r.system_id === selectedSystemId;
        return matchText && matchSection && matchSystem;
    });

    const getResourceCountBySection = (sectionId: number) => 
        resources.filter(r => r.section_id === sectionId).length;

    const getResourceUrl = (content: string) => {
        if (!content) return content;
        if (content.startsWith('http')) return content;
        if (content.startsWith('/uploads')) return `${API_BASE_URL}/api${content}`;
        if (content.startsWith('/')) return `${API_BASE_URL}/api${content}`;
        return `${API_BASE_URL}${content}`;
    };

    const getThumbnail = (res: Resource) => {
        const url = getResourceUrl(res.content);
        if (res.type === 'image') return url;
        return null;
    };

    const handleCardClick = (res: Resource) => {
        if (res.type === 'video' || res.type === 'image') {
            setModalResource(res);
        } else {
            window.open(getResourceUrl(res.content), '_blank');
        }
    };

    const getSectionIcon = (section: ResourceSection) => {
        const name = (section.icon || section.name || '').toLowerCase();
        if (name.includes('driver') || name.includes('download')) return <FaDownload size={24} className="text-gray-600" />;
        if (name.includes('programa') || name.includes('soporte')) return <FaCog size={24} className="text-gray-600" />;
        if (name.includes('pregunta') || name.includes('frecuente')) return <FaQuestionCircle size={24} className="text-gray-600" />;
        return <FaVideo size={24} className="text-red-600" />;
    };

    const getSectionDescription = (section: ResourceSection) => {
        if (section.description) return section.description;
        const name = (section.name || '').toLowerCase();
        if (name.includes('driver')) return 'Descargá los controladores necesarios para tu equipo.';
        if (name.includes('programa') || name.includes('soporte')) return 'Herramientas de acceso remoto y programas de asistencia técnica.';
        return 'Videos y guías paso a paso para aprender a usar los sistemas.';
    };

    return (
        <div className="min-h-screen">
            {/* Banner con título y búsqueda (estilo SectionCard: gray-900) */}
            <div className="bg-gray-900 text-white px-4 py-8 md:py-10">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-2xl md:text-3xl font-bold mb-6">
                        Aprende a utilizar los sistemas con nuestros tutoriales
                    </h1>
                    <div className="relative max-w-xl mx-auto">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscar artículos..." 
                            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 -mt-2">
                {/* Filtro por sistema */}
                {systems.length > 0 && (
                    <div className="flex justify-end mb-6">
                        <select
                            value={selectedSystemId || ''}
                            onChange={e => setSelectedSystemId(e.target.value ? parseInt(e.target.value) : null)}
                            className="p-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        >
                            <option value="">Todos los sistemas</option>
                            {systems.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Grid de tarjetas de secciones (estilo SectionCard) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections.map(s => {
                        const count = getResourceCountBySection(s.id);
                        const isSelected = selectedSectionId === s.id;
                        return (
                            <button
                                key={s.id}
                                onClick={() => setSelectedSectionId(isSelected ? null : s.id)}
                                className={`bg-white rounded-lg shadow-md border p-6 text-left hover:shadow-lg transition-all ${
                                    isSelected ? 'border-red-600 ring-2 ring-red-100' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                        {getSectionIcon(s)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-800 text-lg mb-2">{s.name}</h3>
                                        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                                            {getSectionDescription(s)}
                                        </p>
                                        <p className="text-xs text-gray-500 font-medium">
                                            {count} {count === 1 ? 'recurso' : 'recursos'}
                                        </p>
                                    </div>
                                    <FaChevronRight className={`shrink-0 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Lista de recursos */}
                {(selectedSectionId !== null || filtered.length > 0) && (
                    <div className="mt-10">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            {selectedSectionId 
                                ? `Recursos en "${sections.find(s => s.id === selectedSectionId)?.name || ''}"`
                                : 'Todos los recursos'
                            }
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map(res => {
                                const thumb = getThumbnail(res);
                                const isVideo = res.type === 'video';
                                return (
                                    <div 
                                        key={res.id} 
                                        onClick={() => handleCardClick(res)}
                                        className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-red-300 transition overflow-hidden cursor-pointer group"
                                    >
                                        <div className="aspect-video bg-gray-800 relative overflow-hidden">
                                            {thumb ? (
                                                <img src={thumb} alt={res.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {isVideo ? (
                                                        <div className="bg-red-600 rounded-full p-6 text-white group-hover:scale-110 transition-transform shadow-lg">
                                                            <FaPlay size={28} className="ml-1" />
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-700 rounded-full p-6 text-white">
                                                            {res.type === 'download' ? <FaDownload size={28} /> : <FaFileAlt size={28} />}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {isVideo && thumb && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                                                    <div className="bg-red-600 rounded-full p-4 text-white shadow-lg">
                                                        <FaPlay size={24} className="ml-1" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-gray-800 group-hover:text-red-600 transition line-clamp-2">{res.title}</h3>
                                            <p className="text-xs text-red-600 mt-1 font-medium">Ver {isVideo ? 'video' : res.type === 'download' ? 'descargar' : 'recurso'}</p>
                                            {res.system_name && (
                                                <p className="text-xs text-gray-500 mt-1">{res.system_name}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {filtered.length === 0 && (selectedSectionId !== null || filter) && (
                    <div className="text-center py-16 text-gray-500 mt-10">
                        <FaBook className="mx-auto text-5xl text-gray-300 mb-4" />
                        <p className="font-medium">No se encontraron recursos</p>
                        <p className="text-sm mt-1">Probá cambiar los filtros o la búsqueda</p>
                    </div>
                )}

                {sections.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <FaBook className="mx-auto text-5xl text-gray-300 mb-4" />
                        <p className="font-medium">No hay secciones configuradas</p>
                        <p className="text-sm mt-1">El administrador puede agregar secciones desde la Base de Conocimiento</p>
                    </div>
                )}
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
