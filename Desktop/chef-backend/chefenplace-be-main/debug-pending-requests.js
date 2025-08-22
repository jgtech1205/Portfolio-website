const mongoose = require('mongoose');
const User = require('./database/models/User');
const Request = require('./database/models/Request');

async function debugPendingRequests() {
  try {
    // Connect to production database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log('❌ MONGODB_URI not set. Please set your production MongoDB URI.');
      return;
    }
    
    console.log('🔗 Connecting to production database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to production MongoDB');

    // Test user ID from browser console
    const testUserId = "68a713f2f910e18744c69edf";
    
    console.log(`\n🔍 Checking user: ${testUserId}`);
    
    // Find the user
    const user = await User.findById(testUserId).select('-password');
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   HeadChef ID: ${user.headChefId}`);
    console.log(`   Is Active: ${user.isActive}`);
    
    // Check if user is a head chef
    if (user.role !== 'head-chef') {
      console.log('❌ User is not a head chef. Cannot view pending requests.');
      return;
    }
    
    // Check if headChefId is set
    if (!user.headChefId) {
      console.log('⚠️  User headChefId is null/undefined. This might cause issues.');
      console.log('   The headChefId should be set to the user\'s own _id for head chefs.');
    }
    
    // Try to find pending requests
    console.log(`\n🔍 Searching for pending requests with headChefId: ${user.headChefId || user._id}`);
    
    const searchCriteria = user.headChefId ? 
      { headChefId: user.headChefId, status: 'pending' } :
      { headChefId: user._id, status: 'pending' };
    
    const pendingRequests = await Request.find(searchCriteria).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${pendingRequests.length} pending requests`);
    
    if (pendingRequests.length > 0) {
      pendingRequests.forEach((request, index) => {
        console.log(`\n${index + 1}. Request Details:`);
        console.log(`   ID: ${request._id}`);
        console.log(`   Name: ${request.firstName} ${request.lastName}`);
        console.log(`   HeadChef ID: ${request.headChefId}`);
        console.log(`   Status: ${request.status}`);
        console.log(`   Created: ${request.createdAt}`);
      });
    }
    
    // Check if there are any requests with different headChefId values
    console.log(`\n🔍 Checking for any requests with this user's ID as headChefId...`);
    const allRequests = await Request.find({ headChefId: user._id });
    console.log(`Found ${allRequests.length} total requests (any status) with this user as headChefId`);
    
    // Check for any requests in the system
    const totalRequests = await Request.countDocuments({});
    console.log(`\n📊 Total requests in system: ${totalRequests}`);
    
    // Check for any pending requests in the system
    const totalPending = await Request.countDocuments({ status: 'pending' });
    console.log(`📊 Total pending requests in system: ${totalPending}`);
    
    // Test the exact query that the endpoint uses
    console.log(`\n🧪 Testing exact endpoint query...`);
    try {
      const testQuery = await Request.find({
        headChefId: user._id,
        status: 'pending'
      }).sort({ createdAt: -1 });
      
      console.log(`✅ Query successful. Found ${testQuery.length} results.`);
    } catch (queryError) {
      console.log('❌ Query failed:', queryError.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugPendingRequests();





