// Test Stripe Endpoint Script
const axios = require('axios');

async function testStripeEndpoint() {
  const BASE_URL = 'https://chef-app-backend.vercel.app';
  
  console.log('🔍 Testing Stripe checkout endpoint...');

  const testData = {
    planType: 'pro',
    billingCycle: 'monthly',
    restaurantName: 'Test Restaurant',
    headChefEmail: 'test@example.com',
    headChefName: 'Test Chef',
    headChefPassword: 'testpassword123',
    restaurantType: 'restaurant',
    location: {
      address: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345',
      country: 'US'
    },
    success_url: 'https://chef-frontend-psi.vercel.app/payment-success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://chef-frontend-psi.vercel.app/register'
  };

  try {
    console.log('📋 Test data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/stripe/create-checkout-session`, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:', response.status);
    console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status);
    console.log('📄 Error response:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.details) {
      console.log('🔍 Error details:', error.response.data.details);
    }
  }
}

testStripeEndpoint();
