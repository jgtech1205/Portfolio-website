const express = require("express")
const { body } = require("express-validator")
const restaurantController = require("../controllers/restaurantController")

const router = express.Router()

// Validation rules for restaurant signup
const restaurantSignupValidation = [
  body("restaurantName").trim().isLength({ min: 1 }).withMessage("Restaurant name is required"),
  body("restaurantType").trim().isLength({ min: 1 }).withMessage("Restaurant type is required"),
  body("location.address").trim().isLength({ min: 1 }).withMessage("Address is required"),
  body("location.city").trim().isLength({ min: 1 }).withMessage("City is required"),
  body("location.state").trim().isLength({ min: 1 }).withMessage("State is required"),
  body("location.zipCode").trim().isLength({ min: 1 }).withMessage("Zip code is required"),
  body("location.country").optional().trim(),
  body("headChefName").trim().isLength({ min: 1 }).withMessage("Head chef name is required"),
  body("headChefEmail").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("headChefPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("planType").optional().isIn(["trial", "pro", "enterprise"]).withMessage("Invalid plan type"),
  body("billingCycle").optional().isIn(["monthly", "yearly"]).withMessage("Invalid billing cycle")
]

// Validation rules for Stripe checkout
const stripeCheckoutValidation = [
  body("planType").isIn(["pro", "enterprise"]).withMessage("Plan type must be pro or enterprise"),
  body("billingCycle").isIn(["monthly", "yearly"]).withMessage("Billing cycle must be monthly or yearly"),
  body("restaurantName").trim().isLength({ min: 1 }).withMessage("Restaurant name is required"),
  body("headChefEmail").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("headChefName").trim().isLength({ min: 1 }).withMessage("Head chef name is required"),
  body("headChefPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("restaurantType").trim().isLength({ min: 1 }).withMessage("Restaurant type is required"),
  body("location").isObject().withMessage("Location object is required")
]

/**
 * @swagger
 * /api/restaurant/signup:
 *   post:
 *     summary: Comprehensive restaurant signup
 *     tags: [Restaurant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantName
 *               - restaurantType
 *               - location
 *               - headChefName
 *               - headChefEmail
 *               - headChefPassword
 *             properties:
 *               restaurantName:
 *                 type: string
 *                 description: Name of the restaurant
 *               restaurantType:
 *                 type: string
 *                 description: Type of restaurant (e.g., Italian, French, etc.)
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                     default: "United States"
 *               headChefName:
 *                 type: string
 *                 description: Name of the head chef
 *               headChefEmail:
 *                 type: string
 *                 format: email
 *                 description: Email of the head chef
 *               headChefPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Password for the head chef account
 *               planType:
 *                 type: string
 *                 enum: [trial, pro, enterprise]
 *                 default: trial
 *                 description: Subscription plan type
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 default: monthly
 *                 description: Billing cycle
 *     responses:
 *       201:
 *         description: Restaurant and head chef created successfully
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
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     headChefId:
 *                       type: string
 *                     permissions:
 *                       type: object
 *                     status:
 *                       type: string
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     restaurantName:
 *                       type: string
 *                     restaurantType:
 *                       type: string
 *                     planType:
 *                       type: string
 *                     billingCycle:
 *                       type: string
 *                     subscriptionStatus:
 *                       type: string
 *                     trialEndDate:
 *                       type: string
 *                       format: date-time
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */
router.post("/signup", restaurantSignupValidation, restaurantController.signup)

/**
 * @swagger
 * /api/stripe/create-checkout-session:
 *   post:
 *     summary: Create Stripe checkout session for paid plans
 *     tags: [Stripe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *               - billingCycle
 *               - restaurantName
 *               - headChefEmail
 *               - headChefName
 *               - headChefPassword
 *               - restaurantType
 *               - location
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [pro, enterprise]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               restaurantName:
 *                 type: string
 *               headChefEmail:
 *                 type: string
 *                 format: email
 *               headChefName:
 *                 type: string
 *               headChefPassword:
 *                 type: string
 *               restaurantType:
 *                 type: string
 *               location:
 *                 type: object
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 url:
 *                   type: string
 *       400:
 *         description: Validation failed or invalid plan
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Stripe not configured or checkout error
 */
router.post("/stripe/create-checkout-session", stripeCheckoutValidation, restaurantController.createCheckoutSession)

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     tags: [Stripe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook signature verification failed
 *       500:
 *         description: Webhook processing failed
 */
router.post("/stripe/webhook", restaurantController.webhook)

module.exports = router
