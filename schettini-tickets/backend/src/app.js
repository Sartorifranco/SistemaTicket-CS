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

// Aplicar CORS
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- 3. CONFIGURACIÓN SOCKET.IO ---
const io = new Server(server, {
  cors: corsOptions, 
  transports: ['websocket', 'polling']
});

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
const aiRoutes = require('./routes/aiRoutes'); 
const planRoutes = require('./routes/planRoutes');
// ✅ RESTAURADO: Importar rutas de configuración
const configRoutes = require('./routes/configRoutes'); 

const { startCronJobs } = require('./services/cronJobs');

// --- 5. DEFINICIÓN DE ENDPOINTS ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/plans', planRoutes);
// ✅ RESTAURADO: Usar rutas de configuración
app.use('/api/config', configRoutes);
app.use('/api/modules', require('./routes/moduleRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes')); // <--- AGREGAR
// RUTAS ADMIN EXTRA
try {
    app.use('/api/admin', require('./routes/problemAdminRoutes'));
} catch (error) {
    console.warn("⚠️ Advertencia: problemAdminRoutes no encontrado.");
}

// RUTAS DATA
try {
    app.use('/api', require('./routes/dataRoutes'));
} catch (error) {}

// --- 6. SOCKET.IO ---
io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  if (token) {
      try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.join(`user-${decoded.id}`);
          if (decoded.role) socket.join(decoded.role);
      } catch (error) {}
  }
});

// --- 7. SERVIR FRONTEND ---
app.use(express.static(path.join(__dirname, '../../frontend/build')));
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
      return res.status(404).json({ success: false, message: 'API Endpoint no encontrado' });
  }
  res.sendFile(path.resolve(__dirname, '../../frontend/build', 'index.html'));
});

// --- 8. INICIO ---
const PORT = process.env.PORT || 5050; 
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  startCronJobs();
});