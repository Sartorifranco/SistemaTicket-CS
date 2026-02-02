import api from '../config/axiosConfig';

/**
 * Interface representing a single ticket in the system.
 */
export interface Ticket {
    id: number;
    user_id: number;
    agent_id: number | null; // Agent ID can be null if not assigned
    department_id: number;
    user_username: string;
    department_name: string;
    agent_username: string | null; // Agent username can be null if not assigned
    subject: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'assigned' | 'reopened'; // Added 'reopened' for completeness
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string; // ISO 8601 string
    updated_at: string; // ISO 8601 string
    closed_at?: string | null; // Optional, for when the ticket is closed
    // Assuming comments are part of the TicketData type in other components,
    // but not necessarily returned by all ticket endpoints.
    comments?: Comment[];
}

/**
 * Interface representing a comment on a ticket.
 */
export interface Comment {
    id: number;
    ticket_id: number;
    user_id: number;
    user_username: string;
    message: string; // Changed from comment_text to message based on AdminTicketPage
    created_at: string; // ISO 8601 string
}

/**
 * Interface representing an attachment to a ticket.
 */
export interface Attachment {
    id: number;
    ticket_id: number;
    user_id: number;
    file_name: string;
    file_type: string;
    file_path: string;
    file_size: number; // Size in bytes
    created_at: string; // ISO 8601 string
}

/**
 * Service for interacting with the ticket-related API endpoints.
 */
const ticketService = {
    /**
     * Fetches all tickets.
     * @param token The authentication token.
     * @returns A promise that resolves to an array of Ticket objects.
     */
    getAllTickets: async (token: string): Promise<Ticket[]> => {
        const response = await api.get<{ tickets: Ticket[] }>('/api/tickets', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.tickets;
    },

    /**
     * Fetches a single ticket by its ID, including its comments.
     * @param ticketId The ID of the ticket to fetch.
     * @param token The authentication token.
     * @returns A promise that resolves to an object containing the ticket and its comments.
     */
    getTicketById: async (ticketId: number, token: string): Promise<{ ticket: Ticket; comments: Comment[] }> => {
        const response = await api.get<{ success: boolean; ticket: Ticket; comments: Comment[] }>(
            `/api/tickets/${ticketId}`,
            { headers: { Authorization: `Bearer ${token}` } } // Pass token for authentication
        );
        return { ticket: response.data.ticket, comments: response.data.comments };
    },

    /**
     * Creates a new ticket.
     * @param ticketData The data for the new ticket.
     * @param token The authentication token.
     * @returns A promise that resolves to the created Ticket object.
     */
    createTicket: async (
        ticketData: { subject: string; description: string; department_id: number; priority?: 'low' | 'medium' | 'high' | 'urgent' },
        token: string
    ): Promise<Ticket> => {
        const response = await api.post<{ success: boolean; ticket: Ticket }>(
            '/api/tickets',
            ticketData,
            { headers: { Authorization: `Bearer ${token}` } } // Pass token for authentication
        );
        return response.data.ticket;
    },

    /**
     * Updates an existing ticket.
     * @param ticketId The ID of the ticket to update.
     * @param ticketData The partial data to update the ticket with.
     * @param token The authentication token.
     * @returns A promise that resolves to the updated Ticket object.
     */
    updateTicket: async (ticketId: number, ticketData: Partial<Ticket>, token: string): Promise<Ticket> => {
        const response = await api.put<{ success: boolean; ticket: Ticket }>(
            `/api/tickets/${ticketId}`,
            ticketData,
            { headers: { Authorization: `Bearer ${token}` } } // Pass token for authentication
        );
        return response.data.ticket;
    },

    /**
     * Deletes a ticket by its ID.
     * @param ticketId The ID of the ticket to delete.
     * @param token The authentication token.
     * @returns A promise that resolves when the ticket is deleted.
     */
    deleteTicket: async (ticketId: number, token: string): Promise<void> => {
        await api.delete(`/api/tickets/${ticketId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    /**
     * Adds a comment to a specific ticket.
     * @param ticketId The ID of the ticket to add the comment to.
     * @param message The text content of the comment.
     * @param token The authentication token.
     * @returns A promise that resolves to the created Comment object.
     */
    addCommentToTicket: async (ticketId: number, message: string, token: string): Promise<Comment> => {
        const response = await api.post<{ success: boolean; comment: Comment }>(
            `/api/tickets/${ticketId}/comments`,
            { message: message }, // Changed from comment_text to message based on AdminTicketPage
            { headers: { Authorization: `Bearer ${token}` } } // Pass token for authentication
        );
        return response.data.comment;
    },

    /**
     * Fetches all comments for a specific ticket.
     * @param ticketId The ID of the ticket to fetch comments for.
     * @param token The authentication token.
     * @returns A promise that resolves to an array of Comment objects.
     */
    getCommentsForTicket: async (ticketId: number, token: string): Promise<Comment[]> => {
        const response = await api.get<{ success: boolean; comments: Comment[] }>(
            `/api/tickets/${ticketId}/comments`,
            { headers: { Authorization: `Bearer ${token}` } } // Pass token for authentication
        );
        return response.data.comments;
    },

    /**
     * Assigns a ticket to an agent.
     * @param ticketId The ID of the ticket to assign.
     * @param agentId The ID of the agent to assign the ticket to (or null to unassign).
     * @param token The authentication token.
     * @returns A promise that resolves when the assignment is complete.
     */
    assignTicketToAgent: async (ticketId: number, agentId: number | null, token: string): Promise<void> => {
        await api.put(
            `/api/tickets/${ticketId}/assign`,
            { agent_id: agentId },
            { headers: { Authorization: `Bearer ${token}` } } // Pass token for authentication
        );
    },

    /**
     * Changes the status of a ticket.
     * @param ticketId The ID of the ticket to change the status for.
     * @param status The new status of the ticket.
     * @param token The authentication token.
     * @returns A promise that resolves when the status is updated.
     */
    changeTicketStatus: async (ticketId: number, status: Ticket['status'], token: string): Promise<void> => {
        await api.put(
            `/api/tickets/${ticketId}/status`,
            { status: status },
            { headers: { Authorization: `Bearer ${token}` } } // Pass token for authentication
        );
    },

    /**
     * Uploads an attachment to a ticket.
     * @param ticketId The ID of the ticket to add the attachment to.
     * @param file The file to upload.
     * @param token The authentication token.
     * @returns A promise that resolves to the created Attachment object.
     */
    uploadAttachment: async (ticketId: number, file: File, token: string): Promise<Attachment> => {
        const formData = new FormData();
        formData.append('file', file);

        const headers = {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}` // Pass token for authentication
        };

        const response = await api.post<{ success: boolean; attachment: Attachment }>(
            `/api/tickets/${ticketId}/upload`,
            formData,
            { headers }
        );
        return response.data.attachment;
    },
};

export default ticketService;
