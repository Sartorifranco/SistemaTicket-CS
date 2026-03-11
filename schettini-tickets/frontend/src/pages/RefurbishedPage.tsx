import React, { useState, useEffect, useRef } from 'react';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import {
    FaWrench, FaPlus, FaEdit, FaTrash, FaSearch, FaTimes,
    FaCheckCircle, FaTimesCircle,
} from 'react-icons/fa';

interface RefurbishedEquipment {
    id: number;
    equipment_type: string | null;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    accessories: string | null;
    observations: string | null;
    status: string;
    photos: string[];
    is_active: number;
    created_at: string;
    updated_at: string;
}

const STATUS_OPTIONS = [
    { value: 'pendiente_reparacion', label: 'Pendiente reparación' },
    { value: 'reparado_listo_venta', label: 'Reparado y listo para venta' },
    { value: 'vendido', label: 'Vendido' },
];
const MAX_PHOTOS = 6;

const RefurbishedPage: React.FC = () => {
    const { user: loggedUser } = useAuth();
    const isAgent = loggedUser?.role === 'agent';

    const [list, setList] = useState<RefurbishedEquipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        equipment_type: '',
        brand: '',
        model: '',
        serial_number: '',
        accessories: '',
        observations: '',
        status: 'pendiente_reparacion',
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

    const fetchList = async () => {
        setLoading(true);
        try {
            const res = await api.get<{ success: boolean; data: RefurbishedEquipment[] }>('/api/refurbished-equipments');
            setList(Array.isArray(res.data.data) ? res.data.data : []);
        } catch {
            toast.error('Error al cargar equipos reacondicionados');
            setList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, []);

    const filtered = list.filter(
        (e) =>
            (e.equipment_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openCreate = () => {
        setForm({
            equipment_type: '',
            brand: '',
            model: '',
            serial_number: '',
            accessories: '',
            observations: '',
            status: 'pendiente_reparacion',
        });
        setSelectedFiles([]);
        setExistingPhotos([]);
        setEditingId(null);
        setModalOpen(true);
    };

    const openEdit = (e: RefurbishedEquipment) => {
        setForm({
            equipment_type: e.equipment_type || '',
            brand: e.brand || '',
            model: e.model || '',
            serial_number: e.serial_number || '',
            accessories: e.accessories || '',
            observations: e.observations || '',
            status: e.status || 'pendiente_reparacion',
        });
        setExistingPhotos(Array.isArray(e.photos) ? e.photos : []);
        setSelectedFiles([]);
        setEditingId(e.id);
        setModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const total = existingPhotos.length + selectedFiles.length + files.length;
        if (total > MAX_PHOTOS) {
            toast.warn(`Máximo ${MAX_PHOTOS} fotos. Tenés ${existingPhotos.length + selectedFiles.length} y agregaste ${files.length}.`);
            return;
        }
        const imageFiles = files.filter((f) => f.type.startsWith('image/'));
        if (imageFiles.length !== files.length) toast.warn('Solo se aceptan imágenes.');
        setSelectedFiles((prev) => [...prev, ...imageFiles].slice(0, MAX_PHOTOS - existingPhotos.length));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const removeExistingPhoto = (index: number) => {
        setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const totalPhotos = existingPhotos.length + selectedFiles.length;
        if (totalPhotos > MAX_PHOTOS) {
            toast.warn(`Máximo ${MAX_PHOTOS} fotos.`);
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('equipment_type', form.equipment_type);
            formData.append('brand', form.brand);
            formData.append('model', form.model);
            formData.append('serial_number', form.serial_number);
            formData.append('accessories', form.accessories);
            formData.append('observations', form.observations);
            formData.append('status', form.status);
            selectedFiles.forEach((f) => formData.append('photos', f));

            if (editingId) {
                formData.append('existing_photos', JSON.stringify(existingPhotos));
                await api.put(`/api/refurbished-equipments/${editingId}`, formData);
                toast.success('Equipo actualizado correctamente.');
            } else {
                await api.post('/api/refurbished-equipments', formData);
                toast.success('Equipo creado correctamente.');
            }
            setSelectedFiles([]);
            setExistingPhotos([]);
            setModalOpen(false);
            fetchList();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar este equipo reacondicionado?')) return;
        try {
            await api.delete(`/api/refurbished-equipments/${id}`);
            toast.success('Equipo eliminado.');
            fetchList();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al eliminar');
        }
    };

    const handleSetActive = async (id: number, isActive: boolean) => {
        try {
            await api.patch(`/api/refurbished-equipments/${id}/active`, { is_active: isActive });
            toast.success(isActive ? 'Equipo activado.' : 'Equipo desactivado.');
            fetchList();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al actualizar estado');
        }
    };

    const getStatusLabel = (status: string) => STATUS_OPTIONS.find((o) => o.value === status)?.label || status;

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando equipos reacondicionados...</div>;

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <FaWrench className="text-indigo-600" /> Equipos Reacondicionados
                </h1>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por tipo, marca, modelo o N° serie..."
                            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-2"
                    >
                        <FaPlus /> Nuevo Equipo
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-3 font-bold">Tipo / Marca / Modelo</th>
                                <th className="p-3 font-bold">N° Serie</th>
                                <th className="p-3 font-bold">Estado</th>
                                <th className="p-3 font-bold">Fotos</th>
                                <th className="p-3 font-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length > 0 ? (
                                filtered.map((row) => (
                                    <tr key={row.id} className="hover:bg-indigo-50/40">
                                        <td className="p-3">
                                            <div className="font-medium text-gray-800">{row.equipment_type || '—'}</div>
                                            <div className="text-sm text-gray-600">{row.brand} {row.model}</div>
                                        </td>
                                        <td className="p-3 text-gray-700">{row.serial_number || '—'}</td>
                                        <td className="p-3">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                                {getStatusLabel(row.status)}
                                            </span>
                                            {row.is_active === 0 && (
                                                <span className="ml-1 text-xs text-amber-600 font-semibold">(Inactivo)</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {Array.isArray(row.photos) && row.photos.length > 0 ? (
                                                <span className="text-sm text-gray-600">{row.photos.length} foto(s)</span>
                                            ) : (
                                                <span className="text-gray-400 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(row)}
                                                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                    title="Editar"
                                                >
                                                    <FaEdit />
                                                </button>
                                                {!isAgent && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetActive(row.id, row.is_active ? false : true)}
                                                            className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                                                            title={row.is_active ? 'Desactivar' : 'Activar'}
                                                        >
                                                            {row.is_active ? <FaTimesCircle /> : <FaCheckCircle />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(row.id)}
                                                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                                            title="Eliminar"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        {searchTerm ? 'Sin resultados.' : 'Aún no hay equipos reacondicionados. Clic en «Nuevo Equipo».'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Crear / Editar */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 p-6 relative">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
                        >
                            &times;
                        </button>
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">
                            {editingId ? 'Editar equipo' : 'Nuevo equipo reacondicionado'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de equipo</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={form.equipment_type}
                                        onChange={(e) => setForm({ ...form, equipment_type: e.target.value })}
                                        placeholder="Ej. Notebook, Monitor"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Marca</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={form.brand}
                                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Modelo</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={form.model}
                                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">N° Serie</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={form.serial_number}
                                        onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Accesorios</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={form.accessories}
                                    onChange={(e) => setForm({ ...form, accessories: e.target.value })}
                                    placeholder="Ej. Cargador, bolso"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={form.observations}
                                    onChange={(e) => setForm({ ...form, observations: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Estado</label>
                                <select
                                    className="w-full border border-gray-300 p-2 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                >
                                    {STATUS_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Fotos (máx. {MAX_PHOTOS})
                                </label>
                                {existingPhotos.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {existingPhotos.map((url, i) => (
                                            <div key={i} className="relative inline-block">
                                                <img
                                                    src={getImageUrl(url)}
                                                    alt=""
                                                    className="w-16 h-16 object-cover rounded border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingPhoto(i)}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {selectedFiles.map((f, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 mr-2 mb-2 px-2 py-1 bg-gray-100 rounded text-sm">
                                        {f.name}
                                        <button type="button" onClick={() => removeSelectedFile(i)} className="text-red-600">
                                            <FaTimes />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700"
                                />
                            </div>
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear equipo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RefurbishedPage;
