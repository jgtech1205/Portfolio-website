// Script to debug user login issues
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./database/models/User');
require('dotenv').config();

async function debugUserLogin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chefenplace');
    console.log('✅ Connected to database');

    // Find the user that was created
    const user = await User.findOne({ email: 'headcfasfafzhef@kitchen.com' });
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('🔍 User found:');
    console.log('   ID:', user._id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   IsActive:', user.isActive);
    console.log('   HeadChefId:', user.headChefId);
    console.log('   Created:', user.createdAt);
    console.log('   Updated:', user.updatedAt);
    console.log('   LastLogin:', user.lastLogin);

    // Test password comparison
    const testPassword = 'Bball12!';
    const isPasswordValid = await user.comparePassword(testPassword);
    console.log('🔐 Password test:', isPasswordValid ? '✅ Valid' : '❌ Invalid');

    // Check if user can login based on status
    const canLogin = user.status === 'active' || user.status === 'approved';
    console.log('🚪 Can login:', canLogin ? '✅ Yes' : '❌ No');

    // Check if headChefId is properly set for head-chef role
    if (user.role === 'head-chef') {
      const headChefIdValid = user.headChefId && user.headChefId.toString() === user._id.toString();
      console.log('👨‍🍳 HeadChefId valid:', headChefIdValid ? '✅ Yes' : '❌ No');
    }

    // Check permissions
    console.log('🔑 Permissions:', user.permissions);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the script
debugUserLogin();

