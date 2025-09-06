const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const { validationResult } = require("express-validator")
const User = require("../database/models/User")
const Request = require("../database/models/Request")
const Restaurant = require("../database/models/Restaurant")
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

      console.log('🔍 Login attempt for email:', inputValidation.sanitizedUsername)

      // Find user with explicit error handling
      let user
      try {
        user = await User.findOne({ email: inputValidation.sanitizedUsername })
        if (!user) {
          console.log('❌ User not found in database')
          return handleAuthError(req, res, 'USER_NOT_FOUND', null)
        }
        console.log('✅ User found:', { id: user._id, email: user.email, role: user.role, status: user.status })
      } catch (dbError) {
        console.error('❌ Database error during user lookup:', dbError)
        return res.status(500).json({ 
          message: 'Database error occurred',
          code: 'DATABASE_ERROR'
        })
      }

      // Check if user is active/approved
      if (user.status !== "approved" && user.status !== "active") {
        console.log('❌ User not approved/active:', user.status)
        return handleAuthError(req, res, 'USER_NOT_APPROVED', user)
      }

      // Explicit bcrypt password comparison
      console.log('🔍 Checking password...')
      let isMatch
      try {
        // Check if stored password is a bcrypt hash
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
          console.error('❌ Stored password is not a bcrypt hash:', user.password.substring(0, 10) + '...')
          return res.status(500).json({ 
            message: 'Password format error',
            code: 'PASSWORD_FORMAT_ERROR'
          })
        }
        
        isMatch = await bcrypt.compare(inputValidation.sanitizedPassword, user.password)
        console.log('🔍 Password match result:', isMatch)
      } catch (bcryptError) {
        console.error('❌ Bcrypt comparison error:', bcryptError)
        return res.status(500).json({ 
          message: 'Password verification error',
          code: 'PASSWORD_VERIFICATION_ERROR'
        })
      }

      if (!isMatch) {
        console.log('❌ Password mismatch')
        return handleAuthError(req, res, 'INVALID_CREDENTIALS', user)
      }

      console.log('✅ Password verified successfully')

      // Update last login
      try {
        user.lastLogin = new Date()
        await user.save()
        console.log('✅ Last login updated')
      } catch (saveError) {
        console.error('❌ Error updating last login:', saveError)
        // Don't fail login for this, just log the error
      }

      // Clear failed attempts for this IP after successful login
      const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
      clearFailedAttempts(ip)

      // Generate tokens based on user role
      const { accessToken, refreshToken } = user.role === "head-chef" 
        ? generateHeadChefTokens(user._id)
        : generateTeamTokens(user._id, user.headChefId, user.role)

      console.log('✅ Login successful, tokens generated')
      res.status(HTTP_STATUS.OK).json(authSuccessResponse(user, accessToken, refreshToken))
    } catch (error) {
      console.error("❌ Login error:", error)
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

      // Extract both old and new field names for backward compatibility
      const { 
        email, 
        password, 
        name, 
        role = "head-chef",
        // New restaurant fields
        restaurantName,
        restaurantType,
        location,
        headChefName,
        headChefEmail,
        headChefPassword
      } = req.body

      // Use new fields if provided, otherwise fall back to old fields
      const finalEmail = headChefEmail || email
      const finalPassword = headChefPassword || password
      const finalName = headChefName || name

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(finalEmail)) {
        return res.status(400).json({ 
          message: "Invalid email format",
          code: "INVALID_EMAIL"
        })
      }

      // Validate password strength (minimum 6 characters)
      if (!finalPassword || finalPassword.length < 6) {
        return res.status(400).json({ 
          message: "Password must be at least 6 characters long",
          code: "WEAK_PASSWORD"
        })
      }

      // Check if email already exists in database
      const existingUser = await User.findOne({ email: finalEmail })
      if (existingUser) {
        return res.status(409).json({ 
          message: "Email already exists",
          code: "EMAIL_EXISTS"
        })
      }

      // Create new user with role "head-chef" - permissions will be set by pre-save hook
      const user = new User({
        email: finalEmail,
        password: finalPassword, // Will be hashed by pre-save hook
        firstName: finalName, // Use head chef name as firstName
        lastName: "Head Chef", // Default lastName for head chefs
        role: "head-chef",
        status: "active",
        // Don't set headChefId yet - we'll set it after save
        // Don't set permissions here - let the pre-save hook handle it
      })

      await user.save()

      // Now set headChefId to the user's own _id
      user.headChefId = user._id
      await user.save()

      // Create restaurant record if restaurant information is provided
      let restaurant = null
      if (restaurantName && restaurantType && location) {
        try {
          restaurant = new Restaurant({
            restaurantName,
            restaurantType,
            location: {
              address: location.address || "Not specified",
              city: location.city || "Not specified", 
              state: location.state || "Not specified",
              zipCode: location.zipCode || "Not specified",
              country: location.country || "United States"
            },
            headChefId: user._id,
            planType: "trial",
            billingCycle: "monthly",
            subscriptionStatus: "active"
          })

          await restaurant.save()
          console.log(`✅ Restaurant created for head chef: ${restaurant.restaurantName}`)
        } catch (restaurantError) {
          console.error("❌ Error creating restaurant:", restaurantError)
          // Don't fail the registration if restaurant creation fails
          // The head chef can still use the system
        }
      }

      // Generate JWT accessToken and refreshToken
      const { accessToken, refreshToken } = generateHeadChefTokens(user._id)

      // Return user object with specified format
      const response = {
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
      }

      // Include restaurant info if created
      if (restaurant) {
        response.restaurant = {
          id: restaurant._id,
          restaurantName: restaurant.restaurantName,
          restaurantType: restaurant.restaurantType,
          planType: restaurant.planType,
          billingCycle: restaurant.billingCycle,
          subscriptionStatus: restaurant.subscriptionStatus,
          trialEndDate: restaurant.trialEndDate
        }
      }

      res.status(201).json(response)
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

      // Get restaurant information
      const restaurant = await Restaurant.findOne({ headChefId: headChefId });
      if (!restaurant) {
        console.log('❌ Restaurant data not found');
        return res.status(404).json({
          message: "Restaurant data not found",
          code: "RESTAURANT_DATA_NOT_FOUND"
        })
      }

      console.log('✅ Restaurant data found:', restaurant.restaurantName);

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
          restaurantName: restaurant.restaurantName,
          organization: restaurant.restaurantName,
          restaurant: {
            id: restaurant._id,
            name: restaurant.restaurantName,
            type: restaurant.restaurantType
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

  // Get pending team member requests for head chef
  async getPendingRequests(req, res) {
    try {
      // Check if user is a head chef
      if (req.user.role !== 'head-chef') {
        return res.status(403).json({
          success: false,
          message: 'Only head chefs can view pending requests',
          code: 'FORBIDDEN'
        });
      }

      console.log('🔍 Fetching pending requests for head chef:', {
        headChefId: req.user._id,
        userId: req.user._id
      });

      // Get pending requests for this head chef
      const pendingRequests = await Request.find({
        headChefId: req.user._id,
        status: 'pending'
      }).sort({ createdAt: -1 });

      console.log(`✅ Found ${pendingRequests.length} pending requests`);

      res.status(200).json({
        success: true,
        data: pendingRequests
      });

    } catch (error) {
      console.error('❌ Get pending requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending requests',
        code: 'INTERNAL_ERROR'
      });
    }
  },

  // Approve team member request and create account
  async approveRequest(req, res) {
    try {
      const { requestId } = req.params;

      // Check if user is a head chef
      if (req.user.role !== 'head-chef') {
        return res.status(403).json({
          success: false,
          message: 'Only head chefs can approve requests',
          code: 'FORBIDDEN'
        });
      }

      // Validate request ID
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request ID',
          code: 'INVALID_REQUEST_ID'
        });
      }

      console.log('🔍 Approving request:', {
        requestId,
        headChefId: req.user._id
      });

      // Find the request and ensure it belongs to this head chef
      const request = await Request.findOne({
        _id: requestId,
        headChefId: req.user._id,
        status: 'pending'
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found or already processed',
          code: 'REQUEST_NOT_FOUND'
        });
      }

      // Generate email and password for the team member
      const email = `${request.firstName.toLowerCase()}.${request.lastName.toLowerCase()}.${Date.now()}@chef.local`;
      const tempPassword = Math.random().toString(36).slice(-8);

      // Create the team member user account - permissions will be set by pre-save hook
      const teamMember = new User({
        email,
        password: tempPassword,
        firstName: request.firstName,
        lastName: request.lastName,
        name: `${request.firstName} ${request.lastName}`,
        role: 'team-member',
        headChefId: req.user._id,
        organization: request.organization || req.user.organization || 'Default Organization',
        status: 'approved'
        // Don't set permissions here - let the pre-save hook handle it
      });

      await teamMember.save();

      // Update the request status to approved
      request.status = 'approved';
      request.approvedAt = new Date();
      await request.save();

      console.log('✅ Request approved and team member created:', {
        requestId: request._id,
        userId: teamMember._id,
        email: teamMember.email,
        name: teamMember.name
      });

      res.status(200).json({
        success: true,
        message: 'Request approved successfully',
        data: {
          requestId: request._id,
          userId: teamMember._id
        }
      });

    } catch (error) {
      console.error('❌ Approve request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve request',
        code: 'INTERNAL_ERROR'
      });
    }
  },

  // Reject team member request
  async rejectRequest(req, res) {
    try {
      const { requestId } = req.params;

      // Check if user is a head chef
      if (req.user.role !== 'head-chef') {
        return res.status(403).json({
          success: false,
          message: 'Only head chefs can reject requests',
          code: 'FORBIDDEN'
        });
      }

      // Validate request ID
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request ID',
          code: 'INVALID_REQUEST_ID'
        });
      }

      console.log('🔍 Rejecting request:', {
        requestId,
        headChefId: req.user._id
      });

      // Find the request and ensure it belongs to this head chef
      const request = await Request.findOne({
        _id: requestId,
        headChefId: req.user._id,
        status: 'pending'
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found or already processed',
          code: 'REQUEST_NOT_FOUND'
        });
      }

      // Update the request status to rejected
      request.status = 'rejected';
      request.rejectedAt = new Date();
      await request.save();

      console.log('✅ Request rejected:', {
        requestId: request._id,
        name: `${request.firstName} ${request.lastName}`
      });

      res.status(200).json({
        success: true,
        message: 'Request rejected successfully',
        data: {
          requestId: request._id
        }
      });

    } catch (error) {
      console.error('❌ Reject request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject request',
        code: 'INTERNAL_ERROR'
      });
    }
  },

  // Get current user profile
  async getProfile(req, res) {
    try {
      // User is already authenticated via auth middleware
      const user = await User.findById(req.user.id).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      console.log('✅ Profile retrieved for user:', {
        id: user._id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      });

      res.status(200).json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = authController
