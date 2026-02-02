import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axiosConfig';
import { Company, Department } from '../../types';

const ClientProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [department, setDepartment] = useState<Department | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchClientDetails = useCallback(async () => {
        if (!user || !user.company_id || !user.department_id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [companyRes, deptRes] = await Promise.all([
                api.get(`/api/companies/${user.company_id}`),
                api.get(`/api/departments/${user.department_id}`)
            ]);
            setCompany(companyRes.data.data);
            setDepartment(deptRes.data.data);
        } catch (error) {
            console.error("Error al cargar detalles del cliente:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchClientDetails();
        }
    }, [user, fetchClientDetails]);
    
    if (!user) {
        return <div className="p-8 text-center">Cargando perfil...</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div>
                {/* ✅ Responsive titles */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Tu Perfil de Cliente</h1>
                <p className="text-md sm:text-lg text-gray-500">Hola, {user.username}. Aquí está la información de tu cuenta.</p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-6 border-b pb-4">Detalles de tu Cuenta</h2>
                {/* ✅ The grid was already responsive, which is great. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-gray-600">
                    <p><strong>Nombre de Usuario:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Rol:</strong> <span className="font-semibold text-blue-600 capitalize">{user.role}</span></p>
                    <p><strong>Empresa:</strong> {loading ? 'Cargando...' : company?.name || 'No asignada'}</p>
                    <p><strong>Departamento:</strong> {loading ? 'Cargando...' : department?.name || 'No asignado'}</p>
                </div>
            </div>
        </div>
    );
};

export default ClientProfilePage;