# Migration Quick Reference

## 🚀 Quick Start

```bash
# 1. Backup your data (CRITICAL!)
npm run migrate:backup

# 2. Preview migration changes
npm run migrate:dry-run

# 3. Run the migration
npm run migrate:run

# 4. Validate results
npm run migrate:validate
```

## 📋 All Commands

### Backup & Restore
```bash
# Create backup
npm run migrate:backup

# List backups
npm run backup:list

# Restore from backup
node scripts/backupUsers.js restore backups/users-backup-2024-01-01T00-00-00-000Z.json
```

### Migration
```bash
# Preview changes (safe)
npm run migrate:dry-run

# Run migration
npm run migrate:run

# Validate results
npm run migrate:validate

# Rollback (removes new fields)
npm run migrate:rollback
```

### Testing
```bash
# Test migration with sample data
npm run migrate:test

# Clean up test data
npm run migrate:test-cleanup
```

## 🔧 Manual Commands

```bash
# Direct script execution
node scripts/backupUsers.js backup
node scripts/migrateUsers.js dry-run
node scripts/migrateUsers.js migrate
node scripts/migrateUsers.js validate
node scripts/migrateUsers.js rollback
node scripts/testMigration.js test
```

## 📊 What Gets Migrated

### Fields Added
- `firstName` (string, required)
- `lastName` (string, required)  
- `status` (string: "pending"/"approved"/"active"/"inactive")
- `headChefId` (ObjectId reference)

### Data Transformations
- `name` field split into `firstName` + `lastName`
- `headChef` field renamed to `headChefId`
- Status assigned based on role and existing data

### Indexes Created
- `{ firstName: 1 }`
- `{ lastName: 1 }`
- `{ headChefId: 1, firstName: 1, lastName: 1 }`
- `{ headChefId: 1, status: 1 }`
- `{ role: 1, status: 1 }`

## ⚠️ Important Notes

1. **Always backup first** - Use `npm run migrate:backup`
2. **Test on development** - Run `npm run migrate:test` first
3. **Preview changes** - Use `npm run migrate:dry-run`
4. **Monitor results** - Use `npm run migrate:validate`
5. **Keep backups** - Don't delete backup files until confirmed

## 🆘 Emergency Rollback

```bash
# If something goes wrong
npm run migrate:rollback

# Or restore from backup
node scripts/backupUsers.js restore <backup-file>
```

## 📞 Troubleshooting

### Common Issues
- **Connection error**: Check `MONGODB_URI` in `.env`
- **Permission error**: Ensure database write access
- **Validation error**: Check User model schema

### Recovery Steps
1. Check error logs for specific messages
2. Run validation to see current state
3. Restore from backup if needed
4. Fix issue and re-run migration

## 📈 Post-Migration Checklist

- [ ] Verify all users have `firstName` and `lastName`
- [ ] Check team members have correct `headChefId`
- [ ] Confirm status values are appropriate
- [ ] Test team login functionality
- [ ] Verify indexes were created
- [ ] Monitor application performance
- [ ] Clean up backup files (after confirming success)
