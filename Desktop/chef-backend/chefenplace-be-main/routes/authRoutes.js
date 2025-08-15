const express = require("express")
const { body } = require("express-validator")
const authController = require("../controllers/authController")
const { auth, teamAuth, organizationAuth, checkPermissionWithOrg } = require("../middlewares/auth")
const { loginRateLimiter, teamLoginRateLimiter } = require("../utils/authErrorHandler")

const router = express.Router()

// Validation rules
const loginValidation = [body("email").isEmail().normalizeEmail(), body("password").isLength({ min: 6 })]

const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().isLength({ min: 1 }),
  body("role").optional().isIn(["head-chef"]),
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
router.post("/login", loginRateLimiter, loginValidation, authController.login)

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
router.post("/team-login/:headChefId", teamLoginRateLimiter, authController.teamLogin)

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

module.exports = router
