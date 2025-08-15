const mongoose = require('mongoose')
const User = require('../database/models/User')
require('dotenv').config()

/**
 * Migration script to update users table with new fields:
 * - Add firstName and lastName fields
 * - Split existing name field into firstName and lastName
 * - Add status field with default "active"
 * - Add headChefId field for team relationships
 * - Create performance indexes
 */
const migrateUsers = async () => {
  try {
    console.log('🚀 Starting user migration...')
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Step 1: Get all existing users
    console.log('\n📋 Step 1: Fetching existing users...')
    const existingUsers = await User.find({})
    console.log(`Found ${existingUsers.length} users to migrate`)

    if (existingUsers.length === 0) {
      console.log('No users found. Migration complete.')
      return
    }

    // Step 2: Process each user
    console.log('\n🔄 Step 2: Processing users...')
    let processedCount = 0
    let errorCount = 0
    const errors = []

    for (const user of existingUsers) {
      try {
        console.log(`Processing user: ${user.email} (${user.name})`)
        
        // Split name into firstName and lastName
        const nameParts = user.name ? user.name.trim().split(' ') : ['Unknown', 'User']
        let firstName = nameParts[0] || 'Unknown'
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User'

        // Handle edge cases
        if (firstName.length === 0) firstName = 'Unknown'
        if (lastName.length === 0) lastName = 'User'

        // Determine status based on existing data
        let status = 'active'
        if (user.role === 'head-chef') {
          status = 'active' // Head chefs are always active
        } else if (user.status) {
          // If status already exists, use it
          status = user.status
        } else {
          // Default team members to pending if they have a headChef
          status = user.headChef ? 'pending' : 'active'
        }

        // Determine headChefId
        let headChefId = null
        if (user.role === 'user' && user.headChef) {
          // If user already has headChef field, use it
          headChefId = user.headChef
        } else if (user.role === 'user' && !user.headChef) {
          // Find the first head chef to assign as default
          const headChef = await User.findOne({ role: 'head-chef' })
          if (headChef) {
            headChefId = headChef._id
          }
        }

        // Update user with new fields
        const updateData = {
          firstName,
          lastName,
          status,
          headChefId
        }

        // Only update if fields don't already exist
        if (!user.firstName) updateData.firstName = firstName
        if (!user.lastName) updateData.lastName = lastName
        if (!user.status) updateData.status = status
        if (!user.headChefId && headChefId) updateData.headChefId = headChefId

        // Update the user
        await User.findByIdAndUpdate(user._id, updateData, { new: true })
        
        console.log(`✅ Updated user: ${firstName} ${lastName} (${status})`)
        processedCount++

      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error.message)
        errors.push({
          userId: user._id,
          email: user.email,
          error: error.message
        })
        errorCount++
      }
    }

    // Step 3: Create indexes for performance
    console.log('\n📊 Step 3: Creating database indexes...')
    try {
      // Create indexes for firstName and lastName
      await User.collection.createIndex({ firstName: 1 })
      console.log('✅ Created index on firstName')
      
      await User.collection.createIndex({ lastName: 1 })
      console.log('✅ Created index on lastName')
      
      // Create compound index for team login queries
      await User.collection.createIndex({ headChefId: 1, firstName: 1, lastName: 1 })
      console.log('✅ Created compound index on headChefId, firstName, lastName')
      
      // Create index for organization queries
      await User.collection.createIndex({ headChefId: 1, status: 1 })
      console.log('✅ Created compound index on headChefId, status')
      
      // Create index for role-based queries
      await User.collection.createIndex({ role: 1, status: 1 })
      console.log('✅ Created compound index on role, status')

    } catch (indexError) {
      console.error('❌ Error creating indexes:', indexError.message)
      errors.push({
        type: 'index_creation',
        error: indexError.message
      })
    }

    // Step 4: Validation
    console.log('\n🔍 Step 4: Validating migration...')
    const validationResults = await validateMigration()
    
    // Step 5: Summary
    console.log('\n📈 Migration Summary:')
    console.log(`✅ Successfully processed: ${processedCount} users`)
    console.log(`❌ Errors encountered: ${errorCount}`)
    console.log(`📊 Validation results:`, validationResults)

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.email || error.type}: ${error.error}`)
      })
    }

    console.log('\n🎉 Migration completed!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

/**
 * Validate the migration results
 */
const validateMigration = async () => {
  const results = {
    totalUsers: 0,
    usersWithFirstName: 0,
    usersWithLastName: 0,
    usersWithStatus: 0,
    usersWithHeadChefId: 0,
    headChefs: 0,
    teamMembers: 0,
    activeUsers: 0,
    pendingUsers: 0
  }

  try {
    const users = await User.find({})
    results.totalUsers = users.length

    users.forEach(user => {
      if (user.firstName) results.usersWithFirstName++
      if (user.lastName) results.usersWithLastName++
      if (user.status) results.usersWithStatus++
      if (user.headChefId) results.usersWithHeadChefId++
      
      if (user.role === 'head-chef') {
        results.headChefs++
      } else {
        results.teamMembers++
      }
      
      if (user.status === 'active') results.activeUsers++
      if (user.status === 'pending') results.pendingUsers++
    })

    return results
  } catch (error) {
    console.error('❌ Validation error:', error.message)
    return { error: error.message }
  }
}

/**
 * Rollback function to revert migration changes
 */
const rollbackMigration = async () => {
  try {
    console.log('🔄 Starting rollback...')
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place'
    await mongoose.connect(mongoUri)
    
    // Remove the new fields
    await User.updateMany({}, {
      $unset: {
        firstName: 1,
        lastName: 1,
        headChefId: 1
      }
    })
    
    // Reset status to 'active' for all users
    await User.updateMany({}, { status: 'active' })
    
    console.log('✅ Rollback completed')
    
  } catch (error) {
    console.error('❌ Rollback failed:', error)
  } finally {
    await mongoose.disconnect()
  }
}

/**
 * Dry run function to preview migration without making changes
 */
const dryRunMigration = async () => {
  try {
    console.log('🧪 Starting dry run...')
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place'
    await mongoose.connect(mongoUri)
    
    const users = await User.find({})
    console.log(`Found ${users.length} users to migrate`)
    
    users.forEach(user => {
      const nameParts = user.name ? user.name.trim().split(' ') : ['Unknown', 'User']
      const firstName = nameParts[0] || 'Unknown'
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User'
      const status = user.role === 'head-chef' ? 'active' : (user.status || 'pending')
      
      console.log(`Would update: ${user.email}`)
      console.log(`  Name: "${user.name}" -> First: "${firstName}", Last: "${lastName}"`)
      console.log(`  Status: ${status}`)
      console.log(`  Role: ${user.role}`)
      console.log('---')
    })
    
    console.log('✅ Dry run completed')
    
  } catch (error) {
    console.error('❌ Dry run failed:', error)
  } finally {
    await mongoose.disconnect()
  }
}

// Command line interface
const command = process.argv[2]

switch (command) {
  case 'migrate':
    migrateUsers()
    break
  case 'rollback':
    rollbackMigration()
    break
  case 'dry-run':
    dryRunMigration()
    break
  case 'validate':
    (async () => {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place'
      await mongoose.connect(mongoUri)
      const results = await validateMigration()
      console.log('Validation results:', results)
      await mongoose.disconnect()
    })()
    break
  default:
    console.log(`
Usage: node migrateUsers.js [command]

Commands:
  migrate    - Run the migration
  rollback   - Rollback the migration
  dry-run    - Preview migration without making changes
  validate   - Validate current data state

Examples:
  node migrateUsers.js dry-run
  node migrateUsers.js migrate
  node migrateUsers.js validate
    `)
}
