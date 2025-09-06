const express = require("express")
const { body } = require("express-validator")
const userController = require("../controllers/userController")
const { auth, teamAuth, organizationAuth, checkPermissionWithOrg } = require("../middlewares/auth")
const { headChefAuth } = require("../middlewares/headChefAuth")
const checkPermission = require("../middlewares/checkPermission")
const upload = require("../middlewares/upload")
const { ensureConnection } = require("../database/connection")

const router = express.Router()

// Database connection middleware for all routes
router.use(async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (e) {
    return res.status(503).json({ message: 'Database unavailable' });
  }
});

// All routes require authentication
router.use(auth)

// Head chef specific routes (require head chef authentication)
// Note: /team routes use checkPermission instead of headChefAuth
router.use("/pending-chefs", headChefAuth)
router.use("/invite-link", headChefAuth)

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
 *         description: Team members list
 */
router.get("/team", checkPermission("canManageTeam"), userController.getTeamMembers)

// Simple team endpoint for testing (no auth required)
router.get("/team/public", (req, res) => {
  res.json({
    success: true,
    message: "Team endpoint is working",
    data: []
  });
});
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
  [
    body("email").isEmail().normalizeEmail(), 
    body("firstName").trim().isLength({ min: 1 }),
    body("lastName").trim().isLength({ min: 1 }),
    body("role").isIn(["head-chef", "user"])
  ],
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

// Get team access link for the logged-in head chef
router.get("/team-access-link", checkPermission("canManageTeam"), userController.getTeamAccessLink)

// Pending chef management
/**
 * @swagger
 * /api/users/pending-chefs:
 *   get:
 *     summary: Get pending team member requests
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of pending team members
 */
router.get("/pending-chefs", checkPermission("canManageTeam"), userController.listPendingChefs)

/**
 * @swagger
 * /api/users/pending-chefs/{id}:
 *   put:
 *     summary: Approve or reject pending team member
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team member ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: New status for the team member
 *     responses:
 *       200:
 *         description: Team member status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *       400:
 *         description: Invalid status provided
 *       404:
 *         description: Team member not found
 *       500:
 *         description: Server error
 */
router.put("/pending-chefs/:id", checkPermission("canManageTeam"), userController.updatePendingChef)

// Utility endpoints
router.get("/status/:id", userController.getUserStatus)
router.get("/profile/id/:id", userController.getProfileById)
router.get("/saved-recipes", userController.getSavedRecipes)

// Head chef organization endpoint
/**
 * @swagger
 * /api/users/head-chefs/{headChefId}:
 *   get:
 *     summary: Get head chef organization information
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: headChefId
 *         required: true
 *         schema:
 *           type: string
 *         description: Head chef user ID
 *     responses:
 *       200:
 *         description: Head chef organization information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     name:
 *                       type: string
 *                     organization:
 *                       type: string
 *                     role:
 *                       type: string
 *       404:
 *         description: Head chef not found
 *       500:
 *         description: Server error
 */
router.get("/head-chefs/:headChefId", userController.getHeadChefOrganization)

module.exports = router
