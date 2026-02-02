// frontend/src/utils/dateFormatter.ts

/**
 * Formatea una fecha (string o Date) a un formato localizado para Argentina.
 * @param dateString La fecha en formato ISO o un objeto Date.
 * @returns La fecha y hora formateada (ej: "11/9/2025, 16:30:05").
 */
export const formatLocalDate = (dateString: string | Date): string => {
    try {
        const date = new Date(dateString);
        
        // Opciones para asegurar el formato correcto y la zona horaria de Argentina.
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Usar formato de 24 horas
            timeZone: 'America/Argentina/Buenos_Aires' // Zona horaria de Argentina
        };

        return new Intl.DateTimeFormat('es-AR', options).format(date);
    } catch (error) {
        console.error("Error al formatear la fecha:", dateString, error);
        return "Fecha inválida";
    }
};