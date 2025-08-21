const mongoose = require('mongoose');
const User = require('../database/models/User');
const Request = require('../database/models/Request');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place';

async function testPendingRequests() {
  console.log('🧪 Testing Pending Requests Functionality...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // 1. Check if we have head chefs
    const headChefs = await User.find({ role: 'head-chef' }).limit(5);
    console.log(`📊 Found ${headChefs.length} head chefs in the system`);

    if (headChefs.length === 0) {
      console.log('❌ No head chefs found. Cannot test pending requests functionality.');
      return;
    }

    const testHeadChef = headChefs[0];
    console.log(`👨‍🍳 Using head chef: ${testHeadChef.firstName} ${testHeadChef.lastName} (${testHeadChef.email})`);
    console.log(`   🆔 HeadChefId: ${testHeadChef.headChefId}\n`);

    // 2. Create some test pending requests
    console.log('📝 Creating test pending requests...');
    
    const testRequests = [
      {
        firstName: 'John',
        lastName: 'Doe',
        headChefId: testHeadChef.headChefId,
        status: 'pending'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        headChefId: testHeadChef.headChefId,
        status: 'pending'
      },
      {
        firstName: 'Mike',
        lastName: 'Johnson',
        headChefId: testHeadChef.headChefId,
        status: 'pending'
      }
    ];

    // Clear existing test requests for this head chef
    await Request.deleteMany({ headChefId: testHeadChef.headChefId });
    console.log('🧹 Cleared existing test requests');

    // Create new test requests
    const createdRequests = await Request.insertMany(testRequests);
    console.log(`✅ Created ${createdRequests.length} test pending requests\n`);

    // 3. Test the data structure
    console.log('📋 Test Request Data Structure:');
    createdRequests.forEach((request, index) => {
      console.log(`   Request ${index + 1}:`);
      console.log(`     🆔 ID: ${request._id}`);
      console.log(`     👤 Name: ${request.firstName} ${request.lastName}`);
      console.log(`     👨‍🍳 HeadChefId: ${request.headChefId}`);
      console.log(`     📊 Status: ${request.status}`);
      console.log(`     📅 Created: ${request.createdAt}`);
      console.log('');
    });

    // 4. Test querying pending requests
    console.log('🔍 Testing pending requests query...');
    const pendingRequests = await Request.find({
      headChefId: testHeadChef.headChefId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${pendingRequests.length} pending requests for head chef`);
    console.log('   Expected API response structure:');
    console.log(JSON.stringify({
      success: true,
      data: pendingRequests.map(req => ({
        _id: req._id,
        firstName: req.firstName,
        lastName: req.lastName,
        headChefId: req.headChefId,
        status: req.status,
        createdAt: req.createdAt
      }))
    }, null, 2));

    // 5. Test approving a request
    if (pendingRequests.length > 0) {
      console.log('\n✅ Testing request approval...');
      const requestToApprove = pendingRequests[0];
      
      console.log(`   Approving request for: ${requestToApprove.firstName} ${requestToApprove.lastName}`);
      
      // Simulate the approval process
      const email = `${requestToApprove.firstName.toLowerCase()}.${requestToApprove.lastName.toLowerCase()}.${Date.now()}@chef.local`;
      const tempPassword = Math.random().toString(36).slice(-8);
      
      console.log(`   Generated email: ${email}`);
      console.log(`   Generated password: ${tempPassword}`);
      
      // Create team member user
      const teamMember = new User({
        email,
        password: tempPassword,
        firstName: requestToApprove.firstName,
        lastName: requestToApprove.lastName,
        name: `${requestToApprove.firstName} ${requestToApprove.lastName}`,
        role: 'team-member',
        headChefId: testHeadChef.headChefId,
        status: 'approved',
        permissions: {
          canViewRecipes: true,
          canViewPlateups: true,
          canViewNotifications: true,
          canViewPanels: true,
          canManageTeam: false,
          canAccessAdmin: false,
        }
      });

      await teamMember.save();
      
      // Update request status
      requestToApprove.status = 'approved';
      requestToApprove.approvedAt = new Date();
      await requestToApprove.save();
      
      console.log('✅ Request approved successfully!');
      console.log(`   Team member created with ID: ${teamMember._id}`);
      console.log(`   Request updated to: ${requestToApprove.status}`);
    }

    // 6. Test rejecting a request
    const remainingPending = await Request.find({
      headChefId: testHeadChef.headChefId,
      status: 'pending'
    });

    if (remainingPending.length > 0) {
      console.log('\n❌ Testing request rejection...');
      const requestToReject = remainingPending[0];
      
      console.log(`   Rejecting request for: ${requestToReject.firstName} ${requestToReject.lastName}`);
      
      // Update request status
      requestToReject.status = 'rejected';
      requestToReject.rejectedAt = new Date();
      await requestToReject.save();
      
      console.log('✅ Request rejected successfully!');
      console.log(`   Request updated to: ${requestToReject.status}`);
    }

    // 7. Final status check
    console.log('\n📊 Final Status Check:');
    const finalPending = await Request.find({
      headChefId: testHeadChef.headChefId,
      status: 'pending'
    });
    const finalApproved = await Request.find({
      headChefId: testHeadChef.headChefId,
      status: 'approved'
    });
    const finalRejected = await Request.find({
      headChefId: testHeadChef.headChefId,
      status: 'rejected'
    });

    console.log(`   Pending: ${finalPending.length}`);
    console.log(`   Approved: ${finalApproved.length}`);
    console.log(`   Rejected: ${finalRejected.length}`);

    // 8. Check team members created
    const teamMembers = await User.find({
      headChefId: testHeadChef.headChefId,
      role: 'team-member'
    });

    console.log(`   Team members created: ${teamMembers.length}`);
    teamMembers.forEach(member => {
      console.log(`     - ${member.firstName} ${member.lastName} (${member.email})`);
    });

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPendingRequests();
