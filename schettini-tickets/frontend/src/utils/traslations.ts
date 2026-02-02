// frontend/src/utils/traslations.ts

import { TicketStatus, TicketPriority, UserRole } from '../types'; // Importar los tipos

// Mapeo de traducciones para estados de tickets
export const ticketStatusTranslations: Record<TicketStatus, string> = {
    open: 'Abierto',
    'in-progress': 'En Progreso',
    resolved: 'Resuelto',
    closed: 'Cerrado',
    reopened: 'Reabierto',
};

// Mapeo de traducciones para prioridades de tickets
export const ticketPriorityTranslations: Record<TicketPriority, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
};

// Mapeo de traducciones para roles de usuario
export const userRoleTranslations: Record<UserRole, string> = {
    client: 'Cliente',
    agent: 'Agente',
    admin: 'Administrador',
};

