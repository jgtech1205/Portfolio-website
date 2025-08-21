// Script to create jbuffalo@gmail.com user
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./database/models/User');
require('dotenv').config();

async function createJbuffaloUser() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chefenplace');
    console.log('✅ Connected to database');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'jbuffalo@gmail.com' });
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.email);
      console.log('   ID:', existingUser._id);
      console.log('   Role:', existingUser.role);
      console.log('   Status:', existingUser.status);
      console.log('   HeadChefId:', existingUser.headChefId);
      return;
    }

    // Get the head chef to assign as headChefId
    const headChef = await User.findOne({ role: 'head-chef' });
    if (!headChef) {
      console.log('❌ No head chef found. Please create a head chef first.');
      return;
    }

    // Create user
    const userEmail = 'jbuffalo@gmail.com';
    const userPassword = 'Bball12!';
    const firstName = 'Justin';
    const lastName = 'Buffalo';

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(userPassword, salt);

    // Create user
    const user = new User({
      email: userEmail,
      password: hashedPassword,
      firstName: firstName,
      lastName: lastName,
      role: 'user', // Team member role
      status: 'active',
      isActive: true,
      headChefId: headChef._id, // Assign to the head chef
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

    await user.save();

    console.log('✅ User created successfully!');
    console.log('   Email:', userEmail);
    console.log('   Password:', userPassword);
    console.log('   Name:', `${firstName} ${lastName}`);
    console.log('   ID:', user._id);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   HeadChefId:', user.headChefId);
    console.log('   Assigned to head chef:', headChef.email);

  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the script
createJbuffaloUser();

