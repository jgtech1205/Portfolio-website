const mongoose = require('mongoose');
const User = require('./database/models/User');
const Restaurant = require('./database/models/Restaurant');

async function checkLocalHeadchefs() {
  try {
    // Connect to local database
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/chef-en-place";
    console.log('Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all headchef users
    const headchefs = await User.find({ role: 'head-chef' }).select('-password');
    
    console.log(`\n📊 Found ${headchefs.length} headchef users in local database:`);
    console.log('=' .repeat(60));
    
    if (headchefs.length === 0) {
      console.log('❌ No headchef users found in local database');
    } else {
      headchefs.forEach((user, index) => {
        console.log(`\n${index + 1}. Headchef Details:`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Is Active: ${user.isActive}`);
        console.log(`   HeadChef ID: ${user.headChefId}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Updated: ${user.updatedAt}`);
        console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
      });
    }

    // Also check restaurants
    const restaurants = await Restaurant.find({});
    console.log(`\n🏪 Found ${restaurants.length} restaurants in local database:`);
    
    if (restaurants.length > 0) {
      restaurants.forEach((restaurant, index) => {
        console.log(`\n${index + 1}. Restaurant Details:`);
        console.log(`   ID: ${restaurant._id}`);
        console.log(`   Name: ${restaurant.name}`);
        console.log(`   HeadChef ID: ${restaurant.headChefId}`);
        console.log(`   Created: ${restaurant.createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkLocalHeadchefs();





