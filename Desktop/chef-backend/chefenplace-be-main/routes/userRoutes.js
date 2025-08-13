const express = require("express")
const { body } = require("express-validator")
const userController = require("../controllers/userController")
const auth = require("../middlewares/auth")
const checkPermission = require("../middlewares/checkPermission")
const upload = require("../middlewares/upload")

const router = express.Router()

// All routes require authentication
router.use(auth)

// Profile routes
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User profile
 */
router.get("/profile", userController.getProfile)
/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put(
  "/profile",
  [body("name").optional().trim().isLength({ min: 2 }), body("email").optional().isEmail().normalizeEmail()],
  userController.updateProfile,
)
/**
 * @swagger
 * /api/users/profile/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Avatar uploaded
 */
router.post("/profile/avatar", upload.single("avatar"), userController.uploadAvatar)
/**
 * @swagger
 * /api/users/profile/avatar:
 *   delete:
 *     summary: Delete user avatar
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Avatar deleted
 */
router.delete("/profile/avatar", userController.deleteAvatar)

// Password change
/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Password changed
 */
router.put(
  "/change-password",
  [body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 6 })],
  userController.changePassword,
)

// Preferences
/**
 * @swagger
 * /api/users/preferences:
 *   put:
 *     summary: Update user preferences
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.put("/preferences", userController.updatePreferences)

// Team management (requires permission)
/**
 * @swagger
 * /api/users/team:
 *   get:
 *     summary: Get team members
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Team list
 */
router.get("/team", checkPermission("canManageTeam"), userController.getTeamMembers)
/**
 * @swagger
 * /api/users/team/invite:
 *   post:
 *     summary: Invite team member
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Invitation sent
 */
router.post(
  "/team/invite",
  checkPermission("canManageTeam"),
  [body("email").isEmail().normalizeEmail(), body("role").isIn(["head-chef", "user"])],
  userController.inviteTeamMember,
)
/**
 * @swagger
 * /api/users/team/{id}:
 *   put:
 *     summary: Update team member
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team member updated
 */
router.put(
  "/team/:id",
  checkPermission("canManageTeam"),
  [body("role").optional().isIn(["head-chef", "user"])],
  userController.updateTeamMember,
)
/**
 * @swagger
 * /api/users/team/{id}:
 *   delete:
 *     summary: Remove team member
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team member removed
 */
router.delete("/team/:id", checkPermission("canManageTeam"), userController.removeTeamMember)

// Generate invite link for chefs
router.get("/invite-link", checkPermission("canManageTeam"), userController.generateInviteLink)

// Pending chef management
router.get("/pending-chefs", checkPermission("canManageTeam"), userController.listPendingChefs)
router.put("/pending-chefs/:id", checkPermission("canManageTeam"), userController.updatePendingChef)

// Utility endpoints
router.get("/status/:id", userController.getUserStatus)
router.get("/profile/id/:id", userController.getProfileById)
router.get("/saved-recipes", userController.getSavedRecipes)

module.exports = router
