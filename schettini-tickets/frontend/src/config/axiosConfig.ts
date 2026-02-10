import axios, { InternalAxiosRequestConfig } from 'axios';

// 🔥 SOLUCIÓN FINAL (Detectar URL del navegador):
// Si el navegador dice que estamos en "localhost", usa el puerto 5050.
// Si no, usa la URL FIJA de tu backend en Render.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE_URL = isLocal 
    ? 'http://localhost:5050' 
    : 'https://backend-schettini.onrender.com'; // <--- URL FIJA AQUÍ

console.log(`[Axios] Entorno: ${isLocal ? 'LOCAL' : 'NUBE'}`);
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
            console.error(`❌ Error Crítico: No se puede conectar al Backend en ${API_BASE_URL}`);
        }
        return Promise.reject(error);
    }
);

export default api;