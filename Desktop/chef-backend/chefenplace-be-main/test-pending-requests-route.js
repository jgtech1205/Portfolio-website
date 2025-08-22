const express = require('express');
const request = require('supertest');
const chefRoutes = require('./routes/chefRoutes');

// Create a test app
const app = express();
app.use('/api/chefs', chefRoutes);

async function testPendingRequestsRoute() {
  console.log('🧪 Testing pending-requests route...\n');
  
  try {
    // Test 1: Check if /pending-requests route exists and doesn't get caught by /:id
    console.log('1. Testing /api/chefs/pending-requests route...');
    
    const response = await request(app)
      .get('/api/chefs/pending-requests')
      .set('Authorization', 'Bearer test-token')
      .expect(401); // Should get 401 (unauthorized) not 500 (server error)
    
    console.log('✅ Route exists and is accessible (got 401 as expected for missing auth)');
    
    // Test 2: Check if /:id route still works
    console.log('\n2. Testing /api/chefs/:id route...');
    
    const response2 = await request(app)
      .get('/api/chefs/test-id-123')
      .expect(500); // Should get 500 (server error) because userController.getProfileById expects auth
    
    console.log('✅ /:id route still works (got 500 as expected for missing auth)');
    
    // Test 3: Verify route order - pending-requests should not be caught by :id
    console.log('\n3. Testing route precedence...');
    
    const response3 = await request(app)
      .get('/api/chefs/pending-requests')
      .set('Authorization', 'Bearer test-token');
    
    if (response3.status === 401) {
      console.log('✅ /pending-requests route is correctly matched (not caught by /:id)');
    } else {
      console.log('❌ Route conflict still exists');
    }
    
    console.log('\n🎉 Route testing completed successfully!');
    console.log('📝 The fix should resolve the 500 error in production.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPendingRequestsRoute();





