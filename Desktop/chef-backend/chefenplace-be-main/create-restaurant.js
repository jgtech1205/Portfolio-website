// Script to create a restaurant for the existing head chef
const mongoose = require('mongoose');
const Restaurant = require('./database/models/Restaurant');
require('dotenv').config();

async function createRestaurant() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Your head chef's ID from the console
    const headChefId = '68a4dd4a0310aa85d34c9c91';

    // Check if restaurant already exists
    const existingRestaurant = await Restaurant.findOne({ headChefId });
    if (existingRestaurant) {
      console.log('✅ Restaurant already exists:', existingRestaurant.restaurantName);
      return;
    }

    // Create new restaurant
    const restaurant = new Restaurant({
      restaurantName: "Your Restaurant",
      restaurantType: "Restaurant",
      location: {
        address: "123 Main St",
        city: "Your City",
        state: "Your State",
        zipCode: "12345",
        country: "United States"
      },
      headChefId: headChefId,
      planType: "trial",
      billingCycle: "monthly",
      subscriptionStatus: "active",
      isActive: true
    });

    await restaurant.save();
    console.log('✅ Restaurant created successfully:', restaurant.restaurantName);
    console.log('✅ Restaurant ID:', restaurant._id);

  } catch (error) {
    console.error('❌ Error creating restaurant:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the script
createRestaurant();
