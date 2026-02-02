const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ruta donde se guardarán los archivos.
const uploadDir = 'uploads/';

// Asegurarse de que el directorio de subida exista.
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configuración de almacenamiento de Multer (sin cambios).
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Configuración de Multer.
const upload = multer({
    storage: storage,
    limits: {
        // ✅ MODIFICACIÓN: Límite aumentado a 50MB para soportar videos.
        // Ajusta este valor si necesitas más (ej. 100MB = 1024 * 1024 * 100).
        fileSize: 1024 * 1024 * 50 // Límite de 50 MB por archivo
    },
    fileFilter: (req, file, cb) => {
        // ✅ MODIFICACIÓN: Lógica de filtro mejorada y se añaden tipos de video.

        // 1. Definir extensiones permitidas (incluyendo el punto)
        const allowedExts = [
            '.jpeg', '.jpg', '.png', '.gif', 
            '.pdf', '.doc', '.docx', '.xls', '.xlsx',
            '.mp4', '.mov', '.avi', '.wmv', '.mkv' // Extensiones de video
        ];
        
        // 2. Definir MIME types permitidos
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'video/mp4',
            'video/quicktime', // .mov
            'video/x-msvideo', // .avi
            'video/x-matroska', // .mkv
            'video/x-ms-wmv' // .wmv
        ];

        // 3. Chequear extensión y MIME type
        const ext = path.extname(file.originalname).toLowerCase();
        const extMatch = allowedExts.includes(ext);
        const mimeMatch = allowedMimeTypes.includes(file.mimetype);

        if (extMatch && mimeMatch) {
            // Archivo aceptado
            return cb(null, true);
        }
        
        // Archivo rechazado
        cb(new Error('Error: Tipo de archivo no soportado. (' + file.mimetype + ')'));
    }
});

// Se exporta la instancia de Multer directamente.
module.exports = upload;
