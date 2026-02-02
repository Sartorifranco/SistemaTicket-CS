import React from 'react';
import { IconType } from 'react-icons';
import { IconBaseProps } from 'react-icons/lib';

interface IconWrapperProps extends IconBaseProps {
    icon: IconType;
}

const IconWrapper: React.FC<IconWrapperProps> = ({ icon, ...props }) => {
    // ✅ Solución Definitiva:
    // En lugar de tratar el ícono como un componente JSX (<Icon />),
    // lo llamamos directamente como una función y renderizamos su resultado.
    // Esto evita el conflicto de tipos que tu proyecto está experimentando.
    const iconElement = icon(props);
    
    return <>{iconElement}</>;
};

export default IconWrapper;