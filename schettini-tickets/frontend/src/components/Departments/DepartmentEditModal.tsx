// frontend/src/components/Departments/DepartmentEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Common/Modal';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // Asegúrate de que la ruta sea correcta si cambiaste la estructura
import { Department } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface DepartmentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
    onDepartmentUpdated: () => void;
    token: string | null;
}

const DepartmentEditModal: React.FC<DepartmentEditModalProps> = ({
    isOpen,
    onClose,
    department,
    onDepartmentUpdated,
    token,
}) => {
    const { addNotification } = useNotification();
    const [name, setName] = useState('');
    const [description, setDescription] = useState(''); // Añadida descripción
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (department) {
            setName(department.name);
            setDescription(department.description || ''); // Inicializar descripción
        } else {
            setName('');
            setDescription(''); // Limpiar descripción
        }
        setError(null);
    }, [department]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!name.trim()) {
            setError('El nombre del departamento es obligatorio.');
            addNotification('El nombre del departamento es obligatorio.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (!token) {
                addNotification('No autorizado. Token no disponible.', 'error');
                setLoading(false);
                return;
            }

            const departmentData = {
                name,
                description: description.trim() === '' ? null : description, // Enviar null si la descripción está vacía
            };

            if (department) {
                await api.put(`/api/departments/${department.id}`, departmentData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Departamento actualizado exitosamente.', 'success');
            } else {
                // Este modal es para edición, pero si se usa para crear (department es null),
                // la lógica de creación está aquí. Asegúrate de que sea intencional.
                await api.post('/api/departments', departmentData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Departamento creado exitosamente.', 'success');
            }
            onDepartmentUpdated();
            onClose();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al guardar departamento.');
                addNotification(`Error al guardar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al guardar el departamento.');
                addNotification('Ocurrió un error inesperado al guardar el departamento.', 'error');
            }
            console.error('Error saving department:', err);
        } finally {
            setLoading(false);
        }
    }, [name, description, department, token, addNotification, onDepartmentUpdated, onClose]); // Añadido description a las dependencias

    const modalTitle = department ? `Editar Departamento: ${department.name}` : 'Crear Nuevo Departamento';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit} className="p-4">
                {error && <div className="text-red-600 bg-red-100 p-3 rounded-md text-center mb-4">{error}</div>} {/* Reemplazado error-message */}

                <div className="mb-4"> {/* Reemplazado form-group */}
                    <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Nombre del Departamento:</label> {/* Reemplazado form-label */}
                    <input
                        type="text"
                        id="name"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" /* Reemplazado form-input */
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>
                {/* Añadido campo de descripción */}
                <div className="mb-4">
                    <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Descripción (Opcional):</label>
                    <textarea
                        id="description"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        disabled={loading}
                    ></textarea>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200" /* Reemplazado button primary-button */
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200" /* Reemplazado button secondary-button */
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default DepartmentEditModal;
