// Script to check head chef details
const mongoose = require('mongoose');
const User = require('./database/models/User');
const Restaurant = require('./database/models/Restaurant');
require('dotenv').config();

async function checkHeadChef() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Your head chef's ID from the console
    const headChefId = '68a4dd4a0310aa85d34c9c91';

    // Check head chef user
    const user = await User.findById(headChefId);
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 Head Chef Details:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   HeadChefId: ${user.headChefId}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   HeadChefId matches _id: ${user.headChefId?.toString() === user._id.toString() ? '✅ YES' : '❌ NO'}`);

    // Check for restaurant
    const restaurant = await Restaurant.findOne({ headChefId: user._id });
    console.log(`\n🏪 Restaurant Record: ${restaurant ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (restaurant) {
      console.log(`   Restaurant ID: ${restaurant._id}`);
      console.log(`   Restaurant Name: ${restaurant.restaurantName}`);
      console.log(`   Restaurant Type: ${restaurant.restaurantType}`);
      console.log(`   Created: ${restaurant.createdAt}`);
    } else {
      console.log('   ❌ No restaurant found for this head chef');
      console.log('   💡 This explains the 403 errors!');
    }

    // Check all restaurants in the system
    const allRestaurants = await Restaurant.find();
    console.log(`\n📊 Total restaurants in system: ${allRestaurants.length}`);
    
    if (allRestaurants.length > 0) {
      console.log('   Restaurants:');
      allRestaurants.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.restaurantName} (HeadChef: ${r.headChefId})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking head chef:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Run the script
checkHeadChef();
