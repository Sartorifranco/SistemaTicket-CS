// frontend/src/types/api.ts

// Puedes poner esto al principio de AuthContext.tsx, CreateTicketForm.tsx, etc.
interface ErrorResponseData {
    message?: string; // El mensaje puede ser opcional
    // Si tu backend envía otras propiedades en el error, añádelas aquí, por ejemplo:
    // code?: string;
    // details?: string[];
}

// ESTA LÍNEA ES LA CORRECCIÓN:
export {}; // Para que TypeScript lo trate como un módulo
