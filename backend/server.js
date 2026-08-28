require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./src/routes');
const { initSocket } = require('./src/config/socket');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

const app = express();
const server = http.createServer(app);

const defaultOrigins = ['http://localhost:5180', 'http://localhost:5173', 'http://localhost:5181'];
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const frontendUrl = (process.env.FRONTEND_URL || '').trim();
const ALLOWED_ORIGINS = [...new Set([...defaultOrigins, ...envOrigins, frontendUrl].filter(Boolean))];

const corsOptions = {
  origin(origin, callback) {
    // Permitir requests sin Origin (health checks, curl, etc.)
    if (!origin) return callback(null, true);
    // Permitir despliegues frontend en Vercel para evitar bloqueos CORS en producción.
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Archivos estáticos (logos, uploads)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Rutas API
app.use('/api', routes);

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'CRM Ventas API',
  customCss: '.swagger-ui .topbar { background-color: #0f766e; }',
}));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

const { startRunner } = require('./src/services/workflow_runner');
const { startFollowupNotificationRunner } = require('./src/services/followupNotifications.service');
const { ensurePersonalHubSchema } = require('./src/controllers/personalHub.controller');

// Inicializar Socket.io
initSocket(server, ALLOWED_ORIGINS);

// Iniciar Workflow Runner en segundo plano
startRunner();
startFollowupNotificationRunner();

const PORT = process.env.PORT || 5000;
ensurePersonalHubSchema()
  .then(() => server.listen(PORT, () => console.log(`CRM Ventas API + Socket.io + Workflows corriendo en puerto ${PORT}`)))
  .catch((error) => {
    console.error('[PersonalHub] No se pudo preparar el esquema:', error);
    process.exitCode = 1;
  });
