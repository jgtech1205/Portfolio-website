const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const { validationResult } = require("express-validator")
const User = require("../database/models/User")
const { generateTokens, generateTeamTokens, generateHeadChefTokens } = require("../utils/tokenUtils")
const { validateTeamMemberCredentials } = require("../utils/teamAuthUtils")
const { handleAuthError, validateLoginInputs, clearFailedAttempts } = require("../utils/authErrorHandler")
const { authSuccessResponse, AUTH_ERROR_CODES, HTTP_STATUS } = require("../utils/responseUtils")

const authController = {
  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password } = req.body

      // Validate and sanitize inputs
      const inputValidation = validateLoginInputs(email, password)
      if (!inputValidation.isValid) {
        return handleAuthError(req, res, 'MISSING_CREDENTIALS', null, inputValidation.errors.join(', '))
      }

      // Find user
      const user = await User.findOne({ email: inputValidation.sanitizedUsername })
      if (!user) {
        return handleAuthError(req, res, 'USER_NOT_FOUND', null)
      }

      // Check password
      const isMatch = await user.comparePassword(inputValidation.sanitizedPassword)
      if (!isMatch) {
        return handleAuthError(req, res, 'INVALID_CREDENTIALS', user)
      }

      // Check if user is active/approved
      if (user.status !== "approved" && user.status !== "active") {
        return handleAuthError(req, res, 'USER_NOT_APPROVED', user)
      }

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      // Clear failed attempts for this IP after successful login
      const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
      clearFailedAttempts(ip)

      // Generate tokens based on user role
      const { accessToken, refreshToken } = user.role === "head-chef" 
        ? generateHeadChefTokens(user._id)
        : generateTeamTokens(user._id, user.headChefId, user.role)

      res.status(HTTP_STATUS.OK).json(authSuccessResponse(user, accessToken, refreshToken))
    } catch (error) {
      console.error("Login error:", error)
      handleAuthError(req, res, 'SYSTEM_ERROR', null, 'System error occurred')
    }
  },

  async loginWithChefId(req, res) {
    try {
      const { chefId, headChefId } = req.params
      // Find user by chefId
      const user = await User.findOne({ _id: chefId, status: "active", headChefId: headChefId })
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ 
          message: "User not found",
          code: AUTH_ERROR_CODES.USER_NOT_FOUND
        })
      }
      // Generate tokens based on user role
      const { accessToken, refreshToken } = user.role === "head-chef" 
        ? generateHeadChefTokens(user._id)
        : generateTeamTokens(user._id, user.headChefId, user.role)
      res.status(HTTP_STATUS.OK).json(authSuccessResponse(user, accessToken, refreshToken))
    } catch (error) {
      console.error("Login with chefId error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Register user (head chef registration for new restaurants)
  async register(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: errors.array() 
        })
      }

      const { email, password, name, role = "head-chef" } = req.body

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: "Invalid email format",
          code: "INVALID_EMAIL"
        })
      }

      // Validate password strength (minimum 6 characters)
      if (!password || password.length < 6) {
        return res.status(400).json({ 
          message: "Password must be at least 6 characters long",
          code: "WEAK_PASSWORD"
        })
      }

      // Check if email already exists in database
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(409).json({ 
          message: "Email already exists",
          code: "EMAIL_EXISTS"
        })
      }

      // Generate unique headChefId (using MongoDB ObjectId)
      const headChefId = new mongoose.Types.ObjectId()

      // Create new user with role "head-chef", status "active", and full permissions
      const user = new User({
        email,
        password, // Will be hashed by pre-save hook
        firstName: name, // Use restaurant name as firstName
        lastName: "Head Chef", // Default lastName for head chefs
        role: "head-chef",
        status: "active",
        headChefId: headChefId, // Set headChefId to their own ID
        permissions: {
          canViewPanels: true,
          canViewRecipes: true,
          canViewPlateups: true,
          canViewNotifications: true,
          canManageTeam: true,
          canCreateNotifications: true,
          canEditRecipes: true,
          canDeleteRecipes: true,
          canUpdateRecipes: true,
          canCreatePlateups: true,
          canDeletePlateups: true,
          canUpdatePlateups: true,
          canDeleteNotifications: true,
          canUpdateNotifications: true,
          canCreatePanels: true,
          canDeletePanels: true,
          canUpdatePanels: true,
          canAccessAdmin: true
        }
      })

      await user.save()

      // Generate JWT accessToken and refreshToken
      const { accessToken, refreshToken } = generateHeadChefTokens(user._id)

      // Return user object with specified format
      res.status(201).json({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          headChefId: user.headChefId,
          permissions: user.permissions,
          status: user.status
        },
        accessToken,
        refreshToken
      })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({ 
        message: "Internal server error",
        code: "INTERNAL_ERROR"
      })
    }
  },

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
          message: "Refresh token required",
          code: AUTH_ERROR_CODES.REFRESH_TOKEN_REQUIRED
        })
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
      const user = await User.findById(decoded.userId)

      if (!user || !user.isActive) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
          message: "Invalid refresh token",
          code: AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN
        })
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id)

      res.status(HTTP_STATUS.OK).json({
        accessToken,
        refreshToken: newRefreshToken,
      })
    } catch (error) {
      console.error("Refresh token error:", error)
      res.status(401).json({ message: "Invalid refresh token" })
    }
  },

  // Logout
  async logout(req, res) {
    try {
      res.status(HTTP_STATUS.OK).json({ message: "Logged out successfully" })
    } catch (error) {
      console.error("Logout error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Forgot password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body

      const user = await User.findOne({ email, isActive: true })
      if (!user) {
        return res.json({ message: "If email exists, reset link has been sent" })
      }

      // In production, send actual email with reset token
      res.status(HTTP_STATUS.OK).json({ message: "If email exists, reset link has been sent" })
    } catch (error) {
      console.error("Forgot password error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Reset password
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body

      // In production, verify the reset token
      res.status(HTTP_STATUS.OK).json({ message: "Password reset successfully" })
    } catch (error) {
      console.error("Reset password error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Accept chef invite via token
  async acceptChefInvite(req, res) {
    try {
      const { token } = req.params
      const { firstName, lastName } = req.body

      const decoded = jwt.verify(
        token,
        process.env.CHEF_INVITE_SECRET || "chef-invite-secret",
      )

      const headChefId = decoded.headChefId

      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}@chef.local`
      const tempPassword = Math.random().toString(36).slice(-8)

      const user = new User({
        email,
        password: tempPassword,
        name: `${firstName} ${lastName}`,
        firstName: firstName.trim(), // Store as-is for login purposes
        lastName: lastName.trim(),   // Store as-is for login purposes
        role: "user",
        headChefId: headChefId,
        status: "pending",
      })

      await user.save()

      res.status(HTTP_STATUS.CREATED).json({ 
        message: "Chef invite accepted successfully",
        userId: user._id, 
        status: user.status 
      })
    } catch (error) {
      console.error("Accept chef invite error:", error)
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        message: "Invalid or expired invite",
        code: AUTH_ERROR_CODES.INVALID_INVITE
      })
    }
  },

  // Team member login with restaurant-specific validation
  async teamLogin(req, res) {
    try {
      console.log('🔍 Team login attempt:', { params: req.params, body: req.body });
      const { headChefId } = req.params
      const { username, password } = req.body

      // Validate request body has username and password fields
      if (!username || !password) {
        console.log('❌ Missing credentials');
        return res.status(400).json({ 
          message: "Missing username or password",
          code: "MISSING_CREDENTIALS"
        })
      }

      // Validate headChefId parameter exists and is valid
      if (!headChefId) {
        console.log('❌ Missing headChefId');
        return res.status(400).json({ 
          message: "Missing headChefId parameter",
          code: "MISSING_HEAD_CHEF_ID"
        })
      }

      // Validate headChefId format (MongoDB ObjectId)
      if (!mongoose.Types.ObjectId.isValid(headChefId)) {
        console.log('❌ Invalid headChefId format');
        return res.status(400).json({
          message: "Invalid restaurant ID format",
          code: "INVALID_RESTAURANT_ID"
        })
      }

      // Step 1: Verify the restaurant (head chef) exists and is active
      console.log('🔍 Validating restaurant:', headChefId);
      const headChef = await User.findOne({
        _id: headChefId,
        role: "head-chef",
        status: { $in: ["active", "approved"] }
      })

      if (!headChef) {
        console.log('❌ Restaurant not found or inactive');
        return res.status(404).json({
          message: "Restaurant not found or inactive",
          code: "RESTAURANT_NOT_FOUND"
        })
      }

      console.log('✅ Restaurant validated:', headChef.email);

      // Step 2: Find team member with restaurant-specific validation
      console.log('🔍 Searching for team member:', { headChefId, username, password });
      const teamMember = await User.findOne({
        headChefId: headChefId, // Must belong to this specific restaurant
        firstName: { $regex: new RegExp(`^${username}$`, 'i') },
        lastName: { $regex: new RegExp(`^${password}$`, 'i') },
        role: { $in: ["user", "team-member"] } // Must be a team member, not head chef
      })

      console.log('🔍 Team member found:', teamMember ? 'Yes' : 'No');
      
      // 404 Not Found: Team member not found for this restaurant
      if (!teamMember) {
        console.log('❌ Team member not found for this restaurant');
        return res.status(404).json({ 
          message: "Invalid credentials",
          code: "INVALID_CREDENTIALS"
        })
      }

      console.log('🔍 Team member status:', teamMember.status);
      
      // 403 Forbidden: Team member exists but status is not "approved" or "active"
      if (teamMember.status !== "approved" && teamMember.status !== "active") {
        console.log('❌ Team member not approved');
        return res.status(403).json({ 
          message: "Account not approved",
          code: "ACCOUNT_NOT_APPROVED"
        })
      }

      // Step 3: Verify team member belongs to the correct restaurant
      if (teamMember.headChefId.toString() !== headChefId) {
        console.log('❌ Team member belongs to different restaurant');
        return res.status(403).json({
          message: "Access denied",
          code: "ACCESS_DENIED"
        })
      }

      console.log('🔍 Generating tokens...');
      
      // Update last login
      teamMember.lastLogin = new Date()
      await teamMember.save()

      // Generate JWT tokens with restaurant context
      const { accessToken, refreshToken } = generateTeamTokens(
        teamMember._id, 
        teamMember.headChefId, 
        teamMember.role
      )

      console.log('✅ Tokens generated successfully');
      
      // Return team member data with tokens
      res.status(200).json({
        user: {
          id: teamMember._id,
          firstName: teamMember.firstName,
          lastName: teamMember.lastName,
          name: teamMember.name,
          role: "team-member",
          headChefId: teamMember.headChefId,
          permissions: teamMember.permissions,
          status: teamMember.status,
          restaurant: {
            id: headChef._id,
            name: headChef.name || `${headChef.firstName} ${headChef.lastName}`.trim()
          }
        },
        accessToken,
        refreshToken
      })

    } catch (error) {
      console.error("❌ Team login error:", error)
      res.status(500).json({ 
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  },
}

module.exports = authController
