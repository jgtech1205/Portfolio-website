require('dotenv').config()

/**
 * Environment configuration for Chef En Place backend
 * Centralizes all environment variables with defaults and validation
 */
const environment = {
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
  
  // Team Authentication JWT Secrets
  TEAM_JWT_SECRET: process.env.TEAM_JWT_SECRET || process.env.JWT_SECRET || 'default-team-jwt-secret',
  HEAD_CHEF_JWT_SECRET: process.env.HEAD_CHEF_JWT_SECRET || process.env.JWT_SECRET || 'default-head-chef-jwt-secret',

  // Rate Limiting Configuration
  LOGIN_RATE_LIMIT: parseInt(process.env.LOGIN_RATE_LIMIT) || 5,
  TEAM_LOGIN_RATE_LIMIT: parseInt(process.env.TEAM_LOGIN_RATE_LIMIT) || 10,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes

  // Session Configuration
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 3600, // 1 hour
  TEAM_SESSION_TIMEOUT: parseInt(process.env.TEAM_SESSION_TIMEOUT) || 7200, // 120 minutes
  REFRESH_TOKEN_EXPIRY: parseInt(process.env.REFRESH_TOKEN_EXPIRY) || 31536000, // 365 days

  // Security Configuration
  ORGANIZATION_ISOLATION: process.env.ORGANIZATION_ISOLATION === 'true',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  ENABLE_SECURITY_LOGGING: process.env.ENABLE_SECURITY_LOGGING !== 'false',
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  ACCOUNT_LOCKOUT_DURATION: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 900, // 15 minutes

  // Multi-tenant Security
  ENABLE_CROSS_ORGANIZATION_ACCESS: process.env.ENABLE_CROSS_ORGANIZATION_ACCESS === 'true',
  ALLOW_HEAD_CHEF_CROSS_ACCESS: process.env.ALLOW_HEAD_CHEF_CROSS_ACCESS === 'true',
  TEAM_MEMBER_ORGANIZATION_STRICT: process.env.TEAM_MEMBER_ORGANIZATION_STRICT !== 'false',

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Server Configuration
  PORT: parseInt(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'https://chef-frontend-psi.vercel.app'],

  // Email Configuration
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@chefenplace.com',

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  ENABLE_ERROR_LOGGING: process.env.ENABLE_ERROR_LOGGING !== 'false',

  // Development/Testing
  ENABLE_TEST_MODE: process.env.ENABLE_TEST_MODE === 'true',
  SKIP_AUTH_IN_DEV: process.env.SKIP_AUTH_IN_DEV === 'true'
}

/**
 * Validate required environment variables
 */
const validateEnvironment = () => {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ]

  const missing = required.filter(key => !environment[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing)
    console.error('Please set these variables in your .env file')
    process.exit(1)
  }

  // Warn about development defaults
  if (environment.NODE_ENV === 'production') {
    const developmentDefaults = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'TEAM_JWT_SECRET',
      'HEAD_CHEF_JWT_SECRET'
    ]

    developmentDefaults.forEach(key => {
      if (environment[key].includes('default-')) {
        console.warn(`⚠️  Warning: Using development default for ${key} in production`)
      }
    })
  }

  // console.log('✅ Environment configuration validated')
}

/**
 * Get environment variable with type conversion
 */
const get = (key, defaultValue = null) => {
  return environment[key] !== undefined ? environment[key] : defaultValue
}

/**
 * Check if feature is enabled
 */
const isEnabled = (feature) => {
  return environment[feature] === true
}

/**
 * Get security configuration
 */
const getSecurityConfig = () => {
  return {
    organizationIsolation: environment.ORGANIZATION_ISOLATION,
    enableRateLimiting: environment.ENABLE_RATE_LIMITING,
    enableSecurityLogging: environment.ENABLE_SECURITY_LOGGING,
    maxLoginAttempts: environment.MAX_LOGIN_ATTEMPTS,
    accountLockoutDuration: environment.ACCOUNT_LOCKOUT_DURATION,
    enableCrossOrganizationAccess: environment.ENABLE_CROSS_ORGANIZATION_ACCESS,
    allowHeadChefCrossAccess: environment.ALLOW_HEAD_CHEF_CROSS_ACCESS,
    teamMemberOrganizationStrict: environment.TEAM_MEMBER_ORGANIZATION_STRICT
  }
}

/**
 * Get JWT configuration
 */
const getJWTConfig = () => {
  return {
    secret: environment.JWT_SECRET,
    refreshSecret: environment.JWT_REFRESH_SECRET,
    teamSecret: environment.TEAM_JWT_SECRET,
    headChefSecret: environment.HEAD_CHEF_JWT_SECRET,
    sessionTimeout: environment.SESSION_TIMEOUT,
    teamSessionTimeout: environment.TEAM_SESSION_TIMEOUT,
    refreshTokenExpiry: environment.REFRESH_TOKEN_EXPIRY
  }
}

/**
 * Get rate limiting configuration
 */
const getRateLimitConfig = () => {
  return {
    loginRateLimit: environment.LOGIN_RATE_LIMIT,
    teamLoginRateLimit: environment.TEAM_LOGIN_RATE_LIMIT,
    rateLimitWindowMs: environment.RATE_LIMIT_WINDOW_MS
  }
}

module.exports = {
  ...environment,
  validateEnvironment,
  get,
  isEnabled,
  getSecurityConfig,
  getJWTConfig,
  getRateLimitConfig
}
