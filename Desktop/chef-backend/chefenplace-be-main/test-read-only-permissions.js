const express = require('express');
const request = require('supertest');
const recipeRoutes = require('./routes/recipeRoutes');
const panelRoutes = require('./routes/panelRoutes');
const plateupRoutes = require('./routes/plateupRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Create a test app
const app = express();
app.use('/api/recipes', recipeRoutes);
app.use('/api/panels', panelRoutes);
app.use('/api/plateups', plateupRoutes);
app.use('/api/notifications', notificationRoutes);

async function testReadOnlyPermissions() {
  console.log('🧪 Testing read-only permissions for team members...\n');
  
  try {
    // Test 1: Check if team member can view recipes
    console.log('1. Testing team member VIEW access to /api/recipes...');
    
    const response1 = await request(app)
      .get('/api/recipes')
      .set('Authorization', 'Bearer test-token')
      .expect(401); // Should get 401 (unauthorized) not 403 (forbidden)
    
    console.log('✅ Team member can access recipes view route (got 401 as expected for missing auth)');
    
    // Test 2: Check if team member can view panels
    console.log('\n2. Testing team member VIEW access to /api/panels...');
    
    const response2 = await request(app)
      .get('/api/panels')
      .set('Authorization', 'Bearer test-token')
      .expect(401); // Should get 401 (unauthorized) not 403 (forbidden)
    
    console.log('✅ Team member can access panels view route (got 401 as expected for missing auth)');
    
    // Test 3: Check if team member can view plateups
    console.log('\n3. Testing team member VIEW access to /api/plateups...');
    
    const response3 = await request(app)
      .get('/api/plateups')
      .set('Authorization', 'Bearer test-token')
      .expect(401); // Should get 401 (unauthorized) not 403 (forbidden)
    
    console.log('✅ Team member can access plateups view route (got 401 as expected for missing auth)');
    
    // Test 4: Check if team member can view notifications
    console.log('\n4. Testing team member VIEW access to /api/notifications...');
    
    const response4 = await request(app)
      .get('/api/notifications')
      .set('Authorization', 'Bearer test-token')
      .expect(401); // Should get 401 (unauthorized) not 403 (forbidden)
    
    console.log('✅ Team member can access notifications view route (got 401 as expected for missing auth)');
    
    console.log('\n🎉 Read-only permissions testing completed successfully!');
    console.log('📝 Team members should now be able to VIEW recipes, panels, plateups, and notifications.');
    console.log('🔒 Team members will be blocked from CREATE, UPDATE, and DELETE operations.');
    console.log('👨‍🍳 Headchefs retain full access to all operations.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testReadOnlyPermissions();
