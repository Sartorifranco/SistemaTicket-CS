// src/services/userService.ts
import api from '../config/axiosConfig';
import { User } from '../types'; // Asegúrate de que User sí se importa de aquí

// Define las interfaces NewUser y UpdateUser aquí si no están ya
export interface NewUser {
    username: string;
    email: string;
    password?: string; // La contraseña es opcional para NewUser si tu backend la genera o si hay otros métodos de registro
    role: 'client' | 'agent' | 'admin';
    department_id?: number | null;
}

export interface UpdateUser {
    username?: string;
    email?: string;
    password?: string;
    role?: 'client' | 'agent' | 'admin';
    department_id?: number | null;
}

const userService = {
    // Función para obtener todos los usuarios
    getAllUsers: async (token: string) => {
        const response = await api.get<{ users: User[] }>('/api/users', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.users;
    },

    // Función para crear un nuevo usuario
    createUser: async (userData: NewUser, token: string) => {
        const response = await api.post<User>('/api/users', userData, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    // Función para actualizar un usuario existente
    updateUser: async (id: number, userData: UpdateUser, token: string) => {
        const response = await api.put<User>(`/api/users/${id}`, userData, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    // Función para eliminar un usuario
    deleteUser: async (id: number, token: string) => {
        await api.delete(`/api/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};

export default userService;
