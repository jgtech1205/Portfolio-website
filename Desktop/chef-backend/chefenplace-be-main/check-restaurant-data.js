const Restaurant = require('./database/models/Restaurant');
const User = require('./database/models/User');
const { ensureConnection } = require('./database/connection');

async function checkRestaurantData() {
  try {
    // Use the existing database connection logic
    await ensureConnection();
    console.log('✅ Connected to database');

    // Get the headChefId from command line argument
    const headChefId = process.argv[2];
    if (!headChefId) {
      console.log('❌ Please provide a headChefId as command line argument');
      console.log('Usage: node check-restaurant-data.js <headChefId>');
      console.log('Your headChefId from console: 68a7ab1dac48fff100c91ed0');
      process.exit(1);
    }

    console.log('🔍 Checking restaurant data for headChefId:', headChefId);

    // Check if user exists
    const user = await User.findById(headChefId);
    if (!user) {
      console.log('❌ User not found with headChefId:', headChefId);
      return;
    }

    console.log('✅ User found:', {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      headChefId: user.headChefId,
      status: user.status
    });

    // Check for restaurants associated with this headChefId
    const restaurants = await Restaurant.find({ headChefId: headChefId });
    
    if (restaurants.length === 0) {
      console.log('❌ No restaurants found for headChefId:', headChefId);
      
      // Check if there are any restaurants at all
      const allRestaurants = await Restaurant.find({}).limit(5);
      console.log('📊 Total restaurants in database:', await Restaurant.countDocuments());
      
      if (allRestaurants.length > 0) {
        console.log('📋 Sample restaurants:');
        allRestaurants.forEach((restaurant, index) => {
          console.log(`   ${index + 1}. Restaurant: ${restaurant.restaurantName}`);
          console.log(`      HeadChefId: ${restaurant.headChefId}`);
          console.log(`      Created: ${restaurant.createdAt}`);
          console.log(`      Stripe Customer ID: ${restaurant.stripeCustomerId || 'None'}`);
          console.log(`      Stripe Subscription ID: ${restaurant.stripeSubscriptionId || 'None'}`);
          console.log('');
        });
      }
    } else {
      console.log('✅ Found restaurants for headChefId:', headChefId);
      restaurants.forEach((restaurant, index) => {
        console.log(`\n📋 Restaurant ${index + 1}:`);
        console.log(`   Name: ${restaurant.restaurantName}`);
        console.log(`   Type: ${restaurant.restaurantType}`);
        console.log(`   Location: ${restaurant.location?.address}, ${restaurant.location?.city}, ${restaurant.location?.state}`);
        console.log(`   HeadChefId: ${restaurant.headChefId}`);
        console.log(`   Created: ${restaurant.createdAt}`);
        console.log(`   Stripe Customer ID: ${restaurant.stripeCustomerId || 'None'}`);
        console.log(`   Stripe Subscription ID: ${restaurant.stripeSubscriptionId || 'None'}`);
        console.log(`   Plan Type: ${restaurant.planType || 'None'}`);
        console.log(`   Billing Cycle: ${restaurant.billingCycle || 'None'}`);
      });
    }

    // Check for any restaurants with similar email
    const userEmail = user.email;
    const restaurantsByEmail = await Restaurant.find({
      $or: [
        { 'headChef.email': userEmail },
        { 'headChef.email': { $regex: userEmail.split('@')[0], $options: 'i' } }
      ]
    });

    if (restaurantsByEmail.length > 0) {
      console.log('\n🔍 Found restaurants with similar email:');
      restaurantsByEmail.forEach((restaurant, index) => {
        console.log(`   ${index + 1}. Restaurant: ${restaurant.restaurantName}`);
        console.log(`      HeadChefId: ${restaurant.headChefId}`);
        console.log(`      HeadChef Email: ${restaurant.headChef?.email || 'Not set'}`);
      });
    }

    // Check for any incomplete restaurant records
    const incompleteRestaurants = await Restaurant.find({
      $or: [
        { restaurantName: { $exists: false } },
        { restaurantName: null },
        { restaurantName: '' },
        { headChefId: { $exists: false } },
        { headChefId: null }
      ]
    });

    if (incompleteRestaurants.length > 0) {
      console.log('\n⚠️ Found incomplete restaurant records:');
      incompleteRestaurants.forEach((restaurant, index) => {
        console.log(`   ${index + 1}. ID: ${restaurant._id}`);
        console.log(`      Restaurant Name: ${restaurant.restaurantName || 'Missing'}`);
        console.log(`      HeadChefId: ${restaurant.headChefId || 'Missing'}`);
        console.log(`      Created: ${restaurant.createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking restaurant data:', error);
  }
}

checkRestaurantData();
