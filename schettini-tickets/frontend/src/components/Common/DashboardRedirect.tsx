// src/components/Common/DashboardRedirect.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DashboardRedirect: React.FC = () => {
    const { user, loading, isAuthenticated } = useAuth(); // CAMBIADO: authLoading a loading
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) { // Esperar a que la autenticación inicial termine
            if (isAuthenticated && user) {
                if (user.role === 'admin') {
                    navigate('/admin-dashboard');
                } else if (user.role === 'agent') {
                    navigate('/agent-dashboard'); // Asumiendo que tienes un dashboard para agentes
                } else {
                    navigate('/client-dashboard');
                }
            } else {
                // Si no está autenticado después de la carga, redirigir al login
                navigate('/login');
            }
        }
    }, [user, loading, isAuthenticated, navigate]);

    // Opcional: Mostrar un spinner o mensaje de carga mientras se redirige
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return null; // No renderizar nada si no está cargando y no se ha redirigido aún
};

export default DashboardRedirect;
