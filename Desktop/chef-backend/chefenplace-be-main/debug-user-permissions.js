const mongoose = require('mongoose');
const User = require('./database/models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place';

async function debugUserPermissions() {
  console.log('🔍 Debugging User Permissions...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find the most recent head chef
    const recentHeadChef = await User.findOne({ role: 'head-chef' }).sort({ createdAt: -1 });
    
    if (!recentHeadChef) {
      console.log('❌ No head chefs found.');
      return;
    }

    console.log('👨‍🍳 Most Recent Head Chef:');
    console.log(`   Name: ${recentHeadChef.firstName} ${recentHeadChef.lastName}`);
    console.log(`   Email: ${recentHeadChef.email}`);
    console.log(`   Role: ${recentHeadChef.role}`);
    console.log(`   Status: ${recentHeadChef.status}`);
    console.log(`   Created: ${recentHeadChef.createdAt}`);
    console.log(`   Permissions:`, recentHeadChef.permissions);
    console.log(`   Has canManageTeam: ${recentHeadChef.permissions?.canManageTeam}`);
    console.log('');

    // Check if this user needs to be fixed
    if (!recentHeadChef.permissions?.canManageTeam) {
      console.log('🔧 Fixing permissions for this head chef...');
      
      // Set the correct permissions
      recentHeadChef.permissions = {
        // Recipes
        canViewRecipes: true,
        canEditRecipes: true,
        canDeleteRecipes: true,
        canUpdateRecipes: true,

        // Plateups
        canViewPlateups: true,
        canCreatePlateups: true,
        canDeletePlateups: true,
        canUpdatePlateups: true,

        // Notifications
        canViewNotifications: true,
        canCreateNotifications: true,
        canDeleteNotifications: true,
        canUpdateNotifications: true,

        // Panels
        canViewPanels: true,
        canCreatePanels: true,
        canDeletePanels: true,
        canUpdatePanels: true,

        // Other
        canManageTeam: true,
        canAccessAdmin: true,
      };

      await recentHeadChef.save();
      console.log('✅ Fixed permissions!');
      console.log('   New permissions:', recentHeadChef.permissions);
    }

    // Test the pre-save hook with a new user
    console.log('\n🧪 Testing pre-save hook with new user...');
    const testUser = new User({
      email: 'test-head-chef@example.com',
      password: 'testpass123',
      firstName: 'Test',
      lastName: 'HeadChef',
      role: 'head-chef',
      status: 'active'
    });

    console.log('   Before save - permissions:', testUser.permissions);
    await testUser.save();
    console.log('   After save - permissions:', testUser.permissions);
    console.log('   Has canManageTeam:', testUser.permissions?.canManageTeam);

    // Clean up test user
    await User.deleteOne({ email: 'test-head-chef@example.com' });
    console.log('   ✅ Test user cleaned up');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the debug
debugUserPermissions();
