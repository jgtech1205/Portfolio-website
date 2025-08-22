// Debug Billing Errors Script
// This script tests the billing endpoints to identify the 500 errors

const { ensureConnection } = require('./database/connection');
const User = require('./database/models/User');
const Restaurant = require('./database/models/Restaurant');

async function debugBillingErrors() {
  console.log('🔍 Debugging billing endpoint 500 errors...\n');

  try {
    // Connect to database
    console.log('1️⃣ Connecting to database...');
    await ensureConnection();
    console.log('✅ Database connected');

    // Test data - use the email from the console logs
    const testEmail = 'Headchef@kitcdfahenfdsF.com';
    
    console.log('2️⃣ Looking for user with email:', testEmail);
    
    // Find the user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('❌ User not found with email:', testEmail);
      return;
    }
    
    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Check if user has a restaurant
    console.log('\n3️⃣ Checking for associated restaurant...');
    const restaurant = await Restaurant.findOne({ headChefId: user._id });
    
    if (!restaurant) {
      console.log('❌ No restaurant found for user:', user._id);
      console.log('   This explains the billing endpoint errors!');
      console.log('   The billing endpoints require a restaurant to exist.');
      
      // Check if there are any restaurants at all
      const allRestaurants = await Restaurant.find({});
      console.log('\n📊 Restaurant count in database:', allRestaurants.length);
      
      if (allRestaurants.length > 0) {
        console.log('📋 Sample restaurants:');
        allRestaurants.slice(0, 3).forEach((rest, i) => {
          console.log(`   ${i + 1}. ${rest.restaurantName} (headChefId: ${rest.headChefId})`);
        });
      }
      
      return;
    }
    
    console.log('✅ Restaurant found:', {
      id: restaurant._id,
      restaurantName: restaurant.restaurantName,
      headChefId: restaurant.headChefId,
      stripeCustomerId: restaurant.stripeCustomerId,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
      subscriptionStatus: restaurant.subscriptionStatus
    });

    // Check Stripe configuration
    console.log('\n4️⃣ Checking Stripe configuration...');
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    
    console.log('   STRIPE_SECRET_KEY exists:', !!stripeSecretKey);
    console.log('   STRIPE_PRICE_ID_MONTHLY exists:', !!stripePriceId);
    
    if (!stripeSecretKey) {
      console.log('❌ STRIPE_SECRET_KEY is missing - this would cause 500 errors');
    }
    
    if (!stripePriceId) {
      console.log('⚠️ STRIPE_PRICE_ID_MONTHLY is missing');
    }

    // Test billing endpoints
    console.log('\n5️⃣ Testing billing endpoints...');
    
    // Test subscription endpoint
    try {
      console.log('   Testing /api/billing/subscription...');
      const subscriptionResponse = await fetch('https://chef-app-backend.vercel.app/api/billing/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user._id}`, // This won't work, but let's see what happens
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Subscription response status:', subscriptionResponse.status);
      
      if (!subscriptionResponse.ok) {
        const errorData = await subscriptionResponse.json();
        console.log('   Subscription error:', errorData);
      }
      
    } catch (error) {
      console.log('   Subscription request error:', error.message);
    }

    // Test portal session endpoint
    try {
      console.log('   Testing /api/billing/portal-session...');
      const portalResponse = await fetch('https://chef-app-backend.vercel.app/api/billing/portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user._id}`, // This won't work, but let's see what happens
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          return_url: 'https://chef-frontend-psi.vercel.app/dashboard'
        })
      });
      
      console.log('   Portal response status:', portalResponse.status);
      
      if (!portalResponse.ok) {
        const errorData = await portalResponse.json();
        console.log('   Portal error:', errorData);
      }
      
    } catch (error) {
      console.log('   Portal request error:', error.message);
    }

    console.log('\n📊 Summary:');
    if (!restaurant) {
      console.log('   - User exists but has no associated restaurant');
      console.log('   - This causes 404 errors in billing endpoints');
      console.log('   - The 500 errors might be from authentication issues');
    } else {
      console.log('   - User and restaurant both exist');
      console.log('   - Check Stripe configuration and authentication');
    }

  } catch (error) {
    console.error('❌ Error debugging billing:', error);
  }
}

// Run the debug script
debugBillingErrors();
