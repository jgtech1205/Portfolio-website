// Debug Creation Error Script
// This script tests the exact user/restaurant creation logic that's failing

const { ensureConnection } = require('./database/connection');
const User = require('./database/models/User');
const Restaurant = require('./database/models/Restaurant');
const bcrypt = require('bcryptjs');

async function debugCreationError() {
  console.log('🔍 Debugging user/restaurant creation error...\n');

  try {
    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    await ensureConnection();
    console.log('✅ Database connection successful');

    // Step 2: Test data (same as the failing request)
    const testData = {
      planType: 'pro',
      billingCycle: 'monthly',
      restaurantName: 'Debug Restaurant',
      headChefEmail: `debug${Date.now()}@example.com`,
      headChefName: 'Debug Chef',
      headChefPassword: 'debugpassword123',
      restaurantType: 'restaurant',
      location: {
        address: '123 Debug St',
        city: 'Debug City',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      }
    };

    console.log('2️⃣ Test data:', JSON.stringify(testData, null, 2));

    // Step 3: Test each step individually
    console.log('\n3️⃣ Testing user creation...');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: testData.headChefEmail });
    if (existingUser) {
      console.log('❌ User already exists with this email');
      return;
    }

    // Hash password
    console.log('   Hashing password...');
    const hashedPassword = await bcrypt.hash(testData.headChefPassword, 12);
    console.log('   ✅ Password hashed successfully');

    // Split headChefName into firstName and lastName
    const nameParts = testData.headChefName.trim().split(' ');
    const firstName = nameParts[0] || testData.headChefName;
    const lastName = nameParts.slice(1).join(' ') || 'Head Chef';

    // Create user
    console.log('   Creating user document...');
    const headChef = new User({
      email: testData.headChefEmail,
      firstName: firstName,
      lastName: lastName,
      name: testData.headChefName, // Keep the full name as well
      password: hashedPassword,
      role: 'head-chef',
      isActive: true
    });

    console.log('   Saving user...');
    await headChef.save();
    console.log('   ✅ User created successfully:', headChef._id);

    // Set headChefId
    console.log('   Setting headChefId...');
    headChef.headChefId = headChef._id;
    await headChef.save();
    console.log('   ✅ headChefId set successfully');

    // Step 4: Test restaurant creation
    console.log('\n4️⃣ Testing restaurant creation...');
    
    console.log('   Creating restaurant document...');
    const restaurant = new Restaurant({
      restaurantName: testData.restaurantName,
      restaurantType: testData.restaurantType,
      location: testData.location,
      headChefId: headChef._id,
      planType: testData.planType,
      billingCycle: testData.billingCycle,
      subscriptionStatus: testData.planType === "trial" ? "active" : "inactive",
      isActive: true
    });

    console.log('   Restaurant data:', {
      restaurantName: restaurant.restaurantName,
      restaurantType: restaurant.restaurantType,
      headChefId: restaurant.headChefId,
      planType: restaurant.planType,
      billingCycle: restaurant.billingCycle,
      subscriptionStatus: restaurant.subscriptionStatus
    });

    console.log('   Saving restaurant...');
    await restaurant.save();
    console.log('   ✅ Restaurant created successfully:', restaurant._id);

    // Step 5: Verify both were created
    console.log('\n5️⃣ Verifying creation...');
    
    const savedUser = await User.findById(headChef._id);
    const savedRestaurant = await Restaurant.findById(restaurant._id);
    
    console.log('   User exists:', !!savedUser);
    console.log('   Restaurant exists:', !!savedRestaurant);
    
    if (savedUser && savedRestaurant) {
      console.log('   ✅ Both user and restaurant created successfully!');
      console.log('   User ID:', savedUser._id);
      console.log('   Restaurant ID:', savedRestaurant._id);
      console.log('   Restaurant headChefId:', savedRestaurant.headChefId);
    }

    // Step 6: Clean up (optional)
    console.log('\n6️⃣ Cleaning up test data...');
    await User.findByIdAndDelete(headChef._id);
    await Restaurant.findByIdAndDelete(restaurant._id);
    console.log('   ✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Error during creation test:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });

    // Check for specific error types
    if (error.name === 'ValidationError') {
      console.log('🔍 Validation Error Details:');
      Object.keys(error.errors).forEach(key => {
        console.log(`   ${key}: ${error.errors[key].message}`);
      });
    } else if (error.code === 11000) {
      console.log('🔍 Duplicate Key Error:');
      console.log('   This usually means a unique constraint was violated');
      console.log('   Check for duplicate emails or headChefId');
    } else if (error.name === 'MongooseError') {
      console.log('🔍 Mongoose Error:');
      console.log('   This could be a connection or schema issue');
    }
  }
}

// Run the debug script
debugCreationError();
