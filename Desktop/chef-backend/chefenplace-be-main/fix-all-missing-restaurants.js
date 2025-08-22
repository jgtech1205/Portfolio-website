// Fix All Missing Restaurants Script
// This script finds all head chef users who are missing restaurants and creates them

const mongoose = require('mongoose');

// Production MongoDB URI
const MONGODB_URI = "mongodb+srv://ray:raytech@cluster0.u2chhqk.mongodb.net/chef-en-place";

async function fixAllMissingRestaurants() {
  console.log('🔧 Fixing all missing restaurants for head chef users...\n');

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

    // Find all head chef users
    console.log('2️⃣ Finding all head chef users...');
    const headChefs = await User.find({ role: 'head-chef' });
    console.log(`✅ Found ${headChefs.length} head chef users`);

    if (headChefs.length === 0) {
      console.log('❌ No head chef users found');
      return;
    }

    // Check each head chef for missing restaurant
    console.log('\n3️⃣ Checking each head chef for missing restaurant...');
    
    let usersWithRestaurants = 0;
    let usersWithoutRestaurants = 0;
    let restaurantsCreated = 0;

    for (const headChef of headChefs) {
      console.log(`\n🔍 Checking head chef: ${headChef.email}`);
      
      // Check if user has a restaurant
      const existingRestaurant = await Restaurant.findOne({ headChefId: headChef._id });
      
      if (existingRestaurant) {
        console.log(`   ✅ Has restaurant: ${existingRestaurant.restaurantName}`);
        usersWithRestaurants++;
      } else {
        console.log(`   ❌ Missing restaurant - creating one...`);
        usersWithoutRestaurants++;
        
        try {
          // Create a restaurant for this head chef
          const restaurant = new Restaurant({
            restaurantName: `${headChef.firstName || 'Head Chef'}'s Restaurant`,
            restaurantType: 'restaurant',
            location: {
              address: 'Default Address',
              city: 'Default City',
              state: 'CA',
              zipCode: '12345',
              country: 'US'
            },
            headChefId: headChef._id,
            planType: 'trial', // Start with trial
            billingCycle: 'monthly',
            subscriptionStatus: 'active', // Active trial
            isActive: true
          });

          await restaurant.save();
          restaurantsCreated++;
          
          console.log(`   ✅ Created restaurant: ${restaurant.restaurantName}`);
          
        } catch (error) {
          console.log(`   ❌ Failed to create restaurant: ${error.message}`);
        }
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total head chef users: ${headChefs.length}`);
    console.log(`   Users with restaurants: ${usersWithRestaurants}`);
    console.log(`   Users without restaurants: ${usersWithoutRestaurants}`);
    console.log(`   Restaurants created: ${restaurantsCreated}`);

    if (restaurantsCreated > 0) {
      console.log('\n🎉 Successfully created restaurants for missing head chefs!');
      console.log('   All head chef users should now have restaurants.');
      console.log('   Billing endpoints should work for all users.');
    } else {
      console.log('\n✅ All head chef users already have restaurants!');
    }

    // Final verification
    console.log('\n4️⃣ Final verification...');
    const finalHeadChefs = await User.find({ role: 'head-chef' });
    let allHaveRestaurants = true;
    
    for (const headChef of finalHeadChefs) {
      const restaurant = await Restaurant.findOne({ headChefId: headChef._id });
      if (!restaurant) {
        console.log(`   ❌ ${headChef.email} still missing restaurant`);
        allHaveRestaurants = false;
      }
    }
    
    if (allHaveRestaurants) {
      console.log('   ✅ All head chef users now have restaurants!');
    } else {
      console.log('   ❌ Some head chef users still missing restaurants');
    }

  } catch (error) {
    console.error('❌ Error fixing missing restaurants:', error);
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

// Run the script
fixAllMissingRestaurants();
