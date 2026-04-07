import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { getImageUrl, getYouTubeId, getYouTubeEmbedUrl } from '../utils/imageUrl';
import { FaVideo, FaFileAlt, FaDownload, FaSearch, FaPlay, FaTimes, FaChevronRight, FaBook, FaCog, FaQuestionCircle, FaFolder } from 'react-icons/fa';
import DriversPage from './DriversPage';

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
    image_url?: string | null;
    folder_id?: number | null;
}

interface KbFolder {
    id: number;
    name: string;
    parent_id: number | null;
    sort_order: number;
}

interface BreadcrumbItem {
    id: number | null;
    name: string;
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
    const [viewMode, setViewMode] = useState<'resources' | 'drivers'>('resources');
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
    const [folders, setFolders] = useState<KbFolder[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Inicio' }]);
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<ResourceSection[]>([]);
    const [systems, setSystems] = useState<System[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
    const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
    const [filter, setFilter] = useState('');
    const [modalResource, setModalResource] = useState<Resource | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const params = currentFolderId != null ? { folder_id: currentFolderId } : {};
                const res = await api.get('/api/resources/explorer', { params });
                const d = res.data.data || {};
                setFolders(d.folders || []);
                setResources(d.resources || []);
                setBreadcrumbs(d.breadcrumbs && d.breadcrumbs.length ? d.breadcrumbs : [{ id: null, name: 'Inicio' }]);
            } catch {
                setFolders([]);
                setResources([]);
                setBreadcrumbs([{ id: null, name: 'Inicio' }]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentFolderId]);

    useEffect(() => {
        api.get('/api/resource-sections').then(res => setSections(res.data.data || []));
        api.get('/api/ticket-config/options').then(res => setSystems(res.data.data?.systems || []));
    }, []);

    const filtered = resources.filter(r => {
        const matchText = !filter || r.title.toLowerCase().includes(filter.toLowerCase()) ||
            (r.category && r.category.toLowerCase().includes(filter.toLowerCase())) ||
            (r.section_name && r.section_name.toLowerCase().includes(filter.toLowerCase()));
        const matchSection = !selectedSectionId || r.section_id === selectedSectionId;
        const matchSystem = !selectedSystemId || r.system_id === selectedSystemId;
        const matchFolder = currentFolderId == null
            ? (r.folder_id == null || r.folder_id === 0)
            : r.folder_id === currentFolderId;
        return matchText && matchSection && matchSystem && matchFolder;
    });

    const getResourceCountBySection = (sectionId: number) =>
        resources.filter(r => r.section_id === sectionId).length;

    const getResourceUrl = (content: string) => getImageUrl(content) || content;

    /** Miniatura: prioridad image_url (portada subida), luego content para tipo image. Solo fallback a ícono si no hay imagen. */
    const getThumbnailUrl = (res: Resource): string => {
        if (res.image_url) return getImageUrl(res.image_url);
        if (res.type === 'image' && res.content) return getImageUrl(res.content);
        return '';
    };

    const handleCardClick = (res: Resource) => {
        const isMedia = res.type === 'video' || res.type === 'image';
        const isDirectVideo = !isMedia && res.content && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(res.content);
        if (isMedia || isDirectVideo) {
            setModalResource({ ...res, type: isDirectVideo ? 'video' : res.type });
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

    if (viewMode === 'drivers') {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <button
                        onClick={() => setViewMode('resources')}
                        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                        <FaChevronRight className="rotate-180" /> Volver a Recursos
                    </button>
                </div>
                <DriversPage />
            </div>
        );
    }

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
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4 flex-wrap">
                    {breadcrumbs.map((b, i) => (
                        <span key={b.id ?? 'root'}>
                            {i > 0 && <span className="mx-1 text-gray-400">/</span>}
                            <button
                                type="button"
                                onClick={() => setCurrentFolderId(b.id)}
                                className={`hover:text-red-600 font-medium ${i === breadcrumbs.length - 1 ? 'text-gray-900' : ''}`}
                            >
                                {b.name}
                            </button>
                        </span>
                    ))}
                </nav>

                {/* Acceso rápido a Drivers */}
                {sections.some(s => (s.name || '').toLowerCase().includes('driver') || (s.name || '').toLowerCase().includes('descarga')) && (
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={() => setViewMode('drivers')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            <FaDownload /> Descargas / Drivers
                        </button>
                    </div>
                )}

                {/* Filtro por sistema (solo aplica a recursos en esta carpeta) */}
                {systems.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <select
                            value={selectedSystemId || ''}
                            onChange={e => setSelectedSystemId(e.target.value ? parseInt(e.target.value) : null)}
                            className="p-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-red-500 outline-none"
                        >
                            <option value="">Todos los sistemas</option>
                            {systems.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Grid: carpetas + recursos (siempre mostrar miniatura cuando exista; ícono solo como fallback) */}
                {loading ? (
                    <p className="text-gray-500 py-12 text-center">Cargando...</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {folders.map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setCurrentFolderId(f.id)}
                                className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center min-h-[160px] hover:border-red-300 hover:shadow-lg transition text-left"
                            >
                                <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                                    <FaFolder size={28} />
                                </div>
                                <span className="font-bold text-gray-800 text-center truncate w-full block">{f.name}</span>
                            </button>
                        ))}
                        {filtered.map(res => {
                            const thumbUrl = getThumbnailUrl(res);
                            const isVideo = res.type === 'video';
                            return (
                                <div
                                    key={res.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleCardClick(res)}
                                    onKeyDown={e => e.key === 'Enter' && handleCardClick(res)}
                                    className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg hover:border-red-300 transition overflow-hidden cursor-pointer group h-auto"
                                >
                                    <div className="aspect-video bg-gray-800 relative overflow-hidden shrink-0">
                                        {thumbUrl ? (
                                            <img src={thumbUrl} alt={res.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
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
                                        {isVideo && thumbUrl && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                                                <div className="bg-red-600 rounded-full p-4 text-white shadow-lg">
                                                    <FaPlay size={24} className="ml-1" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 min-h-0 flex flex-col">
                                        <h3 className="font-bold text-gray-800 group-hover:text-red-600 transition whitespace-normal break-words">{res.title}</h3>
                                        <p className="text-xs text-red-600 mt-1 font-medium">Ver {isVideo ? 'video' : res.type === 'download' ? 'descargar' : 'recurso'}</p>
                                        {res.system_name && (
                                            <p className="text-xs text-gray-500 mt-1 whitespace-normal break-words">{res.system_name}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && folders.length === 0 && filtered.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <FaBook className="mx-auto text-5xl text-gray-300 mb-4" />
                        <p className="font-medium">No hay recursos en esta carpeta</p>
                        <p className="text-sm mt-1">Navegá con los breadcrumbs o probá otra sección</p>
                    </div>
                )}
            </div>

            {/* Modal Video/Imagen */}
            {modalResource && (
                <div
                    className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-3 sm:p-6"
                    onClick={() => setModalResource(null)}
                >
                    <div
                        className="relative w-full max-w-3xl flex flex-col"
                        style={{ maxHeight: '90dvh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Botón X SIEMPRE dentro del contenedor, visible en móvil */}
                        <div className="flex items-center justify-between mb-2 px-1">
                            <p className="text-white font-semibold text-sm sm:text-base truncate pr-2">{modalResource.title}</p>
                            <button
                                onClick={() => setModalResource(null)}
                                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white transition"
                                aria-label="Cerrar"
                            >
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {modalResource.type === 'video' ? (() => {
                            const ytId = getYouTubeId(modalResource.content);
                            return ytId ? (
                                <div className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-black" style={{ paddingTop: '56.25%' }}>
                                    <iframe
                                        src={getYouTubeEmbedUrl(ytId)}
                                        className="absolute inset-0 w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={modalResource.title}
                                    />
                                </div>
                            ) : (
                                <video
                                    src={getResourceUrl(modalResource.content)}
                                    controls
                                    autoPlay
                                    playsInline
                                    className="w-full rounded-xl shadow-2xl bg-black"
                                    style={{ maxHeight: '78dvh', objectFit: 'contain' }}
                                />
                            );
                        })() : (
                            <img
                                src={getResourceUrl(modalResource.content)}
                                alt={modalResource.title}
                                className="w-full rounded-xl shadow-2xl object-contain"
                                style={{ maxHeight: '78dvh' }}
                            />
                        )}

                        <p className="text-gray-400 text-center text-xs mt-2">Tocá fuera del video para cerrar</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientResourcesPage;
