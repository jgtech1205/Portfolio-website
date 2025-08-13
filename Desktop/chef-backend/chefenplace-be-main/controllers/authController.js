const jwt = require("jsonwebtoken")
const { validationResult } = require("express-validator")
const User = require("../database/models/User")
const { generateTokens } = require("../utils/tokenUtils")

const authController = {
  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password } = req.body

      // Find user
      const user = await User.findOne({ email, isActive: true })
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" })
      }

      // Check password
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" })
      }

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id)

      res.json({
        message: "Login successful",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      })
    } catch (error) {
      console.error("Login error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  async loginWithChefId(req, res) {
    try {
      const { chefId, headChefId } = req.params
      // Find user by chefId
      const user = await User.findOne({ _id: chefId, status: "active", isActive: true, headChef: headChefId })
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id)
      res.json({
        message: "Login successful",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      })
    } catch (error) {
      console.error("Login with chefId error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Register user
  async register(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password, name, role = "cook" } = req.body

      // Check if user exists
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" })
      }

      // Create user
      const user = new User({
        email,
        password,
        name,
        role,
      })

      await user.save()

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id)

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
        },
        accessToken,
        refreshToken,
      })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" })
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
      const user = await User.findById(decoded.userId)

      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid refresh token" })
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id)

      res.json({
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
      res.json({ message: "Logged out successfully" })
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
      res.json({ message: "If email exists, reset link has been sent" })
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
      res.json({ message: "Password reset successfully" })
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
        role: "user",
        headChef: headChefId,
        status: "pending",
      })

      await user.save()

      res.status(201).json({ success: true, userId: user._id, status: user.status })
    } catch (error) {
      console.error("Accept chef invite error:", error)
      res.status(400).json({ message: "Invalid or expired invite" })
    }
  },
}

module.exports = authController
