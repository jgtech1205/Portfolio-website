// Fix Missing Restaurant Script
// This script creates a restaurant for a user who is missing one

const mongoose = require('mongoose');

// Production MongoDB URI
const MONGODB_URI = "mongodb+srv://ray:raytech@cluster0.u2chhqk.mongodb.net/chef-en-place";

async function fixMissingRestaurant() {
  console.log('🔧 Fixing missing restaurant for user...\n');

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

    // Find the user who is missing a restaurant
    const testEmail = 'Headchef@kitcdfahenfdsF.com';
    console.log('2️⃣ Looking for user with email:', testEmail);
    
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Check if user already has a restaurant
    console.log('\n3️⃣ Checking for existing restaurant...');
    const existingRestaurant = await Restaurant.findOne({ headChefId: user._id });
    
    if (existingRestaurant) {
      console.log('✅ User already has a restaurant:', {
        id: existingRestaurant._id,
        restaurantName: existingRestaurant.restaurantName,
        subscriptionStatus: existingRestaurant.subscriptionStatus
      });
      return;
    }

    // Create a restaurant for the user
    console.log('\n4️⃣ Creating restaurant for user...');
    
    const restaurant = new Restaurant({
      restaurantName: 'Default Restaurant', // User can update this later
      restaurantType: 'restaurant',
      location: {
        address: 'Default Address',
        city: 'Default City',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      },
      headChefId: user._id,
      planType: 'trial', // Start with trial
      billingCycle: 'monthly',
      subscriptionStatus: 'active', // Active trial
      isActive: true
    });

    await restaurant.save();
    
    console.log('✅ Restaurant created successfully:', {
      id: restaurant._id,
      restaurantName: restaurant.restaurantName,
      headChefId: restaurant.headChefId,
      subscriptionStatus: restaurant.subscriptionStatus
    });

    // Verify the restaurant was created
    console.log('\n5️⃣ Verifying restaurant creation...');
    const savedRestaurant = await Restaurant.findOne({ headChefId: user._id });
    
    if (savedRestaurant) {
      console.log('✅ Restaurant verification successful');
      console.log('   The billing endpoints should now work for this user');
    } else {
      console.log('❌ Restaurant verification failed');
    }

    console.log('\n🎉 Missing restaurant fix completed!');
    console.log('   The billing endpoints should now work for this user.');

  } catch (error) {
    console.error('❌ Error fixing missing restaurant:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from production database');
  }
}

// Run the fix
fixMissingRestaurant();
