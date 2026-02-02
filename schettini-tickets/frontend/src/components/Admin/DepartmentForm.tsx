import React, { useState, useEffect } from 'react';
import departmentService, { Department, NewDepartment } from '../../services/departmentService';
import { useAuth } from '../../context/AuthContext'; 
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards'; 

interface DepartmentFormProps {
    departmentToEdit?: Department | null;
    onSave: () => void;
    onCancel: () => void;
    token: string | null; // AÑADIDO: token como prop
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({ departmentToEdit, onSave, onCancel, token }) => {
    const { addNotification } = useNotification(); // <-- MODIFICADO: Obtener addNotification del contexto de notificaciones
    const [formData, setFormData] = useState<NewDepartment>({
        name: departmentToEdit?.name || '',
        description: departmentToEdit?.description || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (departmentToEdit) {
            setFormData({
                name: departmentToEdit.name,
                description: departmentToEdit.description,
            });
        } else {
            setFormData({ name: '', description: '' });
        }
    }, [departmentToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!token) {
            addNotification('No autorizado. Por favor, inicia sesión de nuevo.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (departmentToEdit) {
                await departmentService.updateDepartment(token, departmentToEdit.id, formData);
                addNotification('Departamento actualizado exitosamente!', 'success');
            } else {
                await departmentService.createDepartment(token, formData);
                addNotification('Departamento creado exitosamente!', 'success');
                setFormData({ name: '', description: '' }); 
            }
            onSave(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al guardar el departamento.');
                addNotification(`Error al guardar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al guardar el departamento.');
            }
            console.error('Error saving department:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {departmentToEdit ? 'Editar Departamento' : 'Crear Departamento'}
            </h2>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                    Nombre:
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                />
            </div>
            <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                    Descripción:
                </label>
                <textarea
                    id="description"
                    name="description"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    required
                    disabled={loading}
                ></textarea>
            </div>
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : (departmentToEdit ? 'Actualizar' : 'Crear')}
                </button>
            </div>
        </form>
    );
};

export default DepartmentForm;
