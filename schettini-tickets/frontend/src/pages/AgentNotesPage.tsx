import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AgentNote } from '../types';
import { toast } from 'react-toastify';
import { formatLocalDate } from '../utils/dateFormatter'; // Asegúrate de tener este helper

const AgentNotesPage: React.FC = () => {
    const { user } = useAuth();
    const [notes, setNotes] = useState<AgentNote[]>([]);
    const [loading, setLoading] = useState(true);

    const notesKey = user?.id ? `agent_all_notes_${user.id}` : null;

    const loadNotes = useCallback(() => {
        if (!notesKey) {
            setNotes([]);
            setLoading(false);
            return;
        }
        try {
            const storedNotesString = localStorage.getItem(notesKey);
            const storedNotes: AgentNote[] = storedNotesString ? JSON.parse(storedNotesString) : [];
            setNotes(storedNotes);
        } catch (error) {
            console.error('Error al cargar notas de localStorage:', error);
            toast.error('Error al cargar tus notas.');
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, [notesKey]);

    const saveNotes = useCallback((updatedNotes: AgentNote[]) => {
        if (!notesKey) return;
        try {
            localStorage.setItem(notesKey, JSON.stringify(updatedNotes));
            setNotes(updatedNotes);
            toast.success('Notas actualizadas.');
        } catch (error) {
            console.error('Error al guardar notas en localStorage:', error);
            toast.error('Error al guardar tus notas.');
        }
    }, [notesKey]);

    const handleDeleteNote = (id: number) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar esta nota?")) {
            const updatedNotes = notes.filter(note => note.id !== id);
            saveNotes(updatedNotes);
            toast.info('Nota eliminada.');
        }
    };

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    if (loading) {
        return <div className="p-8 text-center"><span className="text-lg">Cargando notas...</span></div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-red-600">Debes iniciar sesión para ver tus notas.</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            {/* ✅ Título con tamaño de texto responsivo */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Mis Notas Rápidas</h1>

            {notes.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
                    <p className="text-lg">No tienes notas rápidas guardadas aún.</p>
                    <p className="text-sm mt-2">Puedes añadir nuevas notas desde tu Dashboard de Agente.</p>
                </div>
            ) : (
                // ✅ La grilla ya era responsiva, se mantiene su excelente estructura
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.map(note => (
                        <div key={note.id} className="bg-white p-6 rounded-lg shadow-lg flex flex-col justify-between transition-transform hover:scale-105">
                            <div>
                                <p className="text-gray-800 text-base mb-3 whitespace-pre-wrap">{note.content}</p>
                                <span className="text-xs text-gray-500 block">
                                    {/* Usamos el helper para formatear la fecha */}
                                    Creada: {formatLocalDate(note.updated_at)}
                                </span>
                            </div>
                            <div className="mt-4 text-right">
                                <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-1 px-3 rounded-md transition duration-300"
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