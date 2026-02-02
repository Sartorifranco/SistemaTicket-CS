import React, { useState } from 'react';
import { UserRole } from '../../types';

interface CommentFormProps {
    onAddComment: (commentText: string, isInternal: boolean) => Promise<void>;
    userRole: UserRole;
}

const CommentForm: React.FC<CommentFormProps> = ({ onAddComment, userRole }) => {
    const [commentText, setCommentText] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        
        setIsSubmitting(true);
        const finalIsInternal = userRole === 'client' ? false : isInternal;
        await onAddComment(commentText, finalIsInternal);
        
        setCommentText('');
        setIsInternal(false);
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe tu respuesta..."
                className="w-full p-3 border rounded-md h-28 focus:ring-2 focus:ring-red-500"
                required
                disabled={isSubmitting}
            />
            {/* ✅ Contenedor responsivo para los controles del formulario */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-4 gap-4">
                {(userRole === 'agent' || userRole === 'admin') ? (
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="isInternal"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            disabled={isSubmitting}
                        />
                        <label htmlFor="isInternal" className="ml-2 block text-sm text-gray-900">
                            Marcar como Nota Interna
                        </label>
                    </div>
                ) : (
                    <div /> // Espaciador para mantener el botón a la derecha en todos los casos
                )}
                <button 
                    type="submit" 
                    className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 w-full sm:w-auto disabled:bg-gray-400"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
            </div>
        </form>
    );
};

export default CommentForm;