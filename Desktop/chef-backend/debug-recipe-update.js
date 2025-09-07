// Browser Console Debug Script for Recipe Update
// Copy and paste this entire script into your browser's developer console

console.log('🔍 Recipe Update Debug Script Starting...');

// Configuration - Update these values as needed
const RECIPE_ID = '68b9caadcfb025720d1531d3'; // Replace with your recipe ID
const BACKEND_URL = 'https://chef-app-backend.vercel.app'; // Your backend URL
const API_ENDPOINT = `${BACKEND_URL}/api/recipes/${RECIPE_ID}`;

// Test data - modify as needed
const testData = {
  title: 'Test Recipe Update',
  panel: 'your-panel-id-here', // Replace with actual panel ID
  method: 'Test cooking method for debugging',
  chefNotes: 'Debug test notes',
  'ingredients[0][name]': 'Test Ingredient 1',
  'ingredients[1][name]': 'Test Ingredient 2',
  'ingredients[2][name]': 'Test Ingredient 3'
};

// Function to get auth token from localStorage
function getAuthToken() {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt');
  if (!token) {
    console.error('❌ No auth token found in localStorage');
    console.log('Available localStorage keys:', Object.keys(localStorage));
    return null;
  }
  console.log('✅ Auth token found:', token.substring(0, 20) + '...');
  return token;
}

// Function to create FormData
function createFormData(data) {
  const formData = new FormData();
  
  console.log('📝 Creating FormData with:');
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
    console.log(`  ${key}: ${value}`);
  });
  
  return formData;
}

// Function to test the endpoint
async function testRecipeUpdate() {
  console.log('🚀 Testing Recipe Update Endpoint...');
  console.log('Endpoint:', API_ENDPOINT);
  
  const token = getAuthToken();
  if (!token) {
    console.error('❌ Cannot proceed without auth token');
    return;
  }
  
  const formData = createFormData(testData);
  
  try {
    console.log('📤 Sending PUT request...');
    
    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      body: formData
    });
    
    console.log('📥 Response received:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response Body (raw):', responseText);
    
    if (response.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('✅ Success! Response data:', responseData);
      } catch (e) {
        console.log('⚠️ Response is not valid JSON');
      }
    } else {
      console.error('❌ Request failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Error response is not JSON');
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Function to test with different data formats
async function testDifferentFormats() {
  console.log('🧪 Testing different data formats...');
  
  const token = getAuthToken();
  if (!token) return;
  
  // Test 1: JSON format
  console.log('\n--- Test 1: JSON Format ---');
  try {
    const jsonData = {
      title: 'JSON Test Recipe',
      panel: 'your-panel-id-here',
      method: 'JSON test method',
      ingredients: [
        { name: 'JSON Ingredient 1' },
        { name: 'JSON Ingredient 2' }
      ]
    };
    
    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonData)
    });
    
    console.log('JSON Test Status:', response.status);
    const responseText = await response.text();
    console.log('JSON Test Response:', responseText);
    
  } catch (error) {
    console.error('JSON Test Error:', error);
  }
  
  // Test 2: URL-encoded format
  console.log('\n--- Test 2: URL-Encoded Format ---');
  try {
    const urlEncodedData = new URLSearchParams({
      title: 'URL Test Recipe',
      panel: 'your-panel-id-here',
      method: 'URL test method',
      'ingredients[0][name]': 'URL Ingredient 1',
      'ingredients[1][name]': 'URL Ingredient 2'
    });
    
    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: urlEncodedData
    });
    
    console.log('URL Test Status:', response.status);
    const responseText = await response.text();
    console.log('URL Test Response:', responseText);
    
  } catch (error) {
    console.error('URL Test Error:', error);
  }
}

// Function to check current recipe data
async function getCurrentRecipe() {
  console.log('📖 Fetching current recipe data...');
  
  const token = getAuthToken();
  if (!token) return;
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('GET Status:', response.status);
    
    if (response.ok) {
      const recipeData = await response.json();
      console.log('✅ Current recipe data:', recipeData);
      return recipeData;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to get recipe:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error fetching recipe:', error);
  }
}

// Main execution
console.log('🎯 Available functions:');
console.log('  testRecipeUpdate() - Test the main update endpoint');
console.log('  testDifferentFormats() - Test different data formats');
console.log('  getCurrentRecipe() - Get current recipe data');
console.log('  getAuthToken() - Check auth token');

// Auto-run the main test
console.log('\n🚀 Auto-running main test...');
testRecipeUpdate();

// Also get current recipe for reference
setTimeout(() => {
  console.log('\n📖 Getting current recipe for reference...');
  getCurrentRecipe();
}, 1000);
