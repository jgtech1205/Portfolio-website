/**
 * Standardize user object for API responses
 * @param {Object} user - User object from database
 * @returns {Object} - Standardized user object
 */
const standardizeUserObject = (user) => {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    organization: user.organization,
    permissions: user.permissions,
    avatar: user.avatar,
  }
}

/**
 * Standardize success response for authentication endpoints
 * @param {Object} user - User object
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 * @returns {Object} - Standardized success response
 */
const authSuccessResponse = (user, accessToken, refreshToken) => {
  return {
    user: standardizeUserObject(user),
    accessToken,
    refreshToken,
  }
}

/**
 * Standardize error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} statusCode - HTTP status code
 * @returns {Object} - Standardized error response
 */
const errorResponse = (message, code = null, statusCode = 400) => {
  const response = {
    message,
  }
  
  if (code) {
    response.code = code
  }
  
  return {
    statusCode,
    response
  }
}

/**
 * Standardize success response for non-auth endpoints
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {Object} - Standardized success response
 */
const successResponse = (data, message = null) => {
  const response = {}
  
  if (data) {
    response.data = data
  }
  
  if (message) {
    response.message = message
  }
  
  return response
}

/**
 * Common error codes for authentication
 */
const AUTH_ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_NOT_APPROVED: 'USER_NOT_APPROVED',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_REJECTED: 'USER_REJECTED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MISSING_CREDENTIALS: 'MISSING_CREDENTIALS',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  REFRESH_TOKEN_REQUIRED: 'REFRESH_TOKEN_REQUIRED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  INVALID_INVITE: 'INVALID_INVITE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TEAM_RATE_LIMIT_EXCEEDED: 'TEAM_RATE_LIMIT_EXCEEDED',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  NO_TEAM_MEMBERS: 'NO_TEAM_MEMBERS',
  DUPLICATE_NAMES: 'DUPLICATE_NAMES',
  WRONG_ORGANIZATION: 'WRONG_ORGANIZATION'
}

/**
 * HTTP status codes
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
}

module.exports = {
  standardizeUserObject,
  authSuccessResponse,
  errorResponse,
  successResponse,
  AUTH_ERROR_CODES,
  HTTP_STATUS
}
