const mongoose = require('mongoose');
const User = require('../database/models/User');

const MONGODB_URI = "mongodb+srv://ray:raytech@cluster0.u2chhqk.mongodb.net/chef-en-place";
const HEAD_CHEF_ID = "687851455644fcb16f2fa339";

async function checkTeamMembersDetails() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the head chef
    const headChef = await User.findById(HEAD_CHEF_ID);
    if (!headChef) {
      console.log('❌ Head chef not found');
      return;
    }

    console.log('👨‍🍳 Head Chef:', {
      id: headChef._id,
      email: headChef.email,
      name: headChef.name,
      role: headChef.role,
      status: headChef.status
    });

    // Find all team members for this head chef
    const teamMembers = await User.find({
      headChefId: HEAD_CHEF_ID,
      role: { $in: ['user', 'team-member'] }
    });

    console.log(`\n👥 Team Members (${teamMembers.length}):`);
    
    if (teamMembers.length === 0) {
      console.log('❌ No team members found for this head chef');
    } else {
      teamMembers.forEach((member, index) => {
        console.log(`${index + 1}. ${member.firstName} ${member.lastName}`);
        console.log(`   Email: ${member.email}`);
        console.log(`   Role: ${member.role}`);
        console.log(`   Status: ${member.status}`);
        console.log(`   headChefId: ${member.headChefId}`);
        console.log(`   Login: username="${member.firstName}", password="${member.lastName}"`);
        
        // Check if this matches the "mike" login attempt
        if (member.firstName && member.firstName.toLowerCase() === 'mike') {
          console.log(`   🎯 MATCHES LOGIN ATTEMPT: username="mike"`);
        }
        
        console.log('');
      });
    }

    // Check for users with "mike" in their name
    const mikeUsers = await User.find({
      firstName: { $regex: /mike/i }
    });

    console.log(`\n🔍 Users with "mike" in firstName (${mikeUsers.length}):`);
    mikeUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`     Role: ${user.role}, Status: ${user.status}, headChefId: ${user.headChefId}`);
    });

    // Check for users with "vick" in their lastName
    const vickUsers = await User.find({
      lastName: { $regex: /vick/i }
    });

    console.log(`\n🔍 Users with "vick" in lastName (${vickUsers.length}):`);
    vickUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`     Role: ${user.role}, Status: ${user.status}, headChefId: ${user.headChefId}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkTeamMembersDetails();


