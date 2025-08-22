// Check Payment Verification Script - Copy and paste this into browser console

async function checkPaymentVerification() {
  const BASE_URL = 'https://chef-app-backend.vercel.app';
  
  // Get your current token
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  
  if (!token) {
    console.log('❌ No token found - please log in first');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Checking payment verification status...\n');

  // Step 1: Get your user profile
  try {
    console.log('1️⃣ Getting your user profile...');
    const userResponse = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'GET',
      headers: headers
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ Your user profile:', userData);
      
      const user = userData.data;
      console.log('   User ID:', user._id);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Status:', user.status);
      
      // Step 2: Check if you have a restaurant
      console.log('\n2️⃣ Checking restaurant status...');
      const billingResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        method: 'GET',
        headers: headers
      });
      
      console.log('Billing response status:', billingResponse.status);
      
      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        console.log('✅ You have a restaurant with subscription:', billingData);
      } else {
        const billingError = await billingResponse.json();
        console.log('❌ No restaurant found:', billingError);
        
        if (billingError.code === 'RESTAURANT_NOT_FOUND') {
          console.log('\n🔍 Analysis: Restaurant not found after payment');
          console.log('   This suggests the payment verification process may not have completed');
          console.log('   or there was an issue during restaurant creation');
        }
      }
      
      // Step 3: Check if there are any Stripe sessions in your browser storage
      console.log('\n3️⃣ Checking for Stripe session data...');
      
      // Check localStorage and sessionStorage for any Stripe-related data
      const stripeKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('stripe') || key.includes('session') || key.includes('payment'))) {
          stripeKeys.push(key);
        }
      }
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('stripe') || key.includes('session') || key.includes('payment'))) {
          stripeKeys.push(key);
        }
      }
      
      if (stripeKeys.length > 0) {
        console.log('🔍 Found Stripe-related data in storage:', stripeKeys);
        stripeKeys.forEach(key => {
          const value = localStorage.getItem(key) || sessionStorage.getItem(key);
          console.log(`   ${key}:`, value);
        });
      } else {
        console.log('❌ No Stripe session data found in browser storage');
      }
      
      // Step 4: Check URL parameters for session_id
      console.log('\n4️⃣ Checking URL for session_id...');
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (sessionId) {
        console.log('✅ Found session_id in URL:', sessionId);
        console.log('   This suggests you completed a payment but verification may not have completed');
        
        // Try to verify the payment
        console.log('\n5️⃣ Attempting to verify payment...');
        const verifyResponse = await fetch(`${BASE_URL}/api/restaurant/stripe/verify-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ session_id: sessionId })
        });
        
        console.log('Payment verification response status:', verifyResponse.status);
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('✅ Payment verification successful:', verifyData);
        } else {
          const verifyError = await verifyResponse.json();
          console.log('❌ Payment verification failed:', verifyError);
        }
      } else {
        console.log('❌ No session_id found in URL');
      }
      
    } else {
      const error = await userResponse.json();
      console.log('❌ User profile error:', error);
    }
    
  } catch (error) {
    console.log('❌ Error checking payment verification:', error.message);
  }

  console.log('\n🔍 Summary:');
  console.log('   - If you completed payment but have no restaurant, verification may have failed');
  console.log('   - Check if you have a session_id in your URL or browser storage');
  console.log('   - Try completing the payment verification process');
  console.log('   - Contact support if payment was completed but restaurant not created');
}

// Run the check
checkPaymentVerification();
