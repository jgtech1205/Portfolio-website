const mongoose = require('mongoose');
const User = require('../database/models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place';

async function fixHeadChefPermissions() {
  console.log('🔧 Fixing Head Chef Permissions...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all head chefs
    const headChefs = await User.find({ role: 'head-chef' });
    console.log(`📊 Found ${headChefs.length} head chefs in the system`);

    if (headChefs.length === 0) {
      console.log('❌ No head chefs found.');
      return;
    }

    let updatedCount = 0;

    for (const headChef of headChefs) {
      console.log(`👨‍🍳 Checking head chef: ${headChef.firstName} ${headChef.lastName} (${headChef.email})`);
      
      // Check if canManageTeam permission is missing
      if (!headChef.permissions || !headChef.permissions.canManageTeam) {
        console.log('   ❌ Missing canManageTeam permission, fixing...');
        
        // Set the full permissions object for head chefs
        headChef.permissions = {
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

        await headChef.save();
        updatedCount++;
        console.log('   ✅ Fixed permissions');
      } else {
        console.log('   ✅ Permissions already correct');
      }
      
      console.log(`   📋 Current permissions:`, headChef.permissions);
      console.log('');
    }

    console.log(`🎉 Fixed permissions for ${updatedCount} head chefs`);
    console.log('✅ All head chefs now have canManageTeam permission');

  } catch (error) {
    console.error('❌ Error fixing permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixHeadChefPermissions();

