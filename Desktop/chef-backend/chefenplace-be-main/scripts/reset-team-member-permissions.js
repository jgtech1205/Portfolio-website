const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('../database/models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function resetTeamMemberPermissions() {
  try {
    console.log('🔧 Resetting team member permissions to standard...\n');
    
    // Find all team members (users with role "user" or "team-member")
    const teamMembers = await User.find({
      role: { $in: ["user", "team-member"] },
      isActive: true
    });

    console.log(`📊 Found ${teamMembers.length} team members to reset`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const user of teamMembers) {
      try {
        // Reset to standard team member permissions
        const result = await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              permissions: {
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

                // Notification permissions - view and update for team members
                canViewNotifications: true,
                canCreateNotifications: false,
                canDeleteNotifications: false,
                canUpdateNotifications: true,

                // Panel permissions - view only for team members
                canViewPanels: true,
                canCreatePanels: false,
                canDeletePanels: false,
                canUpdatePanels: false,

                // Other permissions - no admin access for team members
                canManageTeam: false,
                canAccessAdmin: false,
              }
            }
          },
          { new: true }
        );

        if (result) {
          console.log(`✅ Reset ${user.firstName} ${user.lastName} (${user.email})`);
          console.log(`   - canAccessAdmin: ${result.permissions.canAccessAdmin}`);
          console.log(`   - canManageTeam: ${result.permissions.canManageTeam}`);
          console.log(`   - canViewNotifications: ${result.permissions.canViewNotifications}`);
          console.log(`   - canUpdateNotifications: ${result.permissions.canUpdateNotifications}`);
          updatedCount++;
        } else {
          console.log(`❌ Failed to reset ${user.firstName} ${user.lastName}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error resetting ${user.firstName} ${user.lastName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Reset Summary:');
    console.log(`   ✅ Successfully reset: ${updatedCount} team members`);
    console.log(`   ❌ Errors: ${errorCount} team members`);
    console.log(`   📊 Total processed: ${teamMembers.length} team members`);

    // Verify the reset
    console.log('\n🔍 Verifying reset...');
    const resetUsers = await User.find({
      role: { $in: ["user", "team-member"] },
      isActive: true,
      'permissions.canAccessAdmin': false,
      'permissions.canManageTeam': false,
      'permissions.canViewNotifications': true,
      'permissions.canUpdateNotifications': true
    });

    console.log(`✅ ${resetUsers.length} team members now have standard permissions`);

  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the reset
resetTeamMemberPermissions();
