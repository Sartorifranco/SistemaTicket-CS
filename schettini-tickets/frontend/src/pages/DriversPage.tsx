import React, { useState, useEffect, useMemo } from 'react';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
    FaDownload,
    FaFolderOpen,
    FaFolder,
    FaPlus,
    FaTrash,
    FaEdit,
    FaTimes,
    FaChevronDown,
    FaChevronRight,
} from 'react-icons/fa';
import SectionCard from '../components/Common/SectionCard';

interface DriverResource {
    id: number;
    title: string;
    type: string;
    content: string;
    category?: string;
    section_id?: number | null;
    section_name?: string;
    folder_name?: string;
    image_url?: string | null;
}

interface ResourceSection {
    id: number;
    name: string;
    sort_order: number;
}

const DriversPage: React.FC = () => {
    const { user } = useAuth();
    const canEdit = !!user && ['admin', 'agent', 'supervisor'].includes(user.role);

    const [sections, setSections] = useState<ResourceSection[]>([]);
    const [drivers, setDrivers] = useState<DriverResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const [formFolder, setFormFolder] = useState('General');
    const [formTitle, setFormTitle] = useState('');
    const [formFile, setFormFile] = useState<File | null>(null);
    const [formImage, setFormImage] = useState<File | null>(null);

    const driversSectionId = useMemo(() => {
        const s = sections.find(sec => (sec.name || '').toLowerCase().includes('driver'));
        return s?.id ?? null;
    }, [sections]);

    useEffect(() => {
        api.get('/api/resource-sections').then(res => setSections(res.data.data || [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (driversSectionId == null) {
            setDrivers([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        api.get('/api/resources', { params: { section_id: driversSectionId } })
            .then(res => setDrivers(Array.isArray(res.data.data) ? res.data.data : []))
            .catch(() => setDrivers([]))
            .finally(() => setLoading(false));
    }, [driversSectionId]);

    const byFolder = useMemo(() => {
        const map: Record<string, DriverResource[]> = {};
        drivers.forEach(d => {
            const folder = (d.folder_name && d.folder_name.trim()) || 'General';
            if (!map[folder]) map[folder] = [];
            map[folder].push(d);
        });
        Object.keys(map).sort((a, b) => a.localeCompare(b));
        return map;
    }, [drivers]);

    const folderNames = useMemo(() => Object.keys(byFolder).sort((a, b) => a.localeCompare(b)), [byFolder]);

    useEffect(() => {
        const next: Record<string, boolean> = {};
        folderNames.forEach(f => { next[f] = expandedFolders[f] !== false; });
        setExpandedFolders(prev => ({ ...next, ...prev }));
    }, [folderNames.join(',')]);

    const toggleFolder = (name: string) => {
        setExpandedFolders(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const openCreate = () => {
        setEditingId(null);
        setFormFolder('General');
        setFormTitle('');
        setFormFile(null);
        setFormImage(null);
        setModalOpen(true);
    };

    const openEdit = (d: DriverResource) => {
        setEditingId(d.id);
        setFormFolder((d.folder_name && d.folder_name.trim()) || 'General');
        setFormTitle(d.title);
        setFormFile(null);
        setFormImage(null);
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            toast.warn('El título es obligatorio');
            return;
        }
        if (!editingId && !formFile) {
            toast.warn('Subí el archivo del driver (ZIP o EXE)');
            return;
        }
        if (driversSectionId == null) {
            toast.error('No se encontró la sección Drivers');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', formTitle.trim());
            fd.append('type', 'download');
            fd.append('category', 'General');
            fd.append('section_id', String(driversSectionId));
            fd.append('folder_name', formFolder.trim() || 'General');
            if (formFile) fd.append('file', formFile);
            if (formImage) fd.append('image', formImage);

            if (editingId) {
                await api.put(`/api/resources/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Driver actualizado');
            } else {
                await api.post('/api/resources', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Driver agregado');
            }
            setModalOpen(false);
            api.get('/api/resources', { params: { section_id: driversSectionId } })
                .then(res => setDrivers(Array.isArray(res.data.data) ? res.data.data : []));
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar este driver?')) return;
        try {
            await api.delete(`/api/resources/${id}`);
            toast.success('Driver eliminado');
            if (driversSectionId != null) {
                const res = await api.get('/api/resources', { params: { section_id: driversSectionId } });
                setDrivers(Array.isArray(res.data.data) ? res.data.data : []);
            }
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const downloadUrl = (content: string) => {
        if (!content) return '#';
        return getImageUrl(content) || content;
    };

    if (driversSectionId == null && !loading) {
        return (
            <div className="p-6">
                <SectionCard title="Descargas / Drivers">
                    <p className="text-gray-500">No está configurada la sección &quot;Drivers&quot;. Creala en Recursos → Gestionar secciones.</p>
                </SectionCard>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <FaDownload className="text-indigo-600" /> Descargas / Drivers
                </h1>
                {canEdit && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                    >
                        <FaPlus /> Nuevo driver
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                </div>
            ) : folderNames.length === 0 ? (
                <SectionCard title="Carpetas">
                    <p className="text-gray-500 py-6 text-center">Aún no hay drivers. {canEdit && 'Usá el botón «Nuevo driver» para agregar uno.'}</p>
                </SectionCard>
            ) : (
                <div className="space-y-6">
                    {folderNames.map(folderName => (
                        <SectionCard key={folderName} title="">
                            <button
                                type="button"
                                onClick={() => toggleFolder(folderName)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
                            >
                                {expandedFolders[folderName] !== false ? (
                                    <FaChevronDown className="text-gray-500 shrink-0" />
                                ) : (
                                    <FaChevronRight className="text-gray-500 shrink-0" />
                                )}
                                {expandedFolders[folderName] !== false ? (
                                    <FaFolderOpen className="text-amber-500 shrink-0" size={22} />
                                ) : (
                                    <FaFolder className="text-amber-500 shrink-0" size={22} />
                                )}
                                <span className="font-bold text-gray-800">{folderName}</span>
                                <span className="text-sm text-gray-500">({byFolder[folderName].length})</span>
                            </button>
                            {expandedFolders[folderName] !== false && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pl-10">
                                    {byFolder[folderName].map(d => (
                                        <div
                                            key={d.id}
                                            className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition flex flex-col"
                                        >
                                            <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                                                {d.image_url ? (
                                                    <img
                                                        src={getImageUrl(d.image_url)}
                                                        alt=""
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <FaDownload className="text-gray-300" size={48} />
                                                )}
                                            </div>
                                            <div className="p-3 flex-1 flex flex-col">
                                                <h3 className="font-semibold text-gray-800 line-clamp-2 min-h-[2.5rem]">{d.title}</h3>
                                                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                                                    <a
                                                        href={downloadUrl(d.content)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                                                    >
                                                        <FaDownload /> Descargar
                                                    </a>
                                                    {canEdit && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => openEdit(d)}
                                                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                                title="Editar"
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(d.id)}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                                title="Eliminar"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 my-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingId ? 'Editar driver' : 'Nuevo driver'}
                            </h2>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Carpeta</label>
                                <input
                                    type="text"
                                    value={formFolder}
                                    onChange={e => setFormFolder(e.target.value)}
                                    placeholder="Ej. Impresoras Térmicas"
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    required
                                    placeholder="Nombre del driver"
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Archivo (ZIP / EXE) {!editingId && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type="file"
                                    accept=".zip,.exe"
                                    onChange={e => setFormFile(e.target.files?.[0] || null)}
                                    className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                                />
                                {editingId && <p className="text-xs text-gray-500 mt-1">Dejar vacío para no cambiar el archivo.</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (JPG / PNG)</label>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png"
                                    onChange={e => setFormImage(e.target.files?.[0] || null)}
                                    className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Opcional. Miniatura del driver.</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriversPage;
