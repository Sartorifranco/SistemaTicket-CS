import React from 'react';
import { Department } from '../../types';
import { formatLocalDate } from '../../utils/dateFormatter';

interface DepartmentsListProps {
    departments: Department[];
    loading: boolean;
    onEdit: (department: Department) => void;
    onDelete: (id: number) => void;
}

const DepartmentsList: React.FC<DepartmentsListProps> = ({ departments, loading, onEdit, onDelete }) => {

    if (loading) {
        return <p className="p-8 text-center text-gray-600">Cargando departamentos...</p>;
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            {departments.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No hay departamentos registrados.</p>
            ) : (
                <>
                    {/* VISTA DE TABLA PARA ESCRITORIO */}
                    <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {departments.map((dept) => (
                                <tr key={dept.id}>
                                    <td className="px-6 py-4">{dept.id}</td>
                                    <td className="px-6 py-4">{dept.name}</td>
                                    <td className="px-6 py-4">{dept.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => onEdit(dept)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                        <button onClick={() => onDelete(dept.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* VISTA DE TARJETAS PARA MÓVILES */}
                    <div className="md:hidden space-y-4">
                        {departments.map((dept) => (
                            <div key={dept.id} className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-gray-800">{dept.name}</p>
                                    <p className="text-xs text-gray-500">ID: {dept.id}</p>
                                </div>
                                <p className="text-sm text-gray-600 mt-2">{dept.description}</p>
                                <div className="mt-4 pt-2 border-t flex justify-end gap-4">
                                    <button onClick={() => onEdit(dept)} className="text-indigo-600 font-semibold hover:underline">Editar</button>
                                    <button onClick={() => onDelete(dept.id)} className="text-red-600 font-semibold hover:underline">Eliminar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default DepartmentsList;