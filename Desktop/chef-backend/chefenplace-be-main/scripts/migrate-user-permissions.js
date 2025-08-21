const mongoose = require('mongoose');
const User = require('../database/models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place';

async function migrateUserPermissions() {
  console.log('🔄 Migrating User Permissions...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in the system`);

    if (users.length === 0) {
      console.log('❌ No users found.');
      return;
    }

    let updatedCount = 0;
    let headChefCount = 0;
    let teamMemberCount = 0;

    for (const user of users) {
      console.log(`👤 Checking user: ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
      
      let needsUpdate = false;
      let newPermissions = {};

      // Set permissions based on role
      switch (user.role) {
        case "head-chef":
          newPermissions = {
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
          headChefCount++;
          break;

        case "team-member":
        case "user":
          newPermissions = {
            // Recipe permissions - view only for team members
            canViewRecipes: true,
            canEditRecipes: false,
            canDeleteRecipes: false,
            canUpdateRecipes: false,

            // Plateup permissions - view only for team members
            canViewPlateups: true,
            canCreatePlateups: false,
            canDeletePlateups: false,
            canUpdatePlateups: false,

            // Notification permissions - view only for team members
            canViewNotifications: true,
            canCreateNotifications: false,
            canDeleteNotifications: false,
            canUpdateNotifications: false,

            // Panel permissions - view only for team members
            canViewPanels: true,
            canCreatePanels: false,
            canDeletePanels: false,
            canUpdatePanels: false,

            // Other permissions - no admin access for team members
            canManageTeam: false,
            canAccessAdmin: false,
          };
          teamMemberCount++;
          break;

        default:
          console.log(`   ⚠️  Unknown role: ${user.role}, skipping`);
          continue;
      }

      // Check if permissions need to be updated
      if (!user.permissions || JSON.stringify(user.permissions) !== JSON.stringify(newPermissions)) {
        console.log('   ❌ Permissions need update, fixing...');
        user.permissions = newPermissions;
        
        // Fix invalid status values
        if (user.status === 'rejected') {
          console.log('   ⚠️  Fixing invalid status: rejected → inactive');
          user.status = 'inactive';
        }
        
        await user.save();
        updatedCount++;
        console.log('   ✅ Updated permissions');
      } else {
        console.log('   ✅ Permissions already correct');
      }
      
      console.log('');
    }

    console.log(`🎉 Migration Summary:`);
    console.log(`   📊 Total users processed: ${users.length}`);
    console.log(`   👨‍🍳 Head chefs: ${headChefCount}`);
    console.log(`   👥 Team members: ${teamMemberCount}`);
    console.log(`   🔧 Users updated: ${updatedCount}`);
    console.log('✅ All users now have correct permissions based on their roles');

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateUserPermissions();
