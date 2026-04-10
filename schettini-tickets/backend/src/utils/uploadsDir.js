/**
 * Ruta absoluta a backend/uploads — debe coincidir con express.static en app.js
 * (path.join(__dirname, '..', 'uploads') desde backend/src/app.js).
 *
 * Multer con 'uploads/' relativo usa process.cwd(); si PM2/cwd no es backend/,
 * los archivos se guardan en otro disco y /api/uploads devuelve 404.
 */
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
} catch (e) {
    console.warn('[uploadsDir] No se pudo crear', uploadsDir, e.message);
}

module.exports = uploadsDir;
