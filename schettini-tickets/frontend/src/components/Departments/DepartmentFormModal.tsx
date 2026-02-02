// frontend/src/components/Departments/DepartmentFormModal.tsx
import React, { useState, useEffect } from 'react';
import { Department } from '../../types'; // Asegúrate de que la interfaz Department esté definida en types.ts

interface DepartmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (departmentData: Partial<Department>) => Promise<void>;
    initialData: Department | null; // Para edición
}

const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description);
        } else {
            setName('');
            setDescription('');
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!name.trim() || !description.trim()) {
            // Aquí podrías usar useNotification si lo tienes disponible en este componente
            alert('Por favor, complete todos los campos requeridos.'); // Usar notificación real si es posible
            setLoading(false);
            return;
        }

        try {
            await onSave({ name, description });
            onClose();
        } catch (error) {
            console.error('Error saving department:', error);
            // La notificación de error se maneja en el componente padre (AdminDepartmentsPage)
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md my-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
                    {initialData ? 'Editar Departamento' : 'Crear Nuevo Departamento'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
                        <input
                            type="text"
                            id="name"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Descripción:</label>
                        <textarea
                            id="description"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            disabled={loading}
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
                            {initialData ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepartmentFormModal;
