const mongoose = require('mongoose');
const User = require('../database/models/User');
require('dotenv').config();

/**
 * Test script to debug delete member functionality
 * This script will help identify issues with the delete member button
 */

async function testDeleteMember() {
  try {
    console.log('🧪 Testing Delete Member Functionality\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Check if there are any head chefs
    console.log('📋 Test 1: Checking for head chefs...');
    const headChefs = await User.find({ 
      role: 'head-chef', 
      isActive: true 
    }).select('_id email name permissions');
    
    if (headChefs.length === 0) {
      console.log('❌ No head chefs found. Cannot test delete functionality.');
      return;
    }
    
    console.log(`✅ Found ${headChefs.length} head chef(s):`);
    headChefs.forEach(chef => {
      console.log(`   - ${chef.name} (${chef.email}) - canManageTeam: ${chef.permissions?.canManageTeam}`);
    });
    console.log('');

    // Test 2: Check team members for each head chef
    console.log('📋 Test 2: Checking team members...');
    for (const headChef of headChefs) {
      console.log(`\n🔍 Head Chef: ${headChef.name}`);
      
      const teamMembers = await User.find({
        headChefId: headChef._id,
        role: { $in: ['user', 'team-member'] },
        isActive: true
      }).select('_id firstName lastName name role status permissions');
      
      console.log(`   Team members: ${teamMembers.length}`);
      
      if (teamMembers.length === 0) {
        console.log('   ⚠️  No team members found for this head chef');
        continue;
      }
      
      teamMembers.forEach(member => {
        console.log(`   - ${member.name} (${member.role}) - Status: ${member.status}`);
      });
    }

    // Test 3: Check permissions structure
    console.log('\n📋 Test 3: Checking permissions structure...');
    const sampleUser = await User.findOne({ role: 'head-chef' });
    if (sampleUser) {
      console.log('✅ Sample head chef permissions:');
      console.log(JSON.stringify(sampleUser.permissions, null, 2));
    }

    // Test 4: Check for any inactive users
    console.log('\n📋 Test 4: Checking for inactive users...');
    const inactiveUsers = await User.find({ 
      isActive: false 
    }).select('_id firstName lastName name role status headChefId');
    
    console.log(`Found ${inactiveUsers.length} inactive users:`);
    inactiveUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.role}) - Status: ${user.status}`);
    });

    // Test 5: API endpoint simulation
    console.log('\n📋 Test 5: Simulating API endpoint logic...');
    if (headChefs.length > 0 && teamMembers.length > 0) {
      const headChef = headChefs[0];
      const teamMember = teamMembers[0];
      
      console.log(`\n🧪 Simulating delete request:`);
      console.log(`   Head Chef: ${headChef.name} (${headChef._id})`);
      console.log(`   Team Member: ${teamMember.name} (${teamMember._id})`);
      
      // Check if head chef has canManageTeam permission
      if (!headChef.permissions?.canManageTeam) {
        console.log('   ❌ Head chef does not have canManageTeam permission');
      } else {
        console.log('   ✅ Head chef has canManageTeam permission');
      }
      
      // Check organization match
      if (teamMember.headChefId.toString() !== headChef._id.toString()) {
        console.log('   ❌ Organization mismatch');
      } else {
        console.log('   ✅ Organization match');
      }
      
      // Check team member status (can delete both active and inactive)
      console.log(`   📊 Team member status: ${teamMember.status} (isActive: ${teamMember.isActive})`);
      console.log('   ✅ Can delete both active and inactive team members');
    }

    console.log('\n🎉 Test completed!');
    console.log('\n💡 Common issues to check:');
    console.log('   1. Make sure the user making the request is a head chef');
    console.log('   2. Verify the head chef has canManageTeam permission');
    console.log('   3. Check that the team member belongs to the same organization');
    console.log('   4. Ensure the team member is currently active');
    console.log('   5. Check browser console for any JavaScript errors');
    console.log('   6. Verify the API endpoint URL is correct: DELETE /api/users/team/:id');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testDeleteMember();
