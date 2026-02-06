import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { AgentNote } from '../types';
import { toast } from 'react-toastify';
import { formatLocalDate } from '../utils/dateFormatter';

const AgentNotesPage: React.FC = () => {
    const [notes, setNotes] = useState<AgentNote[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/notes');
            setNotes(response.data.data || []);
        } catch (error) {
            console.error('Error cargando notas:', error);
            toast.error('No se pudieron cargar las notas.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDeleteNote = async (id: number) => {
        if (!window.confirm("¿Eliminar nota?")) return;
        try {
            await api.delete(`/api/notes/${id}`);
            toast.success('Nota eliminada.');
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            toast.error('Error al eliminar la nota.');
        }
    };

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando notas...</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Mis Notas Rápidas</h1>

            {notes.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
                    <p className="text-lg">No tienes notas guardadas.</p>
                    <p className="text-sm mt-2">Agrega notas desde tu Dashboard principal.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.map(note => (
                        <div key={note.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition flex flex-col justify-between border-t-4 border-yellow-400">
                            <div>
                                <p className="text-gray-800 text-base mb-4 whitespace-pre-wrap">{note.content}</p>
                                <span className="text-xs text-gray-400 block border-t pt-2">
                                    {formatLocalDate(note.updated_at)}
                                </span>
                            </div>
                            <div className="mt-4 text-right">
                                <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="text-red-500 hover:text-red-700 text-sm font-bold uppercase tracking-wider"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AgentNotesPage;