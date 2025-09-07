/**
 * Permission utilities for ensuring users have correct permissions
 */

const ensureUserPermissions = (user) => {
  if (!user.permissions) {
    user.permissions = {};
  }

  // Set permissions based on role
  switch (user.role) {
    case "head-chef":
      user.permissions = {
        // Recipes
        canViewRecipes: true,
        canEditRecipes: true,
        canDeleteRecipes: true,
        canUpdateRecipes: true,

        // Plateups
        canViewPlateups: true,
        canCreatePlateups: true,
        canDeletePlateups: true,
        canUpdatePlateups: true,

        // Notifications
        canViewNotifications: true,
        canCreateNotifications: true,
        canDeleteNotifications: true,
        canUpdateNotifications: true,

        // Panels
        canViewPanels: true,
        canCreatePanels: true,
        canDeletePanels: true,
        canUpdatePanels: true,

        // Other
        canManageTeam: true,
        canAccessAdmin: true,
      };
      break;

    case "team-member":
    case "user":
      user.permissions = {
        // Recipe permissions - view only for team members
        canViewRecipes: true,
        canEditRecipes: false,
        canDeleteRecipes: false,
        canUpdateRecipes: false,

        // Plateup permissions - view only for team members
        canViewPlateups: true,
        canCreatePlateups: false,
        canDeletePlateups: false,
        canUpdatePlateups: false,

        // Notification permissions - view only for team members
        canViewNotifications: true,
        canCreateNotifications: false,
        canDeleteNotifications: false,
        canUpdateNotifications: false,

        // Panel permissions - view only for team members
        canViewPanels: true,
        canCreatePanels: false,
        canDeletePanels: false,
        canUpdatePanels: false,

        // Other permissions - no admin access for team members
        canManageTeam: false,
        canAccessAdmin: false,
      };
      break;

    default:
      // Unknown role, set minimal permissions
      user.permissions = {
        canViewRecipes: false,
        canEditRecipes: false,
        canDeleteRecipes: false,
        canUpdateRecipes: false,
        canViewPlateups: false,
        canCreatePlateups: false,
        canDeletePlateups: false,
        canUpdatePlateups: false,
        canViewNotifications: false,
        canCreateNotifications: false,
        canDeleteNotifications: false,
        canUpdateNotifications: false,
        canViewPanels: false,
        canCreatePanels: false,
        canDeletePanels: false,
        canUpdatePanels: false,
        canManageTeam: false,
        canAccessAdmin: false,
      };
  }

  return user;
};

const validateUserPermissions = (user) => {
  if (!user || !user.permissions) {
    return false;
  }

  // Check if user has the required permissions for their role
  switch (user.role) {
    case "head-chef":
      return user.permissions.canManageTeam === true;
    case "team-member":
    case "user":
      return user.permissions.canViewRecipes === true;
    default:
      return false;
  }
};

module.exports = {
  ensureUserPermissions,
  validateUserPermissions
};
