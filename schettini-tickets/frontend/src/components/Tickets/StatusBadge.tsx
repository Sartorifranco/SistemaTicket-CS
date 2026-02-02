// src/components/Tickets/StatusBadge.tsx

import React from 'react';
import { ticketStatusTranslations } from '../../utils/traslations';
import { TicketStatus } from '../../types';

interface StatusBadgeProps {
    status: TicketStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const getStatusStyles = (status: TicketStatus): string => {
        const baseClasses = "px-3 py-1 text-xs font-semibold leading-5 rounded-full inline-flex items-center justify-center";
        
        switch (status) {
            case 'open':
                return `${baseClasses} bg-blue-100 text-blue-800`;
            case 'in-progress':
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
            case 'resolved':
                return `${baseClasses} bg-cyan-100 text-cyan-800`;
            case 'closed':
                return `${baseClasses} bg-green-100 text-green-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

    return (
        <span className={getStatusStyles(status)}>
            {ticketStatusTranslations[status] || status}
        </span>
    );
};

export default StatusBadge;