// C:\my-ticket-system\frontend\src\config\index.ts

// Define la URL base de tu API backend
// En desarrollo, apunta a donde esté corriendo tu backend (http://192.168.0.236:5000 en tu caso)
// En producción, debe ser la URL de tu API desplegada
export const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.tudominio.com' // <<-- ¡RECUERDA CAMBIAR ESTO PARA TU DESPLIEGUE EN PRODUCCIÓN!
  : 'http://192.168.0.236:5000'; // <<-- Confirmado: tu backend corre en esta dirección y puerto
