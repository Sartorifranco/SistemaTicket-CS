console.log('--- app.js: Iniciando carga del sistema Schettini ---');

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// 1. Cargar variables de entorno
dotenv.config();

const app = express();
const server = http.createServer(app);

// --- 2. CONFIGURACIÓN ROBUSTA DE CORS ---
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5050'];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman, mobile apps o scripts de servidor)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`[CORS] Bloqueado: ${origin}`); 
      callback(new Error('No permitido por CORS (Política de Seguridad Schettini)'));
    }
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  credentials: true, 
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
};

// Aplicar CORS a Express
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- 3. CONFIGURACIÓN SOCKET.IO ---
const io = new Server(server, {
  cors: corsOptions, // Usamos la misma configuración CORS
  transports: ['websocket', 'polling']
});

// Middleware para inyectar 'io'
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- 4. IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const companyRoutes = require('./routes/companyRoutes');
// ✅ IMPORTANTE: Habilitamos la ruta de IA (Dummy)
const aiRoutes = require('./routes/aiRoutes'); 

// Servicios
const { startCronJobs } = require('./services/cronJobs');

// --- 5. DEFINICIÓN DE ENDPOINTS (API) ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/companies', companyRoutes);
// ✅ Conectamos la IA
app.use('/api/ai', aiRoutes);

// ✅ RUTAS DE ADMINISTRACIÓN (Problemas predefinidos, etc)
// Asegúrate de que el archivo problemAdminRoutes.js exista, si no, comenta esta línea temporalmente.
try {
    app.use('/api/admin', require('./routes/problemAdminRoutes'));
} catch (error) {
    console.warn("⚠️ Advertencia: problemAdminRoutes no encontrado o con error. Ruta desactivada temporalmente.");
}

// ✅ RUTAS DE DATOS GENERALES
try {
    app.use('/api', require('./routes/dataRoutes'));
} catch (error) {
    // Si dataRoutes no existe, no rompemos la app
}

// --- 6. SOCKET.IO EVENTOS ---
io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  if (token) {
      try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.join(`user-${decoded.id}`);
          console.log(`✅ Socket conectado: ${decoded.username} (${socket.id})`);
          
          if (decoded.role) {
              socket.join(decoded.role);
          }
      } catch (error) {
          // Token inválido o expirado
      }
  }
  
  socket.on('disconnect', () => {
      // console.log('Socket desconectado');
  });
});

// --- 7. SERVIR FRONTEND (PRODUCCIÓN) ---
app.use(express.static(path.join(__dirname, '../../frontend/build')));
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
      return res.status(404).json({ success: false, message: 'API Endpoint no encontrado' });
  }
  res.sendFile(path.resolve(__dirname, '../../frontend/build', 'index.html'));
});

// --- 8. INICIO DEL SERVIDOR ---
// ⚠️ CAMBIO: Usamos 5050 por defecto para coincidir con tu configuración frontend
const PORT = process.env.PORT || 5050; 
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
  startCronJobs();
});