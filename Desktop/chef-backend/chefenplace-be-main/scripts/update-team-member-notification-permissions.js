const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('../database/models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateTeamMemberNotificationPermissions() {
  try {
    console.log('🔧 Updating team member notification permissions...\n');
    
    // Find all team members (users with role "user" or "team-member")
    const teamMembers = await User.find({
      role: { $in: ["user", "team-member"] },
      isActive: true
    });

    console.log(`📊 Found ${teamMembers.length} team members to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const user of teamMembers) {
      try {
        // Update the user's notification permissions
        const result = await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              'permissions.canUpdateNotifications': true
            }
          },
          { new: true }
        );

        if (result) {
          console.log(`✅ Updated ${user.firstName} ${user.lastName} (${user.email})`);
          updatedCount++;
        } else {
          console.log(`❌ Failed to update ${user.firstName} ${user.lastName}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${user.firstName} ${user.lastName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully updated: ${updatedCount} team members`);
    console.log(`   ❌ Errors: ${errorCount} team members`);
    console.log(`   📊 Total processed: ${teamMembers.length} team members`);

    // Verify the update
    console.log('\n🔍 Verifying updates...');
    const updatedUsers = await User.find({
      role: { $in: ["user", "team-member"] },
      isActive: true,
      'permissions.canUpdateNotifications': true
    });

    console.log(`✅ ${updatedUsers.length} team members now have canUpdateNotifications: true`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
updateTeamMemberNotificationPermissions();
