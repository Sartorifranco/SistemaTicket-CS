import axios, { InternalAxiosRequestConfig } from 'axios';

// 🔥 DETECCIÓN DE ENTORNO
// Exportamos esta constante para usarla también en las IMÁGENES
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5050' 
    : 'https://backend-schettini.onrender.com';

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