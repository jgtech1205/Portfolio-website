// Check database connection and find the user
const mongoose = require('mongoose');
const User = require('./database/models/User');
require('dotenv').config();

async function checkDatabaseConnection() {
  try {
    console.log('🔍 Checking database connections...\n');
    
    // Check current environment variables
    console.log('📋 Environment Variables:');
    console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('   PORT:', process.env.PORT || '5000');
    
    // Try to connect to the configured database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chefenplace';
    console.log('\n🔌 Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected successfully');
    
    // Check database info
    console.log('📊 Database Info:');
    console.log('   Name:', mongoose.connection.db.databaseName);
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port);
    
    // Look for the user
    console.log('\n👤 Looking for user: headcfasfafzhef@kitchen.com');
    const user = await User.findOne({ email: 'headcfasfafzhef@kitchen.com' });
    
    if (user) {
      console.log('✅ User found!');
      console.log('   ID:', user._id);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Status:', user.status);
      console.log('   Created:', user.createdAt);
    } else {
      console.log('❌ User not found in this database');
      
      // List all users to see what's in this database
      const allUsers = await User.find({}).select('email role status createdAt');
      console.log('\n📋 All users in this database:');
      if (allUsers.length === 0) {
        console.log('   No users found');
      } else {
        allUsers.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.email} (${u.role}, ${u.status})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n✅ Disconnected from database');
    }
  }
}

checkDatabaseConnection();







