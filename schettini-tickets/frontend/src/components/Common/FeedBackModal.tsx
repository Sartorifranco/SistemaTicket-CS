// frontend/src/components/Common/FeedbackModal.tsx
import React, { useState, useEffect } from 'react';
import { TicketData } from '../../types';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: TicketData; // El ticket que se está calificando
    onSaveFeedback: (ticketId: number, rating: number, comment: string) => Promise<void>;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, ticket, onSaveFeedback }) => {
    const [rating, setRating] = useState(0); // Calificación de 1 a 5
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Resetear el estado cuando el modal se abre para un nuevo ticket
        setRating(0);
        setComment('');
    }, [ticket]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (rating === 0) {
            alert('Por favor, selecciona una calificación.'); // Usar notificación real si es posible
            setLoading(false);
            return;
        }

        try {
            await onSaveFeedback(ticket.id, rating, comment);
            // onClose() y notificaciones se manejan en onSaveFeedback del padre
        } catch (error) {
            console.error('Error submitting feedback:', error);
            // La notificación de error se maneja en el componente padre
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md my-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
                    Calificar Ticket #{ticket.id}: {ticket.title}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Calificación:</label>
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={`text-3xl ${rating >= star ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-400 focus:outline-none`}
                                    onClick={() => setRating(star)}
                                    disabled={loading}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="comment" className="block text-gray-700 text-sm font-bold mb-2">Comentarios (opcional):</label>
                        <textarea
                            id="comment"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            disabled={loading}
                            placeholder="Comparte tu experiencia..."
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                            disabled={loading}
                        >
                            Enviar Feedback
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
