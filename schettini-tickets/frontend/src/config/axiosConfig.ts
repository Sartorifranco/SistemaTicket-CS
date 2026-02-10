import axios, { InternalAxiosRequestConfig } from 'axios';

// ✅ LÓGICA CORREGIDA:
// 1. Primero busca la variable de entorno de Render (VITE_API_URL).
// 2. Si no existe (estás en tu PC), usa localhost:5050.
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5050`;

console.log(`[Axios] Conectando a: ${API_BASE_URL}`);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log para depurar errores de conexión
        if (error.code === "ERR_NETWORK") {
            console.error(`❌ Error de Red: No se puede conectar al Backend en ${API_BASE_URL}`);
        }
        return Promise.reject(error);
    }
);

export default api;