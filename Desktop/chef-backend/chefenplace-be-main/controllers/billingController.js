const Restaurant = require('../database/models/Restaurant');
const User = require('../database/models/User');

// Stripe configuration
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe configured successfully for billing');
  } catch (error) {
    console.error('❌ Stripe configuration error:', error.message);
  }
} else {
  console.log('⚠️ STRIPE_SECRET_KEY not found in environment variables');
}

const billingController = {
  /**
   * Create Stripe customer portal session
   * Allows customers to manage their subscription, update payment methods, view invoices
   */
  async createPortalSession(req, res) {
    try {
      if (!stripe) {
        return res.status(500).json({
          message: 'Stripe not configured',
          code: 'STRIPE_NOT_CONFIGURED'
        });
      }

      // Get the head chef's restaurant to find Stripe customer ID
      const restaurant = await Restaurant.findOne({ headChefId: req.user._id });
      if (!restaurant) {
        return res.status(404).json({
          message: 'Restaurant not found',
          code: 'RESTAURANT_NOT_FOUND'
        });
      }

      if (!restaurant.stripeCustomerId) {
        return res.status(400).json({
          message: 'No Stripe customer found for this account',
          code: 'NO_STRIPE_CUSTOMER'
        });
      }

      // Use provided return URL or default to frontend dashboard
      const returnUrl = req.body.return_url || 
        `${process.env.FRONTEND_URL || 'https://chef-frontend-psi.vercel.app'}/dashboard`;

      console.log('🔍 Creating portal session for customer:', {
        customerId: restaurant.stripeCustomerId,
        returnUrl: returnUrl,
        headChefId: req.user._id
      });

      // Create portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: restaurant.stripeCustomerId,
        return_url: returnUrl,
        configuration: null // Use default configuration
      });

      console.log('✅ Portal session created successfully:', {
        sessionId: session.id,
        url: session.url
      });

      res.status(200).json({
        success: true,
        url: session.url
      });

    } catch (error) {
      console.error('❌ Error creating portal session:', error);
      res.status(500).json({
        message: 'Failed to create portal session',
        code: 'PORTAL_SESSION_ERROR',
        error: error.message
      });
    }
  },

  /**
   * Get current subscription details
   */
  async getSubscription(req, res) {
    try {
      if (!stripe) {
        return res.status(500).json({
          message: 'Stripe not configured',
          code: 'STRIPE_NOT_CONFIGURED'
        });
      }

      // Get the head chef's restaurant to find Stripe subscription ID
      const restaurant = await Restaurant.findOne({ headChefId: req.user._id });
      if (!restaurant) {
        return res.status(404).json({
          message: 'Restaurant not found',
          code: 'RESTAURANT_NOT_FOUND'
        });
      }

      if (!restaurant.stripeSubscriptionId) {
        return res.status(404).json({
          message: 'No subscription found',
          code: 'NO_SUBSCRIPTION'
        });
      }

      console.log('🔍 Getting subscription details:', {
        subscriptionId: restaurant.stripeSubscriptionId,
        headChefId: req.user._id
      });

      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(restaurant.stripeSubscriptionId, {
        expand: ['latest_invoice', 'default_payment_method']
      });

      // Get price details
      const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
      const product = await stripe.products.retrieve(price.product);

      console.log('✅ Subscription details retrieved successfully');

      res.status(200).json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          plan: {
            name: product.name,
            price: price.unit_amount / 100, // Convert from cents
            currency: price.currency,
            interval: price.recurring.interval,
            interval_count: price.recurring.interval_count
          },
          latest_invoice: subscription.latest_invoice ? {
            id: subscription.latest_invoice.id,
            amount_paid: subscription.latest_invoice.amount_paid / 100,
            status: subscription.latest_invoice.status,
            invoice_pdf: subscription.latest_invoice.invoice_pdf
          } : null
        }
      });

    } catch (error) {
      console.error('❌ Error getting subscription:', error);
      
      if (error.code === 'resource_missing') {
        return res.status(404).json({
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND'
        });
      }

      res.status(500).json({
        message: 'Failed to get subscription details',
        code: 'SUBSCRIPTION_ERROR',
        error: error.message
      });
    }
  },

  /**
   * Get billing history (invoices)
   */
  async getInvoices(req, res) {
    try {
      if (!stripe) {
        return res.status(500).json({
          message: 'Stripe not configured',
          code: 'STRIPE_NOT_CONFIGURED'
        });
      }

      // Get the head chef's restaurant to find Stripe customer ID
      const restaurant = await Restaurant.findOne({ headChefId: req.user._id });
      if (!restaurant) {
        return res.status(404).json({
          message: 'Restaurant not found',
          code: 'RESTAURANT_NOT_FOUND'
        });
      }

      if (!restaurant.stripeCustomerId) {
        return res.status(404).json({
          message: 'No Stripe customer found',
          code: 'NO_STRIPE_CUSTOMER'
        });
      }

      // Get query parameters for pagination
      const limit = parseInt(req.query.limit) || 10;
      const startingAfter = req.query.starting_after;

      console.log('🔍 Getting invoices for customer:', {
        customerId: restaurant.stripeCustomerId,
        limit: limit,
        startingAfter: startingAfter,
        headChefId: req.user._id
      });

      // Get invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: restaurant.stripeCustomerId,
        limit: Math.min(limit, 100), // Max 100 per request
        starting_after: startingAfter
      });

      console.log(`✅ Retrieved ${invoices.data.length} invoices`);

      res.status(200).json({
        success: true,
        invoices: invoices.data.map(invoice => ({
          id: invoice.id,
          number: invoice.number,
          amount_paid: invoice.amount_paid / 100, // Convert from cents
          amount_due: invoice.amount_due / 100,
          currency: invoice.currency,
          status: invoice.status,
          created: new Date(invoice.created * 1000).toISOString(),
          due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
          description: invoice.description,
          lines: invoice.lines.data.map(line => ({
            description: line.description,
            amount: line.amount / 100,
            quantity: line.quantity
          }))
        })),
        has_more: invoices.has_more,
        total_count: invoices.total_count
      });

    } catch (error) {
      console.error('❌ Error getting invoices:', error);
      res.status(500).json({
        message: 'Failed to get invoices',
        code: 'INVOICES_ERROR',
        error: error.message
      });
    }
  },

  /**
   * Get customer payment methods
   */
  async getPaymentMethods(req, res) {
    try {
      if (!stripe) {
        return res.status(500).json({
          message: 'Stripe not configured',
          code: 'STRIPE_NOT_CONFIGURED'
        });
      }

      // Get the head chef's restaurant to find Stripe customer ID
      const restaurant = await Restaurant.findOne({ headChefId: req.user._id });
      if (!restaurant) {
        return res.status(404).json({
          message: 'Restaurant not found',
          code: 'RESTAURANT_NOT_FOUND'
        });
      }

      if (!restaurant.stripeCustomerId) {
        return res.status(404).json({
          message: 'No Stripe customer found',
          code: 'NO_STRIPE_CUSTOMER'
        });
      }

      console.log('🔍 Getting payment methods for customer:', {
        customerId: restaurant.stripeCustomerId,
        headChefId: req.user._id
      });

      // Get payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: restaurant.stripeCustomerId,
        type: 'card'
      });

      console.log(`✅ Retrieved ${paymentMethods.data.length} payment methods`);

      res.status(200).json({
        success: true,
        payment_methods: paymentMethods.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
            country: pm.card.country
          } : null,
          billing_details: {
            name: pm.billing_details.name,
            email: pm.billing_details.email
          },
          created: new Date(pm.created * 1000).toISOString()
        }))
      });

    } catch (error) {
      console.error('❌ Error getting payment methods:', error);
      res.status(500).json({
        message: 'Failed to get payment methods',
        code: 'PAYMENT_METHODS_ERROR',
        error: error.message
      });
    }
  }
};

module.exports = billingController;
