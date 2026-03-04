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
        // No enviar token solo en login (para evitar Bearer null que provoca 401). En register sí lo enviamos si hay token (admin/supervisor creando usuario).
        const isLogin = config.url?.includes('/api/auth/login');
        const token = localStorage.getItem('token');
        if (isLogin) {
            delete config.headers.Authorization;
        } else if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;