import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaTrash, FaVideo, FaLink, FaFileAlt, FaPlus, FaCloudUploadAlt, FaInfoCircle } from 'react-icons/fa';

// Definimos una interfaz para el tipo de recurso
interface Resource {
    id: number;
    title: string;
    type: 'video' | 'download' | 'link' | 'article';
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

        if (type === 'download' || type === 'article') {
            // Si es descarga o articulo, priorizamos el archivo si existe
            if (file) {
                formData.append('file', file);
            } else if (content) {
                // Si no hay archivo pero hay contenido (texto)
                formData.append('content', content);
            } else {
                return toast.error('Sube un archivo o ingresa texto/URL');
            }
        } else {
            // Para videos y links, el contenido es obligatorio (la URL)
            if (!content) return toast.error('La URL es obligatoria para videos/links');
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
        if (res.type === 'download' && res.content.startsWith('/')) {
            // Si es un archivo local del servidor, le pegamos la URL base del backend
            return `${API_BASE_URL}${res.content}`;
        }
        return res.content;
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Base de Conocimientos</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Panel de Formulario */}
                <div className="bg-white p-6 rounded-lg shadow h-fit border border-gray-200">
                    <h2 className="text-lg font-bold mb-4 text-gray-700">Agregar Nuevo Recurso</h2>
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
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="video">Video Tutorial (YouTube/Vimeo)</option>
                                <option value="download">Archivo (PDF, Imágenes, Zip)</option>
                                <option value="link">Enlace Externo</option>
                                <option value="article">Artículo de Texto</option>
                            </select>
                        </div>

                        {type === 'video' && (
                            <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800 mb-2">
                                <div className="flex items-start gap-2">
                                    <FaInfoCircle className="mt-0.5 shrink-0"/>
                                    <div>
                                        <strong>Recomendación:</strong><br/>
                                        Sube los videos a YouTube como "No listado" y pega aquí el enlace.
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
                            {(type === 'download' || type === 'article') ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer relative hover:bg-gray-50 transition-colors">
                                    <input 
                                        type="file" 
                                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <FaCloudUploadAlt className="mx-auto text-gray-400 text-3xl mb-2"/>
                                    <p className="text-sm text-gray-600 font-medium">{file ? file.name : 'Haz clic para subir un archivo'}</p>
                                    <p className="text-xs text-gray-400 mt-1">Soporta PDF, ZIP, PNG, JPG</p>
                                </div>
                            ) : (
                                <input 
                                    type="text" 
                                    placeholder={type === 'video' ? "https://youtube.com/..." : "https://ejemplo.com"} 
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
                </div>

                {/* Lista de Recursos */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-gray-700 border-b pb-2">Recursos Publicados</h2>
                    {resources.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No hay recursos cargados aún.</p>
                    )}
                    
                    {resources.map(res => (
                        <div key={res.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`text-xl p-3 rounded-full shrink-0 ${
                                    res.type === 'video' ? 'bg-red-100 text-red-600' : 
                                    res.type === 'link' ? 'bg-green-100 text-green-600' :
                                    'bg-blue-100 text-blue-600'
                                }`}>
                                    {res.type === 'video' ? <FaVideo/> : 
                                     res.type === 'link' ? <FaLink/> : <FaFileAlt/>}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-800 truncate">{res.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded">{res.category}</span>
                                        <span className="capitalize">• {res.type}</span>
                                    </div>
                                    <a 
                                        href={getResourceLink(res)} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-xs text-indigo-500 hover:underline truncate block max-w-md"
                                    >
                                        {res.type === 'download' ? 'Descargar Archivo' : res.content}
                                    </a>
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
                </div>
            </div>
        </div>
    );
};

export default AdminResourcesPage;