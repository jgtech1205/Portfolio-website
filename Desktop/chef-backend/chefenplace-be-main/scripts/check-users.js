const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chefenplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../database/models/User');

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    // Get all users
    const users = await User.find({}).select('firstName lastName email role status headChefId');
    
    console.log(`📊 Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   HeadChefId: ${user.headChefId || 'None'}`);
      console.log('');
    });
    
    // Check for users with headChefId matching the one in the URL
    const targetHeadChefId = '687851455644fcb16f2fa339';
    const teamMembers = await User.find({ 
      headChefId: targetHeadChefId,
      status: { $in: ['approved', 'active'] }
    }).select('firstName lastName email role status');
    
    console.log(`👥 Team members for headChefId ${targetHeadChefId}:`);
    if (teamMembers.length === 0) {
      console.log('   No approved team members found');
    } else {
      teamMembers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUsers();
