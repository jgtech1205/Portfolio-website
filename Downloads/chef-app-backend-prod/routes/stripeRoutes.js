const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

// CORS middleware for Stripe endpoints
const { stripeCorsHandler } = require('../middlewares/cors');

// Database connection
const { ensureConnection } = require('../database/connection');

// --- Stripe initialization (used by /debug and /test-connection) ---
let stripe = null;
try {
  const Stripe = require('stripe');
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
} catch (err) {
  // leave stripe as null; /debug will report not configured
}

// Ensure DB connection for all routes (handles serverless cold starts)
router.use(async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (e) {
    return res.status(503).json({ message: 'Database unavailable' });
  }
});

// Validation rules for Stripe checkout
const stripeCheckoutValidation = [
  body('planType').isIn(['pro', 'enterprise']).withMessage('Plan type must be pro or enterprise'),
  body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Billing cycle must be monthly or yearly'),
  body('restaurantName').trim().isLength({ min: 1 }).withMessage('Restaurant name is required'),
  body('headChefEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('headChefName').trim().isLength({ min: 1 }).withMessage('Head chef name is required'),
  body('headChefPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('restaurantType').trim().isLength({ min: 1 }).withMessage('Restaurant type is required'),
  body('location').isObject().withMessage('Location object is required'),
  body('success_url').optional().isURL().withMessage('Success URL must be a valid URL'),
  body('cancel_url').optional().isURL().withMessage('Cancel URL must be a valid URL'),
];

// Validator middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Handle OPTIONS requests for all endpoints (Stripe-friendly CORS preflight)
router.options('*', (req, res) => {
  const origin = req.headers.origin;
      // console.log(`🔄 Stripe OPTIONS request from: ${origin}`);
  if (origin) res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, stripe-signature, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Handle OPTIONS for specific endpoint (redundant but explicit)
router.options('/create-checkout-session', (req, res) => {
  const origin = req.headers.origin;
      // console.log(`🔄 Stripe checkout OPTIONS request from: ${origin}`);
  if (origin) res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, stripe-signature, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Test endpoint to verify CORS is working
router.get('/test', (req, res) => {
  const origin = req.headers.origin;
      // console.log(`🧪 Stripe test endpoint called from: ${origin}`);
  res.json({
    message: 'Stripe CORS test successful',
    origin,
    timestamp: new Date().toISOString(),
  });
});

// Simple verify-payment test endpoint
router.get('/verify-payment-test', (req, res) => {
  res.json({
    message: 'Verify payment endpoint is accessible',
    session_id: req.query.session_id,
    timestamp: new Date().toISOString(),
  });
});





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
 *               success_url:
 *                 type: string
 *                 format: uri
 *               cancel_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *       400:
 *         description: Validation failed or invalid plan
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Stripe not configured or checkout error
 */
router.post(
  '/create-checkout-session',
  stripeCorsHandler,
  stripeCheckoutValidation,
  validate,
  restaurantController.createCheckoutSession
);

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook signature verification failed
 *       500:
 *         description: Webhook processing failed
 */
router.post('/webhook', stripeCorsHandler, restaurantController.webhook);

/**
 * @swagger
 * /api/stripe/verify-payment:
 *   get:
 *     summary: Verify payment and get session details
 *     tags: [Stripe]
 *   post:
 *     summary: Verify payment and get session details (POST method)
 *     tags: [Stripe]
 */
router.get('/verify-payment', stripeCorsHandler, restaurantController.verifyPayment);
router.post('/verify-payment', stripeCorsHandler, restaurantController.verifyPayment);

module.exports = router;
