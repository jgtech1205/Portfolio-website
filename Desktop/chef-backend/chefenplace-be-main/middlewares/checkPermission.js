const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" })
    }

    // Bypass for head chefs and admins
    if (req.user.role === "head-chef" || req.user.permissions?.canAccessAdmin) {
      return next()
    }

    if (!req.user.permissions[permission]) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
        required: permission,
      })
    }

    next()
  }
}

module.exports = checkPermission
