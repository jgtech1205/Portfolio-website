// Fix Production Organization Index Script
// This script drops the problematic organizationId index in the production database

const mongoose = require('mongoose');

// Production MongoDB URI
const MONGODB_URI = "mongodb+srv://ray:raytech@cluster0.u2chhqk.mongodb.net/chef-en-place";

async function fixProductionIndex() {
  console.log('🔧 Fixing organizationId index in PRODUCTION database...\n');

  try {
    // Connect to production database
    console.log('1️⃣ Connecting to production database...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to production database');

    // Get the database instance
    const db = mongoose.connection.db;
    
    // List all indexes on the restaurants collection
    console.log('\n2️⃣ Checking current indexes on restaurants collection...');
    const indexes = await db.collection('restaurants').indexes();
    
    console.log('📋 Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}:`, index.key);
    });

    // Check if the problematic index exists
    const organizationIndex = indexes.find(index => 
      index.name === 'organizationId_1' || 
      Object.keys(index.key).includes('organizationId')
    );

    if (organizationIndex) {
      console.log('\n3️⃣ Found problematic organizationId index:', organizationIndex.name);
      console.log('   Index key:', organizationIndex.key);
      
      // Drop the problematic index
      console.log('\n4️⃣ Dropping organizationId index from PRODUCTION...');
      await db.collection('restaurants').dropIndex(organizationIndex.name);
      console.log('✅ organizationId index dropped successfully from production');
      
      // Verify the index was dropped
      console.log('\n5️⃣ Verifying index was dropped...');
      const updatedIndexes = await db.collection('restaurants').indexes();
      const stillExists = updatedIndexes.find(index => 
        index.name === organizationIndex.name || 
        Object.keys(index.key).includes('organizationId')
      );
      
      if (!stillExists) {
        console.log('✅ organizationId index successfully removed from production');
      } else {
        console.log('❌ organizationId index still exists in production');
      }
      
    } else {
      console.log('\n3️⃣ No organizationId index found in production');
      console.log('   The issue might be elsewhere');
    }

    // Show final index list
    console.log('\n6️⃣ Final index list in production:');
    const finalIndexes = await db.collection('restaurants').indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}:`, index.key);
    });

    console.log('\n🎉 Production index fix completed!');
    console.log('   The 500 error should now be resolved in production.');
    console.log('   Try the restaurant signup again.');

  } catch (error) {
    console.error('❌ Error fixing production organization index:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from production database');
  }
}

// Run the production fix
fixProductionIndex();
