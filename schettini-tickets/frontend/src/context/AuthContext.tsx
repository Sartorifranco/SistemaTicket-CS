import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import api from '../config/axiosConfig';
import { User, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import io, { type Socket } from 'socket.io-client';
import { toast } from 'react-toastify';

// URL del Backend para Socket
const SOCKET_URL = 'http://localhost:5050'; 

interface LoginData {
    email: string;
    password: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    socket: Socket | null; // <--- Agregamos Socket al contexto
    login: (credentials: LoginData) => Promise<boolean>;
    register: (userData: any) => Promise<boolean>;
    logout: () => void;
    clearError: () => void;
    updateUserContext: (updatedUserData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null); // Estado del socket

    // --- LOGOUT ---
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        
        // Desconectar socket si existe
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }

        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
    }, [socket]);
    
    // --- VERIFICAR SESIÓN ---
    useEffect(() => {
        const verifyUserSession = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                    const response = await api.get('/api/auth/me');
                    const userData = response.data.user;

                    setUser(userData);
                    setIsAuthenticated(true);
                    setToken(storedToken);
                } catch (err) {
                    logout(); 
                }
            }
            setLoading(false);
        };
        verifyUserSession();
    }, []); // Eliminé logout de deps para evitar loop

    // --- CONEXIÓN SOCKET.IO (La magia está aquí) ---
    useEffect(() => {
        if (user && isAuthenticated && !socket) {
            const newSocket = io(SOCKET_URL);
            
            // Autenticarse en el socket (Enviar ID de usuario)
            newSocket.emit('authenticate', user.id);

            // Escuchar notificaciones
            newSocket.on('notification', (data: any) => {
                toast.info(`🔔 ${data.message}`);
                // Aquí podrías disparar una función para recargar la lista de notificaciones
            });
            
            // Escuchar actualizaciones del dashboard
            newSocket.on('dashboard_update', (data: any) => {
                console.log("Dashboard update:", data);
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user, isAuthenticated]); // Se conecta solo cuando hay usuario logueado

    // --- LOGIN ---
    const login = useCallback(async (credentials: LoginData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/api/auth/login', credentials);
            
            if (response.data && response.data.token && response.data.user) {
                const { token: newToken, user: userData } = response.data;
    
                localStorage.setItem('token', newToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                
                setToken(newToken);
                setUser(userData);
                setIsAuthenticated(true);
    
                setLoading(false);
                return true; 
            } else {
                throw new Error('Formato de respuesta inválido.');
            }
        } catch (err: unknown) {
            setLoading(false);
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error de inicio de sesión.' : 'Error inesperado.';
            setError(message);
            return false; 
        }
    }, []);

    const register = useCallback(async (userData: any) => { return false; }, []);
    const clearError = useCallback(() => setError(null), []);
    const updateUserContext = useCallback((updatedUserData: Partial<User>) => {
        setUser(prevUser => prevUser ? { ...prevUser, ...updatedUserData } : null);
    }, []);

    const value = { user, token, isAuthenticated, loading, error, socket, login, register, logout, clearError, updateUserContext };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};