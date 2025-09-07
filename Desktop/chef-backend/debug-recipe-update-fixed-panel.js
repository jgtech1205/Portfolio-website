// Browser Console Debug Script for Recipe Update - FIXED PANEL ISSUE
// Copy and paste this entire script into your browser's developer console

console.log('🔍 Recipe Update Debug Script - FIXED PANEL ISSUE...');

// Configuration
const RECIPE_ID = '68b9caadcfb025720d1531d3';
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
      return result.data;
    } else {
      console.error('❌ Failed to get recipe:', response.status);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error fetching recipe:', error);
    return null;
  }
}

// Function to test update with FIXED panel ID
async function testUpdateWithFixedPanel() {
  console.log('🚀 Testing update with FIXED panel ID...');
  
  const currentRecipe = await getCurrentRecipe();
  if (!currentRecipe) {
    console.error('❌ Cannot proceed without current recipe data');
    return;
  }
  
  console.log('📋 Current recipe data:');
  console.log('  Title:', currentRecipe.title);
  console.log('  Panel object:', currentRecipe.panel);
  
  // FIX: Extract the panel ID from the panel object
  let panelId;
  if (typeof currentRecipe.panel === 'object' && currentRecipe.panel._id) {
    panelId = currentRecipe.panel._id;
    console.log('✅ Extracted panel ID:', panelId);
  } else if (typeof currentRecipe.panel === 'string') {
    panelId = currentRecipe.panel;
    console.log('✅ Panel ID is already a string:', panelId);
  } else {
    console.error('❌ Cannot determine panel ID from:', currentRecipe.panel);
    return;
  }
  
  const token = getAuthToken();
  if (!token) return;
  
  // Create FormData with FIXED panel ID
  const formData = new FormData();
  
  formData.append('title', currentRecipe.title + ' (Fixed Panel Test)');
  formData.append('panel', panelId); // FIXED: Use string ID instead of object
  formData.append('method', currentRecipe.method || 'Fixed cooking method');
  formData.append('chefNotes', currentRecipe.chefNotes || 'Fixed chef notes');
  
  // Add ingredients in the correct format
  if (currentRecipe.ingredients && Array.isArray(currentRecipe.ingredients)) {
    currentRecipe.ingredients.forEach((ingredient, index) => {
      formData.append(`ingredients[${index}][name]`, ingredient.name || `Fixed Ingredient ${index + 1}`);
    });
  } else {
    formData.append('ingredients[0][name]', 'Fixed Ingredient 1');
    formData.append('ingredients[1][name]', 'Fixed Ingredient 2');
  }
  
  console.log('📝 FormData contents (FIXED):');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  try {
    console.log('📤 Sending PUT request with FIXED panel ID...');
    
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
        console.log('✅ SUCCESS! Recipe updated with fixed panel ID:', responseData);
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

// Function to test with just title and panel (minimal test)
async function testMinimalWithFixedPanel() {
  console.log('🧪 Testing minimal update with FIXED panel ID...');
  
  const currentRecipe = await getCurrentRecipe();
  if (!currentRecipe) return;
  
  // Extract panel ID
  let panelId;
  if (typeof currentRecipe.panel === 'object' && currentRecipe.panel._id) {
    panelId = currentRecipe.panel._id;
  } else {
    panelId = currentRecipe.panel;
  }
  
  const token = getAuthToken();
  if (!token) return;
  
  const formData = new FormData();
  formData.append('title', currentRecipe.title + ' (Minimal Fixed)');
  formData.append('panel', panelId); // FIXED: Use string ID
  
  console.log('📝 Minimal FormData (FIXED):');
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
console.log('  testUpdateWithFixedPanel() - Test with fixed panel ID');
console.log('  testMinimalWithFixedPanel() - Test minimal with fixed panel ID');
console.log('  getCurrentRecipe() - Get current recipe data');

// Auto-run the fixed test
setTimeout(() => {
  console.log('\n🚀 Auto-running test with FIXED panel ID...');
  testUpdateWithFixedPanel();
}, 1000);
