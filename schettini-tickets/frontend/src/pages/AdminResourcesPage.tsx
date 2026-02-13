import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaTrash, FaVideo, FaLink, FaFileAlt, FaPlus, FaCloudUploadAlt, FaInfoCircle, FaImage } from 'react-icons/fa';
import SectionCard from '../components/Common/SectionCard';

// Definimos una interfaz para el tipo de recurso
interface Resource {
    id: number;
    title: string;
    type: 'video' | 'image' | 'download' | 'link' | 'article';
    category: string;
    content: string;
}

const AdminResourcesPage: React.FC = () => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [title, setTitle] = useState('');
    const [type, setType] = useState('video');
    const [category, setCategory] = useState('General');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Obtener la URL base desde la configuración de Axios para los enlaces de descarga
    const API_BASE_URL = api.defaults.baseURL || '';

    useEffect(() => {
        fetchResources();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('category', category);

        if (type === 'video' || type === 'image') {
            if (!file) return toast.error('Debes subir un archivo de video o imagen');
            formData.append('file', file);
        } else if (type === 'download' || type === 'article') {
            if (file) {
                formData.append('file', file);
            } else if (content) {
                formData.append('content', content);
            } else {
                return toast.error('Sube un archivo o ingresa texto/URL');
            }
        } else {
            if (!content) return toast.error('La URL es obligatoria para enlaces');
            formData.append('content', content);
        }

        try {
            await api.post('/api/resources', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Recurso agregado correctamente');
            
            // Resetear formulario
            setTitle('');
            setType('video');
            setContent('');
            setFile(null);
            
            // Recargar lista
            fetchResources();
        } catch (error) {
            console.error(error);
            toast.error('Error al agregar el recurso');
        }
    };

    const handleDelete = async (id: number) => {
        // ✅ CORRECCIÓN: Usamos window.confirm explícitamente para evitar error de ESLint
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

    // Función auxiliar para construir la URL correcta del recurso
    const getResourceLink = (res: Resource) => {
        if (res.content.startsWith('/')) {
            return `${API_BASE_URL}${res.content}`;
        }
        return res.content;
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
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
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