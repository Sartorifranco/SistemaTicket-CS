import { ReactNode } from "react";

// --- CORE INTERFACES ---
export interface Attachment {
    id: number;
    file_name: string;
    file_path: string;
    file_type: string | null; // ✅ MODIFICACIÓN: Cambiado de 'any' a 'string | null'
}

export interface Comment {
    user_username: ReactNode;
    id: number;
    ticket_id: number;
    user_id: number | null; // User ID puede ser null para comentarios del sistema
    username: string;
    comment_text: string;
    created_at: string;
    updated_at: string;
    is_internal: boolean;
}

// ====================================================================
// COMPANY TYPES
// ====================================================================
export interface Company {
    id: number;
    name: string;
}

// ====================================================================
// USER TYPES
// ====================================================================
export type UserRole = 'admin' | 'agent' | 'client';

export interface User {
    last_name: any;
    first_name: any;
    id: number;
    username: string;
    email: string;
    role: UserRole;
    department_id: number | null;
    company_id: number | null;
    company_name?: string;
    created_at: string;
    updated_at: string;
}

// ====================================================================
// DEPARTMENT & PROBLEM TYPES
// ====================================================================
export interface Department {
    id: number;
    name: string;
    description: string;
    company_id?: number | null;
    company_name?: string;
    created_at: string;
    updated_at: string;
}

export interface TicketCategory {
    id: number;
    name: string;
}

export interface PredefinedProblem {
    id: number;
    title: string;
    description: string;
    department_id?: number | null; // Hecho opcional por si acaso
}

// ====================================================================
// TICKET TYPES
// ====================================================================
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'reopened';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketData {
    ticket_department_name?: number | null; // Debería ser string?
    category_name?: ReactNode; // Debería ser string?
    closure_reason?: string; 
    
    user_username?: ReactNode; // Este parece ser un tipo antiguo
    id: number;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    user_id: number | null;
    category_id: number | null;
    department_id: number | null;
    assigned_to_user_id: number | null;
    created_at: string;
    updated_at: string;
    location_id?: number | null;
    
    // Nombres que vienen de los JOINs en el backend
    client_name: string; 
    agent_name: string | null;
    ticket_category_name?: string; // Añadido en AdminTicketDetailPage
    
    // Propiedades opcionales
    comments?: Comment[];
    attachments?: Attachment[]; // ✅ Esta línea ya estaba, lo cual es bueno
    
    // Otros campos que puedas tener
    closed_at?: string | null;
    resolved_at?: string | null;
    feedback?: Feedback | null;
}

// ====================================================================
// ACTIVITY LOG TYPES
// ====================================================================
export interface ActivityLog {
    id: number;
    user_id: number | null;
    username: string;
    user_role: UserRole | null;
    action_type: string;
    description: string;
    target_type: string | null;
    target_id: number | null;
    old_value: any;
    new_value: any;
    created_at: string;
    user_username?: string;
}

// ====================================================================
// BACAR KEY TYPES
// ====================================================================
export interface BacarKey {
    id: number;
    device_user: string;
    username: string;
    password: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by_user_id?: number | null;
    created_by_username?: string | null;
}

export type BacarKeyFormData = Omit<BacarKey, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'created_by_username'>;

// ====================================================================
// REPORT & DASHBOARD TYPES
// ====================================================================
export interface ReportMetrics {
    totalDepartments: ReactNode;
    totalUsers: ReactNode;
    totalTickets: ReactNode;
    ticketsByStatus: { status: TicketStatus; count: number }[];
    ticketsByPriority: { priority: TicketPriority; count: number }[];
    ticketsByDepartment: { departmentName: string; count: number }[];
}

export interface AgentMetrics {
    closedTickets: any;
    resolvedTickets: any;
    inProgressTickets: ReactNode;
    openTickets: ReactNode;
    totalTicketsAssigned: ReactNode;
    assignedTickets: number;
    unassignedTickets: number;
    resolvedByMe: number;
}

// ====================================================================
// NOTIFICATION TYPES
// ====================================================================
export interface Notification {
    id: number;
    user_id: number;
    message: string;
    type: string;
    is_read: boolean;
    related_id: number | null;
    related_type: string | null;
    created_at: string;
}

export type ToastNotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: number | string;
    message: string;
    type: ToastNotificationType;
}

// ====================================================================
// API & OTHER TYPES
// ====================================================================
export interface ApiResponseError {
    message: string;
    details?: string;
    statusCode?: number;
}

export interface Feedback {
    id: number;
    ticket_id: number;
    user_id: number;
    rating: number;
    comment: string | null;
    created_at: string;
}

export interface AgentNote {
    id: number;
    content: string;
    updated_at: string;
}

// ====================================================================
// TIPOS DE USUARIO
// ====================================================================
export interface NewUser {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: UserRole;
    department_id: number | null;
    company_id: number | null;
}

export interface UpdateUser {
    username?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    department_id?: number | null;
    company_id?: number | null;
}
// ====================================================================
// DEPOSITARIOS & MANTENIMIENTO
// ====================================================================
export interface Depositario {
    id: number;
    alias: string;
    company_id: number;
    company_name?: string;
    serial_number: string;
    location_description: string;
    address: string;
    km_from_base: string;
    duration_trip: string;
    last_maintenance?: string; // Fecha
    lat?: number | string | null;
    lng?: number | string | null;
    maintenance_freq?: number | string;
}

export interface MaintenanceTask {
    name: string; // "Limpieza", "Clear RAM", etc.
    done: boolean;
    comment: string;
}

export interface MaintenanceRecord {
    id: number;
    depositario_id: number;
    user_id: number;
    username: string; // Del técnico
    first_name?: string;
    last_name?: string;
    companion_name?: string;
    maintenance_date: string;
    tasks_log: MaintenanceTask[]; // JSON parseado
    observations: string;
    created_at: string;
}