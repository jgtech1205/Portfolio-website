const mongoose = require('mongoose');
const User = require('./database/models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place';

async function fixCurrentUser() {
  console.log('🔧 Fixing Current User Permissions...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all head chefs
    const headChefs = await User.find({ role: 'head-chef' });
    console.log(`📊 Found ${headChefs.length} head chefs`);

    for (const headChef of headChefs) {
      console.log(`👨‍🍳 Head Chef: ${headChef.firstName} ${headChef.lastName} (${headChef.email})`);
      console.log(`   Current permissions:`, headChef.permissions);
      
      // Check if canManageTeam is missing or false
      if (!headChef.permissions || !headChef.permissions.canManageTeam) {
        console.log('   ❌ Missing canManageTeam, fixing...');
        
        // Ensure permissions object exists
        if (!headChef.permissions) {
          headChef.permissions = {};
        }
        
        // Set canManageTeam to true
        headChef.permissions.canManageTeam = true;
        
        // Save the user
        await headChef.save();
        console.log('   ✅ Fixed! canManageTeam is now true');
      } else {
        console.log('   ✅ Already has canManageTeam permission');
      }
      console.log('');
    }

    console.log('🎉 All head chefs now have canManageTeam permission!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixCurrentUser();

