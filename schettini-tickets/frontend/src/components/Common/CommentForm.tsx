import React, { useState, useRef, useEffect } from 'react';
import { FaPaperclip, FaTimes, FaImage, FaVideo, FaFileAlt } from 'react-icons/fa';
import { UserRole } from '../../types';

interface CommentFormProps {
    // Mantiene compatibilidad previa: si el consumidor ignora el 3er parámetro (files), funciona igual.
    onAddComment: (commentText: string, isInternal: boolean, files?: File[]) => Promise<void>;
    userRole: UserRole;
    // Si es true, muestra el botón de adjuntar multimedia (pensado para el chat del cliente, DOC1.7).
    allowAttachments?: boolean;
}

const MIN_HEIGHT = 72;
const MAX_HEIGHT = 300;

const CommentForm: React.FC<CommentFormProps> = ({ onAddComment, userRole, allowAttachments = true }) => {
    const [commentText, setCommentText] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const adjustHeight = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = '0';
        const h = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
        el.style.height = `${h}px`;
    };

    useEffect(() => { adjustHeight(); }, [commentText]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCommentText(e.target.value);
    };

    const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        if (!selected.length) return;
        const MAX = 5;
        const MAX_SIZE_MB = 15;
        const merged = [...files, ...selected].slice(0, MAX);
        const invalid = merged.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
        if (invalid) {
            alert(`El archivo "${invalid.name}" supera los ${MAX_SIZE_MB} MB permitidos.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setFiles(merged);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const iconForFile = (f: File) => {
        if (f.type.startsWith('image/')) return <FaImage className="text-blue-500" />;
        if (f.type.startsWith('video/')) return <FaVideo className="text-purple-500" />;
        return <FaFileAlt className="text-gray-500" />;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() && files.length === 0) return;

        setIsSubmitting(true);
        const finalIsInternal = userRole === 'client' ? false : isInternal;
        try {
            await onAddComment(commentText, finalIsInternal, files);
            setCommentText('');
            setIsInternal(false);
            setFiles([]);
            if (textareaRef.current) textareaRef.current.style.height = `${MIN_HEIGHT}px`;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <textarea
                ref={textareaRef}
                value={commentText}
                onChange={handleChange}
                placeholder="Escribe tu respuesta..."
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-red-500 resize-none overflow-y-auto"
                style={{ minHeight: `${MIN_HEIGHT}px` }}
                disabled={isSubmitting}
            />

            {allowAttachments && files.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {files.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2">
                            <span className="flex items-center gap-2 truncate">
                                {iconForFile(f)}
                                <span className="truncate">{f.name}</span>
                                <span className="text-xs text-gray-400 shrink-0">
                                    ({(f.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Quitar"
                                disabled={isSubmitting}
                            >
                                <FaTimes />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-4 gap-4">
                <div className="flex items-center gap-3">
                    {allowAttachments && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                                onChange={handlePickFiles}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting || files.length >= 5}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                                title="Adjuntar foto, video o documento"
                            >
                                <FaPaperclip /> Adjuntar archivo
                            </button>
                        </>
                    )}
                    {(userRole === 'agent' || userRole === 'admin') && (
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
                    )}
                </div>
                <button
                    type="submit"
                    className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 w-full sm:w-auto disabled:bg-gray-400"
                    disabled={isSubmitting || (!commentText.trim() && files.length === 0)}
                >
                    {isSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
            </div>
        </form>
    );
};

export default CommentForm;
