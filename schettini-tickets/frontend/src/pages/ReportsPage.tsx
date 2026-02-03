import React from 'react';
import AdminReportsPage from './AdminReportsPage'; // Importamos el componente completo

// Este componente ahora es solo un "alias" o contenedor para el reporte completo
// Así mantenemos tu estructura de rutas pero mostramos el reporte poderoso
const ReportsPage: React.FC = () => {
    return (
        <AdminReportsPage />
    );
};

export default ReportsPage;