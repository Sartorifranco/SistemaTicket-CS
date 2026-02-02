import axios, { InternalAxiosRequestConfig } from 'axios';

// 1. Detección Inteligente del Host
// Esto permite que funcione en localhost y en red (192.168.x.x) sin cambiar código
const currentHost = window.location.hostname;

// 2. Construcción de la URL Base
// ✅ CORRECCIÓN: Cambiado de 5040 a 5050 (que es donde levantamos el servidor)
const PORT = 5050; 
const API_BASE_URL = `http://${currentHost}:${PORT}`;

console.log(`[Axios] Configurado apuntando a: ${API_BASE_URL}`);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 3. Interceptor para inyectar el Token (Auth)
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

// 4. Interceptor de Respuestas (Manejo de Errores Global)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === "ERR_NETWORK") {
            console.error(`❌ Error de Red: No se puede conectar al Backend en http://${currentHost}:${PORT}`);
            console.error("💡 Sugerencia: Verifica que 'npm start' esté corriendo en la carpeta backend.");
        }
        if (error.response && error.response.status === 401) {
            console.warn("⚠️ Sesión expirada o token inválido.");
            // Opcional: Redirigir al login si el token murió
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;