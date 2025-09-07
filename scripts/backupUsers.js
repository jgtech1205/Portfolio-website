const mongoose = require('mongoose')
const User = require('../database/models/User')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

/**
 * Backup script to create a safe copy of user data before migration
 */
const backupUsers = async () => {
  try {
    console.log('💾 Starting user data backup...')
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Create backup directory
    const backupDir = path.join(__dirname, '../backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `users-backup-${timestamp}.json`)

    // Fetch all users
    console.log('📋 Fetching all users...')
    const users = await User.find({}).lean()
    console.log(`Found ${users.length} users to backup`)

    // Create backup data structure
    const backupData = {
      timestamp: new Date().toISOString(),
      totalUsers: users.length,
      migrationVersion: '1.0.0',
      users: users.map(user => ({
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        headChef: user.headChef,
        headChefId: user.headChefId,
        firstName: user.firstName,
        lastName: user.lastName,
        organization: user.organization,
        permissions: user.permissions,
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    }

    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
    console.log(`✅ Backup saved to: ${backupFile}`)

    // Create backup summary
    const summary = {
      totalUsers: users.length,
      headChefs: users.filter(u => u.role === 'head-chef').length,
      teamMembers: users.filter(u => u.role === 'user').length,
      activeUsers: users.filter(u => u.isActive).length,
      usersWithStatus: users.filter(u => u.status).length,
      usersWithHeadChef: users.filter(u => u.headChef).length,
      usersWithFirstName: users.filter(u => u.firstName).length,
      usersWithLastName: users.filter(u => u.lastName).length
    }

    console.log('\n📊 Backup Summary:')
    console.log(`Total users: ${summary.totalUsers}`)
    console.log(`Head chefs: ${summary.headChefs}`)
    console.log(`Team members: ${summary.teamMembers}`)
    console.log(`Active users: ${summary.activeUsers}`)
    console.log(`Users with status: ${summary.usersWithStatus}`)
    console.log(`Users with headChef: ${summary.usersWithHeadChef}`)
    console.log(`Users with firstName: ${summary.usersWithFirstName}`)
    console.log(`Users with lastName: ${summary.usersWithLastName}`)

    // Create a simple backup file for easy restoration
    const simpleBackupFile = path.join(backupDir, `users-simple-backup-${timestamp}.json`)
    const simpleBackup = {
      timestamp: new Date().toISOString(),
      users: users.map(user => ({
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status || 'active',
        headChef: user.headChef ? user.headChef.toString() : null,
        isActive: user.isActive
      }))
    }

    fs.writeFileSync(simpleBackupFile, JSON.stringify(simpleBackup, null, 2))
    console.log(`✅ Simple backup saved to: ${simpleBackupFile}`)

    console.log('\n🎉 Backup completed successfully!')
    console.log('💡 You can now safely run the migration script.')

  } catch (error) {
    console.error('❌ Backup failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

/**
 * Restore users from backup file
 */
const restoreUsers = async (backupFile) => {
  try {
    console.log('🔄 Starting user data restoration...')
    
    if (!backupFile) {
      console.error('❌ Please provide a backup file path')
      console.log('Usage: node backupUsers.js restore <backup-file>')
      return
    }

    // Check if backup file exists
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`)
      return
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chef-en-place'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Read backup file
    console.log(`📖 Reading backup file: ${backupFile}`)
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
    
    console.log(`Found ${backupData.users.length} users to restore`)

    // Restore users
    let restoredCount = 0
    let errorCount = 0

    for (const userData of backupData.users) {
      try {
        // Check if user exists
        const existingUser = await User.findById(userData._id)
        
        if (existingUser) {
          // Update existing user
          await User.findByIdAndUpdate(userData._id, {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            status: userData.status,
            headChef: userData.headChef,
            headChefId: userData.headChefId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            organization: userData.organization,
            permissions: userData.permissions,
            avatar: userData.avatar,
            isActive: userData.isActive,
            lastLogin: userData.lastLogin
          })
          console.log(`✅ Updated user: ${userData.email}`)
        } else {
          // Create new user
          const newUser = new User({
            _id: userData._id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            status: userData.status,
            headChef: userData.headChef,
            headChefId: userData.headChefId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            organization: userData.organization,
            permissions: userData.permissions,
            avatar: userData.avatar,
            isActive: userData.isActive,
            lastLogin: userData.lastLogin
          })
          await newUser.save()
          console.log(`✅ Created user: ${userData.email}`)
        }
        
        restoredCount++
      } catch (error) {
        console.error(`❌ Error restoring user ${userData.email}:`, error.message)
        errorCount++
      }
    }

    console.log('\n📈 Restoration Summary:')
    console.log(`✅ Successfully restored: ${restoredCount} users`)
    console.log(`❌ Errors encountered: ${errorCount}`)

    console.log('\n🎉 Restoration completed!')

  } catch (error) {
    console.error('❌ Restoration failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

/**
 * List available backup files
 */
const listBackups = () => {
  try {
    const backupDir = path.join(__dirname, '../backups')
    
    if (!fs.existsSync(backupDir)) {
      console.log('No backup directory found.')
      return
    }

    const files = fs.readdirSync(backupDir)
    const backupFiles = files.filter(file => file.endsWith('.json'))

    if (backupFiles.length === 0) {
      console.log('No backup files found.')
      return
    }

    console.log('📁 Available backup files:')
    backupFiles.forEach((file, index) => {
      const filePath = path.join(backupDir, file)
      const stats = fs.statSync(filePath)
      console.log(`${index + 1}. ${file}`)
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`)
      console.log(`   Created: ${stats.mtime.toISOString()}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error listing backups:', error)
  }
}

// Command line interface
const command = process.argv[2]
const backupFile = process.argv[3]

switch (command) {
  case 'backup':
    backupUsers()
    break
  case 'restore':
    restoreUsers(backupFile)
    break
  case 'list':
    listBackups()
    break
  default:
    console.log(`
Usage: node backupUsers.js [command] [options]

Commands:
  backup           - Create a backup of all users
  restore <file>   - Restore users from backup file
  list             - List available backup files

Examples:
  node backupUsers.js backup
  node backupUsers.js list
  node backupUsers.js restore backups/users-backup-2024-01-01T00-00-00-000Z.json

Note: Always backup your data before running migrations!
    `)
}
