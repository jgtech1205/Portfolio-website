const { ensureConnection, getConnectionStatus } = require('./database/connection');
const User = require('./database/models/User');

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    // Test connection
    console.log('1. Testing connection establishment...');
    await ensureConnection();
    console.log('✅ Connection established successfully');
    
    // Test connection status
    console.log('2. Checking connection status...');
    const status = getConnectionStatus();
    console.log('📊 Connection status:', status);
    
    // Test a simple database operation
    console.log('3. Testing database operation...');
    const userCount = await User.countDocuments();
    console.log(`✅ Database operation successful. User count: ${userCount}`);
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
