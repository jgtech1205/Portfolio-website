// Test Fix Browser Script - Copy and paste this into browser console

async function testFix() {
  const BASE_URL = 'https://chef-app-backend.vercel.app';
  
  console.log('🧪 Testing the 500 error fix...\n');

  // Test data with unique email
  const testData = {
    planType: 'pro',
    billingCycle: 'monthly',
    restaurantName: 'Test Fix Restaurant',
    headChefEmail: `testfix${Date.now()}@example.com`,
    headChefName: 'John Smith', // This will be split into firstName: 'John', lastName: 'Smith'
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

  console.log('📋 Test data:', JSON.stringify(testData, null, 2));

  try {
    console.log('\n🚀 Testing Stripe checkout endpoint...');
    console.log('URL:', `${BASE_URL}/api/stripe/create-checkout-session`);
    
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    const endTime = Date.now();
    
    console.log('Response time:', endTime - startTime, 'ms');
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS! 500 error is fixed!');
      console.log('Response data:', data);
      
      if (data.url) {
        console.log('🔗 Stripe checkout URL:', data.url);
        console.log('💡 You can visit this URL to complete the payment flow');
      }
      
      if (data.sessionId) {
        console.log('🆔 Session ID:', data.sessionId);
      }
      
    } else {
      const errorData = await response.json();
      console.log('❌ Still getting an error:', errorData);
      
      if (errorData.code === 'EMAIL_EXISTS') {
        console.log('🔍 This is expected - the email already exists');
        console.log('   Try running this script again for a fresh test');
      } else if (errorData.code === 'CREATION_ERROR') {
        console.log('🔍 The 500 error is still happening');
        console.log('   This means the fix didn\'t work as expected');
      } else {
        console.log('🔍 New error type:', errorData.code);
      }
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n📊 Summary:');
  console.log('   - If you see "SUCCESS! 500 error is fixed!" above, the fix worked!');
  console.log('   - If you see "Still getting an error" with CREATION_ERROR, the fix didn\'t work');
  console.log('   - If you see EMAIL_EXISTS, that\'s expected - just run the script again');
}

// Run the test
testFix();
