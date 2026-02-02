import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PrivateRouteProps {
    children: React.ReactElement;
    roles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

    // Mientras se verifica la autenticación, se muestra una pantalla de carga.
    if (loading) {
        return <div className="flex justify-center items-center h-screen">Cargando...</div>;
    }

    // Si no está autenticado, se redirige a la página de login.
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Si la ruta requiere roles específicos y el usuario no tiene el rol adecuado,
    // se muestra un mensaje de acceso denegado.
    if (roles && roles.length > 0 && user && !roles.includes(user.role)) {
        return <div className="p-8 text-center text-red-500">No tienes permiso para acceder a esta página.</div>;
    }

    // Si pasa todas las validaciones, se renderiza la página solicitada.
    return children;
};

export default PrivateRoute;

