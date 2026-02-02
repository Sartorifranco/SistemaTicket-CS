// frontend/src/components/Common/CommentList.tsx
import React from 'react';
import { Comment } from '../../types'; // Se importa el tipo Comment

interface CommentListProps {
    comments: Comment[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
    if (!comments || comments.length === 0) {
        return <p className="text-sm text-gray-500 text-center py-4">No hay comentarios aún.</p>;
    }

    return (
        <div className="space-y-3">
            {comments.map((comment) => (
                <div key={comment.id} className="mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{comment.user_username}</p>
                    {/* --- CORRECCIÓN CLAVE AQUÍ --- */}
                    {/* Se usa 'comment_text' en lugar de 'content' para coincidir con la definición en types.ts */}
                    <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{comment.comment_text}</p>
                    <p className="text-xs text-gray-500 text-right mt-1">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
};

export default CommentList;
