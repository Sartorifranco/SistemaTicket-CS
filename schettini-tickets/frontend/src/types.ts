import { ReactNode } from "react";

// --- CORE INTERFACES ---
export interface Attachment {
    id: number;
    file_name: string;
    file_path: string;
    file_type: string | null;
}

export interface Comment {
    user_username: ReactNode;
    id: number;
    ticket_id: number;
    user_id: number | null;
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
    id: number;
    username: string;
    email: string;
    role: UserRole;
    department_id: number | null;
    company_id: number | null;
    
    // Campos existentes (Mantenidos)
    company_name?: string;
    status?: 'active' | 'inactive'; 
    created_at?: string; 
    updated_at?: string;
    
    // Campos de Plan (Mantenidos)
    plan_id?: number;
    plan_name?: string;
    plan_color?: string;
    plan?: string;      // 👈 Agrega esto
   

    first_name?: string | null;
    last_name?: string | null;

    // ✅ NUEVOS CAMPOS (Agregados para el Registro y Admin Panel)
    is_active?: boolean;      // Para el estado Bloqueado/Activo
    business_name?: string;   // Razón Social
    fantasy_name?: string;    // Nombre Fantasía
    phone?: string;           // Teléfono / WhatsApp
    cuit?: string;            // CUIT / RUT
    last_login?: string;      // Para calcular inactividad
    
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
    department_id?: number | null;
}

// ====================================================================
// TICKET TYPES
// ====================================================================
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'reopened';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketData {
    id: number;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    
    // IDs
    user_id: number | null;
    category_id: number | null;
    department_id: number | null;
    assigned_to_user_id: number | null;
    location_id?: number | null;
    depositario_id?: number | null;

    // Fechas
    created_at: string;
    updated_at: string;
    closed_at?: string | null;
    resolved_at?: string | null;

    // Nombres expandidos (Joins)
    client_name: string; 
    agent_name: string | null;
    
    // 👇 AGREGA ESTO AQUÍ 👇
    user_username?: string; // Alias para compatibilidad con componentes viejos
    creator_name?: string;  // Otro alias común
    
    ticket_department_name?: string | null;
    category_name?: string; 
    ticket_category_name?: string;
    closure_reason?: string; 
    
    comments?: Comment[];
    attachments?: Attachment[];
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
    totalDepartments: number;
    totalUsers: number;
    totalTickets: number;
    ticketsByStatus: { status: TicketStatus; count: number }[];
    ticketsByPriority: { priority: TicketPriority; count: number }[];
    ticketsByDepartment: { departmentName: string; count: number }[];
}

export interface AgentMetrics {
    closedTickets: number;
    resolvedTickets: number;
    inProgressTickets: number;
    openTickets: number;
    totalTicketsAssigned: number;
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
// TIPOS DE USUARIO (Formularios)
// ====================================================================
export interface NewUser {
    username: string;
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
    status?: 'active' | 'inactive';
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
    last_maintenance?: string; 
    lat?: number | string | null;
    lng?: number | string | null;
    maintenance_freq?: number | string;
}

export interface MaintenanceTask {
    name: string;
    done: boolean;
    comment: string;
}

export interface MaintenanceRecord {
    id: number;
    depositario_id: number;
    user_id: number;
    username: string; 
    first_name?: string;
    last_name?: string;
    companion_name?: string;
    maintenance_date: string;
    tasks_log: MaintenanceTask[]; 
    observations: string;
    created_at: string;
}

export type ToastNotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: number | string;
    message: string;
    type: ToastNotificationType;
}

export interface Plan {
    id: number;
    name: string;
    color: string;
    price?: number;     // Nuevo
    features?: string;  // Nuevo (texto separado por enters o comas)
}

export interface SystemSettings {
    tech_hour_cost: string;
    payment_alias: string;
}

export interface Module {
    id: number;
    name: string;
    description: string;
    price: number;
}