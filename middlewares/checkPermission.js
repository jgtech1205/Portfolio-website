const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" })
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
