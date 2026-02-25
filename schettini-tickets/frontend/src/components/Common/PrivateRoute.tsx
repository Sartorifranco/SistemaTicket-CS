import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PrivateRouteProps {
    children: React.ReactElement;
    roles?: string[];
    permission?: string;
}

/** Permisos granulares requeridos por ruta. Compatible con nombres legacy. */
const LEGACY_PERMISSION_MAP: Record<string, string> = {
    tickets_view: 'tickets',
    repairs_view: 'repair_orders',
    quoter_access: 'cotizador',
};

function hasRequiredPermission(userPerms: string[] | undefined, required: string): boolean {
    const perms = userPerms || [];
    if (perms.includes(required)) return true;
    const legacy = LEGACY_PERMISSION_MAP[required];
    return legacy ? perms.includes(legacy) : false;
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

    if (permission && (user?.role === 'agent' || user?.role === 'supervisor')) {
        const perms = user.permissions || [];
        if (!hasRequiredPermission(perms, permission)) {
            return <div className="p-8 text-center text-red-500">No tienes permiso para acceder a esta página.</div>;
        }
    }

    return children;
};

export default PrivateRoute;

