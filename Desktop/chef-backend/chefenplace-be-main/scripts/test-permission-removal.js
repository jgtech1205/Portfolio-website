const mongoose = require('mongoose');
const User = require('../database/models/User');
require('dotenv').config();

/**
 * Test script to verify that removing admin access preserves team member permissions
 */

async function testPermissionRemoval() {
  try {
    console.log('🧪 Testing Permission Removal - Admin Access Removal\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Find a team member with admin access
    console.log('📋 Test 1: Finding team member with admin access...');
    const teamMember = await User.findOne({
      role: { $in: ['user', 'team-member'] },
      isActive: true,
      'permissions.canAccessAdmin': true
    }).select('_id firstName lastName name role permissions headChefId');
    
    if (!teamMember) {
      console.log('❌ No team member with admin access found.');
      console.log('   Creating a test scenario...');
      
      // Find any team member and give them admin access
      const anyTeamMember = await User.findOne({
        role: { $in: ['user', 'team-member'] },
        isActive: true
      });
      
      if (!anyTeamMember) {
        console.log('❌ No team members found at all.');
        return;
      }
      
      anyTeamMember.permissions = {
        ...anyTeamMember.permissions,
        canAccessAdmin: true,
        canManageTeam: true
      };
      await anyTeamMember.save();
      console.log(`✅ Granted admin access to: ${anyTeamMember.name}`);
      
      // Use this team member for testing
      teamMember = anyTeamMember;
    }
    
    console.log(`✅ Found team member: ${teamMember.name} (${teamMember.role})`);
    console.log(`   Current permissions:`);
    console.log(`   - canAccessAdmin: ${teamMember.permissions?.canAccessAdmin}`);
    console.log(`   - canManageTeam: ${teamMember.permissions?.canManageTeam}`);
    console.log(`   - canViewRecipes: ${teamMember.permissions?.canViewRecipes}`);
    console.log(`   - canViewNotifications: ${teamMember.permissions?.canViewNotifications}`);
    console.log(`   - canUpdateNotifications: ${teamMember.permissions?.canUpdateNotifications}`);

    // Test 2: Remove admin access (simulate what happens in the frontend)
    console.log('\n📋 Test 2: Removing admin access...');
    
    // Update permissions to remove admin access
    teamMember.permissions = {
      ...teamMember.permissions,
      canAccessAdmin: false,
      canManageTeam: false
    };
    
    console.log('   🔄 Saving user with removed admin access...');
    await teamMember.save();
    console.log('   ✅ Admin access removed');

    // Test 3: Verify permissions after removal
    console.log('\n📋 Test 3: Verifying permissions after admin access removal...');
    const updatedUser = await User.findById(teamMember._id).select('permissions role');
    
    console.log('   📊 Final permissions:');
    console.log(`   - canAccessAdmin: ${updatedUser.permissions?.canAccessAdmin}`);
    console.log(`   - canManageTeam: ${updatedUser.permissions?.canManageTeam}`);
    console.log(`   - canViewRecipes: ${updatedUser.permissions?.canViewRecipes}`);
    console.log(`   - canEditRecipes: ${updatedUser.permissions?.canEditRecipes}`);
    console.log(`   - canViewNotifications: ${updatedUser.permissions?.canViewNotifications}`);
    console.log(`   - canUpdateNotifications: ${updatedUser.permissions?.canUpdateNotifications}`);
    console.log(`   - canViewPlateups: ${updatedUser.permissions?.canViewPlateups}`);
    console.log(`   - canViewPanels: ${updatedUser.permissions?.canViewPanels}`);

    // Test 4: Check if team member permissions are preserved
    console.log('\n📋 Test 4: Checking if team member permissions are preserved...');
    
    const expectedTeamMemberPermissions = {
      canAccessAdmin: false,        // ✅ Should be false (admin removed)
      canManageTeam: false,         // ✅ Should be false (admin removed)
      canViewRecipes: true,         // ✅ Should be true (team member can view)
      canEditRecipes: false,        // ✅ Should be false (team member can't edit)
      canViewNotifications: true,   // ✅ Should be true (team member can view)
      canUpdateNotifications: true, // ✅ Should be true (team member can update)
      canViewPlateups: true,        // ✅ Should be true (team member can view)
      canViewPanels: true,          // ✅ Should be true (team member can view)
    };
    
    let allCorrect = true;
    for (const [permission, expectedValue] of Object.entries(expectedTeamMemberPermissions)) {
      const actualValue = updatedUser.permissions?.[permission];
      if (actualValue === expectedValue) {
        console.log(`   ✅ ${permission}: ${actualValue} (correct)`);
      } else {
        console.log(`   ❌ ${permission}: ${actualValue} (expected ${expectedValue})`);
        allCorrect = false;
      }
    }

    // Final result
    console.log('\n🎯 Test Result:');
    if (allCorrect) {
      console.log('   ✅ SUCCESS: Team member permissions preserved after admin access removal!');
      console.log('   ✅ User should still see dashboard content (recipes, notifications, etc.)');
      console.log('   ✅ User should NOT see admin-only features');
    } else {
      console.log('   ❌ FAILED: Team member permissions were not preserved');
      console.log('   ❌ User will see blank dashboard (no content access)');
    }

    console.log('\n💡 What this means for the frontend:');
    console.log('   - User should still see: Recipes, Notifications, Plateups, Panels');
    console.log('   - User should NOT see: Admin buttons, Team management, Recipe editing');
    console.log('   - Dashboard should NOT be blank/white');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPermissionRemoval();

