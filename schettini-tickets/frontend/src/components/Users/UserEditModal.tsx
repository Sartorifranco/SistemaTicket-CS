// frontend/src/components/Users/UserEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Common/Modal'; // Importar el componente Modal genérico
import api from '../../config/axiosConfig';
import { useNotification } from '../../context/NotificationContext';
import { User, Department } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null; // El usuario a editar (o null para crear)
    onUserUpdated: () => void; // Callback para notificar al padre que un usuario fue actualizado/creado
    token: string | null; // Token de autenticación
    departments: Department[]; // Lista de departamentos para el selector
}

const UserEditModal: React.FC<UserEditModalProps> = ({
    isOpen,
    onClose,
    user,
    onUserUpdated,
    token,
    departments,
}) => {
    const { addNotification } = useNotification();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<User['role']>('client'); // Rol por defecto 'client'
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Resetear el estado del formulario cuando el modal se abre o el usuario a editar cambia
    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
            setRole(user.role);
            setDepartmentId(user.department_id || null);
            setPassword(''); // No precargar contraseñas por seguridad
        } else {
            setUsername('');
            setEmail('');
            setRole('client');
            setDepartmentId(null);
            setPassword('');
        }
    }, [user, isOpen]); // Añadir isOpen a las dependencias para resetear al abrir

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validación del lado del cliente
        if (!username.trim() || !email.trim() || !role) {
            addNotification('Todos los campos obligatorios deben ser completados.', 'warning');
            setLoading(false);
            return;
        }

        if (!user && !password.trim()) {
            addNotification('La contraseña es obligatoria para nuevos usuarios.', 'warning');
            setLoading(false);
            return;
        }

        // Validación de departamento para agentes y administradores
        if (role !== 'client' && departmentId === null) {
            addNotification('Los agentes y administradores deben tener un departamento asignado.', 'warning');
            setLoading(false);
            return;
        }

        try {
            if (!token) {
                addNotification('No autorizado. Token no disponible.', 'error');
                setLoading(false);
                return;
            }

            const userData: any = {
                username: username.trim(),
                email: email.trim(),
                role,
                department_id: role === 'client' ? null : departmentId, // Enviar null si es cliente
            };

            if (password.trim()) { // Solo añadir la contraseña si no está vacía
                userData.password = password.trim();
            }

            if (user) {
                // Actualizar usuario existente
                await api.put(`/api/users/${user.id}`, userData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Usuario actualizado exitosamente.', 'success');
            } else {
                // Crear nuevo usuario
                await api.post('/api/users', userData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Usuario creado exitosamente.', 'success');
            }
            onUserUpdated(); // Notificar al padre que un usuario fue actualizado/creado
            onClose(); // Cerrar el modal
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al guardar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al guardar el usuario.', 'error');
            }
            console.error('Error saving user:', err);
        } finally {
            setLoading(false);
        }
    }, [username, email, role, departmentId, password, user, token, addNotification, onUserUpdated, onClose]);

    const modalTitle = user ? `Editar Usuario: ${user.username}` : 'Crear Nuevo Usuario';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit} className="p-4 space-y-4"> {/* Añadido padding y espacio entre elementos */}
                {/* El mensaje de error local se elimina, las notificaciones se muestran con addNotification */}
                
                <div>
                    <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">Nombre de Usuario:</label>
                    <input
                        type="text"
                        id="username"
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                    <input
                        type="email"
                        id="email"
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">Rol:</label>
                    <select
                        id="role"
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={role}
                        onChange={(e) => setRole(e.target.value as User['role'])}
                        disabled={loading}
                        required
                    >
                        <option value="client">Cliente</option>
                        <option value="agent">Agente</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label>
                    <select
                        id="department"
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={departmentId || ''} // Usar '' para la opción "Seleccionar Departamento"
                        onChange={(e) => setDepartmentId(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={loading || role === 'client'} // Deshabilitar si es cliente
                    >
                        <option value="">Seleccionar Departamento</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                    {role === 'client' && (
                        <p className="text-sm text-gray-500 mt-1">Los clientes no necesitan un departamento asignado.</p>
                    )}
                </div>

                <div>
                    <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Contraseña {user ? '(dejar vacío para no cambiar)' : '*'}:</label>
                    <input
                        type="password"
                        id="password"
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="new-password"
                        required={!user} // Requerir contraseña solo para nuevos usuarios
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UserEditModal;
