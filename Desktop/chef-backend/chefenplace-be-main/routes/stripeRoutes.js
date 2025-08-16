const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

// Import CORS middleware
const { stripeCorsHandler } = require('../middlewares/cors');

// Validation rules for Stripe checkout
const stripeCheckoutValidation = [
  body("planType").isIn(["pro", "enterprise"]).withMessage("Plan type must be pro or enterprise"),
  body("billingCycle").isIn(["monthly", "yearly"]).withMessage("Billing cycle must be monthly or yearly"),
  body("restaurantName").trim().isLength({ min: 1 }).withMessage("Restaurant name is required"),
  body("headChefEmail").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("headChefName").trim().isLength({ min: 1 }).withMessage("Head chef name is required"),
  body("headChefPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("restaurantType").trim().isLength({ min: 1 }).withMessage("Restaurant type is required"),
  body("location").isObject().withMessage("Location object is required"),
  body("success_url").optional().isURL().withMessage("Success URL must be a valid URL"),
  body("cancel_url").optional().isURL().withMessage("Cancel URL must be a valid URL")
];

// Handle OPTIONS requests for Stripe endpoints
router.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log(`🔄 Stripe OPTIONS request from: ${origin}`);
  
  // Set CORS headers for OPTIONS
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, stripe-signature, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  res.status(200).end();
});

// Handle OPTIONS for specific endpoints
router.options('/create-checkout-session', (req, res) => {
  const origin = req.headers.origin;
  console.log(`🔄 Stripe checkout OPTIONS request from: ${origin}`);
  
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, stripe-signature, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  res.status(200).end();
});

// Test endpoint to verify CORS is working
router.get('/test', (req, res) => {
  const origin = req.headers.origin;
  console.log(`🧪 Stripe test endpoint called from: ${origin}`);
  
  res.json({
    message: 'Stripe CORS test successful',
    origin: origin,
    timestamp: new Date().toISOString()
  });
});

// Simple verify-payment test endpoint
router.get('/verify-payment-test', (req, res) => {
  res.json({
    message: 'Verify payment endpoint is accessible',
    session_id: req.query.session_id,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check Stripe configuration
router.get('/debug', (req, res) => {
  const stripeConfigured = !!stripe;
  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  const hasProMonthlyPrice = !!process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const hasProYearlyPrice = !!process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  const hasEnterpriseMonthlyPrice = !!process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID;
  const hasEnterpriseYearlyPrice = !!process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID;
  const hasFrontendUrl = !!process.env.FRONTEND_URL;
  const hasPriceIdMonthly = !!process.env.STRIPE_PRICE_ID_MONTHLY;
  
  res.json({
    stripeConfigured,
    environment: {
      hasSecretKey,
      hasWebhookSecret,
      hasProMonthlyPrice,
      hasProYearlyPrice,
      hasEnterpriseMonthlyPrice,
      hasEnterpriseYearlyPrice,
      hasFrontendUrl,
      hasPriceIdMonthly,
      frontendUrl: process.env.FRONTEND_URL || 'NOT_SET',
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'NOT_SET',
      priceIdMonthly: process.env.STRIPE_PRICE_ID_MONTHLY || 'NOT_SET'
    },
    timestamp: new Date().toISOString()
  });
});

// Test Stripe connection endpoint
router.get('/test-connection', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: 'Stripe not configured',
        message: 'Stripe instance is null'
      });
    }
    
    // Test Stripe connection by making a simple API call
    const account = await stripe.accounts.retrieve();
    
    res.json({
      success: true,
      message: 'Stripe connection successful',
      accountId: account.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Stripe connection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
 *             optional:
 *               - success_url
 *               - cancel_url
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
 *                 description: Custom success URL (optional)
 *               cancel_url:
 *                 type: string
 *                 format: uri
 *                 description: Custom cancel URL (optional)
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
router.post("/create-checkout-session", stripeCorsHandler, stripeCheckoutValidation, restaurantController.createCheckoutSession);

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
router.post("/webhook", stripeCorsHandler, restaurantController.webhook);

/**
 * @swagger
 * /api/stripe/verify-payment:
 *   get:
 *     summary: Verify payment and get session details
 *     tags: [Stripe]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe checkout session ID
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     payment_status:
 *                       type: string
 *                     customer_email:
 *                       type: string
 *                     metadata:
 *                       type: object
 *       400:
 *         description: Invalid session ID
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 *   post:
 *     summary: Verify payment and get session details (POST method)
 *     tags: [Stripe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *             properties:
 *               session_id:
 *                 type: string
 *                 description: Stripe checkout session ID (snake_case)
 *               sessionId:
 *                 type: string
 *                 description: Stripe checkout session ID (camelCase, alternative)
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     payment_status:
 *                       type: string
 *                     customer_email:
 *                       type: string
 *                     metadata:
 *                       type: object
 *       400:
 *         description: Invalid session ID
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get("/verify-payment", stripeCorsHandler, restaurantController.verifyPayment);
router.post("/verify-payment", stripeCorsHandler, restaurantController.verifyPayment);

module.exports = router;
