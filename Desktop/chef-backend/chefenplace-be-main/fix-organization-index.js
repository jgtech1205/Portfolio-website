// Fix Organization Index Script
// This script drops the problematic organizationId index that's causing duplicate key errors

const { ensureConnection } = require('./database/connection');

async function fixOrganizationIndex() {
  console.log('🔧 Fixing organizationId index issue...\n');

  try {
    // Connect to database
    console.log('1️⃣ Connecting to database...');
    await ensureConnection();
    console.log('✅ Database connected');

    // Get the database instance
    const db = require('mongoose').connection.db;
    
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
      console.log('\n4️⃣ Dropping organizationId index...');
      await db.collection('restaurants').dropIndex(organizationIndex.name);
      console.log('✅ organizationId index dropped successfully');
      
      // Verify the index was dropped
      console.log('\n5️⃣ Verifying index was dropped...');
      const updatedIndexes = await db.collection('restaurants').indexes();
      const stillExists = updatedIndexes.find(index => 
        index.name === organizationIndex.name || 
        Object.keys(index.key).includes('organizationId')
      );
      
      if (!stillExists) {
        console.log('✅ organizationId index successfully removed');
      } else {
        console.log('❌ organizationId index still exists');
      }
      
    } else {
      console.log('\n3️⃣ No organizationId index found');
      console.log('   The issue might be elsewhere');
    }

    // Show final index list
    console.log('\n6️⃣ Final index list:');
    const finalIndexes = await db.collection('restaurants').indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}:`, index.key);
    });

    console.log('\n🎉 Index fix completed!');
    console.log('   The 500 error should now be resolved.');
    console.log('   Try the restaurant signup again.');

  } catch (error) {
    console.error('❌ Error fixing organization index:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
  }
}

// Run the fix
fixOrganizationIndex();
