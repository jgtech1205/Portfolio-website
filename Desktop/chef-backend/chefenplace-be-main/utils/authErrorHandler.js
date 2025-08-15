const rateLimit = require('express-rate-limit')
const User = require("../database/models/User")
const { AUTH_ERROR_CODES, HTTP_STATUS } = require("./responseUtils")
const { getRateLimitConfig, getSecurityConfig } = require("../config/environment")

const rateLimitConfig = getRateLimitConfig()
const securityConfig = getSecurityConfig()

// In-memory store for failed login attempts (in production, use Redis)
const failedLoginAttempts = new Map()

/**
 * Rate limiter for login attempts
 */
const loginRateLimiter = rateLimit({
  windowMs: rateLimitConfig.rateLimitWindowMs,
  max: rateLimitConfig.loginRateLimit,
  message: {
    error: 'Too many login attempts. Please try again later.',
    retryAfter: `${Math.floor(rateLimitConfig.rateLimitWindowMs / 60000)} minutes`
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logFailedLoginAttempt(req, 'RATE_LIMIT_EXCEEDED', null)
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      message: 'Too many login attempts. Please try again later.',
      code: AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: `${Math.floor(rateLimitConfig.rateLimitWindowMs / 60000)} minutes`
    })
  }
})

/**
 * Rate limiter for team login attempts
 */
const teamLoginRateLimiter = rateLimit({
  windowMs: rateLimitConfig.rateLimitWindowMs,
  max: rateLimitConfig.teamLoginRateLimit,
  message: {
    error: 'Too many team login attempts. Please try again later.',
    retryAfter: `${Math.floor(rateLimitConfig.rateLimitWindowMs / 60000)} minutes`
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logFailedLoginAttempt(req, 'TEAM_RATE_LIMIT_EXCEEDED', null)
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      message: 'Too many team login attempts. Please try again later.',
      code: AUTH_ERROR_CODES.TEAM_RATE_LIMIT_EXCEEDED,
      retryAfter: `${Math.floor(rateLimitConfig.rateLimitWindowMs / 60000)} minutes`
    })
  }
})

/**
 * Log failed login attempts for security monitoring
 * @param {Object} req - Express request object
 * @param {string} reason - Reason for failure
 * @param {Object} user - User object if found
 */
const logFailedLoginAttempt = (req, reason, user) => {
  const timestamp = new Date().toISOString()
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
  const userAgent = req.headers['user-agent']
  
  const logEntry = {
    timestamp,
    ip,
    userAgent,
    reason,
    endpoint: req.path,
    method: req.method,
    userId: user?._id || null,
    userEmail: user?.email || null,
    organization: user?.headChefId || null
  }

  // Log to console for development
  console.error('🔒 Failed Login Attempt:', logEntry)
  
  // In production, send to logging service (e.g., Winston, Bunyan, or external service)
  // logger.error('Failed login attempt', logEntry)
  
  // Track failed attempts per IP
  trackFailedAttempts(ip, reason)
}

/**
 * Track failed login attempts per IP address
 * @param {string} ip - IP address
 * @param {string} reason - Reason for failure
 */
const trackFailedAttempts = (ip, reason) => {
  if (!failedLoginAttempts.has(ip)) {
    failedLoginAttempts.set(ip, {
      count: 0,
      firstAttempt: Date.now(),
      lastAttempt: Date.now(),
      reasons: []
    })
  }

  const attempts = failedLoginAttempts.get(ip)
  attempts.count++
  attempts.lastAttempt = Date.now()
  attempts.reasons.push({
    reason,
    timestamp: Date.now()
  })

  // Keep only last 10 reasons
  if (attempts.reasons.length > 10) {
    attempts.reasons = attempts.reasons.slice(-10)
  }

  // Clean up old entries (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  if (attempts.lastAttempt < oneHourAgo) {
    failedLoginAttempts.delete(ip)
  }
}

/**
 * Get failed login attempts for an IP
 * @param {string} ip - IP address
 * @returns {Object|null} - Failed attempts data
 */
const getFailedAttempts = (ip) => {
  return failedLoginAttempts.get(ip) || null
}

/**
 * Clear failed login attempts for an IP (after successful login)
 * @param {string} ip - IP address
 */
const clearFailedAttempts = (ip) => {
  failedLoginAttempts.delete(ip)
}

/**
 * Handle authentication errors with proper security measures
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} errorType - Type of error
 * @param {Object} user - User object if found
 * @param {string} customMessage - Custom error message
 */
const handleAuthError = (req, res, errorType, user = null, customMessage = null) => {
  // Log the failed attempt
  logFailedLoginAttempt(req, errorType, user)

  // Determine response message based on error type
  let message = 'Invalid credentials'
  let statusCode = HTTP_STATUS.UNAUTHORIZED
  let errorCode = AUTH_ERROR_CODES.INVALID_CREDENTIALS

  switch (errorType) {
    case 'USER_NOT_FOUND':
      message = 'Invalid credentials'
      errorCode = AUTH_ERROR_CODES.USER_NOT_FOUND
      break
    case 'USER_NOT_APPROVED':
      message = 'Account not approved. Please contact your head chef for approval.'
      statusCode = HTTP_STATUS.UNAUTHORIZED
      errorCode = AUTH_ERROR_CODES.USER_NOT_APPROVED
      break
    case 'USER_INACTIVE':
      message = 'Account is inactive. Please contact your head chef.'
      statusCode = HTTP_STATUS.UNAUTHORIZED
      errorCode = AUTH_ERROR_CODES.USER_INACTIVE
      break
    case 'WRONG_ORGANIZATION':
      message = 'Invalid credentials'
      errorCode = AUTH_ERROR_CODES.WRONG_ORGANIZATION
      break
    case 'INVALID_CREDENTIALS':
      message = 'Invalid credentials'
      errorCode = AUTH_ERROR_CODES.INVALID_CREDENTIALS
      break
    case 'MISSING_CREDENTIALS':
      message = 'Username and password are required'
      statusCode = HTTP_STATUS.BAD_REQUEST
      errorCode = AUTH_ERROR_CODES.MISSING_CREDENTIALS
      break
    case 'DUPLICATE_NAMES':
      message = 'Invalid credentials'
      errorCode = AUTH_ERROR_CODES.DUPLICATE_NAMES
      break
    case 'RATE_LIMIT_EXCEEDED':
      message = 'Too many login attempts. Please try again later.'
      statusCode = HTTP_STATUS.TOO_MANY_REQUESTS
      errorCode = AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED
      break
    default:
      message = customMessage || 'Invalid credentials'
      errorCode = AUTH_ERROR_CODES.SYSTEM_ERROR
  }

  // Add delay for security (prevent timing attacks)
  const delay = Math.random() * 1000 + 500 // 500-1500ms random delay
  setTimeout(() => {
    res.status(statusCode).json({
      message: message,
      code: errorCode,
      timestamp: new Date().toISOString()
    })
  }, delay)
}

/**
 * Validate and sanitize login inputs
 * @param {string} username - Username/email
 * @param {string} password - Password
 * @returns {Object} - Validation result
 */
const validateLoginInputs = (username, password) => {
  const errors = []

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    errors.push('Username is required')
  }

  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    errors.push('Password is required')
  }

  // Check for suspicious patterns
  if (username && username.length > 100) {
    errors.push('Username is too long')
  }

  if (password && password.length > 100) {
    errors.push('Password is too long')
  }

  // Check for SQL injection patterns (basic)
  const sqlPatterns = /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i
  if (username && sqlPatterns.test(username)) {
    errors.push('Invalid username format')
  }

  if (password && sqlPatterns.test(password)) {
    errors.push('Invalid password format')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedUsername: username ? username.trim() : '',
    sanitizedPassword: password ? password.trim() : ''
  }
}

/**
 * Check if user account is locked due to too many failed attempts
 * @param {string} ip - IP address
 * @returns {boolean} - True if account is locked
 */
const isAccountLocked = (ip) => {
  const attempts = getFailedAttempts(ip)
  if (!attempts) return false

  // Lock account if more than max attempts in lockout duration
  const lockoutTimeAgo = Date.now() - (securityConfig.accountLockoutDuration * 1000)
  const recentAttempts = attempts.reasons.filter(r => r.timestamp > lockoutTimeAgo)

  return recentAttempts.length >= securityConfig.maxLoginAttempts
}

/**
 * Get security status for an IP address
 * @param {string} ip - IP address
 * @returns {Object} - Security status
 */
const getSecurityStatus = (ip) => {
  const attempts = getFailedAttempts(ip)
  if (!attempts) {
    return {
      isLocked: false,
      failedAttempts: 0,
      lastAttempt: null,
      timeUntilReset: null
    }
  }

  const lockoutTimeAgo = Date.now() - (securityConfig.accountLockoutDuration * 1000)
  const recentAttempts = attempts.reasons.filter(r => r.timestamp > lockoutTimeAgo)
  const isLocked = recentAttempts.length >= securityConfig.maxLoginAttempts
  const timeUntilReset = isLocked ? 
    Math.max(0, (attempts.lastAttempt + (securityConfig.accountLockoutDuration * 1000)) - Date.now()) : 0

  return {
    isLocked,
    failedAttempts: recentAttempts.length,
    lastAttempt: attempts.lastAttempt,
    timeUntilReset: timeUntilReset > 0 ? Math.ceil(timeUntilReset / 1000) : 0
  }
}

module.exports = {
  loginRateLimiter,
  teamLoginRateLimiter,
  logFailedLoginAttempt,
  handleAuthError,
  validateLoginInputs,
  isAccountLocked,
  getSecurityStatus,
  clearFailedAttempts,
  getFailedAttempts
}
