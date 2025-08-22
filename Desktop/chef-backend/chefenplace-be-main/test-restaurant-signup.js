const axios = require('axios');

// Test configuration
const BASE_URL = 'https://chef-app-backend.vercel.app';

async function testRestaurantSignup() {
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
    
    const signupResponse = await axios.post(`${BASE_URL}/api/restaurant/signup`, signupData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Signup successful:', signupResponse.status);
    console.log('📄 Response:', JSON.stringify(signupResponse.data, null, 2));
    
    // If signup is successful, test the billing endpoint with the new token
    if (signupResponse.data.accessToken) {
      console.log('\n2️⃣ Testing billing endpoint with new account...');
      
      const billingResponse = await axios.get(`${BASE_URL}/api/billing/subscription`, {
        headers: {
          'Authorization': `Bearer ${signupResponse.data.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Billing endpoint response:', billingResponse.status);
      console.log('📄 Billing response:', JSON.stringify(billingResponse.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Signup failed:', error.response?.status);
    console.log('📄 Error response:', JSON.stringify(error.response?.data, null, 2));
    
    // If it's a validation error, show the specific issues
    if (error.response?.data?.errors) {
      console.log('\n🔍 Validation errors:');
      error.response.data.errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err.param}: ${err.msg}`);
      });
    }
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
    
    const minimalResponse = await axios.post(`${BASE_URL}/api/restaurant/signup`, minimalData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Minimal signup successful:', minimalResponse.status);
    console.log('📄 Response:', JSON.stringify(minimalResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ Minimal signup failed:', error.response?.status);
    console.log('📄 Error response:', JSON.stringify(error.response?.data, null, 2));
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
    
    const validationResponse = await axios.post(`${BASE_URL}/api/restaurant/signup`, invalidData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Validation test response:', validationResponse.status);
    
  } catch (error) {
    console.log('❌ Validation test failed:', error.response?.status);
    console.log('📄 Validation errors:', JSON.stringify(error.response?.data, null, 2));
  }

  console.log('\n🔍 Summary:');
  console.log('   - Check if the signup endpoint is working');
  console.log('   - Check what validation rules are enforced');
  console.log('   - Check if the restaurant gets created properly');
  console.log('   - Check if the billing endpoint works after signup');
}

testRestaurantSignup().catch(console.error);
