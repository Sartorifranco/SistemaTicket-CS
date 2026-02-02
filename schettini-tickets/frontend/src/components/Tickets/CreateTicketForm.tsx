import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
// Asegúrate de que los tipos estén definidos en tu archivo types.ts
import { Department, TicketCategory } from '../../types';

interface CreateTicketFormProps {
    onTicketCreated: () => void;
    onClose: () => void;
}

const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ onTicketCreated, onClose }) => {
    // Estado inicial simplificado
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'normal', // Prioridad por defecto
        departmentId: '',   // Se llenará automáticamente
        categoryId: '',     // Se llenará automáticamente
    });

    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // 🚀 LÓGICA AUTOMÁTICA: 
    // Al cargar el formulario, busca el primer departamento y categoría disponibles
    // y los asigna silenciosamente. Así el cliente no tiene que elegir nada.
    useEffect(() => {
        const fetchDefaultData = async () => {
            try {
                const [deptsRes, catsRes] = await Promise.all([
                    api.get('/api/departments'), // Ajustado a ruta estándar
                    api.get('/api/tickets/categories') // Ajusta según tus rutas de backend
                ]);

                const depts: Department[] = deptsRes.data.data || deptsRes.data || [];
                const cats: TicketCategory[] = catsRes.data.data || catsRes.data || [];

                // Asignamos automáticamente el primer ID encontrado (ej. "Mesa de Entrada" / "General")
                setFormData(prev => ({
                    ...prev,
                    departmentId: depts.length > 0 ? String(depts[0].id) : '',
                    categoryId: cats.length > 0 ? String(cats[0].id) : ''
                }));

            } catch (err) {
                console.error('Error configurando formulario automático:', err);
                toast.error('Error de conexión con el servidor.');
            } finally {
                setInitializing(false);
            }
        };

        fetchDefaultData();
    }, []);

    const [attachments, setAttachments] = useState<File[]>([]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validación
        if (!formData.title.trim() || !formData.description.trim()) {
            toast.warn('Por favor, describa su problema.');
            return;
        }

        if (!formData.departmentId || !formData.categoryId) {
            toast.error('Error interno: No hay departamentos configurados en el sistema.');
            return;
        }

        setLoading(true);

        const data = new FormData();
        data.append('title', formData.title.trim());
        data.append('description', formData.description.trim());
        data.append('priority', formData.priority);
        data.append('department_id', formData.departmentId);
        data.append('category_id', formData.categoryId);

        // Adjuntar archivos
        attachments.forEach(file => {
            data.append('attachments', file);
        });

        try {
            await api.post('/api/tickets', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success('¡Ticket enviado! Un agente lo revisará pronto.');
            onTicketCreated();
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Error al enviar el ticket.');
        } finally {
            setLoading(false);
        }
    };

    if (initializing) {
        return <div className="p-8 text-center text-gray-500">Cargando sistema de tickets...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-auto">
            {/* ENCABEZADO ROJO SCHETTINI */}
            <div className="mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Nueva Solicitud</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Describa su problema y nuestro equipo técnico lo asistirá.
                </p>
            </div>

            <div className="space-y-6">
                {/* CAMPO 1: ASUNTO */}
                <div>
                    <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
                        ¿Qué está sucediendo? (Título breve)
                    </label>
                    <input 
                        type="text" 
                        name="title" 
                        placeholder="Ej: No funciona la impresora / Error en pantalla"
                        className="w-full border border-gray-300 rounded-lg py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-shadow"
                        value={formData.title} 
                        onChange={handleInputChange} 
                        autoFocus
                        required 
                        disabled={loading} 
                    />
                </div>

                {/* CAMPO 2: DESCRIPCIÓN */}
                <div>
                    <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                        Detalles del problema
                    </label>
                    <textarea 
                        name="description" 
                        placeholder="Explique con el mayor detalle posible qué necesita..."
                        className="w-full border border-gray-300 rounded-lg py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent h-40 resize-none transition-shadow"
                        value={formData.description} 
                        onChange={handleInputChange} 
                        required 
                        disabled={loading} 
                    />
                </div>

                {/* CAMPO 3: ADJUNTOS (Estilizado Minimalista) */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Adjuntar captura de pantalla (Opcional)
                    </label>
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col w-full h-32 border-2 border-dashed border-gray-300 hover:bg-gray-50 hover:border-red-400 rounded-lg cursor-pointer transition-colors">
                            <div className="flex flex-col items-center justify-center pt-7">
                                <svg className="w-8 h-8 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                <p className="pt-1 text-sm tracking-wider text-gray-400 group-hover:text-gray-600">
                                    {attachments.length > 0 
                                        ? `${attachments.length} archivo(s) seleccionado(s)` 
                                        : "Haga clic para seleccionar archivos"}
                                </p>
                            </div>
                            <input 
                                type="file" 
                                className="opacity-0" 
                                multiple 
                                onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="px-6 py-2.5 bg-white text-gray-700 font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-gray-100 hover:shadow-lg focus:bg-gray-100 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-gray-200 active:shadow-lg transition duration-150 ease-in-out"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-red-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-red-700 hover:shadow-lg focus:bg-red-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-red-800 active:shadow-lg transition duration-150 ease-in-out disabled:opacity-70" 
                    disabled={loading}
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                            Enviando...
                        </div>
                    ) : 'Enviar Solicitud'}
                </button>
            </div>
        </form>
    );
};

export default CreateTicketForm;