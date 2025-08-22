const axios = require('axios');

// Configuration
const API_BASE = 'https://chef-app-backend.vercel.app/api';
const TEST_EMAIL = 'testheadcdfgahef@kitchen.com@example.com'; // Replace with actual test head chef email
const TEST_PASSWORD = 'Bball12!'; // Replace with actual test password

// Test data
let accessToken = null;
let headChefId = null;

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code
    });
    return null;
  }
};

// Test functions
const testLogin = async () => {
  console.log('🔐 Testing login...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (response.data.success) {
      accessToken = response.data.accessToken;
      headChefId = response.data.user.headChefId;
      console.log('✅ Login successful');
      console.log('   Head Chef ID:', headChefId);
      console.log('   Token length:', accessToken?.length);
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
};

const testGetSubscription = async () => {
  console.log('\n📋 Testing GET /api/billing/subscription...');
  
  const result = await makeAuthenticatedRequest('GET', '/billing/subscription');
  
  if (result) {
    console.log('✅ Subscription details retrieved:');
    console.log('   Subscription ID:', result.subscription?.id);
    console.log('   Status:', result.subscription?.status);
    console.log('   Plan:', result.subscription?.plan?.name);
    console.log('   Price:', `$${result.subscription?.plan?.price}/${result.subscription?.plan?.interval}`);
    console.log('   Current period end:', result.subscription?.current_period_end);
  } else {
    console.log('❌ Failed to get subscription details');
  }
};

const testGetInvoices = async () => {
  console.log('\n🧾 Testing GET /api/billing/invoices...');
  
  const result = await makeAuthenticatedRequest('GET', '/billing/invoices?limit=5');
  
  if (result) {
    console.log('✅ Invoices retrieved:');
    console.log('   Total invoices:', result.total_count);
    console.log('   Retrieved:', result.invoices?.length);
    console.log('   Has more:', result.has_more);
    
    if (result.invoices && result.invoices.length > 0) {
      const latestInvoice = result.invoices[0];
      console.log('   Latest invoice:');
      console.log('     ID:', latestInvoice.id);
      console.log('     Amount:', `$${latestInvoice.amount_paid}`);
      console.log('     Status:', latestInvoice.status);
      console.log('     Date:', latestInvoice.created);
    }
  } else {
    console.log('❌ Failed to get invoices');
  }
};

const testGetPaymentMethods = async () => {
  console.log('\n💳 Testing GET /api/billing/payment-methods...');
  
  const result = await makeAuthenticatedRequest('GET', '/billing/payment-methods');
  
  if (result) {
    console.log('✅ Payment methods retrieved:');
    console.log('   Total methods:', result.payment_methods?.length);
    
    if (result.payment_methods && result.payment_methods.length > 0) {
      result.payment_methods.forEach((pm, index) => {
        console.log(`   Method ${index + 1}:`);
        console.log('     ID:', pm.id);
        console.log('     Type:', pm.type);
        if (pm.card) {
          console.log('     Card:', `${pm.card.brand} ****${pm.card.last4}`);
          console.log('     Expires:', `${pm.card.exp_month}/${pm.card.exp_year}`);
        }
      });
    } else {
      console.log('   No payment methods found');
    }
  } else {
    console.log('❌ Failed to get payment methods');
  }
};

const testCreatePortalSession = async () => {
  console.log('\n🚪 Testing POST /api/billing/portal-session...');
  
  const result = await makeAuthenticatedRequest('POST', '/billing/portal-session', {
    return_url: 'https://chef-frontend-psi.vercel.app/dashboard'
  });
  
  if (result) {
    console.log('✅ Portal session created:');
    console.log('   URL:', result.url);
    console.log('   URL length:', result.url?.length);
  } else {
    console.log('❌ Failed to create portal session');
  }
};

// Main test function
const runTests = async () => {
  console.log('🧪 Testing Billing Endpoints');
  console.log('============================');
  console.log('API Base:', API_BASE);
  console.log('Test Email:', TEST_EMAIL);
  
  // Step 1: Login to get access token
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without successful login');
    return;
  }
  
  // Step 2: Test all billing endpoints
  await testGetSubscription();
  await testGetInvoices();
  await testGetPaymentMethods();
  await testCreatePortalSession();
  
  console.log('\n✅ Billing endpoint tests completed!');
};

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error.message);
});
