const jwt = require("jsonwebtoken")
const User = require("../database/models/User")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Check if user is active/approved
    if (user.status !== "approved" && user.status !== "active") {
      return res.status(401).json({ 
        message: "Account not approved or inactive." 
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error("Auth middleware error:", error)
    res.status(401).json({ message: "Invalid token." })
  }
}

// Enhanced authentication for team members with organization validation
const teamAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Ensure user is a team member (not head chef)
    if (user.role !== "user" && user.role !== "team-member") {
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

    req.user = user
    next()
  } catch (error) {
    console.error("Team auth middleware error:", error)
    res.status(401).json({ message: "Invalid token." })
  }
}

// Organization-based access control
const organizationAuth = async (req, res, next) => {
  try {
    const { headChefId } = req.params
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Head chefs can access their own organization
    if (user.role === "head-chef" && user._id.toString() === headChefId) {
      req.user = user
      return next()
    }

    // Team members can access their head chef's organization
    if (user.role === "user" && user.headChefId && user.headChefId.toString() === headChefId) {
      if (user.status !== "approved" && user.status !== "active") {
        return res.status(401).json({ 
          message: "Account not approved. Please contact your head chef for approval." 
        })
      }
      req.user = user
      return next()
    }

    return res.status(403).json({ 
      message: "Access denied. You don't have permission to access this organization." 
    })
  } catch (error) {
    console.error("Organization auth middleware error:", error)
    res.status(401).json({ message: "Invalid token." })
  }
}

// Enhanced permission checking with organization context
const checkPermissionWithOrg = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" })
    }

    // Head chefs have all permissions
    if (req.user.role === "head-chef") {
      return next()
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
      })
    }

    next()
  }
}

module.exports = {
  auth,
  teamAuth,
  organizationAuth,
  checkPermissionWithOrg
}
