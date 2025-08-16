const fetch = require('node-fetch');

const BASE_URL = 'https://chef-app-backend.vercel.app'; // Updated to production URL
const FRONTEND_ORIGIN = 'https://chef-frontend-psi.vercel.app';

async function testCORS() {
  console.log('🧪 Testing CORS configuration...\n');

  // Test 1: Health check (should work)
  try {
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   CORS Headers: ${healthResponse.headers.get('access-control-allow-origin') || 'None'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Stripe test endpoint with CORS headers
  try {
    console.log('\n2. Testing Stripe test endpoint...');
    const stripeResponse = await fetch(`${BASE_URL}/api/stripe/test`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${stripeResponse.status}`);
    console.log(`   CORS Headers: ${stripeResponse.headers.get('access-control-allow-origin') || 'None'}`);
    
    if (stripeResponse.ok) {
      const data = await stripeResponse.json();
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: OPTIONS preflight request
  try {
    console.log('\n3. Testing OPTIONS preflight...');
    const optionsResponse = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    console.log(`   Status: ${optionsResponse.status}`);
    console.log(`   CORS Headers: ${optionsResponse.headers.get('access-control-allow-origin') || 'None'}`);
    console.log(`   Allow Methods: ${optionsResponse.headers.get('access-control-allow-methods') || 'None'}`);
    console.log(`   Allow Headers: ${optionsResponse.headers.get('access-control-allow-headers') || 'None'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 4: POST request to Stripe endpoint
  try {
    console.log('\n4. Testing POST to Stripe endpoint...');
    const postResponse = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        planType: 'pro',
        billingCycle: 'monthly',
        restaurantName: 'Test Restaurant',
        headChefEmail: 'test@example.com',
        headChefName: 'Test Chef',
        headChefPassword: 'password123',
        restaurantType: 'Italian',
        location: { address: '123 Test St', city: 'Test City', state: 'TS', zipCode: '12345', country: 'US' }
      })
    });
    console.log(`   Status: ${postResponse.status}`);
    console.log(`   CORS Headers: ${postResponse.headers.get('access-control-allow-origin') || 'None'}`);
    
    if (!postResponse.ok) {
      const errorData = await postResponse.text();
      console.log(`   Error Response: ${errorData}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n✅ CORS testing completed!');
}

// Run the test
testCORS().catch(console.error);
