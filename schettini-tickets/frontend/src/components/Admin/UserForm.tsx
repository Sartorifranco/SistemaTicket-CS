// src/components/Admin/UserForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import userService, { NewUser, UpdateUser } from '../../services/userService';
import axios from 'axios'; // Asegúrate de que esto es 'axios' y no tu instancia 'api' si no quieres el interceptor de 401 aquí
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { Department, User } from '../../types';

interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: User | null; // Para edición
    departments: Department[]; // Para el selector de departamento
    onSave: (userData: NewUser | UpdateUser) => Promise<void>; // Callback para guardar
}

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, initialData, departments, onSave }) => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false); // Estado de carga para el formulario

    const [formData, setFormData] = useState({
        username: initialData?.username || '',
        email: initialData?.email || '',
        password: '', // Siempre vacío por seguridad al editar
        confirmPassword: '', // Para confirmación en creación
        role: initialData?.role || 'client' as 'admin' | 'agent' | 'client',
        department_id: initialData?.department_id || null as number | null,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                username: initialData.username,
                email: initialData.email,
                password: '',
                confirmPassword: '',
                role: initialData.role,
                department_id: initialData.department_id || null,
            });
        } else {
            setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'client',
                department_id: null,
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'department_id' && value ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.username.trim() || !formData.email.trim()) {
            addNotification('El nombre de usuario y el email son obligatorios.', 'warning');
            setLoading(false);
            return;
        }

        if (!initialData && formData.password !== formData.confirmPassword) {
            addNotification('Las contraseñas no coinciden.', 'error');
            setLoading(false);
            return;
        }

        if (!initialData && formData.password.length < 6) {
            addNotification('La contraseña debe tener al menos 6 caracteres.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (initialData) { // Editando usuario existente
                const dataToUpdate: UpdateUser = {
                    username: formData.username,
                    email: formData.email,
                    role: formData.role,
                    department_id: formData.department_id,
                };
                if (formData.password) { // Solo actualiza la contraseña si se proporciona una nueva
                    dataToUpdate.password = formData.password;
                }
                // Llama a userService.updateUser con los argumentos correctos
                await userService.updateUser(initialData.id, dataToUpdate, token as string);
                addNotification('Usuario actualizado exitosamente!', 'success');
                // Pasa el objeto dataToUpdate (ya tipado como UpdateUser) al callback onSave
                await onSave(dataToUpdate); // Usar await para asegurar que la operación se complete antes de cerrar el modal
            } else { // Creando nuevo usuario
                if (!formData.password) {
                    addNotification('La contraseña es obligatoria para crear un nuevo usuario.', 'warning');
                    setLoading(false);
                    return;
                }
                const newUser: NewUser = {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                    department_id: formData.department_id,
                };
                // Llama a userService.createUser con los argumentos correctos
                await userService.createUser(newUser, token as string);
                addNotification('Usuario creado exitosamente!', 'success');
                setFormData({ username: '', email: '', password: '', confirmPassword: '', role: 'client', department_id: null });
                // Pasa el objeto newUser (ya tipado como NewUser) al callback onSave
                await onSave(newUser); // Usar await para asegurar que la operación se complete antes de cerrar el modal
            }
            onClose(); // Cerrar el modal al guardar exitosamente
        } catch (err: unknown) {
            console.error('Error saving user:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al guardar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al guardar el usuario.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md my-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
                    {initialData ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">Nombre de Usuario:</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                            {initialData ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}:
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formData.password}
                            onChange={handleChange}
                            required={!initialData} // Requerida solo para nuevos usuarios
                            disabled={loading}
                        />
                    </div>
                    {!initialData && (
                        <div className="mb-6">
                            <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
                                Confirmar Contraseña:
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required={!initialData}
                                disabled={loading}
                            />
                        </div>
                    )}
                    <div className="mb-4">
                        <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">Rol:</label>
                        <select
                            id="role"
                            name="role"
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formData.role}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        >
                            <option value="client">Cliente</option>
                            <option value="agent">Agente</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    {formData.role === 'agent' && (
                        <div className="mb-4">
                            <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label>
                            <select
                                id="department"
                                name="department_id"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={formData.department_id || ''}
                                onChange={handleChange}
                                disabled={loading}
                            >
                                <option value="">Seleccionar Departamento</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
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

export default UserForm;
