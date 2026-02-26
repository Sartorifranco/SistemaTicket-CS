import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { Department, User, TicketData, UserRole } from '../../types';
import { FaSave, FaTimes, FaImage, FaExclamationTriangle } from 'react-icons/fa';

interface ConfigOption {
    id: number;
    name: string;
    category_id?: number; 
}

interface TicketFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any, attachments: File[]) => Promise<void>;
    initialData: TicketData | null;
    departments: Department[]; // Se mantiene por compatibilidad
    users: User[];
    currentUserRole: UserRole;
}

const TicketFormModal: React.FC<TicketFormModalProps> = ({ isOpen, onClose, onSave, users, currentUserRole }) => {
    const { user: loggedInUser } = useAuth();

    // Estados para listas
    const [systems, setSystems] = useState<ConfigOption[]>([]);
    const [equipment, setEquipment] = useState<ConfigOption[]>([]);
    const [categories, setCategories] = useState<ConfigOption[]>([]);
    const [specificProblems, setSpecificProblems] = useState<ConfigOption[]>([]);

    // Formulario
    const [formData, setFormData] = useState({
        user_id: undefined as number | undefined,
        title: '',
        system_id: '',
        custom_system: '',
        equipment_id: '',
        custom_equipment: '',
        problem_category_id: '',
        specific_problem_id: '',
        custom_problem: '',
        description: '',
        priority: 'medium',
    });

    const [attachments, setAttachments] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);

    const hardStyle = {
        backgroundColor: '#ffffff',
        color: '#000000',
        borderColor: '#d1d5db'
    };

    // Cargar opciones
    useEffect(() => {
        if (isOpen) {
            api.get('/api/ticket-config/options')
                .then(res => {
                    if (res.data.success) {
                        setSystems(res.data.data.systems || []);
                        setEquipment(res.data.data.equipment || []);
                        setCategories(res.data.data.categories || []);
                        setSpecificProblems(res.data.data.problems || []);
                    }
                })
                .catch(err => console.error("Error options", err));
        } else {
            // Reset
            setFormData({
                user_id: undefined,
                title: '',
                system_id: '', custom_system: '',
                equipment_id: '', custom_equipment: '',
                problem_category_id: '',
                specific_problem_id: '', custom_problem: '',
                description: '',
                priority: 'medium'
            });
            setAttachments([]);
        }
    }, [isOpen]);

    const filteredProblems = useMemo(() => {
        if (!formData.problem_category_id) return [];
        return specificProblems.filter(p => p.category_id === Number(formData.problem_category_id));
    }, [formData.problem_category_id, specificProblems]);

    const problemsWithOthers = useMemo(() => {
        const base = filteredProblems;
        const hasOthers = base.some(p => p.name.toLowerCase() === 'otros' || p.name.toLowerCase() === 'otro');
        if (hasOthers) return base;
        return [...base, { id: -1, name: 'Otros', category_id: Number(formData.problem_category_id) } as ConfigOption];
    }, [filteredProblems, formData.problem_category_id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const validFiles = files.filter(f => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type));
            if (validFiles.length !== files.length) toast.warn("Solo imágenes y PDF.");
            setAttachments(validFiles);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if ((currentUserRole === 'admin' || currentUserRole === 'agent') && !formData.user_id) {
            return toast.warn("Selecciona el cliente afectado.");
        }
        if (!formData.title.trim()) {
            return toast.warn("Ingresa un título para el ticket.");
        }
        if (!formData.description.trim()) {
            return toast.warn("Describe el problema.");
        }
        if (!formData.problem_category_id || !formData.specific_problem_id) {
            return toast.warn("Selecciona categoría y problema.");
        }

        setLoading(true);
        await onSave(formData, attachments);
        setLoading(false);
    };

    const isOther = (id: string, list: ConfigOption[]) => {
        const item = list.find(i => i.id === Number(id));
        return item?.name.toLowerCase() === 'otros' || item?.name.toLowerCase() === 'otro';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-100/80 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-800">Nuevo Ticket</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><FaTimes size={24} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* TÍTULO */}
                    <div className="border-l-4 border-blue-500 bg-blue-50/60 p-4 rounded-r-lg">
                        <label className="block text-blue-800 font-bold mb-1 text-sm">Título del ticket</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Ej: No funciona la impresora / Error en pantalla"
                            className="w-full p-2.5 border border-blue-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>

                    {/* CLIENTE (SOLO ADMIN/AGENT) */}
                    {(currentUserRole === 'admin' || currentUserRole === 'agent') && (
                        <div className="border-l-4 border-amber-500 bg-amber-50/60 p-4 rounded-r-lg">
                            <label className="block text-yellow-800 font-bold mb-1 text-sm">Cliente:</label>
                            <select 
                                name="user_id" 
                                value={formData.user_id || ''} 
                                onChange={handleChange} 
                                className="w-full p-2 bg-white border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                                required
                            >
                                <option value="">-- Seleccione Cliente --</option>
                                {users.filter(u => u.role === 'client').map(client => (
                                    <option key={client.id} value={client.id}>{client.username} ({client.business_name || 'Sin Empresa'})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* SISTEMA Y EQUIPO */}
                    <div className="border-l-4 border-gray-400 bg-gray-50/50 rounded-r-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Sistema y Equipo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Sistema Afectado</label>
                            <select name="system_id" value={formData.system_id} onChange={handleChange} className="w-full p-2.5 border rounded-lg outline-none" style={hardStyle} required>
                                <option value="">Seleccione...</option>
                                {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {isOther(formData.system_id, systems) && (
                                <input type="text" name="custom_system" placeholder="Especifique..." className="mt-2 w-full p-2 border rounded bg-gray-50 text-sm" onChange={handleChange} required />
                            )}
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Equipo Afectado</label>
                            <select name="equipment_id" value={formData.equipment_id} onChange={handleChange} className="w-full p-2.5 border rounded-lg outline-none" style={hardStyle} required>
                                <option value="">Seleccione...</option>
                                <option value="none">Ninguno</option>
                                {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            {formData.equipment_id && formData.equipment_id !== 'none' && isOther(formData.equipment_id, equipment) && (
                                <input type="text" name="custom_equipment" placeholder="Especifique..." className="mt-2 w-full p-2 border rounded bg-white text-sm" onChange={handleChange} required />
                            )}
                        </div>
                        </div>
                    </div>

                    {/* CATEGORÍA Y PROBLEMA */}
                    <div className="border-l-4 border-gray-400 bg-gray-50/50 rounded-r-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Categoría y Problema</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Categoría</label>
                            <select 
                                name="problem_category_id"
                                value={formData.problem_category_id}
                                onChange={(e) => { handleChange(e); setFormData(prev => ({ ...prev, specific_problem_id: '' })); }}
                                className="w-full p-2.5 border rounded-lg outline-none"
                                style={hardStyle}
                                required
                            >
                                <option value="">Seleccione...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Problema Específico</label>
                            <select name="specific_problem_id" value={formData.specific_problem_id} onChange={handleChange} className="w-full p-2.5 border rounded-lg outline-none disabled:bg-gray-100" style={hardStyle} disabled={!formData.problem_category_id} required>
                                <option value="">Seleccione...</option>
                                {problemsWithOthers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {isOther(formData.specific_problem_id, problemsWithOthers) && (
                                <input type="text" name="custom_problem" placeholder="Detalle el problema..." className="mt-2 w-full p-2 border rounded bg-white text-sm" onChange={handleChange} required />
                            )}
                        </div>
                        </div>
                    </div>

                    {/* PRIORIDAD Y DESCRIPCIÓN */}
                    <div className="border-l-4 border-gray-400 bg-gray-50/50 rounded-r-lg p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Detalles</h3>
                    {/* PRIORIDAD */}
                    <div>
                        <label className="block text-gray-700 font-bold mb-1 text-sm">Prioridad</label>
                        <select name="priority" value={formData.priority} onChange={handleChange} className="w-full p-2.5 border rounded-lg outline-none" style={hardStyle}>
                            <option value="low">🟢 Baja (Consulta)</option>
                            <option value="medium">🟡 Media (Inconveniente)</option>
                            <option value="high">🟠 Alta (Interrupción parcial)</option>
                            <option value="urgent">🔴 Urgente (Sistema caído)</option>
                        </select>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label className="block text-gray-700 font-bold mb-1 text-sm flex items-center gap-2">
                            <FaExclamationTriangle className="text-orange-500"/> ¿Qué está sucediendo?
                        </label>
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describa el problema detalladamente..." rows={4} className="w-full p-3 border rounded-lg outline-none resize-none text-sm" style={hardStyle} required />
                    </div>
                    </div>

                    {/* ADJUNTOS */}
                    <div className="border-l-4 border-gray-300 bg-gray-50/30 rounded-r-lg p-4">
                        <label className="block text-gray-700 font-bold mb-2 text-sm flex items-center gap-2"><FaImage className="text-gray-500"/> Adjuntar Imágenes (Opcional)</label>
                        <input type="file" multiple className="w-full text-sm text-gray-500" onChange={handleFileChange} accept="image/*,.pdf" />
                        {attachments.length > 0 && <div className="mt-2 text-xs text-gray-600"><strong>Archivos:</strong> {attachments.map(f => f.name).join(', ')}</div>}
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 mt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition">Cancelar</button>
                        <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition flex items-center gap-2" disabled={loading}>
                            <FaSave /> {loading ? 'Enviando...' : 'Crear Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TicketFormModal;