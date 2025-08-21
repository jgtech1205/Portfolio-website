// Test script for verify-payment endpoint
const axios = require('axios');

const BASE_URL = 'http://localhost:3001'; // Adjust if needed

async function testVerifyPayment() {
  console.log('🧪 Testing verify-payment endpoint...\n');

  // Test 1: Test with a valid session ID (you'll need to replace this with a real one)
  console.log('📝 Test 1: Verify payment with session ID');
  
  // This is a mock test - you'll need to replace with a real session ID
  const sessionId = 'cs_test_your_session_id_here';
  
  try {
    const response = await axios.get(`${BASE_URL}/api/stripe/verify-payment?session_id=${sessionId}`);
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));
    
    // Check if restaurant data is included
    if (response.data.data?.restaurant) {
      console.log('✅ Restaurant data included in response');
      console.log('   Restaurant ID:', response.data.data.restaurant.id);
      console.log('   Restaurant Name:', response.data.data.restaurant.restaurantName);
      console.log('   Plan Type:', response.data.data.restaurant.planType);
    } else {
      console.log('❌ No restaurant data in response');
    }
    
    // Check if user data is included
    if (response.data.data?.user) {
      console.log('✅ User data included in response');
      console.log('   User ID:', response.data.data.user._id);
      console.log('   User Email:', response.data.data.user.email);
      console.log('   HeadChefId:', response.data.data.user.headChefId);
      console.log('   Restaurant ID in user:', response.data.data.user.restaurantId);
    } else {
      console.log('❌ No user data in response');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data || error.message);
  }

  console.log('\n🎉 Verify-payment endpoint testing complete!');
  console.log('\n💡 To test with a real session ID:');
  console.log('   1. Create a checkout session via /api/stripe/create-checkout-session');
  console.log('   2. Complete the payment in Stripe');
  console.log('   3. Use the session ID from the checkout to test this endpoint');
}

// Run the test
testVerifyPayment().catch(console.error);
