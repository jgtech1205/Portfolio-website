// Read-only authentication middleware for team members
// Allows both headchefs and team members, but team members can only read
const readOnlyAuth = (req, res, next) => {
  // Allow both headchefs and team members
  if (req.user.role === "head-chef" || req.user.role === "team-member") {
    return next();
  }
  return res.status(403).json({ 
    message: "Access denied. Organization access only." 
  });
};

// Read-only permission check for team members
const checkReadOnlyPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Head chefs have all permissions
    if (req.user.role === "head-chef") {
      return next();
    }

    // Team members can only view (read-only)
    if (req.user.role === "team-member") {
      // Only allow view permissions for team members
      const viewPermissions = [
        "canViewRecipes",
        "canViewPlateups", 
        "canViewNotifications",
        "canViewPanels"
      ];
      
      if (viewPermissions.includes(permission) && req.user.permissions[permission]) {
        return next();
      }
      
      return res.status(403).json({
        message: "Access denied. Team members have read-only access.",
        required: permission,
        userRole: req.user.role,
      });
    }

    // For other roles, check normal permissions
    if (!req.user.permissions[permission]) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
        required: permission,
      });
    }

    next();
  };
};

module.exports = {
  readOnlyAuth,
  checkReadOnlyPermission
};
