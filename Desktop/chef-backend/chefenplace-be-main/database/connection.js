const mongoose = require("mongoose");

// Connection state management
let connectionPromise = null;
let isConnecting = false;

// Serverless-optimized connection options
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Disable buffering to prevent timeouts
  bufferCommands: false,
  // Optimize for serverless environments
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 60000, // Increased to 60 seconds for cold starts
  socketTimeoutMS: 60000, // Increased to 60 seconds
  connectTimeoutMS: 60000, // Increased to 60 seconds
  // Disable auto operations for faster startup
  autoIndex: false,
  autoCreate: false,
  // Additional serverless optimizations
  heartbeatFrequencyMS: 10000,
  maxStalenessSeconds: 90,
  retryWrites: true,
  w: "majority",
  // Add connection retry logic
  retryReads: true,
};

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise<mongoose.Connection>} The MongoDB connection
 */
const connectWithRetry = async () => {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/chef-en-place";
  const maxRetries = 5; // Increased retries for serverless
  const retryDelay = 3000; // Increased delay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔌 Attempting to connect to MongoDB... (attempt ${attempt}/${maxRetries})`
      );
      console.log(
        `📍 MongoDB URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`
      ); // Hide credentials

      const conn = await mongoose.connect(mongoUri, connectionOptions);

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`🔗 Database name: ${conn.connection.name}`);

      // Safely log pool size if available
      if (conn.connection.pool && typeof conn.connection.pool.size === "function") {
        console.log(`📊 Connection pool size: ${conn.connection.pool.size()}`);
      }

      isConnecting = false;
      return conn.connection;
    } catch (error) {
      console.error(
        `❌ MongoDB connection attempt ${attempt} failed:`,
        error.message
      );
      console.error(`Error details:`, error);

      if (attempt === maxRetries) {
        console.error(
          `💥 Failed to connect to MongoDB after ${maxRetries} attempts`
        );
        connectionPromise = null;
        isConnecting = false;
        throw error;
      }

      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

/**
 * Get or create a cached MongoDB connection
 * @returns {Promise<mongoose.Connection>} The MongoDB connection
 */
const getConnection = async () => {
  // If already connected, return the connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If connection is in progress, wait for it
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // If we have a cached promise, return it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection process
  isConnecting = true;
  connectionPromise = connectWithRetry();

  return connectionPromise;
};

/**
 * Ensure database connection is ready
 * EDIT #1: Reuse the cached+retry path instead of calling mongoose.connect directly
 * @returns {Promise<mongoose.Connection>} The MongoDB connection
 */
const ensureConnection = async () => getConnection();

/**
 * Initialize database connection and event handlers
 */
const initializeDatabase = async () => {
  try {
    // Set up connection event handlers
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
      connectionPromise = null; // Reset promise to allow reconnection
    });

    mongoose.connection.on("disconnected", () => {
      console.log("🔌 MongoDB disconnected");
      connectionPromise = null; // Reset promise to allow reconnection
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
    });

    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB connected");
    });

    // Graceful shutdown (only for non-serverless environments)
    if (!process.env.VERCEL) {
      process.on("SIGINT", async () => {
        console.log("🛑 Shutting down gracefully...");
        try {
          await mongoose.connection.close();
          console.log("✅ MongoDB connection closed through app termination");
          process.exit(0);
        } catch (error) {
          console.error("❌ Error closing MongoDB connection:", error);
          process.exit(1);
        }
      });
    }

    // Initial connection
    await ensureConnection();
  } catch (error) {
    console.error("❌ Database initialization error:", error.message);
    // Don't exit in serverless environment
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      console.log(
        "Continuing without database connection in serverless environment"
      );
    } else {
      throw error;
    }
  }
};

/**
 * Get connection status
 */
const getConnectionStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    state: states[mongoose.connection.readyState] || "unknown",
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    isConnected: mongoose.connection.readyState === 1,
  };
};

// Legacy function for backward compatibility
const connectDB = ensureConnection;

// EDIT #2 is in your main server file (await connectDB + initHeadChef at startup)

// Export ensureConnection in multiple ways for compatibility
module.exports = ensureConnection;
module.exports.ensureConnection = ensureConnection;
module.exports.connectDB = ensureConnection;
module.exports.getConnection = getConnection;
module.exports.initializeDatabase = initializeDatabase;
module.exports.getConnectionStatus = getConnectionStatus;

