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
  'http://a0021444.ferozo.com',
  'http://200.58.127.173',
  'https://200.58.127.173',
  'https://sch-soporte.com.ar',
  'http://sch-soporte.com.ar',
  'https://www.sch-soporte.com.ar',
  'http://www.sch-soporte.com.ar',
  'https://api.sch-soporte.com.ar',
  'http://api.sch-soporte.com.ar'
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

// Servir archivos estáticos (imágenes, adjuntos de tickets, fotos de taller)
// __dirname = backend/src → ../uploads = backend/uploads (raíz del backend)
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));
app.use('/api/uploads', express.static(uploadsPath));

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
const resourceSectionRoutes = require('./routes/resourceSectionRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); 
const ticketConfigRoutes = require('./routes/ticketConfigRoutes'); 
const promotionRoutes = require('./routes/promotionRoutes');
const noteRoutes = require('./routes/noteRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const taskRoutes = require('./routes/taskRoutes');
const repairOrderRoutes = require('./routes/repairOrderRoutes');
const warrantyRoutes = require('./routes/warrantyRoutes');
const companySettingsRoutes = require('./routes/companySettingsRoutes');
const ticketCategoriesRoutes = require('./routes/ticketCategoriesRoutes');
const systemOptionsRoutes = require('./routes/systemOptionsRoutes');
const sparePartsCatalogRoutes = require('./routes/sparePartsCatalogRoutes');
const activationRoutes = require('./routes/activationRoutes');
const factoryShipmentRoutes = require('./routes/factoryShipmentRoutes');
const techCashRoutes = require('./routes/techCashRoutes');

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
app.use('/api/resource-sections', resourceSectionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ticket-config', ticketConfigRoutes); 
app.use('/api/promotions', promotionRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/repair-orders', repairOrderRoutes);
app.use('/api/warranties', warrantyRoutes);
app.use('/api/settings/company', companySettingsRoutes);
app.use('/api/settings/ticket-categories', ticketCategoriesRoutes);
app.use('/api/settings/system-options', systemOptionsRoutes);
app.use('/api/settings/spare-parts-catalog', sparePartsCatalogRoutes);
app.use('/api/activations', activationRoutes);
app.use('/api/factory-shipments', factoryShipmentRoutes);
app.use('/api/tech-cash', techCashRoutes);

// Rutas opcionales (reportRoutes ya incluye /api/reports con debts) (try-catch para evitar errores si no existen los archivos)
try { app.use('/api/admin', require('./routes/problemAdminRoutes')); } catch (e) { console.log('Ruta admin opcional no cargada'); }
try { app.use('/api', require('./routes/dataRoutes')); } catch (e) { console.log('Ruta data opcional no cargada'); }

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('❌ [Error]', err.message);
    if (process.env.NODE_ENV !== 'production') console.error('   Stack:', err.stack);
    let status = 500;
    if (res.statusCode >= 400) status = res.statusCode;
    else if (err.message && (err.message.includes('No autorizado') || err.message.includes('sin token') || err.message.includes('no encontrado') || err.message.includes('desactivada'))) status = 401;
    else if (err.message && err.message.includes('no autorizado')) status = 403;
    res.status(status).json({ success: false, message: err.message || 'Error del servidor' });
});

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
  startCronJobs(io);
});