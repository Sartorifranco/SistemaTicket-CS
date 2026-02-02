// Middleware para manejar rutas no encontradas (404)
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error); // Pasa el error al siguiente middleware de manejo de errores
};

// Middleware centralizado para manejar errores
// Siempre debe tener 4 argumentos: err, req, res, next
const errorHandler = (err, req, res, next) => {
    // Loguea el error completo en la consola del servidor para depuración
    console.error('[ERROR HANDLER] Detalle del error:', err);

    // Determina el código de estado HTTP:
    // 1. Si el error tiene un statusCode, úsalo.
    // 2. Si la respuesta ya tiene un estado (y no es 200), úsalo.
    // 3. Por defecto, usa 500 (Internal Server Error).
    const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
    res.status(statusCode);

    // Envía una respuesta JSON con el mensaje de error
    res.json({
        success: false, // Indicador explícito de que la operación falló
        message: err.message || 'Error interno del servidor', // Mensaje del error o un mensaje genérico
        // En producción, es buena práctica no enviar el stack trace completo por seguridad.
        // Solo lo enviamos si el entorno es de desarrollo.
        stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    });
};

module.exports = {
    notFound,
    errorHandler,
};
