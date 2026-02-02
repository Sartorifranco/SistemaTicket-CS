import React, { useState, useEffect } from 'react';
import api from '../../config/axiosConfig';
import { User, Department, Company, NewUser, UpdateUser } from '../../types';
import { toast } from 'react-toastify';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: NewUser | UpdateUser) => Promise<void>;
    initialData: User | null;
    departments: Department[];
    companies: Company[];
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, initialData, departments, companies }) => {
    
    const getInitialFormData = () => ({
        firstName: '',
        lastName: '',
        email: initialData?.email || '',
        password: '',
        confirmPassword: '',
        role: initialData?.role || 'client' as 'admin' | 'agent' | 'client',
        department_id: initialData?.department_id || null as number | null,
        company_id: initialData?.company_id || null as number | null,
    });

    const [formData, setFormData] = useState(getInitialFormData);
    const [loading, setLoading] = useState(false);
    const [isInternal, setIsInternal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData());
            setIsInternal(false);
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['department_id', 'company_id'].includes(name) && value ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!initialData && !isInternal && formData.password !== formData.confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        try {
            if (initialData) {
                // UPDATE (Usa la función onSave del padre)
                const updateData: UpdateUser = {
                    email: formData.email,
                    role: formData.role,
                    department_id: formData.department_id,
                    company_id: formData.company_id,
                };
                if (formData.password) updateData.password = formData.password;
                
                await onSave(updateData);
            } else {
                // CREATE (Nuevo Usuario)
                const newData = {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                    department_id: formData.department_id,
                    company_id: formData.company_id,
                    isInternal: isInternal // Flag para usuario interno
                };

                // ⚠️ CAMBIO CLAVE: Usamos '/users' en lugar de '/auth/register'
                // Esto asegura que use la función createUser del backend (la que modificamos)
                await api.post('/api/users', newData);
                
                toast.success('Usuario creado exitosamente.');
                
                // Recargar para ver el nuevo usuario en la tabla
                window.location.reload(); 
            }
            
            onClose();
        } catch (error: any) {
            console.error('Error:', error);
            const msg = error.response?.data?.message || 'Error al guardar usuario';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">
                    {initialData ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </h2>
                <form onSubmit={handleSubmit}>
                    
                    {!initialData && (
                        <>
                            {/* CHECKBOX INTERNO */}
                            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 flex items-center gap-3 mb-4">
                                <input 
                                    type="checkbox" 
                                    id="isInternal"
                                    checked={isInternal}
                                    onChange={(e) => setIsInternal(e.target.checked)}
                                    className="w-5 h-5 text-yellow-600 rounded cursor-pointer"
                                />
                                <label htmlFor="isInternal" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                    Usuario Interno (Sin Acceso)
                                    <span className="block text-xs font-normal text-gray-500">
                                        No requiere email ni contraseña. Solo para asignación de tickets.
                                    </span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-gray-700 font-medium">Nombre:</label>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-2 border rounded mt-1" required disabled={loading} />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium">Apellido:</label>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-2 border rounded mt-1" required disabled={loading} />
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Campos de Email y Password ocultos si es interno */}
                    {!isInternal && (
                        <>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium">Email:</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded mt-1" required={!isInternal} disabled={loading} />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium">{initialData ? 'Nueva Contraseña (opcional)' : 'Contraseña'}:</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full p-2 border rounded mt-1" required={!initialData && !isInternal} disabled={loading} />
                            </div>

                            {!initialData && (
                                 <div className="mb-4">
                                    <label className="block text-gray-700 font-medium">Confirmar Contraseña:</label>
                                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full p-2 border rounded mt-1" required={!initialData && !isInternal} disabled={loading} />
                                </div>
                            )}
                        </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="company" className="block text-gray-700 font-medium">Empresa:</label>
                            <select id="company" name="company_id" className="w-full p-2 border rounded mt-1" value={formData.company_id || ''} onChange={handleChange} required disabled={loading}>
                                <option value="">Seleccionar Empresa</option>
                                {companies.map(comp => (
                                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="department" className="block text-gray-700 font-medium">Departamento:</label>
                            <select id="department" name="department_id" className="w-full p-2 border rounded mt-1" value={formData.department_id || ''} onChange={handleChange} required disabled={loading}>
                                <option value="">Seleccionar Departamento</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="role" className="block text-gray-700 font-medium">Rol:</label>
                        <select id="role" name="role" className="w-full p-2 border rounded mt-1" value={formData.role} onChange={handleChange} required disabled={loading}>
                            <option value="client">Cliente</option>
                            <option value="agent">Agente</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" disabled={loading}>
                            {loading ? 'Guardando...' : (initialData ? 'Actualizar' : 'Crear Usuario')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;