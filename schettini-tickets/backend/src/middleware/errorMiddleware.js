// backend/src/middleware/errorMiddleware.js

// Middleware para manejar rutas no encontradas (404)
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error); // Pasa el error al siguiente middleware de manejo de errores
};

// Middleware centralizado para manejar errores
// Siempre debe tener 4 argumentos: err, req, res, next
const errorHandler = (err, req, res, next) => {
    // Determina el código de estado HTTP: si la respuesta ya tiene un estado, úsalo;
    // de lo contrario, usa 500 (Internal Server Error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);

    // Envía una respuesta JSON con el mensaje de error
    res.json({
        message: err.message, // Mensaje del error
        // En producción, es buena práctica no enviar el stack trace completo por seguridad.
        // Solo lo enviamos si el entorno no es de producción.
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
    console.error('[ERROR HANDLER] Detalle del error:', err); // Log the full error object
};

module.exports = {
    notFound,
    errorHandler,
};
