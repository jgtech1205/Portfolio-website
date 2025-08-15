# Environment Variables Quick Reference

## 🚀 Essential Variables (Required)

```bash
# JWT Secrets (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Database
MONGODB_URI=mongodb://localhost:27017/chef-en-place
```

## 🔐 Team Authentication Variables

```bash
# Team-specific JWT secrets (optional, fallback to JWT_SECRET)
TEAM_JWT_SECRET=your-team-specific-jwt-secret-here
HEAD_CHEF_JWT_SECRET=your-head-chef-specific-jwt-secret-here

# Session timeouts
SESSION_TIMEOUT=3600          # 1 hour
TEAM_SESSION_TIMEOUT=1800     # 30 minutes
REFRESH_TOKEN_EXPIRY=604800   # 7 days
```

## 🛡️ Security Variables

```bash
# Rate limiting
LOGIN_RATE_LIMIT=5            # Login attempts per IP
TEAM_LOGIN_RATE_LIMIT=10      # Team login attempts per IP
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes

# Account security
MAX_LOGIN_ATTEMPTS=5          # Failed attempts before lockout
ACCOUNT_LOCKOUT_DURATION=900  # Lockout duration (15 minutes)

# Feature toggles
ENABLE_RATE_LIMITING=true
ENABLE_SECURITY_LOGGING=true
```

## 🏢 Multi-tenant Security

```bash
# Organization isolation
ORGANIZATION_ISOLATION=true
ENABLE_CROSS_ORGANIZATION_ACCESS=false
ALLOW_HEAD_CHEF_CROSS_ACCESS=false
TEAM_MEMBER_ORGANIZATION_STRICT=true
```

## 🌐 Server & CORS

```bash
# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## 📧 Email (Optional)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@chefenplace.com
```

## ☁️ Cloudinary (Optional)

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📊 Logging

```bash
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_LOGGING=true
```

## 🧪 Development

```bash
ENABLE_TEST_MODE=false
SKIP_AUTH_IN_DEV=false
```

## ⚡ Quick Setup

### Development
```bash
# Copy and modify these essential variables
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
MONGODB_URI=mongodb://localhost:27017/chef-en-place
PORT=5000
NODE_ENV=development
```

### Production
```bash
# Strong secrets (at least 32 characters)
JWT_SECRET=your-very-long-and-very-secure-jwt-secret-key-here
JWT_REFRESH_SECRET=your-very-long-and-very-secure-refresh-secret-key-here

# Production settings
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chef-en-place
NODE_ENV=production
ORGANIZATION_ISOLATION=true
ENABLE_RATE_LIMITING=true
ENABLE_SECURITY_LOGGING=true

# Your domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🔧 Validation

The app validates environment variables on startup:

```bash
# ✅ Success
✅ Environment configuration validated

# ❌ Missing required variables
❌ Missing required environment variables: ['JWT_SECRET', 'JWT_REFRESH_SECRET']

# ⚠️ Development defaults in production
⚠️  Warning: Using development default for JWT_SECRET in production
```

## 📋 Checklist

### Required for Basic Functionality
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `MONGODB_URI`

### Required for Team Authentication
- [ ] `TEAM_SESSION_TIMEOUT`
- [ ] `TEAM_LOGIN_RATE_LIMIT`
- [ ] `ORGANIZATION_ISOLATION`

### Required for Production
- [ ] Strong JWT secrets (32+ characters)
- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS` configured
- [ ] Email configuration (for notifications)

### Optional but Recommended
- [ ] `TEAM_JWT_SECRET` (separate from main JWT_SECRET)
- [ ] `HEAD_CHEF_JWT_SECRET` (separate from main JWT_SECRET)
- [ ] `ENABLE_SECURITY_LOGGING=true`
- [ ] `ENABLE_RATE_LIMITING=true`

## 🚨 Security Notes

1. **Never commit secrets** to version control
2. **Use different secrets** for each environment
3. **Rotate secrets regularly** in production
4. **Enable organization isolation** in production
5. **Monitor rate limiting** and adjust as needed
