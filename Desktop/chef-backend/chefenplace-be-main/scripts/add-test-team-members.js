const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../database/models/User');

const MONGODB_URI = "mongodb+srv://ray:raytech@cluster0.u2chhqk.mongodb.net/chef-en-place";
const HEAD_CHEF_ID = "687851455644fcb16f2fa339";

const testTeamMembers = [
  {
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@restaurant.com",
    role: "team-member"
  },
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@restaurant.com",
    role: "team-member"
  },
  {
    firstName: "Mike",
    lastName: "Davis",
    email: "mike.davis@restaurant.com",
    role: "team-member"
  },
  {
    firstName: "Lisa",
    lastName: "Wilson",
    email: "lisa.wilson@restaurant.com",
    role: "team-member"
  }
];

async function addTestTeamMembers() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Verify head chef exists
    const headChef = await User.findById(HEAD_CHEF_ID);
    if (!headChef) {
      console.log('❌ Head chef not found');
      return;
    }

    console.log('👨‍🍳 Head Chef:', headChef.email);

    // Add test team members
    for (const memberData of testTeamMembers) {
      // Check if team member already exists
      const existingMember = await User.findOne({
        email: memberData.email
      });

      if (existingMember) {
        console.log(`⚠️  Team member ${memberData.firstName} ${memberData.lastName} already exists`);
        continue;
      }

      // Hash password (using lastName as password)
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(memberData.lastName, salt);

      // Create team member
      const teamMember = new User({
        email: memberData.email,
        password: hashedPassword,
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        role: memberData.role,
        status: "active",
        headChefId: HEAD_CHEF_ID,
        permissions: {
          canViewRecipes: true,
          canEditRecipes: true,
          canViewPlateups: true,
          canCreatePlateups: true,
          canViewNotifications: true,
          canViewPanels: true,
          canManageTeam: false,
          canAccessAdmin: false
        }
      });

      await teamMember.save();
      console.log(`✅ Added team member: ${memberData.firstName} ${memberData.lastName}`);
      console.log(`   Login: username="${memberData.firstName}", password="${memberData.lastName}"`);
    }

    // List all team members for this head chef
    const allTeamMembers = await User.find({
      headChefId: HEAD_CHEF_ID,
      role: { $in: ["user", "team-member"] }
    });

    console.log(`\n📋 All team members for ${headChef.email}:`);
    allTeamMembers.forEach((member, index) => {
      console.log(`${index + 1}. ${member.firstName} ${member.lastName}`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Role: ${member.role}`);
      console.log(`   Status: ${member.status}`);
      console.log(`   Login: username="${member.firstName}", password="${member.lastName}"`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

addTestTeamMembers();


