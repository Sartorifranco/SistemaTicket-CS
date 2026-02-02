// backend/src/middleware/asyncHandler.js
// Este es un middleware de utilidad para envolver funciones asíncronas de Express
// y manejar automáticamente los errores, pasándolos al siguiente middleware (Express error handler).

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
