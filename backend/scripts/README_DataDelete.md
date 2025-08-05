# DataFlow Deletion Tool

A comprehensive tool for safely deleting data from the DataFlow Visualization System. Supports both full database cleanup and targeted deletion with advanced filtering capabilities.

## ⚠️ Important Safety Notice

**This tool can permanently delete data from your database. Always use with caution and ensure you have backups.**

- Use `--dry-run` mode first to preview what will be deleted
- The tool requires manual confirmation unless `--force` is used
- Deletion respects foreign key constraints and cascades appropriately
- Full database deletion will remove ALL data from the system

## Features

- ✅ **Full Database Cleanup**: Remove all data from the system
- ✅ **Targeted Deletion**: Delete specific records with advanced filtering
- ✅ **Dry Run Mode**: Preview deletions without making changes
- ✅ **Safety Confirmations**: Manual confirmation required (bypassed with --force)
- ✅ **Cascade Handling**: Automatically handles related record deletions
- ✅ **Detailed Reporting**: Comprehensive deletion summaries
- ✅ **Error Handling**: Robust error handling and reporting

## Installation

Make sure you have the required dependencies installed:

```bash
cd /Users/milkiss/github/simple-dataflow/backend
npm install commander chalk readline
```

## Usage

### Full Database Deletion

**⚠️ DESTRUCTIVE OPERATION - Deletes ALL data**

```bash
node scripts/dataDelete.js full [options]
```

**Examples:**
```bash
# Preview what would be deleted (safe)
node scripts/dataDelete.js full --dry-run

# Delete all data with confirmation prompt
node scripts/dataDelete.js full

# Delete all data without confirmation (DANGEROUS)
node scripts/dataDelete.js full --force
```

### Targeted Deletion

Delete specific records based on filtering criteria:

```bash
node scripts/dataDelete.js target --type <entity_type> [filters] [options]
```

**Examples:**
```bash
# Preview components from a specific team
node scripts/dataDelete.js target --type components --team "DevOps Team" --dry-run

# Delete inactive components
node scripts/dataDelete.js target --type components --inactive

# Delete anomaly logs older than 30 days
node scripts/dataDelete.js target --type anomaly-logs --older-than 30

# Delete connections from a specific domain
node scripts/dataDelete.js target --type connections --domain "Finance Domain"

# Delete components by name pattern
node scripts/dataDelete.js target --type components --name "test" --dry-run
```

## Supported Entity Types

1. **domains** - Domain definitions
2. **groups** - Component groups
3. **components** - System components (with cascade deletion of connections)
4. **connections** - Component connections
5. **anomaly-logs** - Anomaly detection logs
6. **connectors** - Data connectors

## Filtering Options

### Universal Filters (all entity types)
- `--name <name>` - Filter by name (partial match, case-insensitive)
- `--active` - Only delete active records
- `--inactive` - Only delete inactive records

### Domain-Specific Filters
- `--color <color>` - Filter by hex color code

### Group-Specific Filters
- `--domain <domain>` - Filter by domain name
- `--type-filter <type>` - Filter by group type (LOGICAL, PHYSICAL, FUNCTIONAL, SERVICE)

### Component-Specific Filters
- `--type-filter <type>` - Filter by component type (DB, API, APP, STORAGE, PIPES)
- `--domain <domain>` - Filter by domain name
- `--source <source>` - Filter by source system
- `--team <team>` - Filter by team name (partial match)
- `--tag <tag>` - Filter by component tag (partial match)

### Connection-Specific Filters
- `--domain <domain>` - Filter by connection domain
- `--type-filter <type>` - Filter by connection type (direct, domain, etc.)

### Anomaly Log-Specific Filters
- `--importance <level>` - Filter by importance (critical, high, medium, low, info)
- `--category <category>` - Filter by category (system, object_addition, anomaly, security, performance)
- `--source <source>` - Filter by source system
- `--older-than <days>` - Delete records older than N days

### Connector-Specific Filters
- `--type-filter <type>` - Filter by connector type
- `--status <status>` - Filter by connector status

## Command Line Options

### Global Options

| Option | Short | Description |
|--------|-------|-------------|
| --dry-run | -d | Preview what would be deleted without actually deleting |
| --force | -F | Skip confirmation prompts (USE WITH CAUTION) |
| --verbose | -v | Enable detailed output |

### Full Command Options

The `full` command supports all global options.

### Target Command Options

| Option | Description | Applicable To |
|--------|-------------|---------------|
| --type | Entity type to delete (required) | All |
| --name | Filter by name (partial match) | All |
| --domain | Filter by domain | Groups, Components, Connections |
| --type-filter | Filter by type | Components, Connections, Groups, Connectors |
| --source | Filter by source | Components, Anomaly Logs |
| --team | Filter by team | Components |
| --tag | Filter by tag | Components |
| --importance | Filter by importance | Anomaly Logs |
| --category | Filter by category | Anomaly Logs |
| --older-than | Delete records older than N days | Anomaly Logs |
| --status | Filter by status | Connectors |
| --active | Only delete active records | All |
| --inactive | Only delete inactive records | All |

## Deletion Order & Cascading

The tool handles foreign key constraints by deleting in the correct order:

### Full Deletion Order:
1. **Group Memberships** (junction table)
2. **Connections** (depend on components)
3. **Anomaly Logs** (independent)
4. **Connectors** (independent)
5. **Components** (may reference groups/domains)
6. **Groups** (may reference domains)
7. **Domains** (base entities)

### Targeted Component Deletion Cascading:
When deleting components, the tool automatically:
1. Deletes all **connections** where the component is source or target
2. Deletes all **group memberships** for the component
3. Deletes the **component** itself

## Safety Features

### Confirmation Prompts
- All deletions require manual confirmation unless `--force` is used
- Shows preview of records to be deleted
- Displays current database statistics before full deletion

### Dry Run Mode
- Use `--dry-run` to safely preview what would be deleted
- No actual deletions are performed
- Full deletion summary is shown

### Error Handling
- Comprehensive error catching and reporting
- Database transaction rollback on failures
- Detailed error messages in summary

## Examples & Use Cases

### Development & Testing

```bash
# Clean up test data after development
node scripts/dataDelete.js target --type components --source "test" --dry-run
node scripts/dataDelete.js target --type components --source "test"

# Remove old anomaly logs
node scripts/dataDelete.js target --type anomaly-logs --older-than 7 --dry-run
node scripts/dataDelete.js target --type anomaly-logs --older-than 7
```

### Production Maintenance

```bash
# Clean up inactive components and their connections
node scripts/dataDelete.js target --type components --inactive --dry-run
node scripts/dataDelete.js target --type components --inactive

# Remove expired anomaly logs
node scripts/dataDelete.js target --type anomaly-logs --importance "low" --older-than 90
```

### Team-Specific Cleanup

```bash
# Remove components from a disbanded team
node scripts/dataDelete.js target --type components --team "Legacy Team" --dry-run
node scripts/dataDelete.js target --type components --team "Legacy Team"
```

### Emergency Cleanup

```bash
# Complete database reset (with confirmation)
node scripts/dataDelete.js full --dry-run  # Preview first
node scripts/dataDelete.js full           # Execute with confirmation

# Emergency reset without confirmation (DANGEROUS)
node scripts/dataDelete.js full --force
```

## Best Practices

### 1. Always Use Dry Run First
```bash
# GOOD: Preview first
node scripts/dataDelete.js target --type components --team "test" --dry-run
node scripts/dataDelete.js target --type components --team "test"

# RISKY: Direct deletion
node scripts/dataDelete.js target --type components --team "test"
```

### 2. Backup Before Major Deletions
```bash
# Create backup before full deletion
pg_dump dataflow_db > backup_$(date +%Y%m%d_%H%M%S).sql
node scripts/dataDelete.js full
```

### 3. Use Specific Filters
```bash
# GOOD: Specific criteria
node scripts/dataDelete.js target --type components --source "test" --team "QA"

# RISKY: Broad criteria
node scripts/dataDelete.js target --type components --inactive
```

### 4. Monitor Deletion Results
- Always review the deletion summary
- Check for any errors reported
- Verify the results in the application

## Troubleshooting

### Common Issues

1. **"Entity type not supported"**
   - Check that entity type is one of: domains, groups, components, connections, anomaly-logs, connectors

2. **"No records found matching criteria"**
   - Verify your filter criteria are correct
   - Use `--dry-run` to test filters without deletion

3. **"Foreign key constraint violation"**
   - The tool should handle this automatically
   - For components, related connections are deleted first

4. **"Database connection failed"**
   - Ensure database is running and accessible
   - Check connection configuration

### Debug Tips

- Use `--verbose` for detailed output
- Use `--dry-run` to test operations safely
- Check the deletion summary for error details
- Verify database state after operations

## Performance Considerations

- **Large Datasets**: The tool processes records in batches for memory efficiency
- **Cascade Deletions**: Component deletion handles related records automatically
- **Database Locks**: Operations may temporarily lock tables during deletion
- **Preview Limits**: Record previews are limited to 100 records for performance

## Security Notes

- **Access Control**: Ensure proper database access permissions
- **Audit Trail**: Consider logging deletions for audit purposes
- **Backup Strategy**: Always maintain recent backups before major deletions
- **Environment Separation**: Never run against production without extreme caution