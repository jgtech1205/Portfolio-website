# Environment Variables Documentation

This document describes all environment variables used in the Chef En Place backend, with a focus on the new team authentication and security features.

## 🔐 JWT Configuration

### Core JWT Secrets
```bash
# Primary JWT secret for general authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Refresh token secret (should be different from JWT_SECRET)
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
```

### Team Authentication JWT Secrets
```bash
# JWT secret specifically for team member tokens
TEAM_JWT_SECRET=your-team-specific-jwt-secret-here

# JWT secret specifically for head chef tokens
HEAD_CHEF_JWT_SECRET=your-head-chef-specific-jwt-secret-here
```

**Note**: If `TEAM_JWT_SECRET` or `HEAD_CHEF_JWT_SECRET` are not set, they will fall back to `JWT_SECRET`.

## ⏱️ Session Configuration

```bash
# General session timeout (in seconds)
SESSION_TIMEOUT=3600

# Team member session timeout (in seconds) - shorter for security
TEAM_SESSION_TIMEOUT=1800

# Refresh token expiry (in seconds)
REFRESH_TOKEN_EXPIRY=604800
```

**Default Values:**
- `SESSION_TIMEOUT`: 3600 seconds (1 hour)
- `TEAM_SESSION_TIMEOUT`: 1800 seconds (30 minutes)
- `REFRESH_TOKEN_EXPIRY`: 604800 seconds (7 days)

## 🛡️ Rate Limiting Configuration

```bash
# Number of login attempts allowed per IP
LOGIN_RATE_LIMIT=5

# Number of team login attempts allowed per IP
TEAM_LOGIN_RATE_LIMIT=10

# Rate limiting window in milliseconds
RATE_LIMIT_WINDOW_MS=900000
```

**Default Values:**
- `LOGIN_RATE_LIMIT`: 5 attempts
- `TEAM_LOGIN_RATE_LIMIT`: 10 attempts
- `RATE_LIMIT_WINDOW_MS`: 900000ms (15 minutes)

## 🔒 Security Configuration

### Account Security
```bash
# Maximum failed login attempts before account lockout
MAX_LOGIN_ATTEMPTS=5

# Account lockout duration in seconds
ACCOUNT_LOCKOUT_DURATION=900
```

**Default Values:**
- `MAX_LOGIN_ATTEMPTS`: 5 attempts
- `ACCOUNT_LOCKOUT_DURATION`: 900 seconds (15 minutes)

### Feature Toggles
```bash
# Enable/disable rate limiting
ENABLE_RATE_LIMITING=true

# Enable/disable security logging
ENABLE_SECURITY_LOGGING=true
```

**Default Values:**
- `ENABLE_RATE_LIMITING`: true
- `ENABLE_SECURITY_LOGGING`: true

## 🏢 Multi-tenant Security

### Organization Isolation
```bash
# Enable strict organization isolation
ORGANIZATION_ISOLATION=true

# Allow cross-organization access
ENABLE_CROSS_ORGANIZATION_ACCESS=false

# Allow head chefs to access other organizations
ALLOW_HEAD_CHEF_CROSS_ACCESS=false

# Strict team member organization enforcement
TEAM_MEMBER_ORGANIZATION_STRICT=true
```

**Default Values:**
- `ORGANIZATION_ISOLATION`: true
- `ENABLE_CROSS_ORGANIZATION_ACCESS`: false
- `ALLOW_HEAD_CHEF_CROSS_ACCESS`: false
- `TEAM_MEMBER_ORGANIZATION_STRICT`: true

## 🗄️ Database Configuration

```bash
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/chef-en-place
```

## 🌐 Server Configuration

```bash
# Server port
PORT=5000

# Node environment
NODE_ENV=development
```

**Default Values:**
- `PORT`: 5000
- `NODE_ENV`: development

## 🔗 CORS Configuration

```bash
# CORS origin (single domain)
CORS_ORIGIN=http://localhost:3000

# CORS origins (multiple domains, comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

**Default Values:**
- `CORS_ORIGIN`: http://localhost:3000
- `ALLOWED_ORIGINS`: ["http://localhost:3000"]

## 📧 Email Configuration

```bash
# SMTP server host
SMTP_HOST=smtp.gmail.com

# SMTP server port
SMTP_PORT=587

# SMTP username
SMTP_USER=your-email@gmail.com

# SMTP password/app password
SMTP_PASS=your-app-password

# From email address
EMAIL_FROM=noreply@chefenplace.com
```

## 📊 Logging Configuration

```bash
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Enable request logging
ENABLE_REQUEST_LOGGING=true

# Enable error logging
ENABLE_ERROR_LOGGING=true
```

**Default Values:**
- `LOG_LEVEL`: info
- `ENABLE_REQUEST_LOGGING`: true
- `ENABLE_ERROR_LOGGING`: true

## ☁️ Cloudinary Configuration

```bash
# Cloudinary cloud name
CLOUDINARY_CLOUD_NAME=your-cloud-name

# Cloudinary API key
CLOUDINARY_API_KEY=your-api-key

# Cloudinary API secret
CLOUDINARY_API_SECRET=your-api-secret
```

## 🧪 Development/Testing

```bash
# Enable test mode
ENABLE_TEST_MODE=false

# Skip authentication in development
SKIP_AUTH_IN_DEV=false
```

**Default Values:**
- `ENABLE_TEST_MODE`: false
- `SKIP_AUTH_IN_DEV`: false

## 📝 Example .env File

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/chef-en-place

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
TEAM_JWT_SECRET=your-team-specific-jwt-secret-here
HEAD_CHEF_JWT_SECRET=your-head-chef-specific-jwt-secret-here

# Session Configuration
SESSION_TIMEOUT=3600
TEAM_SESSION_TIMEOUT=1800
REFRESH_TOKEN_EXPIRY=604800

# Rate Limiting
LOGIN_RATE_LIMIT=5
TEAM_LOGIN_RATE_LIMIT=10
RATE_LIMIT_WINDOW_MS=900000

# Security
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900
ENABLE_RATE_LIMITING=true
ENABLE_SECURITY_LOGGING=true

# Multi-tenant Security
ORGANIZATION_ISOLATION=true
ENABLE_CROSS_ORGANIZATION_ACCESS=false
ALLOW_HEAD_CHEF_CROSS_ACCESS=false
TEAM_MEMBER_ORGANIZATION_STRICT=true

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@chefenplace.com

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_LOGGING=true

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Development
ENABLE_TEST_MODE=false
SKIP_AUTH_IN_DEV=false
```

## 🔧 Environment Configuration Usage

The application uses a centralized environment configuration system:

```javascript
const { 
  getJWTConfig, 
  getSecurityConfig, 
  getRateLimitConfig,
  validateEnvironment 
} = require('./config/environment')

// Get JWT configuration
const jwtConfig = getJWTConfig()

// Get security configuration
const securityConfig = getSecurityConfig()

// Get rate limiting configuration
const rateLimitConfig = getRateLimitConfig()

// Validate environment on startup
validateEnvironment()
```

## ⚠️ Security Best Practices

### JWT Secrets
1. **Use strong, unique secrets** for each environment
2. **Never commit secrets** to version control
3. **Rotate secrets regularly** in production
4. **Use different secrets** for different token types

### Rate Limiting
1. **Set appropriate limits** based on your application needs
2. **Monitor rate limiting** in production
3. **Adjust limits** based on user behavior

### Organization Isolation
1. **Enable organization isolation** in production
2. **Test cross-organization access** thoroughly
3. **Monitor access patterns** for security

### Environment Variables
1. **Use environment-specific values** for different deployments
2. **Validate required variables** on startup
3. **Use secure variable management** in production (e.g., AWS Secrets Manager)

## 🚀 Production Deployment

For production deployment, ensure you have:

1. **Strong JWT secrets** (at least 32 characters)
2. **Proper CORS configuration** for your domain
3. **Email configuration** for notifications
4. **Security features enabled**
5. **Appropriate rate limiting** for your user base
6. **Monitoring and logging** configured

## 🔍 Validation

The application validates environment variables on startup:

```bash
# Missing required variables will cause startup failure
❌ Missing required environment variables: ['JWT_SECRET', 'JWT_REFRESH_SECRET']

# Development defaults will show warnings in production
⚠️  Warning: Using development default for JWT_SECRET in production
```

## 📚 Related Documentation

- [Migration Guide](./MIGRATION_GUIDE.md) - User data migration
- [API Documentation](./README.md) - API endpoints and usage
- [Security Guide](./SECURITY.md) - Security best practices
