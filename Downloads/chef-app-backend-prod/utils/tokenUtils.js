const jwt = require("jsonwebtoken")
const { getJWTConfig } = require("../config/environment")

const config = getJWTConfig()

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.secret, { expiresIn: `${config.sessionTimeout}s` })

  const refreshToken = jwt.sign({ userId }, config.refreshSecret, {
    expiresIn: `${config.refreshTokenExpiry}s`,
  })

  return { accessToken, refreshToken }
}

// Generate tokens with additional user context for team members
const generateTeamTokens = (userId, headChefId, role) => {
  const payload = { 
    userId, 
    headChefId, 
    role,
    type: 'team-member'
  }
  
  const accessToken = jwt.sign(payload, config.teamSecret, { expiresIn: `${config.teamSessionTimeout}s` })

  const refreshToken = jwt.sign(payload, config.refreshSecret, {
    expiresIn: `${config.refreshTokenExpiry}s`,
  })

  return { accessToken, refreshToken }
}

// Generate tokens for head chefs
const generateHeadChefTokens = (userId) => {
  const payload = { 
    userId, 
    role: 'head-chef',
    type: 'head-chef'
  }
  
  const accessToken = jwt.sign(payload, config.headChefSecret, { expiresIn: `${config.sessionTimeout}s` })

  const refreshToken = jwt.sign(payload, config.refreshSecret, {
    expiresIn: `${config.refreshTokenExpiry}s`,
  })

  return { accessToken, refreshToken }
}

const verifyToken = (token, secret) => {
  return jwt.verify(token, secret)
}

// Verify token and extract user context
const verifyTokenWithContext = (token) => {
  try {
    // Try different secrets based on token type
    const secrets = [config.secret, config.teamSecret, config.headChefSecret]
    
    for (const secret of secrets) {
      try {
        const decoded = jwt.verify(token, secret)
        return {
          userId: decoded.userId,
          headChefId: decoded.headChefId,
          role: decoded.role,
          type: decoded.type,
          valid: true
        }
      } catch (err) {
        // Continue to next secret
        continue
      }
    }
    
    throw new Error('Invalid token')
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

module.exports = {
  generateTokens,
  generateTeamTokens,
  generateHeadChefTokens,
  verifyToken,
  verifyTokenWithContext
}
