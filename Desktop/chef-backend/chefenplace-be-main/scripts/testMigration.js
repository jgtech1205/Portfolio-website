const mongoose = require('mongoose')
const User = require('../database/models/User')
require('dotenv').config()

/**
 * Test script to verify migration functionality
 * Creates test users and runs migration on them
 */
const testMigration = async () => {
  try {
    console.log('🧪 Starting migration test...')
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Clean up any existing test users
    await User.deleteMany({ email: { $regex: /^test-/ } })
    console.log('🧹 Cleaned up existing test users')

    // Create test users
    const testUsers = [
      {
        email: 'test-headchef@example.com',
        name: 'Chef Gordon',
        role: 'head-chef',
        password: 'password123',
        organization: 'Test Kitchen'
      },
      {
        email: 'test-team1@example.com',
        name: 'John Doe',
        role: 'user',
        password: 'password123',
        organization: 'Test Kitchen'
      },
      {
        email: 'test-team2@example.com',
        name: 'Mary Jane Smith',
        role: 'user',
        password: 'password123',
        organization: 'Test Kitchen'
      },
      {
        email: 'test-single@example.com',
        name: 'Chef',
        role: 'user',
        password: 'password123',
        organization: 'Test Kitchen'
      },
      {
        email: 'test-empty@example.com',
        name: '',
        role: 'user',
        password: 'password123',
        organization: 'Test Kitchen'
      }
    ]

    console.log('\n📝 Creating test users...')
    const createdUsers = []
    for (const userData of testUsers) {
      const user = new User(userData)
      await user.save()
      createdUsers.push(user)
      console.log(`✅ Created: ${user.email} (${user.name})`)
    }

    // Assign team members to head chef
    const headChef = createdUsers.find(u => u.role === 'head-chef')
    for (const user of createdUsers) {
      if (user.role === 'user') {
        user.headChef = headChef._id
        await user.save()
        console.log(`🔗 Assigned ${user.email} to head chef`)
      }
    }

    console.log('\n📊 Pre-migration state:')
    await printUserSummary()

    // Run migration logic (simplified version)
    console.log('\n🔄 Running migration logic...')
    const users = await User.find({ email: { $regex: /^test-/ } })
    
    for (const user of users) {
      // Split name
      const nameParts = user.name ? user.name.trim().split(' ') : ['Unknown', 'User']
      let firstName = nameParts[0] || 'Unknown'
      let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User'

      // Determine status
      let status = 'active'
      if (user.role === 'head-chef') {
        status = 'active'
      } else if (user.headChef) {
        status = 'pending'
      }

      // Determine headChefId
      let headChefId = null
      if (user.role === 'user' && user.headChef) {
        headChefId = user.headChef
      }

      // Update user
      await User.findByIdAndUpdate(user._id, {
        firstName,
        lastName,
        status,
        headChefId
      })

      console.log(`✅ Migrated: ${user.email}`)
      console.log(`   Name: "${user.name}" -> "${firstName}" "${lastName}"`)
      console.log(`   Status: ${status}`)
      console.log(`   HeadChefId: ${headChefId || 'null'}`)
    }

    console.log('\n📊 Post-migration state:')
    await printUserSummary()

    // Test team login functionality
    console.log('\n🔐 Testing team login functionality...')
    await testTeamLogin()

    console.log('\n🎉 Migration test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

/**
 * Print summary of test users
 */
const printUserSummary = async () => {
  const users = await User.find({ email: { $regex: /^test-/ } })
  
  console.log(`Total test users: ${users.length}`)
  users.forEach(user => {
    console.log(`  ${user.email}:`)
    console.log(`    Name: "${user.name}"`)
    console.log(`    First: "${user.firstName || 'N/A'}"`)
    console.log(`    Last: "${user.lastName || 'N/A'}"`)
    console.log(`    Role: ${user.role}`)
    console.log(`    Status: ${user.status || 'N/A'}`)
    console.log(`    HeadChef: ${user.headChef || 'N/A'}`)
    console.log(`    HeadChefId: ${user.headChefId || 'N/A'}`)
  })
}

/**
 * Test team login functionality
 */
const testTeamLogin = async () => {
  try {
    const headChef = await User.findOne({ email: 'test-headchef@example.com' })
    const teamMember = await User.findOne({ email: 'test-team1@example.com' })

    if (!headChef || !teamMember) {
      console.log('❌ Test users not found')
      return
    }

    // Test case-insensitive login
    const testCases = [
      { username: 'john', password: 'doe', expected: true },
      { username: 'JOHN', password: 'DOE', expected: true },
      { username: 'John', password: 'Doe', expected: true },
      { username: 'john', password: 'wrong', expected: false },
      { username: 'wrong', password: 'doe', expected: false }
    ]

    for (const testCase of testCases) {
      const result = await testLogin(headChef._id, testCase.username, testCase.password)
      const status = result === testCase.expected ? '✅' : '❌'
      console.log(`${status} Login test: "${testCase.username}" / "${testCase.password}" -> ${result}`)
    }

  } catch (error) {
    console.error('❌ Team login test failed:', error.message)
  }
}

/**
 * Test login functionality
 */
const testLogin = async (headChefId, username, password) => {
  try {
    // Find user with case-insensitive matching
    const user = await User.findOne({
      headChefId: headChefId,
      firstName: { $regex: new RegExp(`^${username}$`, 'i') },
      lastName: { $regex: new RegExp(`^${password}$`, 'i') },
      status: { $in: ['approved', 'active'] }
    })

    return !!user
  } catch (error) {
    return false
  }
}

/**
 * Clean up test data
 */
const cleanupTestData = async () => {
  try {
    console.log('🧹 Cleaning up test data...')
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place'
    await mongoose.connect(mongoUri)
    
    await User.deleteMany({ email: { $regex: /^test-/ } })
    console.log('✅ Test data cleaned up')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await mongoose.disconnect()
  }
}

// Command line interface
const command = process.argv[2]

switch (command) {
  case 'test':
    testMigration()
    break
  case 'cleanup':
    cleanupTestData()
    break
  default:
    console.log(`
Usage: node testMigration.js [command]

Commands:
  test      - Run migration test with sample data
  cleanup   - Clean up test data

Examples:
  node testMigration.js test
  node testMigration.js cleanup
    `)
}
