import React from 'react';
import { User, Department } from '../../types';

interface UsersProps {
    users: User[];
    departments: Department[];
    loading: boolean;
    error: string | null;
    onEditUser: (user: User) => void;
    onDeleteUser: (id: number, username: string) => void;
}

const Users: React.FC<UsersProps> = ({ users, departments, loading, error, onEditUser, onDeleteUser }) => {

    const getDepartmentName = (id: number | null) => {
        const dept = departments.find(d => d.id === id);
        return dept ? dept.name : 'N/A';
    };

    if (loading) {
        return <p className="text-center text-gray-600 p-8">Cargando usuarios...</p>;
    }

    if (error) {
        return <p className="text-center text-red-500 p-8">Error: {error}</p>;
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            {users.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No hay usuarios registrados.</p>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre de Usuario</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4">{user.id}</td>
                                    <td className="px-6 py-4">{user.username}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'agent' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{getDepartmentName(user.department_id)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => onEditUser(user)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                        <button onClick={() => onDeleteUser(user.id, user.username)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {users.map((user) => (
                            <div key={user.id} className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-800">{user.username}</p>
                                        <p className="text-sm text-gray-600">{user.email}</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${
                                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                        user.role === 'agent' ? 'bg-red-100 text-red-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {user.role}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 mt-2">
                                    <p><strong>Departamento:</strong> {getDepartmentName(user.department_id)}</p>
                                </div>
                                <div className="mt-4 pt-2 border-t flex justify-end gap-4">
                                    <button onClick={() => onEditUser(user)} className="text-indigo-600 font-semibold hover:underline">Editar</button>
                                    <button onClick={() => onDeleteUser(user.id, user.username)} className="text-red-600 font-semibold hover:underline">Eliminar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Users;