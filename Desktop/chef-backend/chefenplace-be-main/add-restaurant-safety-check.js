// Restaurant Safety Check Middleware
// This middleware ensures all head chef users have restaurants

const Restaurant = require('./database/models/Restaurant');

/**
 * Middleware to ensure head chef users have restaurants
 * This can be added to routes that require restaurant access
 */
async function ensureHeadChefHasRestaurant(req, res, next) {
  try {
    // Only check for head chefs
    if (req.user && req.user.role === 'head-chef') {
      const restaurant = await Restaurant.findOne({ headChefId: req.user._id });
      
      if (!restaurant) {
        console.log(`⚠️ Head chef ${req.user.email} missing restaurant - creating one...`);
        
        // Create a default restaurant for the head chef
        const newRestaurant = new Restaurant({
          restaurantName: `${req.user.firstName || 'Head Chef'}'s Restaurant`,
          restaurantType: 'restaurant',
          location: {
            address: 'Default Address',
            city: 'Default City',
            state: 'CA',
            zipCode: '12345',
            country: 'US'
          },
          headChefId: req.user._id,
          planType: 'trial',
          billingCycle: 'monthly',
          subscriptionStatus: 'active',
          isActive: true
        });

        await newRestaurant.save();
        console.log(`✅ Created restaurant for ${req.user.email}: ${newRestaurant.restaurantName}`);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in restaurant safety check:', error);
    next(); // Continue anyway to avoid blocking the request
  }
}

/**
 * Function to check and fix all head chefs without restaurants
 * Can be called periodically or on startup
 */
async function checkAndFixAllHeadChefs() {
  try {
    const User = require('./database/models/User');
    
    console.log('🔍 Checking all head chefs for missing restaurants...');
    
    const headChefs = await User.find({ role: 'head-chef' });
    let fixed = 0;
    
    for (const headChef of headChefs) {
      const restaurant = await Restaurant.findOne({ headChefId: headChef._id });
      
      if (!restaurant) {
        console.log(`⚠️ Head chef ${headChef.email} missing restaurant - creating one...`);
        
        const newRestaurant = new Restaurant({
          restaurantName: `${headChef.firstName || 'Head Chef'}'s Restaurant`,
          restaurantType: 'restaurant',
          location: {
            address: 'Default Address',
            city: 'Default City',
            state: 'CA',
            zipCode: '12345',
            country: 'US'
          },
          headChefId: headChef._id,
          planType: 'trial',
          billingCycle: 'monthly',
          subscriptionStatus: 'active',
          isActive: true
        });

        await newRestaurant.save();
        fixed++;
        console.log(`✅ Created restaurant for ${headChef.email}`);
      }
    }
    
    if (fixed > 0) {
      console.log(`🎉 Fixed ${fixed} head chefs without restaurants`);
    } else {
      console.log('✅ All head chefs have restaurants');
    }
    
  } catch (error) {
    console.error('❌ Error checking head chefs:', error);
  }
}

module.exports = {
  ensureHeadChefHasRestaurant,
  checkAndFixAllHeadChefs
};
