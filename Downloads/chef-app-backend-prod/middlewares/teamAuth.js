const jwt = require("jsonwebtoken")
const User = require("../database/models/User")
const { verifyTokenWithContext } = require("../utils/tokenUtils")

// Team member authentication middleware
const teamMemberAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    // Verify token and extract context
    const tokenContext = verifyTokenWithContext(token)
    if (!tokenContext.valid) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Get user from database
    const user = await User.findById(tokenContext.userId).select("-password")
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Ensure user is a team member
    if (user.role !== "user") {
      return res.status(403).json({ 
        message: "Access denied. Team member access only." 
      })
    }

    // Check if user is approved
    if (user.status !== "approved" && user.status !== "active") {
      return res.status(401).json({ 
        message: "Account not approved. Please contact your head chef for approval." 
      })
    }

    // Ensure user has a headChefId (belongs to an organization)
    if (!user.headChefId) {
      return res.status(403).json({ 
        message: "Access denied. User not associated with any organization." 
      })
    }

    // Verify token context matches user data
    if (tokenContext.headChefId && tokenContext.headChefId !== user.headChefId.toString()) {
      return res.status(401).json({ 
        message: "Token context mismatch. Please login again." 
      })
    }

    req.user = user
    req.teamContext = {
      headChefId: user.headChefId,
      organization: user.organization,
      permissions: user.permissions
    }
    next()
  } catch (error) {
    console.error("Team member auth middleware error:", error)
    res.status(401).json({ message: "Invalid token." })
  }
}

// Organization-scoped team member authentication
const organizationTeamAuth = async (req, res, next) => {
  try {
    const { headChefId } = req.params
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    // Verify token and extract context
    const tokenContext = verifyTokenWithContext(token)
    if (!tokenContext.valid) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Get user from database
    const user = await User.findById(tokenContext.userId).select("-password")
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Ensure user is a team member
    if (user.role !== "user") {
      return res.status(403).json({ 
        message: "Access denied. Team member access only." 
      })
    }

    // Check if user is approved
    if (user.status !== "approved" && user.status !== "active") {
      return res.status(401).json({ 
        message: "Account not approved. Please contact your head chef for approval." 
      })
    }

    // Verify user belongs to the specified organization
    if (!user.headChefId || user.headChefId.toString() !== headChefId) {
      return res.status(403).json({ 
        message: "Access denied. You don't have permission to access this organization." 
      })
    }

    req.user = user
    req.teamContext = {
      headChefId: user.headChefId,
      organization: user.organization,
      permissions: user.permissions
    }
    next()
  } catch (error) {
    console.error("Organization team auth middleware error:", error)
    res.status(401).json({ message: "Invalid token." })
  }
}

// Enhanced permission checking for team members
const checkTeamPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" })
    }

    // Ensure user is a team member
    if (req.user.role !== "user") {
      return res.status(403).json({ 
        message: "Access denied. Team member access only." 
      })
    }

    // Check if user is approved
    if (req.user.status !== "approved" && req.user.status !== "active") {
      return res.status(401).json({ 
        message: "Account not approved. Please contact your head chef for approval." 
      })
    }

    // Check specific permission
    if (!req.user.permissions[permission]) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
        required: permission,
        userRole: req.user.role,
        userStatus: req.user.status,
        availablePermissions: req.user.permissions
      })
    }

    next()
  }
}

module.exports = {
  teamMemberAuth,
  organizationTeamAuth,
  checkTeamPermission
}
