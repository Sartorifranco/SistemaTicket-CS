import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { getImageUrl, getYouTubeId, getYouTubeEmbedUrl } from '../utils/imageUrl';
import {
    FaTrash, FaVideo, FaLink, FaFileAlt, FaPlus, FaCloudUploadAlt, FaImage, FaCog, FaEdit, FaChevronDown, FaChevronUp,
    FaFolderOpen, FaChevronRight, FaFolder, FaTimes, FaPlay, FaExternalLinkAlt, FaDownload
} from 'react-icons/fa';
import SectionCard from '../components/Common/SectionCard';
import DriversPage from './DriversPage';

interface Resource {
    id: number;
    title: string;
    type: 'video' | 'image' | 'download' | 'link' | 'article';
    category: string;
    content: string;
    section_id?: number | null;
    system_id?: number | null;
    section_name?: string;
    system_name?: string;
    image_url?: string | null;
    folder_id?: number | null;
    description?: string | null;
    folder_name?: string | null;
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

/** URL de miniatura: prioridad image_url (portada), luego content para tipo image */
function getResourceThumbnailUrl(res: Resource): string {
    if (res.image_url) return getImageUrl(res.image_url);
    if (res.type === 'image' && res.content) return getImageUrl(res.content);
    return '';
}

const AdminResourcesPage: React.FC = () => {
    const [viewMode, setViewMode] = useState<'resources' | 'drivers'>('resources');
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
    const [folders, setFolders] = useState<KbFolder[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Inicio' }]);
    const [loading, setLoading] = useState(true);

    const [sections, setSections] = useState<ResourceSection[]>([]);
    const [systems, setSystems] = useState<System[]>([]);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewResourceModal, setShowNewResourceModal] = useState(false);
    const [destinationFolderId, setDestinationFolderId] = useState<string>('');
    const [allFoldersList, setAllFoldersList] = useState<KbFolder[]>([]);
    const [moveTargetResource, setMoveTargetResource] = useState<Resource | null>(null);
    const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('');
    const [thumbnailEditResource, setThumbnailEditResource] = useState<Resource | null>(null);
    const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
    const [savingThumbnail, setSavingThumbnail] = useState(false);
    const [showSectionsManager, setShowSectionsManager] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
    const [editingSectionName, setEditingSectionName] = useState('');
    const [editingSectionDescription, setEditingSectionDescription] = useState('');
    const [previewResource, setPreviewResource] = useState<Resource | null>(null);

    const [title, setTitle] = useState('');
    const [type, setType] = useState<'video' | 'image' | 'download' | 'link' | 'article'>('video');
    const [category, setCategory] = useState('General');
    const [content, setContent] = useState('');
    const [sectionId, setSectionId] = useState<string>('');
    const [systemId, setSystemId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

    const fetchExplorer = useCallback(async (folderId: number | null) => {
        setLoading(true);
        try {
            const params = folderId != null ? { folder_id: folderId } : {};
            const res = await api.get('/api/resources/explorer', { params });
            const { folders: f, resources: r, breadcrumbs: b } = res.data.data || {};
            setFolders(f || []);
            setResources(r || []);
            setBreadcrumbs(b && b.length ? b : [{ id: null, name: 'Inicio' }]);
        } catch (e) {
            console.error(e);
            toast.error('Error al cargar el explorador');
            setFolders([]);
            setResources([]);
            setBreadcrumbs([{ id: null, name: 'Inicio' }]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExplorer(currentFolderId);
    }, [currentFolderId, fetchExplorer]);

    // Solo mostrar recursos de la carpeta actual (raíz = folder_id null/0)
    const resourcesInCurrentFolder = useMemo(() =>
        resources.filter(r =>
            (currentFolderId == null && (r.folder_id == null || r.folder_id === 0)) ||
            (currentFolderId != null && r.folder_id === currentFolderId)
        ),
        [resources, currentFolderId]
    );

    useEffect(() => {
        api.get('/api/resource-sections').then(res => setSections(res.data.data || [])).catch(() => {});
        api.get('/api/ticket-config/options').then(res => setSystems(res.data.data?.systems || [])).catch(() => {});
        api.get('/api/kb-folders/list').then(res => setAllFoldersList(res.data.data || [])).catch(() => setAllFoldersList([]));
    }, []);

    const openNewResourceModal = () => {
        setDestinationFolderId(currentFolderId != null ? String(currentFolderId) : '');
        setShowNewResourceModal(true);
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return toast.error('Escribe el nombre de la carpeta');
        try {
            await api.post('/api/kb-folders', { name: newFolderName.trim(), parent_id: currentFolderId });
            toast.success('Carpeta creada');
            setNewFolderName('');
            setShowNewFolderModal(false);
            fetchExplorer(currentFolderId);
        } catch (err) {
            console.error(err);
            toast.error('Error al crear carpeta');
        }
    };

    const handleDeleteFolder = async (id: number) => {
        if (!window.confirm('¿Eliminar esta carpeta? Las subcarpetas y recursos quedarán en la raíz.')) return;
        try {
            await api.delete(`/api/kb-folders/${id}`);
            toast.success('Carpeta eliminada');
            if (currentFolderId === id) setCurrentFolderId(null);
            fetchExplorer(currentFolderId === id ? null : currentFolderId);
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar');
        }
    };

    const handleSubmitResource = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('category', category);
        formData.append('section_id', sectionId || '');
        formData.append('system_id', systemId || '');
        const folderId = destinationFolderId === '' ? null : parseInt(destinationFolderId, 10);
        if (folderId !== null && !isNaN(folderId)) formData.append('folder_id', String(folderId));

        if (type === 'video' || type === 'image') {
            if (!file) return toast.error('Debes subir un archivo de video o imagen');
            formData.append('file', file);
        } else if (type === 'download' || type === 'article') {
            if (file) formData.append('file', file);
            else if (content) formData.append('content', content);
            else return toast.error('Sube un archivo o ingresa texto/URL');
        } else {
            if (!content) return toast.error('La URL es obligatoria para enlaces');
            formData.append('content', content);
        }
        if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

        try {
            await api.post('/api/resources', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Recurso agregado correctamente');
            setTitle('');
            setType('video');
            setContent('');
            setFile(null);
            setThumbnailFile(null);
            setSectionId('');
            setSystemId('');
            setShowNewResourceModal(false);
            fetchExplorer(currentFolderId);
        } catch (err) {
            console.error(err);
            toast.error('Error al agregar el recurso');
        }
    };

    const handleDeleteResource = async (id: number) => {
        if (!window.confirm('¿Estás seguro de que deseas borrar este recurso?')) return;
        try {
            await api.delete(`/api/resources/${id}`);
            toast.success('Recurso eliminado');
            fetchExplorer(currentFolderId);
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar');
        }
    };

    const handleMoveResource = async () => {
        if (!moveTargetResource) return;
        const folderId = moveTargetFolderId === '' ? null : parseInt(moveTargetFolderId, 10);
        const payload = folderId !== null && !isNaN(folderId) ? { folder_id: folderId } : { folder_id: null };
        try {
            await api.patch(`/api/resources/${moveTargetResource.id}/move`, payload);
            toast.success('Recurso movido');
            setMoveTargetResource(null);
            setMoveTargetFolderId('');
            fetchExplorer(currentFolderId);
        } catch (err) {
            console.error(err);
            toast.error('Error al mover');
        }
    };

    const handleUpdateResourceSection = async (resourceId: number, newSectionId: string, newSystemId: string) => {
        try {
            await api.put(`/api/resources/${resourceId}`, { section_id: newSectionId || null, system_id: newSystemId || null });
            toast.success('Sección actualizada');
            fetchExplorer(currentFolderId);
        } catch (err) {
            console.error(err);
            toast.error('Error al actualizar');
        }
    };

    /** Actualizar solo la portada (miniatura): PUT multipart para que el backend reciba el archivo */
    const handleSaveThumbnail = async () => {
        if (!thumbnailEditResource || !editThumbnailFile) {
            toast.warn('Seleccioná una imagen de portada.');
            return;
        }
        setSavingThumbnail(true);
        try {
            const fd = new FormData();
            fd.append('title', thumbnailEditResource.title);
            fd.append('type', thumbnailEditResource.type);
            fd.append('category', thumbnailEditResource.category || 'General');
            if (thumbnailEditResource.description != null && thumbnailEditResource.description !== '') {
                fd.append('description', thumbnailEditResource.description);
            }
            fd.append('section_id', thumbnailEditResource.section_id != null ? String(thumbnailEditResource.section_id) : '');
            fd.append('system_id', thumbnailEditResource.system_id != null ? String(thumbnailEditResource.system_id) : '');
            if (thumbnailEditResource.folder_id != null) {
                fd.append('folder_id', String(thumbnailEditResource.folder_id));
            }
            if (thumbnailEditResource.folder_name) {
                fd.append('folder_name', thumbnailEditResource.folder_name);
            }
            fd.append('thumbnail', editThumbnailFile);
            await api.put(`/api/resources/${thumbnailEditResource.id}`, fd);
            toast.success('Portada actualizada correctamente');
            setThumbnailEditResource(null);
            setEditThumbnailFile(null);
            fetchExplorer(currentFolderId);
        } catch (err) {
            console.error(err);
            toast.error('No se pudo actualizar la portada');
        } finally {
            setSavingThumbnail(false);
        }
    };

    const handleAddSection = async () => {
        if (!newSectionName.trim()) return toast.error('Escribe el nombre de la sección');
        try {
            await api.post('/api/resource-sections', { name: newSectionName.trim() });
            toast.success('Sección creada');
            setNewSectionName('');
            api.get('/api/resource-sections').then(res => setSections(res.data.data || []));
        } catch (err) {
            console.error(err);
            toast.error('Error al crear sección');
        }
    };

    const handleUpdateSection = async (id: number) => {
        if (!editingSectionName.trim()) return toast.error('El nombre no puede estar vacío');
        try {
            await api.put(`/api/resource-sections/${id}`, { name: editingSectionName.trim(), description: editingSectionDescription.trim() || null });
            toast.success('Sección actualizada');
            setEditingSectionId(null);
            setEditingSectionName('');
            setEditingSectionDescription('');
            api.get('/api/resource-sections').then(res => setSections(res.data.data || []));
        } catch (err) {
            console.error(err);
            toast.error('Error al actualizar');
        }
    };

    const handleDeleteSection = async (id: number) => {
        if (!window.confirm('¿Eliminar esta sección? Los recursos quedarán sin sección.')) return;
        try {
            await api.delete(`/api/resource-sections/${id}`);
            toast.success('Sección eliminada');
            api.get('/api/resource-sections').then(res => setSections(res.data.data || []));
            fetchExplorer(currentFolderId);
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar');
        }
    };

    const handleOpenResource = (res: Resource) => {
        if (res.type === 'video' || res.type === 'image') {
            setPreviewResource(res);
        } else {
            const url = getImageUrl(res.content) || res.content;
            window.open(url, '_blank');
        }
    };

    if (viewMode === 'drivers') {
        return (
            <div className="min-h-screen">
                <div className="container mx-auto px-4 py-4">
                    <button
                        onClick={() => setViewMode('resources')}
                        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                        <FaChevronRight className="rotate-180" /> Volver a Base de Conocimiento
                    </button>
                </div>
                <DriversPage />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-800">Base de Conocimientos</h1>
                <button
                    type="button"
                    onClick={() => setViewMode('drivers')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-indigo-200 text-indigo-700 font-medium hover:bg-indigo-50 transition"
                >
                    <FaFolderOpen /> Descargas / Drivers
                </button>
            </div>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4 flex-wrap">
                {breadcrumbs.map((b, i) => (
                    <span key={b.id ?? 'root'}>
                        {i > 0 && <span className="mx-1 text-gray-400">/</span>}
                        <button
                            type="button"
                            onClick={() => setCurrentFolderId(b.id)}
                            className={`hover:text-indigo-600 font-medium ${i === breadcrumbs.length - 1 ? 'text-gray-900' : ''}`}
                        >
                            {b.name}
                        </button>
                    </span>
                ))}
            </nav>

            {/* Toolbar: Nueva Carpeta, Nuevo Recurso */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                <button
                    type="button"
                    onClick={() => setShowNewFolderModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
                >
                    <FaFolder /> Nueva Carpeta
                </button>
                <button
                    type="button"
                    onClick={openNewResourceModal}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
                >
                    <FaPlus /> Nuevo Recurso
                </button>
                <button
                    type="button"
                    onClick={() => setShowSectionsManager(!showSectionsManager)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                    <FaCog /> Gestionar secciones
                    {showSectionsManager ? <FaChevronUp /> : <FaChevronDown />}
                </button>
            </div>

            {showSectionsManager && (
                <SectionCard title="Secciones (Tutoriales, Drivers, etc.)" className="mb-6">
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            placeholder="Nueva sección..."
                            className="flex-1 p-2 border rounded text-sm"
                            value={newSectionName}
                            onChange={e => setNewSectionName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSection())}
                        />
                        <button type="button" onClick={handleAddSection} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-indigo-700">
                            <FaPlus />
                        </button>
                    </div>
                    <ul className="space-y-1">
                        {sections.map(s => (
                            <li key={s.id} className="bg-gray-50 p-2 rounded text-sm flex items-center justify-between">
                                {editingSectionId === s.id ? (
                                    <>
                                        <input value={editingSectionName} onChange={e => setEditingSectionName(e.target.value)} className="flex-1 p-1 border rounded text-sm" />
                                        <textarea value={editingSectionDescription} onChange={e => setEditingSectionDescription(e.target.value)} placeholder="Descripción" className="flex-1 p-1 border rounded text-sm ml-2" rows={1} />
                                        <button type="button" onClick={() => handleUpdateSection(s.id)} className="text-green-600 font-bold ml-2">Guardar</button>
                                        <button type="button" onClick={() => { setEditingSectionId(null); setEditingSectionName(''); setEditingSectionDescription(''); }} className="text-gray-500 ml-1">Cancelar</button>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-medium">{s.name}</span>
                                        <div className="flex gap-1">
                                            <button type="button" onClick={() => { setEditingSectionId(s.id); setEditingSectionName(s.name); setEditingSectionDescription(s.description || ''); }} className="text-indigo-600"><FaEdit size={12} /></button>
                                            <button type="button" onClick={() => handleDeleteSection(s.id)} className="text-red-500"><FaTrash size={12} /></button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            )}

            {/* Grid: carpetas + recursos */}
            {loading ? (
                <p className="text-gray-500 py-8 text-center">Cargando...</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {folders.map(f => (
                        <div
                            key={f.id}
                            className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center justify-center min-h-[140px] hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
                            onClick={() => setCurrentFolderId(f.id)}
                        >
                            <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:bg-amber-200">
                                <FaFolder size={28} />
                            </div>
                            <span className="font-medium text-gray-800 text-center truncate w-full block">{f.name}</span>
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                                className="mt-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition text-sm"
                                title="Eliminar carpeta"
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                    ))}
                    {resourcesInCurrentFolder.map(res => {
                        const thumbUrl = getResourceThumbnailUrl(res);
                        return (
                            <div
                                key={res.id}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition flex flex-col"
                            >
                                <div className="aspect-video bg-gray-100 relative shrink-0">
                                    {thumbUrl ? (
                                        <img src={thumbUrl} alt={res.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${
                                            res.type === 'video' ? 'bg-red-100 text-red-600' :
                                            res.type === 'image' ? 'bg-purple-100 text-purple-600' :
                                            res.type === 'link' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            {res.type === 'video' ? <FaVideo size={32} /> : res.type === 'image' ? <FaImage size={32} /> : res.type === 'link' ? <FaLink size={32} /> : <FaFileAlt size={32} />}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 flex-1 min-w-0 flex flex-col">
                                    <h4 className="font-bold text-gray-800 text-sm truncate" title={res.title}>{res.title}</h4>
                                    <div className="flex items-center gap-1 mt-1 flex-wrap text-xs text-gray-500">
                                        {res.section_name && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{res.section_name}</span>}
                                        <span className="capitalize">{res.type}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); handleOpenResource(res); }}
                                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-1.5 rounded transition text-xs font-medium flex items-center gap-1"
                                            title="Abrir / previsualizar"
                                        >
                                            {res.type === 'video' ? <FaPlay size={12} /> : res.type === 'download' ? <FaDownload size={12} /> : <FaExternalLinkAlt size={12} />}
                                            Abrir
                                        </button>
                                        <button
                                            type="button"
                                            onClick={e => {
                                                e.stopPropagation();
                                                setThumbnailEditResource(res);
                                                setEditThumbnailFile(null);
                                            }}
                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 p-1.5 rounded transition text-xs font-medium flex items-center gap-1"
                                            title="Actualizar imagen de portada"
                                        >
                                            <FaImage size={12} /> Portada
                                        </button>
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); setMoveTargetResource(res); setMoveTargetFolderId(res.folder_id != null ? String(res.folder_id) : ''); }}
                                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-1.5 rounded transition text-xs font-medium flex items-center gap-1"
                                            title="Mover a otra carpeta"
                                        >
                                            <FaFolder size={12} /> Mover
                                        </button>
                                        <select
                                            value={res.section_id || ''}
                                            onChange={e => handleUpdateResourceSection(res.id, e.target.value, String(res.system_id || ''))}
                                            className="text-xs p-1 border rounded bg-white flex-1 min-w-0"
                                            title="Sección"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <option value="">Sin sección</option>
                                            {sections.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); handleDeleteResource(res.id); }}
                                            className="text-red-400 hover:text-red-600 p-1.5 rounded transition"
                                            title="Eliminar"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && folders.length === 0 && resourcesInCurrentFolder.length === 0 && (
                <p className="text-gray-500 text-center py-12">Esta carpeta está vacía. Creá una carpeta o agregá un recurso.</p>
            )}

            {/* Modal Nueva Carpeta */}
            {showNewFolderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewFolderModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Nueva carpeta</h3>
                            <button type="button" onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleCreateFolder}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                placeholder="Ej: Controladores Fiscales"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none mb-4"
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setShowNewFolderModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal actualizar portada / miniatura */}
            {thumbnailEditResource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { if (!savingThumbnail) { setThumbnailEditResource(null); setEditThumbnailFile(null); } }}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Actualizar imagen de portada</h3>
                            <button type="button" disabled={savingThumbnail} onClick={() => { setThumbnailEditResource(null); setEditThumbnailFile(null); }} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                                <FaTimes />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 truncate" title={thumbnailEditResource.title}>Recurso: <strong>{thumbnailEditResource.title}</strong></p>
                        {getResourceThumbnailUrl(thumbnailEditResource) ? (
                            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                                <img src={getResourceThumbnailUrl(thumbnailEditResource)} alt="Portada actual" className="w-full h-full object-cover max-h-40" />
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 mb-4">Sin portada actual. Subí una imagen para mostrarla en la Base de Conocimientos.</p>
                        )}
                        <label className="block text-sm font-medium text-gray-700 mb-2">Actualizar Imagen de Portada</label>
                        <input
                            type="file"
                            accept="image/*"
                            disabled={savingThumbnail}
                            onChange={e => setEditThumbnailFile(e.target.files?.[0] ?? null)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700"
                        />
                        {editThumbnailFile && <p className="text-xs text-gray-500 mt-2">Seleccionado: {editThumbnailFile.name}</p>}
                        <div className="flex gap-2 justify-end mt-6">
                            <button type="button" disabled={savingThumbnail} onClick={() => { setThumbnailEditResource(null); setEditThumbnailFile(null); }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="button" disabled={savingThumbnail} onClick={() => void handleSaveThumbnail()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">
                                {savingThumbnail ? 'Guardando...' : 'Guardar portada'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Mover a... */}
            {moveTargetResource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMoveTargetResource(null)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Mover recurso</h3>
                            <button type="button" onClick={() => setMoveTargetResource(null)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">“{moveTargetResource.title}” →</p>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Carpeta de destino</label>
                        <select
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white mb-4"
                            value={moveTargetFolderId}
                            onChange={e => setMoveTargetFolderId(e.target.value)}
                        >
                            <option value="">Inicio (raíz)</option>
                            {allFoldersList.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setMoveTargetResource(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
                            <button type="button" onClick={handleMoveResource} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">Mover</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Preview */}
            {previewResource && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewResource(null)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreviewResource(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 z-10">
                            <FaTimes size={28} />
                        </button>
                        {previewResource.type === 'video' ? (() => {
                            const ytId = getYouTubeId(previewResource.content);
                            return ytId ? (
                                <div className="relative w-full rounded-lg overflow-hidden shadow-2xl bg-black" style={{ paddingTop: '56.25%' }}>
                                    <iframe
                                        src={getYouTubeEmbedUrl(ytId)}
                                        className="absolute inset-0 w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={previewResource.title}
                                    />
                                </div>
                            ) : (
                                <video
                                    src={getImageUrl(previewResource.content) || previewResource.content}
                                    controls
                                    autoPlay
                                    className="w-full rounded-lg shadow-2xl bg-black"
                                />
                            );
                        })() : (
                            <img
                                src={getImageUrl(previewResource.content) || previewResource.content}
                                alt={previewResource.title}
                                className="w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                        )}
                        <p className="text-white text-center mt-2 font-medium">{previewResource.title}</p>
                    </div>
                </div>
            )}

            {/* Modal Nuevo Recurso */}
            {showNewResourceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowNewResourceModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full my-8 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Nuevo recurso</h3>
                            <button type="button" onClick={() => setShowNewResourceModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleSubmitResource} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Carpeta de Destino <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                                    value={destinationFolderId}
                                    onChange={e => setDestinationFolderId(e.target.value)}
                                >
                                    <option value="">Inicio (raíz)</option>
                                    {allFoldersList.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Seleccioná dónde guardar el recurso. Por defecto: carpeta actual.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Título</label>
                                <input type="text" placeholder="Ej: Manual de Usuario 2026" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Sección</label>
                                <select className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={sectionId} onChange={e => setSectionId(e.target.value)}>
                                    <option value="">Sin sección</option>
                                    {sections.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Sistema</label>
                                <select className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={systemId} onChange={e => setSystemId(e.target.value)}>
                                    <option value="">Sin sistema</option>
                                    {systems.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label>
                                <select className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={type} onChange={e => { setType(e.target.value as Resource['type']); setFile(null); setContent(''); }}>
                                    <option value="video">Video</option>
                                    <option value="image">Imagen</option>
                                    <option value="download">Archivo</option>
                                    <option value="link">Enlace</option>
                                    <option value="article">Artículo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
                                <input type="text" placeholder="Ej: Facturación" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={category} onChange={e => setCategory(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Contenido / Archivo</label>
                                {(type === 'video' || type === 'image' || type === 'download' || type === 'article') ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer relative hover:bg-gray-50">
                                        <input type="file" accept={type === 'video' ? 'video/mp4,video/webm' : type === 'image' ? 'image/*' : undefined} onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <FaCloudUploadAlt className="mx-auto text-gray-400 text-3xl mb-2" />
                                        <p className="text-sm text-gray-600">{file ? file.name : 'Clic para subir'}</p>
                                    </div>
                                ) : (
                                    <input type="text" placeholder="https://..." className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={content} onChange={e => setContent(e.target.value)} required />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Imagen de portada / miniatura (opcional)</label>
                                <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border border-gray-300 rounded-lg text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700" />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setShowNewResourceModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 flex items-center gap-2">
                                    <FaPlus /> Publicar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminResourcesPage;
