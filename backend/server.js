const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initializeDatabase } = require('./models');
const redisClient = require('./config/redis');

const componentRoutes = require('./routes/components');
const connectionRoutes = require('./routes/connections');
const domainRoutes = require('./routes/domainsNew');
const connectorRoutes = require('./routes/connectors');
const groupRoutes = require('./routes/groups');
const anomalyLogRoutes = require('./routes/anomalyLogs');
const { router: syncRoutes } = require('./routes/sync');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.set('io', io);

app.use('/api/components', componentRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/anomaly-logs', anomalyLogRoutes);
app.use('/api/sync', syncRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await require('./config/database').authenticate()
      .then(() => 'connected')
      .catch(() => 'disconnected');
    
    const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      redis: redisStatus,
      memory: process.memoryUsage(),
      version: require('./package.json').version
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'DataFlow Visualization API',
    version: require('./package.json').version,
    documentation: '/api/docs',
    health: '/api/health'
  });
});

let connectedClients = 0;

io.on('connection', (socket) => {
  connectedClients++;
  console.log(`Client connected: ${socket.id}. Total clients: ${connectedClients}`);
  
  socket.emit('connection:established', {
    clientId: socket.id,
    timestamp: new Date().toISOString()
  });

  socket.on('subscribe:components', () => {
    socket.join('components');
    console.log(`Client ${socket.id} subscribed to components updates`);
  });

  socket.on('subscribe:connections', () => {
    socket.join('connections');
    console.log(`Client ${socket.id} subscribed to connections updates`);
  });

  socket.on('subscribe:connectors', () => {
    socket.join('connectors');
    console.log(`Client ${socket.id} subscribed to connectors updates`);
  });

  socket.on('subscribe:sync', () => {
    socket.join('sync');
    console.log(`Client ${socket.id} subscribed to sync updates`);
  });

  socket.on('unsubscribe', (room) => {
    socket.leave(room);
    console.log(`Client ${socket.id} unsubscribed from ${room}`);
  });

  socket.on('client:heartbeat', () => {
    socket.emit('server:heartbeat', {
      timestamp: new Date().toISOString(),
      clients: connectedClients
    });
  });

  socket.on('disconnect', (reason) => {
    connectedClients--;
    console.log(`Client disconnected: ${socket.id}. Reason: ${reason}. Total clients: ${connectedClients}`);
  });
});

setInterval(() => {
  io.emit('server:stats', {
    connectedClients,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
}, 30000);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully');
    
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    const { initializeJobs } = require('./jobs/syncJob');
    await initializeJobs();
    console.log('Job system initialized successfully');
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    redisClient.quit();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    redisClient.quit();
    process.exit(0);
  });
});

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };