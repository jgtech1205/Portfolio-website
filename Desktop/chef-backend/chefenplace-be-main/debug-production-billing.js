// Debug Production Billing Errors Script
// This script tests the billing endpoints in production database

const mongoose = require('mongoose');

// Production MongoDB URI
const MONGODB_URI = "mongodb+srv://ray:raytech@cluster0.u2chhqk.mongodb.net/chef-en-place";

async function debugProductionBilling() {
  console.log('🔍 Debugging billing endpoint 500 errors in PRODUCTION...\n');

  try {
    // Connect to production database
    console.log('1️⃣ Connecting to production database...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to production database');

    const User = require('./database/models/User');
    const Restaurant = require('./database/models/Restaurant');

    // Test data - use the email from the console logs
    const testEmail = 'Headchef@kitcdfahenfdsF.com';
    
    console.log('2️⃣ Looking for user with email:', testEmail);
    
    // Find the user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('❌ User not found with email:', testEmail);
      
      // Check if there are any users at all
      const allUsers = await User.find({});
      console.log('\n📊 User count in production database:', allUsers.length);
      
      if (allUsers.length > 0) {
        console.log('📋 Sample users:');
        allUsers.slice(0, 3).forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.email} (role: ${u.role})`);
        });
      }
      
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
      console.log('\n📊 Restaurant count in production database:', allRestaurants.length);
      
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

    // Check if restaurant has Stripe data
    if (!restaurant.stripeCustomerId) {
      console.log('⚠️ Restaurant has no Stripe customer ID');
      console.log('   This would cause billing endpoint errors');
    }
    
    if (!restaurant.stripeSubscriptionId) {
      console.log('⚠️ Restaurant has no Stripe subscription ID');
      console.log('   This would cause subscription endpoint errors');
    }

    console.log('\n📊 Summary:');
    if (!restaurant) {
      console.log('   - User exists but has no associated restaurant');
      console.log('   - This causes 404 errors in billing endpoints');
      console.log('   - The 500 errors might be from authentication issues');
    } else {
      console.log('   - User and restaurant both exist');
      if (!restaurant.stripeCustomerId || !restaurant.stripeSubscriptionId) {
        console.log('   - Restaurant missing Stripe data - this causes billing errors');
      } else {
        console.log('   - Restaurant has Stripe data - check authentication');
      }
    }

  } catch (error) {
    console.error('❌ Error debugging production billing:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from production database');
  }
}

// Run the production debug script
debugProductionBilling();
