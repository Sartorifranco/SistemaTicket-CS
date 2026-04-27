import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { Department, User, TicketData, UserRole } from '../../types';
import { FaSave, FaTimes, FaImage, FaExclamationTriangle } from 'react-icons/fa';

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user: loggedInUser } = useAuth();

    // Tiempo máximo de respuesta (configurable desde company_settings; default 48hs hábiles)
    const [responseTimeHours, setResponseTimeHours] = useState<number>(48);

    // DOC1.4: el módulo "Tipo de problema" fue eliminado.
    // Solo quedan: Cliente (solo admin/agente), Prioridad, Descripción y Adjuntos.
    const [formData, setFormData] = useState({
        user_id: undefined as number | undefined,
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

    useEffect(() => {
        if (isOpen) {
            api.get('/api/settings/company')
                .then((res) => {
                    const data = res.data?.data ?? res.data;
                    const h = Number(data?.ticket_response_time_hours);
                    if (Number.isFinite(h) && h > 0) setResponseTimeHours(h);
                })
                .catch(() => { /* usa default 48 */ });
        } else {
            setFormData({
                user_id: undefined,
                description: '',
                priority: 'medium'
            });
            setAttachments([]);
        }
    }, [isOpen]);

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

    // Título derivado automáticamente desde las primeras palabras de la descripción
    // (reemplaza al antiguo "Tipo de Problema", eliminado por DOC1.4).
    const deriveTitle = (): string => {
        const desc = formData.description.trim();
        if (!desc) return 'Consulta del cliente';
        const firstLine = desc.split(/\r?\n/)[0].trim();
        if (firstLine.length <= 80) return firstLine;
        return firstLine.slice(0, 77).trimEnd() + '…';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if ((currentUserRole === 'admin' || currentUserRole === 'agent') && !formData.user_id) {
            return toast.warn("Selecciona el cliente afectado.");
        }
        if (!formData.description.trim()) {
            return toast.warn("Describí el problema en '¿Qué está sucediendo?'.");
        }

        setLoading(true);
        try {
            const title = deriveTitle();
            await onSave({ ...formData, title }, attachments);
        } finally {
            setLoading(false);
        }
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

                    {/* PRIORIDAD Y DESCRIPCIÓN */}
                    <div className="border-l-4 border-gray-400 bg-gray-50/50 rounded-r-lg p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Detalles</h3>

                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Prioridad</label>
                            <select name="priority" value={formData.priority} onChange={handleChange} className="w-full p-2.5 border rounded-lg outline-none" style={hardStyle}>
                                <option value="low">🟢 Baja (Consulta)</option>
                                <option value="medium">🟡 Media (Inconveniente)</option>
                                <option value="high">🟠 Alta (Interrupción parcial)</option>
                                <option value="urgent">🔴 Urgente (Sistema caído)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm flex items-center gap-2 flex-wrap">
                                <FaExclamationTriangle className="text-orange-500"/>
                                <span>¿Qué está sucediendo?</span>
                                <span className="ml-1 inline-block text-xs font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                    Responderemos su consulta en un plazo máximo de {responseTimeHours}hs hábiles
                                </span>
                            </label>
                            <p className="text-sm text-gray-500 mb-2 leading-snug">
                                Utilice esta sección para describir su consulta de manera clara y detallada. Cuanta más información nos brinde, más ágil y precisa podrá ser nuestra asistencia.
                            </p>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={6}
                                className="w-full p-3 border rounded-lg outline-none resize-none text-sm"
                                style={hardStyle}
                                required
                            />
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
