const { validationResult } = require("express-validator")
const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")
const User = require("../database/models/User")
const Restaurant = require("../database/models/Restaurant")
const { generateHeadChefTokens } = require("../utils/tokenUtils")
const { ensureConnection } = require("../database/connection")

// URL validation helper function
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Stripe configuration
let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
    console.log("✅ Stripe configured successfully")
  } catch (error) {
    console.error("❌ Stripe configuration error:", error.message)
  }
} else {
  console.log("⚠️ STRIPE_SECRET_KEY not found in environment variables")
}

const restaurantController = {
  // Comprehensive restaurant signup
  async signup(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: errors.array() 
        })
      }

      const {
        restaurantName,
        restaurantType,
        location,
        headChefName,
        headChefEmail,
        headChefPassword,
        planType = "trial",
        billingCycle = "monthly"
      } = req.body

      // Validate required fields
      if (!restaurantName || !restaurantType || !location || !headChefName || !headChefEmail || !headChefPassword) {
        return res.status(400).json({
          message: "All required fields must be provided",
          code: "MISSING_FIELDS"
        })
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(headChefEmail)) {
        return res.status(400).json({
          message: "Invalid email format",
          code: "INVALID_EMAIL"
        })
      }

      // Validate password strength
      if (headChefPassword.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters long",
          code: "WEAK_PASSWORD"
        })
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: headChefEmail })
      if (existingUser) {
        return res.status(409).json({
          message: "Email already exists",
          code: "EMAIL_EXISTS"
        })
      }

      // Password will be hashed by User model pre-save hook

      // Create head chef user
      const headChef = new User({
        email: headChefEmail,
        password: headChefPassword,
        firstName: headChefName,
        lastName: "Head Chef",
        role: "head-chef",
        status: "active",
        // Don't set headChefId yet - we'll set it after save
        permissions: {
          canViewPanels: true,
          canViewRecipes: true,
          canViewPlateups: true,
          canViewNotifications: true,
          canManageTeam: true,
          canCreateNotifications: true,
          canEditRecipes: true,
          canDeleteRecipes: true,
          canUpdateRecipes: true,
          canCreatePlateups: true,
          canDeletePlateups: true,
          canUpdatePlateups: true,
          canDeleteNotifications: true,
          canUpdateNotifications: true,
          canCreatePanels: true,
          canDeletePanels: true,
          canUpdatePanels: true,
          canAccessAdmin: true
        }
      })

      await headChef.save()

      // Now set headChefId to the user's own _id
      headChef.headChefId = headChef._id
      await headChef.save()

      // Create restaurant record
      const restaurant = new Restaurant({
        restaurantName,
        restaurantType,
        location,
        headChefId: headChef._id,
        planType,
        billingCycle,
        subscriptionStatus: planType === "trial" ? "active" : "inactive"
      })

      await restaurant.save()

      // Generate JWT tokens
      const { accessToken, refreshToken } = generateHeadChefTokens(headChef._id)

      // Return success response
      res.status(201).json({
        user: {
          id: headChef._id,
          email: headChef.email,
          name: headChef.name,
          role: headChef.role,
          headChefId: headChef.headChefId,
          permissions: headChef.permissions,
          status: headChef.status
        },
        restaurant: {
          id: restaurant._id,
          restaurantName: restaurant.restaurantName,
          restaurantType: restaurant.restaurantType,
          planType: restaurant.planType,
          billingCycle: restaurant.billingCycle,
          subscriptionStatus: restaurant.subscriptionStatus,
          trialEndDate: restaurant.trialEndDate
        },
        accessToken,
        refreshToken
      })

    } catch (error) {
      console.error("Restaurant signup error:", error)
      res.status(500).json({
        message: "Internal server error",
        code: "INTERNAL_ERROR"
      })
    }
  },

  // Create Stripe checkout session
  async createCheckoutSession(req, res) {
    try {
      console.log("🔍 Stripe checkout session request received:", {
        body: req.body,
        stripeConfigured: !!stripe,
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasPriceId: !!process.env.STRIPE_PRICE_ID_MONTHLY
      })
      
      if (!stripe) {
        console.error("❌ Stripe not configured")
        return res.status(500).json({
          message: "Stripe not configured",
          code: "STRIPE_NOT_CONFIGURED"
        })
      }

      // Ensure database connection is ready
      const { ensureConnection } = require('../database/connection');
      await ensureConnection();
      console.log("✅ Database connection ready for Stripe checkout");

      const {
        planType,
        billingCycle,
        restaurantName,
        headChefEmail,
        headChefName,
        headChefPassword,
        restaurantType,
        location,
        success_url,
        cancel_url
      } = req.body

      // Validate required fields
      if (!planType || !billingCycle || !restaurantName || !headChefEmail || !headChefName || !headChefPassword || !restaurantType || !location) {
        return res.status(400).json({
          message: "All required fields must be provided",
          code: "MISSING_FIELDS",
          required: ["planType", "billingCycle", "restaurantName", "headChefEmail", "headChefName", "headChefPassword", "restaurantType", "location"]
        })
      }

      // Validate URLs if provided
      if (success_url && !isValidUrl(success_url)) {
        return res.status(400).json({
          message: "Invalid success_url format",
          code: "INVALID_SUCCESS_URL"
        })
      }

      if (cancel_url && !isValidUrl(cancel_url)) {
        return res.status(400).json({
          message: "Invalid cancel_url format",
          code: "INVALID_CANCEL_URL"
        })
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: headChefEmail })
      if (existingUser) {
        return res.status(409).json({
          message: "Email already exists",
          code: "EMAIL_EXISTS"
        })
      }

      // Create user and restaurant immediately for all signups
      console.log('🔍 Creating user and restaurant immediately for signup...');
      
      // Ensure database connection is ready
      await ensureConnection();
      console.log('✅ Database connection ready for user/restaurant creation');
      
      let headChef, restaurant;
      try {
        // Split headChefName into firstName and lastName
        const nameParts = headChefName.trim().split(' ');
        const firstName = nameParts[0] || headChefName;
        const lastName = nameParts.slice(1).join(' ') || 'Head Chef';

        // Create head chef user (password will be hashed by pre-save hook)
        headChef = new User({
          email: headChefEmail,
          password: headChefPassword,
          firstName: firstName,
          lastName: lastName,
          name: headChefName, // Keep the full name as well
          role: "head-chef",
          status: "active",
          permissions: {
            canViewPanels: true,
            canViewRecipes: true,
            canViewPlateups: true,
            canViewNotifications: true,
            canManageTeam: true,
            canCreateNotifications: true,
            canEditRecipes: true,
            canDeleteRecipes: true,
            canUpdateRecipes: true,
            canCreatePlateups: true,
            canDeletePlateups: true,
            canUpdatePlateups: true,
            canDeleteNotifications: true,
            canUpdateNotifications: true,
            canCreatePanels: true,
            canDeletePanels: true,
            canUpdatePanels: true,
            canAccessAdmin: true
          }
        });

        await headChef.save();

        // Set headChefId to user's own _id
        headChef.headChefId = headChef._id;
        await headChef.save();

        // Create restaurant record immediately
        restaurant = new Restaurant({
          restaurantName,
          restaurantType,
          location,
          headChefId: headChef._id,
          planType,
          billingCycle,
          subscriptionStatus: planType === "trial" ? "active" : "inactive", // Use valid enum values
          isActive: true
        });

        await restaurant.save();

        console.log('✅ User and restaurant created immediately:', {
          userId: headChef._id,
          restaurantId: restaurant._id,
          restaurantName: restaurant.restaurantName,
          planType: planType,
          subscriptionStatus: restaurant.subscriptionStatus
        });

      } catch (error) {
        console.error('❌ Error creating user/restaurant during signup:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        });
        return res.status(500).json({
          message: "Failed to create user and restaurant",
          code: "CREATION_ERROR",
          details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }

      // Define price IDs based on plan and billing cycle with fallbacks
      const priceIds = {
        pro: {
          monthly: process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
          yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || process.env.STRIPE_PRICE_ID_MONTHLY // Fallback to monthly
        },
        enterprise: {
          monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_ID_MONTHLY, // Fallback to pro monthly
          yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || process.env.STRIPE_PRICE_ID_MONTHLY // Fallback to pro monthly
        }
      }

      const priceId = priceIds[planType]?.[billingCycle]
      if (!priceId) {
        return res.status(400).json({
          message: "Invalid plan type or billing cycle",
          code: "INVALID_PLAN",
          availablePlans: {
            pro: {
              monthly: !!priceIds.pro.monthly,
              yearly: !!priceIds.pro.yearly
            },
            enterprise: {
              monthly: !!priceIds.enterprise.monthly,
              yearly: !!priceIds.enterprise.yearly
            }
          }
        })
      }

      // Prepare comprehensive metadata for the session
      const sessionMetadata = {
        // Restaurant information
        restaurantName,
        restaurantType,
        location: JSON.stringify(location),
        restaurantId: restaurant._id.toString(),
        
        // User information
        headChefEmail,
        headChefName,
        headChefPassword,
        userId: headChef._id.toString(),
        
        // Plan information
        planType,
        billingCycle,
        
        // Timestamp for tracking
        createdAt: new Date().toISOString(),
        
        // Additional context
        source: 'web_checkout',
        version: '1.0'
      }

      // Use provided URLs or fallback to defaults
      const successUrl = success_url || `${process.env.FRONTEND_URL || 'https://chef-frontend-psi.vercel.app'}/payment-success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = cancel_url || `${process.env.FRONTEND_URL || 'https://chef-frontend-psi.vercel.app'}/register?cancelled=true`

      console.log('🔍 Creating Stripe checkout session with:', {
        priceId,
        planType,
        billingCycle,
        successUrl,
        cancelUrl,
        cancelUrl,
        providedSuccessUrl: success_url,
        providedCancelUrl: cancel_url,
        fallbackSuccessUrl: `${process.env.FRONTEND_URL || 'https://chef-frontend-psi.vercel.app'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        fallbackCancelUrl: `${process.env.FRONTEND_URL || 'https://chef-frontend-psi.vercel.app'}/signup?cancelled=true`,
        metadataKeys: Object.keys(sessionMetadata)
      })

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: sessionMetadata,
        customer_email: headChefEmail, // Pre-fill customer email
        allow_promotion_codes: true, // Allow promo codes
        billing_address_collection: 'required', // Collect billing address
        subscription_data: {
          metadata: {
            planType,
            billingCycle,
            restaurantName
          }
        }
      })

      console.log('✅ Stripe checkout session created successfully:', {
        sessionId: session.id,
        url: session.url,
        actualSuccessUrl: session.success_url,
        actualCancelUrl: session.cancel_url
      })

      res.status(200).json({
        sessionId: session.id,
        url: session.url
      })

    } catch (error) {
      console.error("Stripe checkout session error:", error)
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        stripeConfigured: !!stripe,
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasPriceId: !!process.env.STRIPE_PRICE_ID_MONTHLY,
        requestBody: req.body
      })
      
      res.status(500).json({
        message: "Failed to create checkout session",
        code: "CHECKOUT_ERROR",
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  },

  // Verify payment and get session details
  async verifyPayment(req, res) {
    try {
      await ensureConnection(); // <-- add this line
      
  
      console.log('🔍 Verify payment request:', {
        method: req.method,
        query: req.query,
        body: req.body,
        headers: {
          'content-type': req.headers['content-type'],
          'origin': req.headers.origin
        }
      });

      // Handle both GET (query params) and POST (request body) requests
      // Support both snake_case (session_id) and camelCase (sessionId) field names
      const session_id = req.query.session_id || req.body.session_id || req.body.sessionId;

      if (!session_id) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required",
          code: "MISSING_SESSION_ID"
        });
      }

      if (!stripe) {
        return res.status(500).json({
          success: false,
          message: "Stripe not configured",
          code: "STRIPE_NOT_CONFIGURED"
        });
      }

      console.log('🔍 Verifying payment for session:', session_id);

      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
          code: "SESSION_NOT_FOUND"
        });
      }

      console.log('✅ Session retrieved:', {
        id: session.id,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
        metadata: session.metadata
      });

      // Check if payment was successful
      if (session.payment_status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: "Payment not completed",
          code: "PAYMENT_NOT_COMPLETED",
          payment_status: session.payment_status
        });
      }

      // Check if user and restaurant were already created
      let existingUser = await User.findOne({ email: session.customer_email });
      let existingRestaurant = existingUser ? await Restaurant.findOne({ headChefId: existingUser._id }) : null;
      
      // If user and restaurant already exist, update the restaurant with Stripe data
      if (session.payment_status === 'paid' && existingUser && existingRestaurant && session.metadata) {
        console.log('🔄 Payment successful, updating existing restaurant with Stripe data...');
        
        try {
          // Update restaurant with Stripe customer and subscription IDs
          existingRestaurant.stripeCustomerId = session.customer;
          existingRestaurant.stripeSubscriptionId = session.subscription;
          existingRestaurant.subscriptionStatus = "active"; // This is a valid enum value
          await existingRestaurant.save();
          
          // Also update user with Stripe customer ID
          existingUser.stripeCustomerId = session.customer;
          existingUser.stripeSubscriptionId = session.subscription;
          await existingUser.save();
          
          console.log('✅ Restaurant and user updated with Stripe data:', {
            restaurantId: existingRestaurant._id,
            userId: existingUser._id,
            stripeCustomerId: existingRestaurant.stripeCustomerId,
            stripeSubscriptionId: existingRestaurant.stripeSubscriptionId,
            subscriptionStatus: existingRestaurant.subscriptionStatus
          });
          
        } catch (error) {
          console.error('❌ Error updating restaurant with Stripe data:', error);
        }
      }
      // If payment is successful but user doesn't exist, create them immediately (fallback)
      else if (session.payment_status === 'paid' && !existingUser && session.metadata) {
        console.log('🔄 Payment successful but user not found, creating user immediately...');
        
        try {
          const {
            restaurantName,
            headChefEmail,
            headChefName,
            headChefPassword,
            restaurantType,
            location,
            planType,
            billingCycle
          } = session.metadata;

          // Create head chef user first (password will be hashed by pre-save hook)
          const headChef = new User({
            email: headChefEmail,
            password: headChefPassword,
            firstName: headChefName,
            lastName: "Head Chef",
            role: "head-chef",
            status: "active",
            // headChefId will be set after user is saved
            permissions: {
              canViewPanels: true,
              canViewRecipes: true,
              canViewPlateups: true,
              canViewNotifications: true,
              canManageTeam: true,
              canCreateNotifications: true,
              canEditRecipes: true,
              canDeleteRecipes: true,
              canUpdateRecipes: true,
              canCreatePlateups: true,
              canDeletePlateups: true,
              canUpdatePlateups: true,
              canDeleteNotifications: true,
              canUpdateNotifications: true,
              canCreatePanels: true,
              canDeletePanels: true,
              canUpdatePanels: true,
              canAccessAdmin: true
            }
          });

          await headChef.save();

          // Now set the headChefId to the user's own _id
          headChef.headChefId = headChef._id;
          await headChef.save();

          // Update user with Stripe customer ID
          headChef.stripeCustomerId = session.customer;
          headChef.stripeSubscriptionId = session.subscription;
          await headChef.save();

          // Create restaurant record
          const restaurant = new Restaurant({
            restaurantName,
            restaurantType,
            location: typeof location === 'string' ? JSON.parse(location) : location,
            headChefId: headChef._id, // Use the user's _id as headChefId
            planType,
            billingCycle,
            subscriptionStatus: "active",
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription
          });

          await restaurant.save();

          console.log('✅ User and restaurant created successfully');
          console.log('🏪 Restaurant details:', {
            restaurantId: restaurant._id,
            restaurantName: restaurant.restaurantName,
            headChefId: restaurant.headChefId,
            userHeadChefId: headChef.headChefId
          });
          
          // Update our references
          existingUser = headChef;
          existingRestaurant = restaurant;
          
        } catch (error) {
          console.error('❌ Error creating user during payment verification:', error);
        }
      }
      
      console.log('🔍 Payment verification results:', {
        customerEmail: session.customer_email,
        userExists: !!existingUser,
        restaurantExists: !!existingRestaurant,
        userId: existingUser?._id,
        restaurantId: existingRestaurant?._id,
        userRole: existingUser?.role,
        userStatus: existingUser?.status,
        userHeadChefId: existingUser?.headChefId,
        restaurantHeadChefId: existingRestaurant?.headChefId,
        headChefIdMatch: existingUser?.headChefId?.toString() === existingRestaurant?.headChefId?.toString(),
        userEmail: existingUser?.email,
        restaurantName: existingRestaurant?.restaurantName
      });

      // Return response in format expected by frontend
      const response = {
        success: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          customer_email: session.customer_email,
          metadata: session.metadata,
          subscription_id: session.subscription,
          customer_id: session.customer
        },
        account_status: {
          user_created: !!existingUser,
          restaurant_created: !!existingRestaurant,
          user_id: existingUser?._id,
          restaurant_id: existingRestaurant?._id
        }
      };

      // Always include data property, even if user doesn't exist yet
      if (existingUser) {
        try {
          // Generate tokens for the user
          const { generateHeadChefTokens } = require('../utils/tokenUtils');
          const { accessToken, refreshToken } = generateHeadChefTokens(existingUser._id);
          
          console.log('🔑 Generated tokens for user:', {
            userId: existingUser._id,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length
          });
          
          // Ensure the user object includes all necessary fields for frontend
          const userResponse = {
            _id: existingUser._id,
            email: existingUser.email,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            role: existingUser.role,
            status: existingUser.status,
            headChefId: existingUser.headChefId,
            permissions: existingUser.permissions,
            preferences: existingUser.preferences,
            restaurantId: existingRestaurant?._id, // Add restaurant ID
            restaurantName: existingRestaurant?.restaurantName // Add restaurant name
          };
          
          response.data = {
            user: userResponse,
            accessToken,
            refreshToken
          };

          // Include full restaurant data if it exists
          if (existingRestaurant) {
            response.data.restaurant = {
              id: existingRestaurant._id,
              restaurantName: existingRestaurant.restaurantName,
              restaurantType: existingRestaurant.restaurantType,
              location: existingRestaurant.location,
              planType: existingRestaurant.planType,
              billingCycle: existingRestaurant.billingCycle,
              subscriptionStatus: existingRestaurant.subscriptionStatus,
              trialEndDate: existingRestaurant.trialEndDate,
              stripeCustomerId: existingRestaurant.stripeCustomerId,
              stripeSubscriptionId: existingRestaurant.stripeSubscriptionId
            };
          }
          
          console.log('✅ Successfully created response with tokens');
        } catch (tokenError) {
          console.error('❌ Error generating tokens:', tokenError);
          // Fallback: return user without tokens
          response.data = {
            user: existingUser,
            accessToken: null,
            refreshToken: null
          };
        }
        
        // Add redirect information for successful payment
        response.redirect = {
          shouldRedirect: true,
          destination: '/dashboard', // or whatever the frontend dashboard route is
          message: 'Payment successful! Redirecting to dashboard...'
        };
      } else {
        // User doesn't exist yet (webhook hasn't processed)
        // Return a placeholder user object to prevent frontend errors
        // The frontend should retry or wait for webhook processing
        response.data = {
          user: {
            _id: null,
            email: session.customer_email,
            firstName: session.metadata?.headChefName || 'Processing...',
            lastName: 'Head Chef',
            role: 'head-chef',
            status: 'processing',
            message: 'Account is being created, please wait...'
          },
          accessToken: null,
          refreshToken: null
        };
        
        // Add retry information
        response.redirect = {
          shouldRedirect: false,
          message: 'Account is being created. Please wait a moment and try again.',
          retryAfter: 3000 // 3 seconds
        };
      }
      
  
      console.log('📤 Final response structure:', {
        hasData: !!response.data,
        hasUser: !!response.data?.user,
        hasAccessToken: !!response.data?.accessToken,
        hasRefreshToken: !!response.data?.refreshToken,
        userExists: !!existingUser,
        responseKeys: Object.keys(response)
      });

      res.status(200).json(response);

    } catch (error) {
      console.error("Payment verification error:", error);
      
      if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID",
          code: "INVALID_SESSION_ID"
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to verify payment",
        code: "VERIFICATION_ERROR",
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Handle Stripe webhook
  async webhook(req, res) {
    try {
      if (!stripe) {
        return res.status(500).json({
          message: "Stripe not configured",
          code: "STRIPE_NOT_CONFIGURED"
        })
      }

      const sig = req.headers['stripe-signature']
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

      let event

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message)
        return res.status(400).send(`Webhook Error: ${err.message}`)
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object)
          break
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object)
          break
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object)
          break
        default:
          console.log(`Unhandled event type ${event.type}`)
      }

      res.status(200).json({ received: true })

    } catch (error) {
      console.error("Stripe webhook error:", error)
      res.status(500).json({
        message: "Webhook processing failed",
        code: "WEBHOOK_ERROR"
      })
    }
  }
}

// Helper functions for webhook handling
async function handleCheckoutSessionCompleted(session) {
  try {
    const {
      restaurantName,
      headChefEmail,
      headChefName,
      headChefPassword,
      restaurantType,
      location,
      planType,
      billingCycle
    } = session.metadata

    // Check if user already exists (in case of duplicate webhook)
    const existingUser = await User.findOne({ email: headChefEmail })
    if (existingUser) {
      console.log('User already exists, skipping creation')
      return
    }

    // Create head chef user (password will be hashed by pre-save hook)
    const headChef = new User({
      email: headChefEmail,
      password: headChefPassword,
      firstName: headChefName,
      lastName: "Head Chef",
      role: "head-chef",
      status: "active",
      // Don't set headChefId yet - we'll set it after save
      permissions: {
        canViewPanels: true,
        canViewRecipes: true,
        canViewPlateups: true,
        canViewNotifications: true,
        canManageTeam: true,
        canCreateNotifications: true,
        canEditRecipes: true,
        canDeleteRecipes: true,
        canUpdateRecipes: true,
        canCreatePlateups: true,
        canDeletePlateups: true,
        canUpdatePlateups: true,
        canDeleteNotifications: true,
        canUpdateNotifications: true,
        canCreatePanels: true,
        canDeletePanels: true,
        canUpdatePanels: true,
        canAccessAdmin: true
      }
    })

    await headChef.save()

    // Now set headChefId to the user's own _id
    headChef.headChefId = headChef._id
    await headChef.save()

    // Create restaurant record
    const restaurant = new Restaurant({
      restaurantName,
      restaurantType,
      location: typeof location === 'string' ? JSON.parse(location) : location,
      headChefId: headChef._id,
      planType,
      billingCycle,
      subscriptionStatus: "active",
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription
    })

    await restaurant.save()

    console.log('✅ Webhook: Restaurant created successfully:', {
      restaurantId: restaurant._id,
      restaurantName: restaurant.restaurantName,
      headChefId: restaurant.headChefId,
      userHeadChefId: headChef.headChefId,
      userEmail: headChef.email,
      planType: restaurant.planType,
      subscriptionStatus: restaurant.subscriptionStatus
    });

    // Send welcome email (implement email service)
    console.log(`Restaurant ${restaurantName} created successfully for ${headChefEmail}`)

  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  try {
    const restaurant = await Restaurant.findOne({ stripeSubscriptionId: invoice.subscription })
    if (restaurant) {
      restaurant.subscriptionStatus = "active"
      await restaurant.save()
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    const restaurant = await Restaurant.findOne({ stripeSubscriptionId: invoice.subscription })
    if (restaurant) {
      restaurant.subscriptionStatus = "past_due"
      await restaurant.save()
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error)
  }
}

module.exports = restaurantController
