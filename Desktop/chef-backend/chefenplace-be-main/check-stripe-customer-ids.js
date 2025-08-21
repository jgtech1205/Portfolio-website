const mongoose = require('mongoose');
const Restaurant = require('./database/models/Restaurant');
const User = require('./database/models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkStripeCustomerIds = async () => {
  try {
    console.log('🔍 Checking Stripe Customer IDs in database...\n');

    // Get all restaurants
    const restaurants = await Restaurant.find({}).populate('headChefId', 'email firstName lastName');
    
    console.log(`📊 Found ${restaurants.length} total restaurants\n`);

    // Check restaurants with stripeCustomerId
    const withStripeCustomer = restaurants.filter(r => r.stripeCustomerId);
    const withoutStripeCustomer = restaurants.filter(r => !r.stripeCustomerId);

    console.log(`✅ Restaurants WITH stripeCustomerId: ${withStripeCustomer.length}`);
    console.log(`❌ Restaurants WITHOUT stripeCustomerId: ${withoutStripeCustomer.length}\n`);

    if (withStripeCustomer.length > 0) {
      console.log('📋 Restaurants with Stripe Customer IDs:');
      withStripeCustomer.forEach((restaurant, index) => {
        console.log(`  ${index + 1}. ${restaurant.restaurantName}`);
        console.log(`     Head Chef: ${restaurant.headChefId?.email || 'Unknown'}`);
        console.log(`     Stripe Customer ID: ${restaurant.stripeCustomerId}`);
        console.log(`     Stripe Subscription ID: ${restaurant.stripeSubscriptionId || 'None'}`);
        console.log(`     Plan: ${restaurant.planType} (${restaurant.billingCycle})`);
        console.log(`     Status: ${restaurant.subscriptionStatus}`);
        console.log('');
      });
    }

    if (withoutStripeCustomer.length > 0) {
      console.log('⚠️ Restaurants without Stripe Customer IDs:');
      withoutStripeCustomer.forEach((restaurant, index) => {
        console.log(`  ${index + 1}. ${restaurant.restaurantName}`);
        console.log(`     Head Chef: ${restaurant.headChefId?.email || 'Unknown'}`);
        console.log(`     Plan: ${restaurant.planType} (${restaurant.billingCycle})`);
        console.log(`     Status: ${restaurant.subscriptionStatus}`);
        console.log(`     Created: ${restaurant.createdAt}`);
        console.log('');
      });
    }

    // Check head chefs without restaurants
    const headChefs = await User.find({ role: 'head-chef' });
    const headChefsWithRestaurants = headChefs.filter(chef => 
      restaurants.some(restaurant => restaurant.headChefId?.toString() === chef._id.toString())
    );
    const headChefsWithoutRestaurants = headChefs.filter(chef => 
      !restaurants.some(restaurant => restaurant.headChefId?.toString() === chef._id.toString())
    );

    console.log('👨‍🍳 Head Chef Analysis:');
    console.log(`   Total head chefs: ${headChefs.length}`);
    console.log(`   Head chefs with restaurants: ${headChefsWithRestaurants.length}`);
    console.log(`   Head chefs without restaurants: ${headChefsWithoutRestaurants.length}\n`);

    if (headChefsWithoutRestaurants.length > 0) {
      console.log('⚠️ Head chefs without restaurants:');
      headChefsWithoutRestaurants.forEach((chef, index) => {
        console.log(`  ${index + 1}. ${chef.email} (${chef.firstName} ${chef.lastName})`);
        console.log(`     Created: ${chef.createdAt}`);
        console.log(`     Status: ${chef.status}`);
        console.log('');
      });
    }

    // Summary
    console.log('📈 Summary:');
    console.log(`   Total restaurants: ${restaurants.length}`);
    console.log(`   Restaurants with Stripe Customer ID: ${withStripeCustomer.length} (${((withStripeCustomer.length / restaurants.length) * 100).toFixed(1)}%)`);
    console.log(`   Restaurants without Stripe Customer ID: ${withoutStripeCustomer.length} (${((withoutStripeCustomer.length / restaurants.length) * 100).toFixed(1)}%)`);
    
    if (withStripeCustomer.length > 0) {
      console.log('\n✅ Billing endpoints should work for restaurants with Stripe Customer IDs');
    }
    
    if (withoutStripeCustomer.length > 0) {
      console.log('\n⚠️ Billing endpoints will NOT work for restaurants without Stripe Customer IDs');
      console.log('   These restaurants likely signed up before Stripe integration or had payment issues');
    }

  } catch (error) {
    console.error('❌ Error checking Stripe Customer IDs:', error);
  }
};

// Run the check
const main = async () => {
  await connectDB();
  await checkStripeCustomerIds();
  await mongoose.disconnect();
  console.log('\n✅ Check completed');
};

main().catch(console.error);
