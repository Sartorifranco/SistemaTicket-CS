import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasAnyPermission } from '../../utils/permissions';

interface PrivateRouteProps {
    children: React.ReactElement;
    roles?: string[];
    /** Un permiso o lista de permisos (cualquiera cumple) */
    permission?: string | string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles, permission }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Cargando...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && roles.length > 0 && user && !roles.includes(user.role)) {
        return <div className="p-8 text-center text-red-500">No tienes permiso para acceder a esta página.</div>;
    }

    if (permission && (user?.role === 'agent' || user?.role === 'supervisor' || user?.role === 'viewer')) {
        const perms = user.permissions || [];
        const required = Array.isArray(permission) ? permission : [permission];
        if (!hasAnyPermission(perms, required)) {
            return <div className="p-8 text-center text-red-500">No tienes permiso para acceder a esta página.</div>;
        }
    }

    return children;
};

export default PrivateRoute;

