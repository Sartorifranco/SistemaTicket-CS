import React, { useState } from 'react';
import { User } from '../../types';
import { toast } from 'react-toastify';

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => Promise<void>; // La función ahora es async
    user: User | null;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onConfirm, user }) => {
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        setLoading(true);
        await onConfirm(newPassword);
        setLoading(false);
        setNewPassword(''); // Limpiar el campo
        onClose();
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Resetear Contraseña</h2>
                <p className="mb-4 text-gray-600">
                    Estás cambiando la contraseña para el usuario: <strong className="text-indigo-600">{user.username}</strong>
                </p>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordModal;