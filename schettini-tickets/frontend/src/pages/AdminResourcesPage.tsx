import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { FaTrash, FaVideo, FaLink, FaFileAlt, FaPlus, FaCloudUploadAlt, FaInfoCircle } from 'react-icons/fa';

const AdminResourcesPage: React.FC = () => {
    const [resources, setResources] = useState<any[]>([]);
    const [title, setTitle] = useState('');
    const [type, setType] = useState('video');
    const [category, setCategory] = useState('General');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => { fetchResources(); }, []);

    const fetchResources = async () => {
        try {
            const res = await api.get('/api/resources');
            setResources(res.data.data);
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('category', category);

        if (type === 'download' || type === 'article') {
            if (file) formData.append('file', file);
            else if (content) formData.append('content', content);
            else return toast.error('Sube un archivo o ingresa texto/URL');
        } else {
            if (!content) return toast.error('La URL es obligatoria para videos/links');
            formData.append('content', content);
        }

        try {
            await api.post('/api/resources', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Recurso agregado');
            setTitle(''); setType('video'); setContent(''); setFile(null);
            fetchResources();
        } catch (error) { toast.error('Error al agregar'); }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('¿Borrar?')) return;
        try { await api.delete(`/api/resources/${id}`); fetchResources(); } catch (error) {}
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Base de Conocimientos</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-lg shadow h-fit border border-gray-200">
                    <h2 className="text-lg font-bold mb-4 text-gray-700">Agregar Nuevo Recurso</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" placeholder="Título" className="w-full p-2 border rounded" value={title} onChange={e => setTitle(e.target.value)} required />
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Recurso</label>
                            <select className="w-full p-2 border rounded" value={type} onChange={e => setType(e.target.value)}>
                                <option value="video">Video Tutorial (YouTube/Vimeo)</option>
                                <option value="download">Archivo (PDF, Imágenes, Zip)</option>
                                <option value="link">Enlace Externo</option>
                                <option value="article">Artículo de Texto</option>
                            </select>
                        </div>

                        {type === 'video' && (
                            <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800 mb-2">
                                <p className="flex items-start gap-2">
                                    <FaInfoCircle className="mt-0.5 shrink-0"/>
                                    <span>
                                        <strong>¿Por qué usar enlaces para videos?</strong><br/>
                                        Para garantizar que el sistema funcione rápido y sin cortes, recomendamos subir los videos a YouTube (como "No listado") o Vimeo y pegar aquí el enlace. Esto ahorra espacio en tu servidor y mejora la experiencia del cliente.
                                    </span>
                                </p>
                            </div>
                        )}

                        <input type="text" placeholder="Categoría (ej: Facturación)" className="w-full p-2 border rounded" value={category} onChange={e => setCategory(e.target.value)} />

                        {(type === 'download' || type === 'article') ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer relative hover:bg-gray-50">
                                <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                <FaCloudUploadAlt className="mx-auto text-gray-400 text-2xl"/>
                                <p className="text-xs text-gray-500 mt-1">{file ? file.name : 'Click para subir archivo'}</p>
                            </div>
                        ) : (
                            <input type="text" placeholder="Pegar URL aquí..." className="w-full p-2 border rounded" value={content} onChange={e => setContent(e.target.value)} required />
                        )}

                        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 flex justify-center items-center gap-2"><FaPlus/> Publicar</button>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-3">
                    {resources.map(res => (
                        <div key={res.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`text-xl p-3 rounded-full ${res.type === 'video' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {res.type === 'video' ? <FaVideo/> : <FaFileAlt/>}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-800">{res.title}</h4>
                                    <p className="text-xs text-gray-500">{res.category}</p>
                                    <a href={res.content.startsWith('/') ? `http://localhost:5050${res.content}` : res.content} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline truncate block">{res.content}</a>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(res.id)} className="text-red-400 hover:text-red-600 p-2"><FaTrash/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminResourcesPage;