import axios, { InternalAxiosRequestConfig } from 'axios';

// URL del backend: en local usa localhost:5050; en producción DEBE usar REACT_APP_API_URL (ej. https://api.sch-soporte.com.ar).
// Si no está definida en producción, se usa window.location.origin y las imágenes/adjuntos fallan cuando frontend y backend están en dominios distintos.
// Nota: Si migrás a Vite, usar import.meta.env.VITE_API_URL.
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
export const API_BASE_URL = isLocal
    ? 'http://localhost:5050'
    : (process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : ''));

console.log(`[Axios] Entorno detectado: ${API_BASE_URL}`);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // No enviar token en login/register para evitar Bearer null/undefined que provoca 401
        const isAuthRoute = config.url?.includes('/api/auth/login') || config.url?.includes('/api/auth/register');
        if (!isAuthRoute) {
            const token = localStorage.getItem('token');
            // Solo añadir si es un token válido (no null, undefined o string vacío)
            if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } else {
            // En login/register: asegurar que no llevamos Authorization (evitar token caducado/inválido)
            delete config.headers.Authorization;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;