import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import api from '../config/axiosConfig';
import { User, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import { toast } from 'react-toastify';

// ✅ CORRECCIÓN FINAL DE IMPORTS:
// 1. Usamos import por defecto (sin llaves) porque tu TS dice que no hay miembro exportado.
import io from 'socket.io-client';

// 2. INFERENCIA DE TIPO:
// En lugar de importar 'Socket', calculamos el tipo basándonos en la función 'io'.
// Esto evita todos los errores de "Value vs Type" y "No exported member".
type SocketType = ReturnType<typeof io>;

// URL del Backend
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
    socket: SocketType | null; // Usamos nuestro tipo inferido
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
    
    // Usamos el tipo inferido aquí también
    const [socket, setSocket] = useState<SocketType | null>(null);

    // --- 1. LOGOUT ---
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }

        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
    }, [socket]); 
    
    // --- 2. VERIFICAR SESIÓN ---
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // --- 3. CONEXIÓN SOCKET.IO ---
    useEffect(() => {
        if (user && isAuthenticated && !socket) {
            // Usamos la función 'io' importada por defecto
            const newSocket = io(SOCKET_URL, {
                auth: { token: localStorage.getItem('token') },
                transports: ['websocket', 'polling']
            });
            
            newSocket.on('connect', () => {
                // console.log("Socket conectado");
            });

            newSocket.on('notification', (data: any) => {
                toast.info(`🔔 ${data.message}`);
            });
            
            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user, isAuthenticated, socket]);

    // --- 4. DASHBOARD UPDATE ---
    useEffect(() => {
        if (socket) {
            const handleDashboardUpdate = (data: any) => {
                // console.log("Dashboard update:", data);
            };
            socket.on('dashboard_update', handleDashboardUpdate);
            return () => {
                socket.off('dashboard_update', handleDashboardUpdate);
            };
        }
    }, [socket]);

    // --- 5. LOGIN ---
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