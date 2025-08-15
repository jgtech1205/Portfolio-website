# User Migration Guide

This guide provides step-by-step instructions for migrating the users table to include new fields required for the enhanced team authentication system.

## Overview

The migration adds the following fields to the users table:
- `firstName` (string, required) - User's first name
- `lastName` (string, required) - User's last name  
- `status` (string) - User status: "pending", "approved", "active", "inactive"
- `headChefId` (ObjectId) - Reference to head chef for team members

## Prerequisites

1. **Backup your data** - Always create a backup before running migrations
2. **Test environment** - Test the migration on a copy of your production data first
3. **Database access** - Ensure you have write access to your MongoDB database
4. **Environment variables** - Set up your `MONGODB_URI` in `.env` file

## Migration Steps

### Step 1: Create Backup

**⚠️ CRITICAL: Always backup your data before running migrations**

```bash
# Create a backup of all users
npm run migrate:backup
```

This creates two backup files:
- `users-backup-{timestamp}.json` - Complete backup with all fields
- `users-simple-backup-{timestamp}.json` - Simple backup for easy restoration

### Step 2: Dry Run (Preview)

Preview the migration without making changes:

```bash
# Preview what the migration will do
npm run migrate:dry-run
```

This shows you exactly what changes will be made to each user.

### Step 3: Run Migration

Execute the migration:

```bash
# Run the actual migration
npm run migrate:run
```

The migration will:
1. Split existing `name` field into `firstName` and `lastName`
2. Set appropriate `status` values based on user role
3. Assign `headChefId` for team members
4. Create performance indexes

### Step 4: Validate Results

Verify the migration was successful:

```bash
# Validate migration results
npm run migrate:validate
```

This provides a summary of the migration results.

## Migration Details

### Name Splitting Logic

The migration splits the existing `name` field using the following logic:

```javascript
const nameParts = user.name ? user.name.trim().split(' ') : ['Unknown', 'User']
const firstName = nameParts[0] || 'Unknown'
const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User'
```

**Examples:**
- `"John Doe"` → `firstName: "John"`, `lastName: "Doe"`
- `"Mary Jane Smith"` → `firstName: "Mary"`, `lastName: "Jane Smith"`
- `"Chef"` → `firstName: "Chef"`, `lastName: "User"`
- `""` → `firstName: "Unknown"`, `lastName: "User"`

### Status Assignment

Users are assigned status based on their role and existing data:

- **Head Chefs**: Always set to `"active"`
- **Team Members**: 
  - If they have existing `status`, keep it
  - If they have `headChef` field, set to `"pending"`
  - Otherwise, set to `"active"`

### Head Chef Assignment

Team members are assigned to head chefs as follows:

- If they already have a `headChef` field, it's converted to `headChefId`
- If they don't have a head chef, they're assigned to the first available head chef
- Head chefs don't have a `headChefId` (they are the head of their organization)

### Database Indexes

The migration creates the following indexes for performance:

```javascript
// Single field indexes
{ firstName: 1 }
{ lastName: 1 }

// Compound indexes for queries
{ headChefId: 1, firstName: 1, lastName: 1 }  // Team login queries
{ headChefId: 1, status: 1 }                  // Organization queries
{ role: 1, status: 1 }                        // Role-based queries
```

## Rollback

If you need to rollback the migration:

```bash
# Rollback the migration
npm run migrate:rollback
```

**⚠️ WARNING**: Rollback will remove the new fields and reset all users to `status: "active"`. Make sure you have a backup before rolling back.

## Backup Management

### List Available Backups

```bash
# List all backup files
npm run backup:list
```

### Restore from Backup

```bash
# Restore from a specific backup file
node scripts/backupUsers.js restore backups/users-backup-2024-01-01T00-00-00-000Z.json
```

## Troubleshooting

### Common Issues

1. **Connection Error**
   ```
   ❌ Migration failed: connect ECONNREFUSED
   ```
   **Solution**: Check your `MONGODB_URI` in `.env` file

2. **Permission Error**
   ```
   ❌ Error creating indexes: not authorized
   ```
   **Solution**: Ensure your database user has write permissions

3. **Validation Error**
   ```
   ❌ Validation error: firstName is required
   ```
   **Solution**: Check if the User model has been updated with the new schema

### Error Recovery

If the migration fails partway through:

1. **Check the error log** - The script provides detailed error information
2. **Review the validation results** - See what was successfully migrated
3. **Restore from backup** if necessary
4. **Fix the issue** and re-run the migration

### Partial Migration Recovery

If some users were migrated successfully:

1. Run validation to see the current state
2. The migration script is idempotent - it won't overwrite existing data
3. Re-run the migration to process remaining users

## Post-Migration Tasks

After successful migration:

1. **Update your application code** to use the new fields
2. **Test the team login functionality** with migrated users
3. **Verify user permissions** are working correctly
4. **Monitor the application** for any issues

## Data Verification

You can verify the migration results by checking:

```javascript
// Check users with new fields
db.users.find({ firstName: { $exists: true } }).count()

// Check users with status
db.users.find({ status: { $exists: true } }).count()

// Check team members with headChefId
db.users.find({ role: "user", headChefId: { $exists: true } }).count()

// Check indexes
db.users.getIndexes()
```

## Performance Considerations

- The migration processes users one by one to avoid memory issues
- Indexes are created after all users are processed
- Large datasets may take several minutes to complete
- Consider running during low-traffic periods

## Security Notes

- Backup files contain sensitive user data - store them securely
- Delete backup files after confirming successful migration
- Use environment variables for database credentials
- Test the migration on a copy of production data first

## Support

If you encounter issues:

1. Check the error logs for specific error messages
2. Verify your database connection and permissions
3. Ensure you have sufficient disk space for backups
4. Test the migration on a small dataset first

## Migration Checklist

- [ ] Create backup of current data
- [ ] Test migration on development environment
- [ ] Run dry-run to preview changes
- [ ] Execute migration on production
- [ ] Validate migration results
- [ ] Test application functionality
- [ ] Monitor for issues
- [ ] Clean up backup files (after confirming success)
