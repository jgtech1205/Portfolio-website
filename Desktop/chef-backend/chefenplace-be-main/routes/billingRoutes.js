const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const billingController = require('../controllers/billingController');

// Import middleware
const { auth } = require('../middlewares/auth');
const { headChefAuth } = require('../middlewares/headChefAuth');
const { ensureHeadChefHasRestaurant } = require('../add-restaurant-safety-check');

// Database connection
const { ensureConnection } = require('../database/connection');

// Ensure DB connection for all routes (handles serverless cold starts)
router.use(async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (e) {
    return res.status(503).json({ message: 'Database unavailable' });
  }
});

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// All billing routes require authentication and head chef role
router.use(auth);
router.use(headChefAuth);
router.use(ensureHeadChefHasRestaurant); // Ensure all head chefs have restaurants

/**
 * @swagger
 * /api/billing/portal-session:
 *   post:
 *     summary: Create Stripe customer portal session
 *     tags: [Billing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               return_url:
 *                 type: string
 *                 format: uri
 *                 description: URL to return to after portal session
 *     responses:
 *       200:
 *         description: Portal session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 *                   description: Portal session URL
 *       400:
 *         description: Invalid request or missing customer
 *       500:
 *         description: Stripe error or server error
 */
router.post('/portal-session', [
  body('return_url').optional().isURL().withMessage('Return URL must be a valid URL')
], validate, billingController.createPortalSession);

/**
 * @swagger
 * /api/billing/subscription:
 *   get:
 *     summary: Get current subscription details
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Subscription details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     current_period_start:
 *                       type: string
 *                       format: date-time
 *                     current_period_end:
 *                       type: string
 *                       format: date-time
 *                     plan:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         price:
 *                           type: number
 *                         interval:
 *                           type: string
 *       404:
 *         description: No subscription found
 *       500:
 *         description: Stripe error or server error
 */
router.get('/subscription', billingController.getSubscription);

/**
 * @swagger
 * /api/billing/invoices:
 *   get:
 *     summary: Get billing history (invoices)
 *     tags: [Billing]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of invoices to return
 *       - in: query
 *         name: starting_after
 *         schema:
 *           type: string
 *         description: Pagination cursor
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 invoices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       amount_paid:
 *                         type: number
 *                       status:
 *                         type: string
 *                       created:
 *                         type: string
 *                       invoice_pdf:
 *                         type: string
 *       404:
 *         description: No customer found
 *       500:
 *         description: Stripe error or server error
 */
router.get('/invoices', billingController.getInvoices);

/**
 * @swagger
 * /api/billing/payment-methods:
 *   get:
 *     summary: Get customer payment methods
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment_methods:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       card:
 *                         type: object
 *                         properties:
 *                           brand:
 *                             type: string
 *                           last4:
 *                             type: string
 *                           exp_month:
 *                             type: integer
 *                           exp_year:
 *                             type: integer
 *       404:
 *         description: No customer found
 *       500:
 *         description: Stripe error or server error
 */
router.get('/payment-methods', billingController.getPaymentMethods);

module.exports = router;
