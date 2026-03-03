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
    supervisor: 'Supervisor',
    admin: 'Administrador',
    viewer: 'Vista',
};

// Planes (Free, Pro, Enterprise -> español)
export const planNameTranslations: Record<string, string> = {
    Free: 'Gratuito',
    free: 'Gratuito',
    Pro: 'Profesional',
    pro: 'Profesional',
    Enterprise: 'Empresarial',
    enterprise: 'Empresarial',
    Premium: 'Premium',
    premium: 'Premium',
};
export const getPlanLabel = (plan: string | null | undefined): string => {
    if (!plan) return 'Gratuito';
    return planNameTranslations[plan] || plan;
};

