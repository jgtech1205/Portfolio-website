const { ensureConnection } = require('../database/connection');

/**
 * Middleware to ensure database connection is ready before handling requests
 * This middleware should be applied early in the middleware chain
 */
const ensureDbConnection = async (req, res, next) => {
  try {
    console.log(`🔌 Database connection middleware: ${req.method} ${req.path}`);
    
    // Set a timeout for connection attempts (important for serverless)
    const connectionTimeout = setTimeout(() => {
      console.error('❌ Database connection timeout in middleware');
      res.status(503).json({
        message: 'Database connection timeout',
        error: 'Connection attempt timed out',
        timestamp: new Date().toISOString(),
        retryAfter: 10
      });
    }, 45000); // 45 second timeout (increased for serverless cold starts)

    // Ensure database connection is ready
    await ensureConnection();
    
    // Clear timeout on success
    clearTimeout(connectionTimeout);
    
    // Add connection status to request object for debugging
    req.dbConnectionStatus = 'ready';
    console.log(`✅ Database connection ready for ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    console.error('❌ Database connection middleware error:', error.message);
    console.error('Error details:', error);
    
    // Return appropriate error response
    res.status(503).json({
      message: 'Database service unavailable',
      error: 'Database connection failed',
      details: error.message,
      timestamp: new Date().toISOString(),
      retryAfter: 10 // Reduced retry time for serverless
    });
  }
};

/**
 * Optional middleware for routes that don't require database access
 * Use this for health checks or static content
 */
const optionalDbConnection = async (req, res, next) => {
  try {
    await ensureConnection();
    req.dbConnectionStatus = 'ready';
  } catch (error) {
    console.warn('⚠️ Optional database connection failed:', error.message);
    req.dbConnectionStatus = 'failed';
  }
  
  next();
};

module.exports = {
  ensureDbConnection,
  optionalDbConnection
};
