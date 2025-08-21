// Script to create a head chef user
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./database/models/User');
const Restaurant = require('./database/models/Restaurant');
require('dotenv').config();

async function createHeadChef() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chefenplace');
    console.log('✅ Connected to database');

    // Check if head chef already exists
    const existingHeadChef = await User.findOne({ role: 'head-chef' });
    if (existingHeadChef) {
      console.log('✅ Head chef already exists:', existingHeadChef.email);
      console.log('   ID:', existingHeadChef._id);
      console.log('   Status:', existingHeadChef.status);
      console.log('   HeadChefId:', existingHeadChef.headChefId);
      return;
    }

    // Create head chef user
    const headChefEmail = 'headchef@restaurant.com';
    const headChefPassword = 'headchef123';
    const headChefName = 'Head Chef';

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(headChefPassword, salt);

    // Create head chef user
    const headChef = new User({
      email: headChefEmail,
      password: hashedPassword,
      firstName: headChefName,
      lastName: 'Head Chef',
      role: 'head-chef',
      status: 'active',
      isActive: true,
      // Don't set headChefId yet - we'll set it after save
      permissions: {
        canViewPanels: true,
        canViewRecipes: true,
        canViewPlateups: true,
        canViewNotifications: true,
        canManageTeam: true,
        canCreateNotifications: true,
        canEditRecipes: true,
        canDeleteRecipes: true,
        canUpdateRecipes: true,
        canCreatePlateups: true,
        canDeletePlateups: true,
        canUpdatePlateups: true,
        canDeleteNotifications: true,
        canUpdateNotifications: true,
        canCreatePanels: true,
        canDeletePanels: true,
        canUpdatePanels: true,
        canAccessAdmin: true
      }
    });

    await headChef.save();

    // Now set headChefId to the user's own _id
    headChef.headChefId = headChef._id;
    await headChef.save();

    console.log('✅ Head chef created successfully!');
    console.log('   Email:', headChefEmail);
    console.log('   Password:', headChefPassword);
    console.log('   ID:', headChef._id);
    console.log('   HeadChefId:', headChef.headChefId);
    console.log('   Status:', headChef.status);

    // Create a default restaurant
    const restaurant = new Restaurant({
      restaurantName: "My Restaurant",
      restaurantType: "Restaurant",
      location: {
        address: "123 Main St",
        city: "Your City",
        state: "Your State",
        zipCode: "12345",
        country: "United States"
      },
      headChefId: headChef._id,
      planType: "trial",
      billingCycle: "monthly",
      subscriptionStatus: "active",
      isActive: true
    });

    await restaurant.save();
    console.log('✅ Default restaurant created:', restaurant.restaurantName);

  } catch (error) {
    console.error('❌ Error creating head chef:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the script
createHeadChef();

