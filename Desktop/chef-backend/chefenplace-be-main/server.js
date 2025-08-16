const express = require('express');
const helmet = require('helmet');
const { corsMiddleware, stripeCorsHandler, globalOptionsHandler } = require('./middlewares/cors');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./database/connection');
const { validateEnvironment, PORT, MONGODB_URI, CORS_ORIGIN, ALLOWED_ORIGINS } = require('./config/environment');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const panelRoutes = require('./routes/panelRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chefRoutes = require('./routes/chefRoutes');
const User = require('./database/models/User');
const plateUpRoutes = require('./routes/plateupRoutes');
const plateupFolderRoutes = require('./routes/plateupFolderRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const stripeRoutes = require('./routes/stripeRoutes');

const initHeadChef = async () => {
  const exists = await User.findOne({ role: 'head-chef' });
  if (!exists) {
    const email = process.env.HEAD_CHEF_EMAIL || 'headchef@kitchen.com';
    const password = process.env.HEAD_CHEF_PASSWORD || 'headchef123';
    const headChef = new User({
      email,
      password,
      firstName: 'Head',
      lastName: 'Chef',
      name: 'Head Chef',
      role: 'head-chef',
      status: 'active',
    });
    await headChef.save();
    console.log(`Auto-created Head Chef user: ${email}`);
  }
};

const app = express();

// Validate environment configuration
validateEnvironment();

// Connect to MongoDB (with error handling for serverless)
try {
  connectDB();
  initHeadChef();
} catch (error) {
  console.error('Database connection error:', error.message);
  // Don't exit in serverless environment, just log the error
}

// Security middleware
app.use(helmet());

// Global OPTIONS handler - must come before other CORS middleware
app.use(globalOptionsHandler);

// Global CORS middleware
app.use(corsMiddleware);

// Specific CORS handling for Stripe endpoints
app.use('/api/stripe', stripeCorsHandler);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chefs', chefRoutes);
app.use('/api/users', userRoutes);
app.use('/api/panels', panelRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plateups', plateUpRoutes);
app.use('/api/plateup-folders', plateupFolderRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Add routes without /api prefix for frontend compatibility
app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/chefs', chefRoutes);
app.use('/panels', panelRoutes);
app.use('/plateups', plateUpRoutes);
app.use('/recipes', recipeRoutes);
app.use('/notifications', notificationRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Chef en Place API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    features: {
      teamAuthentication: true,
      organizationIsolation: true,
      rateLimiting: true,
      securityLogging: true
    }
  });
});

// Additional health check for serverless environments
app.get('/api/health/detailed', async (req, res) => {
  try {
    // Check database connection
    const dbStatus =
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.status(200).json({
      status: 'OK',
      message: 'Chef en Place API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: dbStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
    });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    console.log(`❌ CORS Error: ${req.method} ${req.path} from origin: ${req.headers.origin}`);
    return res.status(403).json({ 
      message: 'CORS policy violation',
      error: 'Origin not allowed',
      origin: req.headers.origin,
      allowedOrigins: ['https://chef-frontend-psi.vercel.app', 'https://chefenplace-psi.vercel.app', 'https://chef-app-backend.vercel.app']
    });
  }
  
  res.status(500).json({
    message: 'Internal server error',
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// Only start the server if this file is run directly (not imported)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Security features: Organization isolation ${process.env.ORGANIZATION_ISOLATION === 'true' ? 'enabled' : 'disabled'}`);
    console.log(`📱 Chef en Place API is ready!`);
  });
}

module.exports = app;
