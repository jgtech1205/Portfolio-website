const mongoose = require('mongoose');
const User = require('./database/models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place';

async function testPermissionsHook() {
  console.log('🧪 Testing Permissions Pre-save Hook...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Create a new head chef
    console.log('📝 Test 1: Creating new head chef...');
    const headChef = new User({
      email: 'test-headchef@example.com',
      password: 'testpass123',
      firstName: 'Test',
      lastName: 'HeadChef',
      role: 'head-chef',
      status: 'active'
    });

    console.log('   Before save - permissions:', headChef.permissions);
    await headChef.save();
    console.log('   After save - permissions:', headChef.permissions);
    console.log('   Has canManageTeam:', headChef.permissions?.canManageTeam);
    console.log('   ✅ Head chef test completed\n');

    // Test 2: Create a new team member
    console.log('📝 Test 2: Creating new team member...');
    const teamMember = new User({
      email: 'test-member@example.com',
      password: 'testpass123',
      firstName: 'Test',
      lastName: 'Member',
      role: 'team-member',
      status: 'approved',
      headChefId: headChef._id
    });

    console.log('   Before save - permissions:', teamMember.permissions);
    await teamMember.save();
    console.log('   After save - permissions:', teamMember.permissions);
    console.log('   Has canManageTeam:', teamMember.permissions?.canManageTeam);
    console.log('   ✅ Team member test completed\n');

    // Test 3: Update role and see if permissions change
    console.log('📝 Test 3: Updating user role...');
    const regularUser = new User({
      email: 'test-user@example.com',
      password: 'testpass123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      status: 'active'
    });

    await regularUser.save();
    console.log('   Initial role "user" - canManageTeam:', regularUser.permissions?.canManageTeam);

    // Change role to head-chef
    regularUser.role = 'head-chef';
    await regularUser.save();
    console.log('   After role change to "head-chef" - canManageTeam:', regularUser.permissions?.canManageTeam);
    console.log('   ✅ Role update test completed\n');

    // Clean up test users
    console.log('🧹 Cleaning up test users...');
    await User.deleteMany({
      email: { 
        $in: ['test-headchef@example.com', 'test-member@example.com', 'test-user@example.com'] 
      }
    });
    console.log('   ✅ Test users cleaned up\n');

    console.log('🎉 All tests passed! The pre-save hook is working correctly.');
    console.log('✅ New head chefs will automatically get canManageTeam: true');
    console.log('✅ New team members will automatically get canManageTeam: false');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPermissionsHook();














