// Test login functionality
const mongoose = require('mongoose');
const User = require('./database/models/User');
const { generateHeadChefTokens } = require('./utils/tokenUtils');
require('dotenv').config();

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chefenplace');
    console.log('✅ Connected to database');

    // Test login for the user
    const email = 'headcfasfafzhef@kitchen.com';
    const password = 'Bball12!';

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('🔍 User found:', user.email);

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password incorrect');
      return;
    }

    console.log('✅ Password correct');

    // Check status
    if (user.status !== 'active' && user.status !== 'approved') {
      console.log('❌ User status not active:', user.status);
      return;
    }

    console.log('✅ User status OK:', user.status);

    // Generate tokens
    const { accessToken, refreshToken } = generateHeadChefTokens(user._id);
    console.log('✅ Tokens generated successfully');
    console.log('   Access Token (first 50 chars):', accessToken.substring(0, 50) + '...');
    console.log('   Refresh Token (first 50 chars):', refreshToken.substring(0, 50) + '...');

    // Update last login
    user.lastLogin = new Date();
    await user.save();
    console.log('✅ Last login updated');

    console.log('\n🎉 Login test successful!');
    console.log('   User can log in with these credentials');
    console.log('   Email:', email);
    console.log('   Password:', password);

  } catch (error) {
    console.error('❌ Login test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testLogin();







