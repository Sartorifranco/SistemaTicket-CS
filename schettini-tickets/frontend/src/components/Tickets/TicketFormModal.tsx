import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { Department, User, TicketData, UserRole } from '../../types';

// --- INTERFACES LOCALES ---
interface Location {
    id: number;
    alias: string;
    serial_number?: string;
    name?: string;
    type?: string;
}

interface DepositarioOption {
    id: number;
    alias: string;
    serial_number: string;
}

interface PredefinedProblemLocal {
    id: number;
    title: string;
    description: string;
    priority?: string;
    department_id?: number;
}

interface TicketCategoryLocal {
    id: number;
    name: string;
}

type FormDataType = Partial<TicketData> & { predefined_problem_id?: number | string, depositario_id?: number | string };

interface TicketFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<TicketData>, attachments: File[]) => Promise<void>;
    initialData: TicketData | null;
    departments: Department[];
    users: User[];
    currentUserRole: UserRole;
}

const TicketFormModal: React.FC<TicketFormModalProps> = ({ isOpen, onClose, onSave, departments, users, currentUserRole }) => {
    const { user: loggedInUser } = useAuth();
    
    const initialFormData: FormDataType = {
        title: '',
        description: '',
        priority: 'medium',
        department_id: undefined,
        category_id: undefined,
        user_id: undefined,
        location_id: undefined,
        depositario_id: undefined, 
        predefined_problem_id: '', // String vacío por defecto para el select
    };

    const [formData, setFormData] = useState<FormDataType>(initialFormData);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Estados de IA
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Estados de datos
    const [locations, setLocations] = useState<Location[]>([]);
    const [depositarios, setDepositarios] = useState<DepositarioOption[]>([]);
    const [predefinedProblems, setPredefinedProblems] = useState<PredefinedProblemLocal[]>([]); // <--- NUEVO ESTADO
    
    const hardStyle = {
        backgroundColor: '#ffffff',
        color: '#000000',
        borderColor: '#d1d5db'
    };

    const targetCompanyId = useMemo(() => {
        if ((currentUserRole === 'admin' || currentUserRole === 'agent') && formData.user_id) {
            return users.find(u => u.id === formData.user_id)?.company_id;
        }
        return loggedInUser?.company_id;
    }, [currentUserRole, formData.user_id, users, loggedInUser]);

    // 1. CARGA INICIAL DE DATOS
    useEffect(() => {
        if (isOpen) {
            const fetchModalData = async () => {
                try {
                    // Cargar Problemas Predefinidos (Siempre)
                    const problemsRes = await api.get('/api/tickets/predefined-problems');
                    setPredefinedProblems(problemsRes.data.data || []);

                    // Cargar Ubicaciones/Depositarios solo si hay empresa
                    if (targetCompanyId) {
                        let locationsUrl = currentUserRole === 'client' 
                            ? '/api/locations' 
                            : `/api/locations/${targetCompanyId}`;

                        const [locRes, depRes] = await Promise.all([
                            api.get(locationsUrl),
                            api.get(`/api/depositarios?companyId=${targetCompanyId}`)
                        ]);

                        setLocations(locRes.data.data || []);
                        setDepositarios(depRes.data.data || []); 
                    }
                } catch (error) {
                    console.error("Error cargando datos del modal:", error);
                }
            };
            fetchModalData();
        }
        if (!isOpen) {
            setFormData(initialFormData);
            setLocations([]);
            setDepositarios([]);
            setIsAnalyzing(false);
        }
    }, [isOpen, targetCompanyId, currentUserRole]);
    
    // --- LÓGICA DE AUTOCOMPLETADO POR PROBLEMA ---
    const handleProblemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const problemId = parseInt(e.target.value);
        if (!problemId) {
            setFormData(prev => ({ ...prev, predefined_problem_id: '' }));
            return;
        }

        const problem = predefinedProblems.find(p => p.id === problemId);
        if (problem) {
            setFormData(prev => ({
                ...prev,
                predefined_problem_id: problemId,
                title: problem.title,             // Autocompleta Título
                description: problem.description, // Autocompleta Descripción
                // Autocompleta Prioridad si existe, sino mantiene la actual
                priority: (problem.priority as any) || prev.priority, 
                // Autocompleta Departamento si existe
                department_id: problem.department_id || prev.department_id 
            }));
            toast.info("Plantilla aplicada: Campos actualizados.");
        }
    };

    // 2. IA PREDICTIVA (Se mantiene, pero no sobreescribe si ya elegiste un problema predefinido)
    useEffect(() => {
        if (!isOpen || !formData.description || formData.description.length < 10) return;
        // Si ya seleccionó un problema predefinido, evitamos que la IA lo cambie
        if (formData.predefined_problem_id) return; 

        if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        
        analysisTimeoutRef.current = setTimeout(async () => {
            setIsAnalyzing(true);
            try {
                const res = await api.post('/api/ai/predict', { text: formData.description });
                const { suggestedPriority } = res.data.data;
                const priorityMap: Record<string, string> = { 'Crítica': 'urgent', 'Alta': 'high', 'Media': 'medium', 'Baja': 'low' };
                
                if (suggestedPriority && priorityMap[suggestedPriority]) {
                    setFormData(prev => ({ ...prev, priority: priorityMap[suggestedPriority] as any }));
                }
                
                if (!formData.title) {
                     setFormData(prev => ({
                        ...prev,
                        title: formData.description!.length > 50 ? formData.description!.substring(0, 50) + '...' : formData.description
                     }));
                }

            } catch (error) { console.error("Error IA:", error); } finally { setIsAnalyzing(false); }
        }, 1200); 
        return () => { if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current); };
    }, [formData.description, isOpen, formData.predefined_problem_id]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10);
        
        if (name === 'user_id') {
            setFormData({ ...initialFormData, user_id: numValue || undefined });
            return;
        }
        
        const newValue = name.endsWith('_id') ? numValue || undefined : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setAttachments(Array.from(e.target.files));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if ((currentUserRole === 'admin' || currentUserRole === 'agent') && !formData.user_id) {
            toast.warn("Por favor, selecciona el cliente para quien es este ticket.");
            return;
        }

        const requiredFields = [formData.title, formData.description];
        if (requiredFields.some(field => !field)) {
            toast.warn("Por favor, complete el título y la descripción.");
            return;
        }

        setLoading(true);
        await onSave(formData, attachments);
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">Crear Nuevo Ticket</h2>
                    {isAnalyzing && (
                        <span className="text-sm font-bold text-blue-600 animate-pulse bg-blue-50 px-3 py-1 rounded-full border border-blue-200">🤖 IA Analizando...</span>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* CLIENTE (SOLO ADMIN/AGENT) */}
                    {(currentUserRole === 'admin' || currentUserRole === 'agent') && (
                        <div>
                            <label className="block text-gray-700 font-medium">Crear Ticket para (Cliente):</label>
                            <select 
                                name="user_id" 
                                value={formData.user_id || ''} 
                                onChange={handleChange} 
                                className="w-full p-2 border rounded mt-1" 
                                style={hardStyle}
                                required
                            >
                                <option value="" style={hardStyle}>-- Seleccione un usuario --</option>
                                {users.filter(u => u.role === 'client').map(client => (
                                    <option key={client.id} value={client.id} style={hardStyle}>{client.username}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* --- NUEVO: SELECTOR DE PROBLEMAS PREDEFINIDOS --- */}
                    {predefinedProblems.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-100">
                            <label className="block text-blue-800 font-bold mb-1 flex items-center gap-2">
                                ⚡ Selección Rápida de Problema:
                                <span className="text-xs font-normal text-blue-600">(Autocompletar formulario)</span>
                            </label>
                            <select
                                name="predefined_problem_id"
                                value={formData.predefined_problem_id || ''}
                                onChange={handleProblemSelect}
                                className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                style={hardStyle}
                            >
                                <option value="">-- Seleccionar tipo de problema frecuente --</option>
                                {predefinedProblems.map(prob => (
                                    <option key={prob.id} value={prob.id}>
                                        {prob.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {/* UBICACIONES Y DEPOSITARIOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {locations.length > 0 && (
                            <div>
                                <label className="block text-gray-700 font-medium">{locations[0]?.type || 'Ubicación'}:</label>
                                <select 
                                    name="location_id" 
                                    value={formData.location_id || ''} 
                                    onChange={handleChange} 
                                    className="w-full p-2 border rounded mt-1" 
                                    style={hardStyle}
                                >
                                    <option value="" style={hardStyle}>-- Seleccione ubicación --</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id} style={hardStyle}>
                                            {loc.alias || loc.name} {loc.serial_number ? `(S/N: ${loc.serial_number})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {depositarios.length > 0 && (
                            <div>
                                <label className="block text-gray-700 font-medium flex items-center gap-2">
                                    <span>📠 Equipo Afectado:</span>
                                    <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
                                </label>
                                <select 
                                    name="depositario_id" 
                                    value={formData.depositario_id || ''} 
                                    onChange={handleChange} 
                                    className="w-full p-2 border rounded mt-1"
                                    style={hardStyle}
                                >
                                    <option value="" style={hardStyle}>-- Ninguno / No aplica --</option>
                                    {depositarios.map(dep => (
                                        <option key={dep.id} value={dep.id} style={hardStyle}>
                                            {dep.alias} (S/N: {dep.serial_number})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded border">
                        <label className="block text-gray-700 font-bold mb-1">
                            ¿Qué está sucediendo?
                        </label>
                        <textarea 
                            name="description" 
                            value={formData.description || ''} 
                            onChange={handleChange} 
                            placeholder="Ej: La impresora no enciende y sale humo..." 
                            rows={4} 
                            className="w-full p-2 border rounded mt-1 outline-none transition-all"
                            style={hardStyle}
                            required 
                        />
                    </div>

                    <input 
                        type="text" 
                        name="title" 
                        value={formData.title || ''} 
                        onChange={handleChange} 
                        placeholder="Título del ticket" 
                        className="w-full p-2 border rounded mt-1" 
                        style={hardStyle}
                        required 
                    />
                    
                    {/* PRIORIDAD */}
                    <div>
                        <label className="block text-gray-700 font-medium">Prioridad:</label>
                        <select 
                            name="priority" 
                            value={formData.priority || 'medium'} 
                            onChange={handleChange} 
                            className="w-full p-2 border rounded mt-1" 
                            style={hardStyle}
                            required
                        >
                            <option value="low" style={hardStyle}>Baja</option>
                            <option value="medium" style={hardStyle}>Media</option>
                            <option value="high" style={hardStyle}>Alta</option>
                            <option value="urgent" style={{ ...hardStyle, color: 'red', fontWeight: 'bold' }}>Urgente</option>
                        </select>
                    </div>
                    
                    {/* DEPARTAMENTO (Visible y autocompletable) */}
                    <div>
                         <label className="block text-gray-700 font-medium">Departamento:</label>
                         <select 
                            name="department_id" 
                            value={formData.department_id || ''} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded mt-1"
                            style={hardStyle}
                         >
                             <option value="">-- Automático / General --</option>
                             {departments.map(dept => (
                                 <option key={dept.id} value={dept.id}>{dept.name}</option>
                             ))}
                         </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium">Adjuntar Archivos:</label>
                        <input type="file" multiple onChange={handleFileChange} className="w-full text-sm mt-1" style={{ color: '#000000' }} />
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">Cancelar</button>
                        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Ticket'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TicketFormModal;