// Test script for the updated /api/auth/register endpoint
const axios = require('axios');

const BASE_URL = 'http://localhost:3001'; // Adjust if your server runs on a different port

async function testRegistration() {
  console.log('🧪 Testing updated registration endpoint...\n');

  // Test 1: New restaurant format
  console.log('📝 Test 1: New restaurant format');
  try {
    const newFormatResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      restaurantName: "Test Restaurant",
      restaurantType: "Italian",
      location: {
        address: "123 Test St",
        city: "Test City",
        state: "Test State",
        zipCode: "12345"
      },
      headChefName: "Test Chef",
      headChefEmail: `test-chef-${Date.now()}@example.com`,
      headChefPassword: "password123"
    });

    console.log('✅ New format success:', {
      status: newFormatResponse.status,
      hasUser: !!newFormatResponse.data.user,
      hasRestaurant: !!newFormatResponse.data.restaurant,
      restaurantName: newFormatResponse.data.restaurant?.restaurantName
    });
  } catch (error) {
    console.log('❌ New format failed:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Old format (backward compatibility)
  console.log('📝 Test 2: Old format (backward compatibility)');
  try {
    const oldFormatResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: `test-old-${Date.now()}@example.com`,
      password: "password123",
      name: "Old Format Chef",
      role: "head-chef"
    });

    console.log('✅ Old format success:', {
      status: oldFormatResponse.status,
      hasUser: !!oldFormatResponse.data.user,
      hasRestaurant: !!oldFormatResponse.data.restaurant
    });
  } catch (error) {
    console.log('❌ Old format failed:', error.response?.data || error.message);
  }

  console.log('\n🎉 Registration endpoint testing complete!');
}

// Run the test
testRegistration().catch(console.error);
