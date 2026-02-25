import React from 'react';

interface SectionCardProps {
    title: string;
    children: React.ReactNode;
    /** Usar para secciones de peligro (ej. Zona de Peligro) */
    variant?: 'default' | 'danger';
    /** Permite que el contenido (ej. dropdowns) se muestre fuera del card sin recortarse */
    overflowVisible?: boolean;
    className?: string;
}

/**
 * Tarjeta de sección con título destacado (estilo barra de navegación gray-900).
 * Usar en todas las páginas para consistencia visual.
 */
const SectionCard: React.FC<SectionCardProps> = ({ title, children, variant = 'default', overflowVisible = false, className = '' }) => {
    const headerClass = variant === 'danger'
        ? 'bg-red-900 text-white'
        : 'bg-gray-900 text-white';

    return (
        <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'} ${className}`}>
            <h2 className={`px-6 py-3 text-lg font-bold ${headerClass}`}>{title}</h2>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
};

export default SectionCard;
