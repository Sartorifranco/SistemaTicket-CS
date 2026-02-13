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

// --- 2. CONFIGURACIÓN DE CORS (CORREGIDA) ---
// Aquí agregamos explícitamente tu URL de Render Frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5050',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://sistematicket-cs.onrender.com',
  'https://a0021444.ferozo.com',
  'http://a0021444.ferozo.com'
];

// Si tienes configurada la variable en Render, la sumamos a la lista
if (process.env.CORS_ORIGINS) {
  const envOrigins = process.env.CORS_ORIGINS.split(',');
  allowedOrigins.push(...envOrigins);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman o Apps móviles)
    if (!origin) return callback(null, true);
    
    // Verificar si el origen está en la lista
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`[CORS] Bloqueado: ${origin}`); 
      callback(new Error(`Bloqueado por CORS: ${origin}`));
    }
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  credentials: true, 
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- 3. SOCKET.IO ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Usamos la misma lista que arriba
    methods: ["GET", "POST"],
    credentials: true
  }, 
  transports: ['websocket', 'polling']
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- 4. RUTAS ---
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
const noteRoutes = require('./routes/noteRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');

const { startCronJobs } = require('./services/cronJobs');

// --- 5. ENDPOINTS ---
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
app.use('/api/notes', noteRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Rutas opcionales (try-catch para evitar errores si no existen los archivos)
try { app.use('/api/admin', require('./routes/problemAdminRoutes')); } catch (e) { console.log('Ruta admin opcional no cargada'); }
try { app.use('/api', require('./routes/dataRoutes')); } catch (e) { console.log('Ruta data opcional no cargada'); }

// --- 6. SOCKET LOGIC ---
io.on('connection', (socket) => {
  console.log(`[Socket] Nuevo cliente conectado: ${socket.id}`);
  
  const token = socket.handshake.auth.token;
  if (token) {
      try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.join(`user-${decoded.id}`);
          if (decoded.role) socket.join(decoded.role);
          console.log(`[Socket] Usuario autenticado: ${decoded.email}`);
      } catch (error) {
          console.log('[Socket] Token inválido, desconectando...');
          socket.disconnect(); 
      }
  }
});

// --- 7. FRONTEND (Fallback para producción) ---
// Nota: En Render usas dos servicios separados, pero dejamos esto por si acaso.
app.use(express.static(path.join(__dirname, '../../frontend/build')));
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
      return res.status(404).json({ success: false, message: 'API Endpoint no encontrado' });
  }
  // Si no encuentra el archivo build, envía un mensaje simple para no romper el server
  res.send('Backend API Running. Frontend is hosted separately.');
});

// --- 8. INICIO ---
const PORT = process.env.PORT || 5050; 
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  startCronJobs();
});