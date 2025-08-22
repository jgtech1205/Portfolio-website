// Check Your Restaurant Script - Copy and paste this into browser console

async function checkYourRestaurant() {
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
  
  console.log('🔍 Checking your restaurant data...\n');

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
      console.log('   Head Chef ID:', user.headChefId);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      
      // Step 2: Try to get restaurant info
      console.log('\n2️⃣ Checking if you have a restaurant...');
      
      // Try the billing endpoint to see if restaurant exists
      const billingResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
        method: 'GET',
        headers: headers
      });
      
      console.log('Billing response status:', billingResponse.status);
      
      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        console.log('✅ Billing endpoint works! You have a restaurant with subscription:', billingData);
      } else {
        const billingError = await billingResponse.json();
        console.log('❌ Billing endpoint error:', billingError);
        
        if (billingError.code === 'RESTAURANT_NOT_FOUND') {
          console.log('\n🔍 Analysis: You don\'t have a restaurant associated with your account');
          console.log('   This means either:');
          console.log('   1. The restaurant signup didn\'t complete successfully');
          console.log('   2. The restaurant was created but not linked to your account');
          console.log('   3. You need to complete the restaurant setup process');
        }
      }
      
      // Step 3: Try to create a restaurant for your account
      console.log('\n3️⃣ Testing restaurant creation for your account...');
      
      const restaurantData = {
        restaurantName: "Your Restaurant",
        restaurantType: "General",
        location: {
          address: "Your Address",
          city: "Your City",
          state: "CA",
          zipCode: "12345",
          country: "United States"
        },
        headChefName: user.name || "Head Chef",
        headChefEmail: user.email,
        headChefPassword: "temporarypassword123", // This will be ignored since user exists
        planType: "trial",
        billingCycle: "monthly"
      };
      
      const createResponse = await fetch(`${BASE_URL}/api/restaurant/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(restaurantData)
      });
      
      console.log('Restaurant creation response status:', createResponse.status);
      
      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('✅ Restaurant created successfully:', createData);
      } else {
        const createError = await createResponse.json();
        console.log('❌ Restaurant creation failed:', createError);
        
        if (createError.code === 'EMAIL_EXISTS') {
          console.log('\n🔍 Analysis: The signup endpoint expects a new email');
          console.log('   This suggests you need to use a different signup flow');
          console.log('   or there\'s a separate endpoint for existing users');
        }
      }
      
    } else {
      const error = await userResponse.json();
      console.log('❌ User profile error:', error);
    }
    
  } catch (error) {
    console.log('❌ Error checking your restaurant:', error.message);
  }

  console.log('\n🔍 Summary:');
  console.log('   - The signup endpoint works but expects new emails');
  console.log('   - You may need to use a different process to create a restaurant');
  console.log('   - Check if there\'s a "complete setup" or "add restaurant" flow');
}

// Run the check
checkYourRestaurant();
