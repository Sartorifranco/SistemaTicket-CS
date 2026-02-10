import axios, { InternalAxiosRequestConfig } from 'axios';

// ✅ LÓGICA HÍBRIDA (Local vs Nube)
// 1. Si existe la variable de Render (VITE_API_URL), usa esa.
// 2. Si no, usa la lógica de tu PC (localhost:5050).
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
        if (error.code === "ERR_NETWORK") {
            console.error(`❌ Error de Red: No se puede conectar al Backend en ${API_BASE_URL}`);
        }
        return Promise.reject(error);
    }
);

export default api;