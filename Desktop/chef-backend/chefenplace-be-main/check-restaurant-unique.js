// Check Restaurant Unique Constraint Issues
const { ensureConnection } = require('./database/connection');
const Restaurant = require('./database/models/Restaurant');
const User = require('./database/models/User');

async function checkRestaurantUnique() {
  try {
    await ensureConnection();
    console.log('✅ Connected to database');

    // Check for any restaurants with the same headChefId
    const restaurants = await Restaurant.find({});
    console.log('📊 Total restaurants in database:', restaurants.length);

    // Group by headChefId to find duplicates
    const headChefIdCounts = {};
    restaurants.forEach(restaurant => {
      const headChefId = restaurant.headChefId.toString();
      headChefIdCounts[headChefId] = (headChefIdCounts[headChefId] || 0) + 1;
    });

    // Find duplicates
    const duplicates = Object.entries(headChefIdCounts).filter(([id, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('❌ Found duplicate headChefIds:');
      duplicates.forEach(([headChefId, count]) => {
        console.log(`   headChefId: ${headChefId} - ${count} restaurants`);
      });
    } else {
      console.log('✅ No duplicate headChefIds found');
    }

    // Check for restaurants with invalid headChefIds (users that don't exist)
    console.log('\n🔍 Checking for restaurants with invalid headChefIds...');
    for (const restaurant of restaurants) {
      const user = await User.findById(restaurant.headChefId);
      if (!user) {
        console.log(`❌ Restaurant ${restaurant._id} has invalid headChefId: ${restaurant.headChefId}`);
        console.log(`   Restaurant name: ${restaurant.restaurantName}`);
        console.log(`   Created: ${restaurant.createdAt}`);
      }
    }

    // Check for users without restaurants
    console.log('\n🔍 Checking for users without restaurants...');
    const users = await User.find({ role: 'head-chef' });
    console.log('📊 Total head chef users:', users.length);

    for (const user of users) {
      const restaurant = await Restaurant.findOne({ headChefId: user._id });
      if (!restaurant) {
        console.log(`❌ User ${user._id} (${user.email}) has no restaurant`);
      } else {
        console.log(`✅ User ${user._id} (${user.email}) has restaurant: ${restaurant.restaurantName}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking restaurant unique constraints:', error);
  }
}

checkRestaurantUnique();
