import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaTrash, FaVideo, FaLink, FaFileAlt, FaPlus, FaCloudUploadAlt, FaInfoCircle, FaImage, FaCog, FaEdit, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import SectionCard from '../components/Common/SectionCard';

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

const AdminResourcesPage: React.FC = () => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [sections, setSections] = useState<ResourceSection[]>([]);
    const [systems, setSystems] = useState<System[]>([]);
    const [title, setTitle] = useState('');
    const [type, setType] = useState('video');
    const [category, setCategory] = useState('General');
    const [content, setContent] = useState('');
    const [sectionId, setSectionId] = useState<string>('');
    const [systemId, setSystemId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [showSectionsManager, setShowSectionsManager] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
    const [editingSectionName, setEditingSectionName] = useState('');
    const [editingSectionDescription, setEditingSectionDescription] = useState('');

    useEffect(() => {
        fetchResources();
        fetchSections();
        fetchSystems();
    }, []);

    const fetchResources = async () => {
        try {
            const res = await api.get('/api/resources');
            setResources(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar recursos');
        }
    };

    const fetchSections = async () => {
        try {
            const res = await api.get('/api/resource-sections');
            setSections(res.data.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSystems = async () => {
        try {
            const res = await api.get('/api/ticket-config/options');
            setSystems(res.data.data?.systems || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('category', category);
        formData.append('section_id', sectionId || '');
        formData.append('system_id', systemId || '');

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

        try {
            await api.post('/api/resources', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Recurso agregado correctamente');
            setTitle('');
            setType('video');
            setContent('');
            setFile(null);
            setSectionId('');
            setSystemId('');
            fetchResources();
        } catch (error) {
            console.error(error);
            toast.error('Error al agregar el recurso');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de que deseas borrar este recurso?')) return;
        try {
            await api.delete(`/api/resources/${id}`);
            toast.success('Recurso eliminado');
            fetchResources();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar');
        }
    };

    const handleAddSection = async () => {
        if (!newSectionName.trim()) return toast.error('Escribe el nombre de la sección');
        try {
            await api.post('/api/resource-sections', { name: newSectionName.trim() });
            toast.success('Sección creada');
            setNewSectionName('');
            fetchSections();
        } catch (error) {
            console.error(error);
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
            fetchSections();
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar');
        }
    };

    const handleDeleteSection = async (id: number) => {
        if (!window.confirm('¿Eliminar esta sección? Los recursos quedarán sin sección.')) return;
        try {
            await api.delete(`/api/resource-sections/${id}`);
            toast.success('Sección eliminada');
            fetchSections();
            fetchResources();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar');
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Base de Conocimientos</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Panel de Formulario */}
                <SectionCard title="Agregar Nuevo Recurso" className="h-fit">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Título</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Manual de Usuario 2026" 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Sección (visible para el cliente)</label>
                            <select 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={sectionId} 
                                onChange={e => setSectionId(e.target.value)}
                            >
                                <option value="">Sin sección</option>
                                {sections.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Sistema (para filtrar)</label>
                            <select 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={systemId} 
                                onChange={e => setSystemId(e.target.value)}
                            >
                                <option value="">Sin sistema</option>
                                {systems.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Recurso</label>
                            <select 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={type} 
                                onChange={e => { setType(e.target.value); setFile(null); setContent(''); }}
                            >
                                <option value="video">Video (subir archivo MP4/WebM)</option>
                                <option value="image">Imagen (subir archivo PNG/JPG)</option>
                                <option value="download">Archivo (PDF, Zip)</option>
                                <option value="link">Enlace Externo</option>
                                <option value="article">Artículo de Texto</option>
                            </select>
                        </div>

                        {(type === 'video' || type === 'image') && (
                            <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800 mb-2">
                                <div className="flex items-start gap-2">
                                    <FaInfoCircle className="mt-0.5 shrink-0"/>
                                    <div>
                                        <strong>Subida directa:</strong><br/>
                                        {type === 'video' ? 'Sube el archivo de video (MP4, WebM). Máx. 100MB.' : 'Sube la imagen (PNG, JPG, WebP).'}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Facturación, Soporte, General" 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={category} 
                                onChange={e => setCategory(e.target.value)} 
                            />
                        </div>

                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Contenido / Archivo</label>
                            {(type === 'video' || type === 'image' || type === 'download' || type === 'article') ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer relative hover:bg-gray-50 transition-colors">
                                    <input 
                                        type="file" 
                                        accept={type === 'video' ? 'video/mp4,video/webm' : type === 'image' ? 'image/png,image/jpeg,image/webp' : undefined}
                                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <FaCloudUploadAlt className="mx-auto text-gray-400 text-3xl mb-2"/>
                                    <p className="text-sm text-gray-600 font-medium">{file ? file.name : 'Haz clic para subir un archivo'}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {type === 'video' ? 'MP4, WebM (máx. 100MB)' : type === 'image' ? 'PNG, JPG, WebP' : 'PDF, ZIP, PNG, JPG'}
                                    </p>
                                </div>
                            ) : (
                                <input 
                                    type="text" 
                                    placeholder="https://ejemplo.com" 
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    value={content} 
                                    onChange={e => setContent(e.target.value)} 
                                    required 
                                />
                            )}
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2"
                        >
                            <FaPlus/> Publicar Recurso
                        </button>
                    </form>

                    {/* Gestión de secciones */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <button 
                            type="button"
                            onClick={() => setShowSectionsManager(!showSectionsManager)}
                            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-indigo-600 transition w-full"
                        >
                            <FaCog size={14}/> Gestionar secciones (Tutoriales, Drivers, etc.)
                            {showSectionsManager ? <FaChevronUp/> : <FaChevronDown/>}
                        </button>
                        {showSectionsManager && (
                            <div className="mt-2 space-y-2">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Nueva sección..." 
                                        className="flex-1 p-2 border rounded text-sm" 
                                        value={newSectionName} 
                                        onChange={e => setNewSectionName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSection())}
                                    />
                                    <button type="button" onClick={handleAddSection} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-indigo-700">
                                        <FaPlus/>
                                    </button>
                                </div>
                                <ul className="space-y-1">
                                    {sections.map(s => (
                                        <li key={s.id} className="bg-gray-50 p-2 rounded text-sm">
                                            {editingSectionId === s.id ? (
                                                <div className="space-y-2">
                                                    <input 
                                                        type="text" 
                                                        value={editingSectionName} 
                                                        onChange={e => setEditingSectionName(e.target.value)}
                                                        placeholder="Nombre"
                                                        className="w-full p-1 border rounded text-sm"
                                                        autoFocus
                                                    />
                                                    <textarea 
                                                        value={editingSectionDescription} 
                                                        onChange={e => setEditingSectionDescription(e.target.value)}
                                                        placeholder="Descripción (visible en la tarjeta)"
                                                        className="w-full p-1 border rounded text-sm resize-none"
                                                        rows={2}
                                                    />
                                                    <div className="flex gap-1">
                                                        <button type="button" onClick={() => handleUpdateSection(s.id)} className="text-green-600 hover:text-green-700 font-bold">Guardar</button>
                                                        <button type="button" onClick={() => { setEditingSectionId(null); setEditingSectionName(''); setEditingSectionDescription(''); }} className="text-gray-500">Cancelar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-medium">{s.name}</span>
                                                        {s.description && <p className="text-xs text-gray-500 truncate max-w-[180px]">{s.description}</p>}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button type="button" onClick={() => { setEditingSectionId(s.id); setEditingSectionName(s.name); setEditingSectionDescription(s.description || ''); }} className="text-indigo-600 hover:text-indigo-700"><FaEdit size={12}/></button>
                                                        <button type="button" onClick={() => handleDeleteSection(s.id)} className="text-red-500 hover:text-red-600"><FaTrash size={12}/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* Lista de Recursos */}
                <div className="lg:col-span-2 space-y-4">
                    <SectionCard title="Recursos Publicados">
                    {resources.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No hay recursos cargados aún.</p>
                    )}
                    
                    {resources.map(res => (
                        <div key={res.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`text-xl p-3 rounded-full shrink-0 ${
                                    res.type === 'video' ? 'bg-red-100 text-red-600' : 
                                    res.type === 'image' ? 'bg-purple-100 text-purple-600' :
                                    res.type === 'link' ? 'bg-green-100 text-green-600' :
                                    'bg-blue-100 text-blue-600'
                                }`}>
                                    {res.type === 'video' ? <FaVideo/> : 
                                     res.type === 'image' ? <FaImage/> :
                                     res.type === 'link' ? <FaLink/> : <FaFileAlt/>}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-800 truncate">{res.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 flex-wrap">
                                        {res.section_name && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{res.section_name}</span>}
                                        {res.system_name && <span className="bg-gray-100 px-2 py-0.5 rounded">{res.system_name}</span>}
                                        <span className="bg-gray-100 px-2 py-0.5 rounded">{res.category}</span>
                                        <span className="capitalize">• {res.type}</span>
                                    </div>
                                    <span className="text-xs text-indigo-500 truncate block max-w-md">
                                        {res.type === 'video' || res.type === 'image' ? 'Archivo subido' : res.type === 'download' ? 'Descargar Archivo' : res.content}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDelete(res.id)} 
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                                title="Eliminar Recurso"
                            >
                                <FaTrash/>
                            </button>
                        </div>
                    ))}
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default AdminResourcesPage;
