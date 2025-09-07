// Browser Console Debug Script for Recipe Update - WITH REAL DATA
// Copy and paste this entire script into your browser's developer console

console.log('🔍 Recipe Update Debug Script with Real Data...');

// Configuration
const RECIPE_ID = '68b9caadcfb025720d1531d3'; // Your recipe ID
const BACKEND_URL = 'https://chef-app-backend.vercel.app';
const API_ENDPOINT = `${BACKEND_URL}/api/recipes/${RECIPE_ID}`;

// Function to get auth token
function getAuthToken() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.error('❌ No auth token found');
    return null;
  }
  console.log('✅ Auth token found');
  return token;
}

// Function to get current recipe data
async function getCurrentRecipe() {
  console.log('📖 Fetching current recipe data...');
  
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Current recipe data:', result);
      return result.data; // Return the actual recipe data
    } else {
      console.error('❌ Failed to get recipe:', response.status);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error fetching recipe:', error);
    return null;
  }
}

// Function to test update with REAL data from current recipe
async function testUpdateWithRealData() {
  console.log('🚀 Testing update with REAL recipe data...');
  
  // First, get the current recipe data
  const currentRecipe = await getCurrentRecipe();
  if (!currentRecipe) {
    console.error('❌ Cannot proceed without current recipe data');
    return;
  }
  
  console.log('📋 Using current recipe data:');
  console.log('  Current title:', currentRecipe.title);
  console.log('  Current panel:', currentRecipe.panel);
  console.log('  Current ingredients:', currentRecipe.ingredients);
  
  const token = getAuthToken();
  if (!token) return;
  
  // Create FormData with REAL data from current recipe
  const formData = new FormData();
  
  // Use current recipe data but modify title to show it's an update
  formData.append('title', currentRecipe.title + ' (Updated)');
  formData.append('panel', currentRecipe.panel); // Use REAL panel ID
  formData.append('method', currentRecipe.method || 'Updated cooking method');
  formData.append('chefNotes', currentRecipe.chefNotes || 'Updated chef notes');
  
  // Add ingredients in the correct format
  if (currentRecipe.ingredients && Array.isArray(currentRecipe.ingredients)) {
    currentRecipe.ingredients.forEach((ingredient, index) => {
      formData.append(`ingredients[${index}][name]`, ingredient.name || `Updated Ingredient ${index + 1}`);
    });
  } else {
    // Fallback if ingredients format is different
    formData.append('ingredients[0][name]', 'Updated Ingredient 1');
    formData.append('ingredients[1][name]', 'Updated Ingredient 2');
  }
  
  console.log('📝 FormData contents:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  try {
    console.log('📤 Sending PUT request with REAL data...');
    
    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });
    
    console.log('📥 Response received:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response Body (raw):', responseText);
    
    if (response.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('✅ SUCCESS! Recipe updated:', responseData);
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

// Function to test with minimal data
async function testMinimalUpdate() {
  console.log('🧪 Testing with minimal data...');
  
  const currentRecipe = await getCurrentRecipe();
  if (!currentRecipe) return;
  
  const token = getAuthToken();
  if (!token) return;
  
  // Test with just title and panel (minimal required fields)
  const formData = new FormData();
  formData.append('title', currentRecipe.title + ' (Minimal Test)');
  formData.append('panel', currentRecipe.panel);
  
  console.log('📝 Minimal FormData:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });
    
    console.log('Minimal test status:', response.status);
    const responseText = await response.text();
    console.log('Minimal test response:', responseText);
    
  } catch (error) {
    console.error('Minimal test error:', error);
  }
}

// Main execution
console.log('🎯 Available functions:');
console.log('  testUpdateWithRealData() - Test with real recipe data');
console.log('  testMinimalUpdate() - Test with minimal data');
console.log('  getCurrentRecipe() - Get current recipe data');

// Auto-run the test with real data
setTimeout(() => {
  console.log('\n🚀 Auto-running test with REAL data...');
  testUpdateWithRealData();
}, 1000);
