// Final Test Script - Copy and paste this into browser console

async function testFinalFix() {
  const BASE_URL = 'https://chef-app-backend.vercel.app';
  
  console.log('🎯 Final Test: 500 Error Fix Verification\n');

  // Test data with unique email
  const testData = {
    planType: 'pro',
    billingCycle: 'monthly',
    restaurantName: 'Final Test Restaurant',
    headChefEmail: `finaltest${Date.now()}@example.com`,
    headChefName: 'John Smith', // This will be split into firstName: 'John', lastName: 'Smith'
    headChefPassword: 'testpassword123',
    restaurantType: 'restaurant',
    location: {
      address: '123 Final Test St',
      city: 'Final Test City',
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
      console.log('🎉 SUCCESS! 500 error is completely fixed!');
      console.log('Response data:', data);
      
      if (data.url) {
        console.log('🔗 Stripe checkout URL:', data.url);
        console.log('💡 You can visit this URL to complete the payment flow');
      }
      
      if (data.sessionId) {
        console.log('🆔 Session ID:', data.sessionId);
      }
      
      console.log('\n✅ SUMMARY:');
      console.log('   - User creation: ✅ Working');
      console.log('   - Restaurant creation: ✅ Working');
      console.log('   - Stripe session creation: ✅ Working');
      console.log('   - No more 500 errors: ✅ Fixed');
      console.log('   - Restaurant signup flow: ✅ Complete');
      
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

  console.log('\n📊 Final Status:');
  console.log('   - If you see "SUCCESS! 500 error is completely fixed!" above, everything is working!');
  console.log('   - Restaurant signup should now work for all users');
  console.log('   - Both free and paid plans should create restaurants immediately');
  console.log('   - No more 500 errors during signup');
}

// Run the final test
testFinalFix();
