const express = require("express")
const { body } = require("express-validator")
const authController = require("../controllers/authController")
const { auth, teamAuth, organizationAuth, checkPermissionWithOrg } = require("../middlewares/auth")
const { loginRateLimiter, teamLoginRateLimiter } = require("../utils/authErrorHandler")
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

// Validation rules
const loginValidation = [body("email").isEmail().normalizeEmail(), body("password").isLength({ min: 6 })]

const registerValidation = [
  // Backward compatibility with old fields
  body("email").optional().isEmail().normalizeEmail(),
  body("password").optional().isLength({ min: 6 }),
  body("name").optional().trim().isLength({ min: 1 }),
  body("role").optional().isIn(["head-chef"]),
  // New restaurant fields
  body("headChefEmail").optional().isEmail().normalizeEmail(),
  body("headChefPassword").optional().isLength({ min: 6 }),
  body("headChefName").optional().trim().isLength({ min: 1 }),
  body("restaurantName").optional().trim().isLength({ min: 1 }),
  body("restaurantType").optional().trim().isLength({ min: 1 }),
  body("location").optional().isObject(),
  body("location.address").optional().trim().isLength({ min: 1 }),
  body("location.city").optional().trim().isLength({ min: 1 }),
  body("location.state").optional().trim().isLength({ min: 1 }),
  body("location.zipCode").optional().trim().isLength({ min: 1 }),
  body("location.country").optional().trim(),
  // Custom validation to ensure at least one set of credentials is provided
  body().custom((value, { req }) => {
    const hasOldFields = req.body.email && req.body.password && req.body.name;
    const hasNewFields = req.body.headChefEmail && req.body.headChefPassword && req.body.headChefName;
    
    if (!hasOldFields && !hasNewFields) {
      throw new Error('Either old fields (email, password, name) or new fields (headChefEmail, headChefPassword, headChefName) must be provided');
    }
    
    return true;
  })
]

// Routes
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully logged in
 */
router.post("/login", loginValidation, authController.login)

router.post("/login/:headChefId/:chefId", loginRateLimiter, authController.loginWithChefId)

/**
 * @swagger
 * /api/auth/team-login/{headChefId}:
 *   post:
 *     summary: Team member login using first name and last name
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: headChefId
 *         required: true
 *         schema:
 *           type: string
 *         description: The head chef's ID that identifies the restaurant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Team member's first name (case-insensitive)
 *               password:
 *                 type: string
 *                 description: Team member's last name (case-insensitive)
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     firstName:
 *                       type: string
 *                       description: User's first name
 *                     lastName:
 *                       type: string
 *                       description: User's last name
 *                     role:
 *                       type: string
 *                       description: User role (team-member)
 *                     headChefId:
 *                       type: string
 *                       description: Head chef's ID
 *                     permissions:
 *                       type: object
 *                       properties:
 *                         canViewPanels:
 *                           type: boolean
 *                         canViewRecipes:
 *                           type: boolean
 *                         canViewPlateups:
 *                           type: boolean
 *                         canViewNotifications:
 *                           type: boolean
 *                         canManageTeam:
 *                           type: boolean
 *                         canCreateNotifications:
 *                           type: boolean
 *                     status:
 *                       type: string
 *                       description: User status (approved)
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *       400:
 *         description: Invalid request body or missing fields
 *       403:
 *         description: User exists but status is not "approved"
 *       404:
 *         description: User not found for this headChefId + firstName combination
 *       500:
 *         description: Internal server error
 */
// Team member login
router.post("/team-login/:headChefId", authController.teamLogin)

// Alias for frontend compatibility
router.post("/login-team-member/:headChefId", authController.teamLogin)

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register head chef for new restaurant
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Head chef's email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Password (minimum 6 characters)
 *               name:
 *                 type: string
 *                 description: Restaurant name
 *               role:
 *                 type: string
 *                 enum: [head-chef]
 *                 default: head-chef
 *                 description: User role (should be head-chef)
 *     responses:
 *       201:
 *         description: Head chef registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       description: User email
 *                     name:
 *                       type: string
 *                       description: Restaurant name
 *                     role:
 *                       type: string
 *                       description: User role (head-chef)
 *                     headChefId:
 *                       type: string
 *                       description: Unique head chef ID
 *                     permissions:
 *                       type: object
 *                       description: User permissions
 *                     status:
 *                       type: string
 *                       description: User status (active)
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */
router.post("/register", registerValidation, authController.register)
/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token
 */
router.post("/refresh-token", authController.refreshToken)
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
router.post("/logout", auth, authController.logout)
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Reset email sent
 */
router.post("/forgot-password", [body("email").isEmail()], authController.forgotPassword)
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post(
  "/reset-password",
  [body("token").notEmpty(), body("password").isLength({ min: 6 })],
  authController.resetPassword,
)

// Chef invite via token
router.post(
  "/chef-invite/:token",
  [body("firstName").trim().isLength({ min: 1 }), body("lastName").trim().isLength({ min: 1 })],
  authController.acceptChefInvite,
)

// Pending team member requests endpoints
/**
 * @swagger
 * /api/auth/pending-requests:
 *   get:
 *     summary: Get pending team member requests for head chef
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       headChefId:
 *                         type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a head chef
 *       500:
 *         description: Server error
 */
router.get("/pending-requests", auth, authController.getPendingRequests);

/**
 * @swagger
 * /api/auth/approve-request/{requestId}:
 *   put:
 *     summary: Approve team member request and create account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID to approve
 *     responses:
 *       200:
 *         description: Request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *                     userId:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a head chef or not owner
 *       404:
 *         description: Request not found
 *       500:
 *         description: Server error
 */
router.put("/approve-request/:requestId", auth, authController.approveRequest);

/**
 * @swagger
 * /api/auth/reject-request/{requestId}:
 *   put:
 *     summary: Reject team member request
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID to reject
 *     responses:
 *       200:
 *         description: Request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a head chef or not owner
 *       404:
 *         description: Request not found
 *       500:
 *         description: Server error
 */
router.put("/reject-request/:requestId", auth, authController.rejectRequest);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     role:
 *                       type: string
 *                     permissions:
 *                       type: object
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/profile", auth, authController.getProfile);

module.exports = router
