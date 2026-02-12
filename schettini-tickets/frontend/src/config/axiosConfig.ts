import axios, { InternalAxiosRequestConfig } from 'axios';

// URL del backend: en local usa localhost:5050; en producción usa REACT_APP_API_URL o la misma URL del sitio (VPS mismo servidor).
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
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;