import axios, { InternalAxiosRequestConfig } from 'axios';

// ✅ LÓGICA HÍBRIDA (Local vs Nube)
// 1. Si existe una variable de entorno (Producción), usa esa.
// 2. Si no, usa la lógica de localhost/red (Desarrollo).
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5050`;

console.log(`[Axios] Conectando a: ${API_BASE_URL}`);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // withCredentials: true // Descomentar si tienes problemas de cookies/CORS en el futuro
});

// Interceptor para inyectar el Token (Auth)
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

// Interceptor de Respuestas (Manejo de Errores Global)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === "ERR_NETWORK") {
            console.error(`❌ Error de Red: No se puede conectar al Backend en ${API_BASE_URL}`);
        }
        if (error.response && error.response.status === 401) {
            console.warn("⚠️ Sesión expirada o token inválido.");
            // Opcional: localStorage.removeItem('token'); window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;