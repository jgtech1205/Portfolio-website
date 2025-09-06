const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ray:raytech@cluster0.u2chhqk.mongodb.net/chef-en-place";

console.log('🔧 Migrating data for multi-restaurant isolation...\n');

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../database/models/User');
const Recipe = require('../database/models/Recipe');
const Panel = require('../database/models/Panel');
const Plateup = require('../database/models/plateup');
const Notification = require('../database/models/Notification');

async function migrateOrganizationIsolation() {
  try {
    console.log('🔍 Starting organization isolation migration...\n');
    
    // Get the main head chef ID (the one we've been using)
    const mainHeadChefId = '687851455644fcb16f2fa339';
    
    console.log(`🎯 Using headChefId: ${mainHeadChefId}\n`);
    
    // 1. Update Recipes
    console.log('📝 Updating Recipes...');
    const recipeResult = await Recipe.updateMany(
      { headChefId: { $exists: false } },
      { $set: { headChefId: mainHeadChefId } }
    );
    console.log(`   ✅ Updated ${recipeResult.modifiedCount} recipes`);
    
    // 2. Update Panels
    console.log('📋 Updating Panels...');
    const panelResult = await Panel.updateMany(
      { headChefId: { $exists: false } },
      { $set: { headChefId: mainHeadChefId } }
    );
    console.log(`   ✅ Updated ${panelResult.modifiedCount} panels`);
    
    // 3. Update Plateups
    console.log('🍽️  Updating Plateups...');
    const plateupResult = await Plateup.updateMany(
      { headChefId: { $exists: false } },
      { $set: { headChefId: mainHeadChefId } }
    );
    console.log(`   ✅ Updated ${plateupResult.modifiedCount} plateups`);
    
    // 4. Update Notifications
    console.log('🔔 Updating Notifications...');
    const notificationResult = await Notification.updateMany(
      { headChefId: { $exists: false } },
      { $set: { headChefId: mainHeadChefId } }
    );
    console.log(`   ✅ Updated ${notificationResult.modifiedCount} notifications`);
    
    // 5. Verify the migration
    console.log('\n🔍 Verifying migration...');
    
    const recipeCount = await Recipe.countDocuments({ headChefId: mainHeadChefId });
    const panelCount = await Panel.countDocuments({ headChefId: mainHeadChefId });
    const plateupCount = await Plateup.countDocuments({ headChefId: mainHeadChefId });
    const notificationCount = await Notification.countDocuments({ headChefId: mainHeadChefId });
    
    console.log(`📊 Migration Summary:`);
    console.log(`   Recipes with headChefId: ${recipeCount}`);
    console.log(`   Panels with headChefId: ${panelCount}`);
    console.log(`   Plateups with headChefId: ${plateupCount}`);
    console.log(`   Notifications with headChefId: ${notificationCount}`);
    
    console.log('\n🎉 Organization isolation migration completed successfully!');
    console.log('\n✅ Your system is now ready for multiple restaurants!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    mongoose.connection.close();
  }
}

migrateOrganizationIsolation();
