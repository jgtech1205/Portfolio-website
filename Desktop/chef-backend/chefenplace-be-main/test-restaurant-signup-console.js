// Restaurant Signup Test Script - Copy and paste this into browser console

async function testRestaurantSignup() {
  const BASE_URL = 'https://chef-app-backend.vercel.app';
  
  console.log('🔍 Testing restaurant signup process...\n');

  // Test data for restaurant signup
  const signupData = {
    restaurantName: "Test Restaurant",
    restaurantType: "Italian",
    location: {
      address: "123 Test Street",
      city: "Test City",
      state: "CA",
      zipCode: "12345",
      country: "United States"
    },
    headChefName: "Test Chef",
    headChefEmail: "testchef@example.com",
    headChefPassword: "testpassword123",
    planType: "trial",
    billingCycle: "monthly"
  };

  console.log('📋 Test signup data:', JSON.stringify(signupData, null, 2));

  // Test 1: Restaurant signup endpoint
  try {
    console.log('\n1️⃣ Testing restaurant signup endpoint...');
    console.log('URL:', `${BASE_URL}/api/restaurant/signup`);
    
    const signupResponse = await fetch(`${BASE_URL}/api/restaurant/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signupData)
    });
    
    console.log('Signup response status:', signupResponse.status);
    
    if (signupResponse.ok) {
      const data = await signupResponse.json();
      console.log('✅ Signup successful:', data);
      
      // If signup is successful, test the billing endpoint with the new token
      if (data.accessToken) {
        console.log('\n2️⃣ Testing billing endpoint with new account...');
        
        const billingResponse = await fetch(`${BASE_URL}/api/billing/subscription`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Billing response status:', billingResponse.status);
        
        if (billingResponse.ok) {
          const billingData = await billingResponse.json();
          console.log('✅ Billing endpoint response:', billingData);
        } else {
          const billingError = await billingResponse.json();
          console.log('❌ Billing endpoint error:', billingError);
        }
      }
    } else {
      const error = await signupResponse.json();
      console.log('❌ Signup failed:', error);
      
      // If it's a validation error, show the specific issues
      if (error.errors) {
        console.log('\n🔍 Validation errors:');
        error.errors.forEach((err, index) => {
          console.log(`   ${index + 1}. ${err.param}: ${err.msg}`);
        });
      }
    }
    
  } catch (error) {
    console.log('❌ Signup request failed:', error.message);
  }

  // Test 2: Try with minimal data to see what's required
  try {
    console.log('\n3️⃣ Testing with minimal data...');
    
    const minimalData = {
      restaurantName: "Minimal Restaurant",
      restaurantType: "Test",
      location: {
        address: "123 Test",
        city: "Test",
        state: "CA",
        zipCode: "12345"
      },
      headChefName: "Test",
      headChefEmail: "minimal@example.com",
      headChefPassword: "test123"
    };
    
    const minimalResponse = await fetch(`${BASE_URL}/api/restaurant/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalData)
    });
    
    console.log('Minimal signup response status:', minimalResponse.status);
    
    if (minimalResponse.ok) {
      const data = await minimalResponse.json();
      console.log('✅ Minimal signup successful:', data);
    } else {
      const error = await minimalResponse.json();
      console.log('❌ Minimal signup failed:', error);
    }
    
  } catch (error) {
    console.log('❌ Minimal signup request failed:', error.message);
  }

  // Test 3: Check what validation rules are being enforced
  try {
    console.log('\n4️⃣ Testing validation rules...');
    
    const invalidData = {
      // Missing required fields
      restaurantName: "",
      restaurantType: "",
      location: {},
      headChefName: "",
      headChefEmail: "invalid-email",
      headChefPassword: "123" // Too short
    };
    
    const validationResponse = await fetch(`${BASE_URL}/api/restaurant/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidData)
    });
    
    console.log('Validation test response status:', validationResponse.status);
    
    if (!validationResponse.ok) {
      const error = await validationResponse.json();
      console.log('❌ Validation test failed:', error);
    }
    
  } catch (error) {
    console.log('❌ Validation test request failed:', error.message);
  }

  console.log('\n🔍 Summary:');
  console.log('   - Check if the signup endpoint is working');
  console.log('   - Check what validation rules are enforced');
  console.log('   - Check if the restaurant gets created properly');
  console.log('   - Check if the billing endpoint works after signup');
}

// Run the test
testRestaurantSignup();
