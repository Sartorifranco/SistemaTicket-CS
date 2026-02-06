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

// ✅ ARREGLO IMÁGENES: Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- 3. CONFIGURACIÓN SOCKET.IO ---
const io = new Server(server, {
  cors: corsOptions, 
  transports: ['websocket', 'polling']
});

// Middleware para inyectar io en req
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
const configRoutes = require('./routes/configRoutes'); 
const moduleRoutes = require('./routes/moduleRoutes');
const chatRoutes = require('./routes/chatRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); 
const ticketConfigRoutes = require('./routes/ticketConfigRoutes'); 
const promotionRoutes = require('./routes/promotionRoutes');

// ✅ NUEVAS RUTAS IMPORTADAS (Para arreglar Agente)
const noteRoutes = require('./routes/noteRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');

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
app.use('/api/config', configRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ticket-config', ticketConfigRoutes); 
app.use('/api/promotions', promotionRoutes);

// ✅ NUEVOS ENDPOINTS CONECTADOS
app.use('/api/notes', noteRoutes);
app.use('/api/activity-logs', activityLogRoutes);

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
  console.log('🔌 Nuevo cliente conectado:', socket.id);

  const token = socket.handshake.auth.token;

  if (token) {
      try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          console.log(`✅ Usuario autenticado en Socket: ${decoded.username} (${decoded.role})`);

          // 1. Unirse a sala personal (user-ID)
          socket.join(`user-${decoded.id}`);
          console.log(`👤 Unido a sala: user-${decoded.id}`);

          // 2. Unirse a sala de ROL (admin, agent, client)
          if (decoded.role) {
              socket.join(decoded.role);
              console.log(`🛡️ Unido a sala de rol: ${decoded.role}`);
          }

      } catch (error) {
          console.log('❌ Token de socket inválido:', error.message);
          socket.disconnect(); 
      }
  } else {
      console.log('⚠️ Cliente conectado sin token (Socket)');
  }

  socket.on('disconnect', () => {
      // console.log('🔌 Cliente desconectado:', socket.id);
  });
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