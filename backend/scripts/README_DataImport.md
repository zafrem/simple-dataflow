# DataFlow CSV Import Tool

A comprehensive tool for importing data into the DataFlow Visualization System from CSV files. Supports validation, duplicate checking, and batch processing for all entity types.

## Features

- ✅ **CSV Validation**: Comprehensive validation for all data types
- ✅ **Duplicate Detection**: Smart duplicate checking with detailed reporting
- ✅ **Batch Processing**: Import multiple CSV files at once
- ✅ **Dry Run Mode**: Test imports without making changes
- ✅ **Force Mode**: Update existing records when duplicates are found
- ✅ **Detailed Reporting**: Comprehensive import summaries and error reporting
- ✅ **Auto-Detection**: Automatic entity type detection from filenames

## Installation

Make sure you have the required dependencies installed:

```bash
cd /Users/milkiss/github/simple-dataflow/backend
npm install csv-parser commander chalk
```

## Usage

### Single File Import

Import data from a single CSV file:

```bash
node scripts/dataImport.js file -f <csv_file> -t <entity_type> [options]
```

**Examples:**
```bash
# Import domains from CSV
node scripts/dataImport.js file -f data/domains.csv -t domains

# Dry run for components (validation only)
node scripts/dataImport.js file -f data/components.csv -t components --dry-run

# Force import connections (update existing)
node scripts/dataImport.js file -f data/connections.csv -t connections --force

# Verbose output for groups
node scripts/dataImport.js file -f data/groups.csv -t groups --verbose
```

### Batch Import

Import multiple CSV files from a directory:

```bash
node scripts/dataImport.js batch -d <directory> [options]
```

**Examples:**
```bash
# Import all CSV files in directory
node scripts/dataImport.js batch -d ./import_data/

# Dry run for entire directory
node scripts/dataImport.js batch -d ./import_data/ --dry-run

# Force import with verbose output
node scripts/dataImport.js batch -d ./import_data/ --force --verbose
```

## Entity Types

### Supported Entity Types

1. **domains** - Domain definitions
2. **groups** - Component groups
3. **components** - System components
4. **connections** - Component connections
5. **anomaly-logs** - Anomaly detection logs

### Auto-Detection for Batch Import

The tool automatically detects entity types from filenames:
- Files containing "domain" → domains
- Files containing "group" → groups  
- Files containing "component" → components
- Files containing "connection" → connections
- Files containing "anomaly" or "log" → anomaly-logs

## CSV Format Requirements

### Domains CSV Format

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| name | ✅ | Domain name (unique, max 255 chars) | "Finance Domain" |
| description | ❌ | Domain description | "Financial services and accounting" |
| color | ❌ | Hex color code | "#ff6b6b" |
| pipelines | ❌ | JSON array of pipelines | `[{"name": "Process", "steps": [...]}]` |
| metadata | ❌ | JSON metadata object | `{"owner": "team", "criticality": "high"}` |

### Groups CSV Format

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| name | ✅ | Group name (unique per domain, max 255 chars) | "Payment Services" |
| description | ❌ | Group description | "Payment processing components" |
| group_type | ❌ | LOGICAL, PHYSICAL, FUNCTIONAL, SERVICE | "FUNCTIONAL" |
| domain | ❌ | Domain name (alternative to domain_id) | "Finance Domain" |
| domain_id | ❌ | Domain ID (alternative to domain) | 1 |
| color | ❌ | Hex color code | "#ff6b6b" |
| position | ❌ | JSON position object | `{"x": 100, "y": 150}` |
| metadata | ❌ | JSON metadata object | `{"service_level": "critical"}` |

### Components CSV Format

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| name | ✅ | Component name (max 255 chars) | "Payment Gateway" |
| type | ✅ | DB, API, APP, STORAGE, PIPES | "API" |
| tag | ❌ | Unique component tag (auto-generated if not provided) | "finance_payment_gateway_api" |
| description | ❌ | Component description | "Handles payment processing" |
| domain | ❌ | Domain name | "Finance Domain" |
| domain_id | ❌ | Domain ID | 1 |
| source | ❌ | Source system (defaults to 'csv-import') | "manual" |
| team | ❌ | Team responsible for component (max 100 chars) | "DevOps Team" |
| metadata | ❌ | JSON metadata object | `{"version": "2.1", "uptime": "99.9%"}` |

### Connections CSV Format

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| source_id | ❌* | Source component ID | 5 |
| target_id | ❌* | Target component ID | 8 |
| source_tag | ❌* | Source component tag (alternative to source_id) | "finance_payment_gateway_api" |
| target_tag | ❌* | Target component tag (alternative to target_id) | "operations_user_db" |
| domain | ✅ | Connection domain | "Finance Domain" |
| connection_type | ❌ | direct, domain, group-pipe, etc. | "direct" |
| strength | ❌ | Connection strength (0.0-1.0) | 0.8 |
| metadata | ❌ | JSON metadata object | `{"query_type": "read"}` |

*Either source_id + target_id OR source_tag + target_tag must be provided

### Anomaly Logs CSV Format

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| message | ✅ | Log message (max 1000 chars) | "Payment gateway response time exceeded" |
| importance | ❌ | critical, high, medium, low, info | "high" |
| category | ❌ | system, object_addition, anomaly, security, performance | "anomaly" |
| source | ❌ | Source system | "monitoring-system" |
| retention_days | ❌ | Days to retain (1-365, default 30) | 90 |
| details | ❌ | JSON details object | `{"threshold": "2000ms", "actual": "5500ms"}` |
| tags | ❌ | JSON array or comma-separated tags | `["performance", "payment", "api"]` |
| timestamp | ❌ | ISO timestamp (defaults to current time) | "2025-08-05T10:30:00Z" |

## Command Line Options

### Global Options

| Option | Short | Description |
|--------|-------|-------------|
| --dry-run | -d | Perform validation without importing data |
| --force | -F | Force import, updating existing records when duplicates found |
| --verbose | -v | Enable verbose output |

### File Command Options

| Option | Short | Description |
|--------|-------|-------------|
| --file | -f | Path to CSV file (required) |
| --type | -t | Entity type (required) |

### Batch Command Options

| Option | Short | Description |
|--------|-------|-------------|
| --directory | -d | Directory containing CSV files (required) |

## Validation Rules

### Domain Validation
- ✅ Name is required and must be unique (case-insensitive)
- ✅ Name maximum length: 255 characters
- ✅ Color must be valid hex format (#rrggbb)
- ✅ Pipelines must be valid JSON array
- ✅ Metadata must be valid JSON object

### Group Validation
- ✅ Name is required and must be unique within domain
- ✅ Name maximum length: 255 characters
- ✅ Group type must be: LOGICAL, PHYSICAL, FUNCTIONAL, or SERVICE
- ✅ Position must be valid JSON object with x, y coordinates
- ✅ Color must be valid hex format
- ✅ Domain or domain_id must reference existing domain

### Component Validation
- ✅ Name is required
- ✅ Type is required: DB, API, APP, STORAGE, or PIPES
- ✅ Tag must be unique (auto-generated if not provided)
- ✅ Tag must end with: _db, _api, _app, _storage, or _pipes
- ✅ No duplicate name+type+domain combinations
- ✅ Team name maximum length: 100 characters
- ✅ Metadata must be valid JSON object

### Connection Validation
- ✅ Source and target components must exist
- ✅ Either IDs or tags must be provided for source/target
- ✅ Domain is required
- ✅ Connection type must be valid
- ✅ Strength must be between 0.0 and 1.0
- ✅ No duplicate source→target connections

### Anomaly Log Validation
- ✅ Message is required (max 1000 characters)
- ✅ Importance must be: critical, high, medium, low, or info
- ✅ Category must be: system, object_addition, anomaly, security, or performance
- ✅ Retention days must be 1-365
- ✅ Timestamp must be valid ISO format
- ✅ No duplicate message+category+source within 1 hour window

## Duplicate Detection

### Smart Duplicate Checking

The tool performs intelligent duplicate detection based on entity type:

- **Domains**: Case-insensitive name matching
- **Groups**: Name matching within the same domain
- **Components**: Tag uniqueness + name+type+domain combinations
- **Connections**: Source→target pair matching
- **Anomaly Logs**: Message+category+source within 1-hour window

### Handling Duplicates

1. **Default Behavior**: Skip duplicates and report them
2. **Force Mode** (`--force`): Update existing records with new data
3. **Detailed Reporting**: Show exactly what conflicts were found

## Error Handling

### Validation Errors
- Invalid required fields
- Format validation failures
- Data type mismatches
- Reference integrity violations

### Import Errors
- Database connection failures
- Constraint violations
- Missing dependencies

### Comprehensive Reporting
- Total records processed
- Created, updated, skipped counts
- Detailed error messages
- Duplicate detection results

## Examples

### Template Files

Use the provided template files in `scripts/templates/` as starting points:

- `domains_template.csv`
- `groups_template.csv`
- `components_template.csv`
- `connections_template.csv`
- `anomaly_logs_template.csv`

### Sample Import Workflow

1. **Prepare your data** using the template files
2. **Validate first** with dry-run mode:
   ```bash
   node scripts/dataImport.js file -f domains.csv -t domains --dry-run
   ```
3. **Import if validation passes**:
   ```bash
   node scripts/dataImport.js file -f domains.csv -t domains
   ```
4. **Handle duplicates** if needed:
   ```bash
   node scripts/dataImport.js file -f domains.csv -t domains --force
   ```

### Import Order Recommendations

For best results, import in this order:
1. **Domains** (required for groups)
2. **Groups** (required for group-component relationships)
3. **Components** (required for connections)
4. **Connections** (depends on components)
5. **Anomaly Logs** (independent)

## Troubleshooting

### Common Issues

1. **"Entity type not supported"**: Check that entity type is one of: domains, groups, components, connections, anomaly-logs

2. **"Required field missing"**: Ensure all required columns are present and have values

3. **"Invalid JSON format"**: Check that JSON fields (metadata, details, etc.) are properly formatted

4. **"Component not found"**: When using component tags in connections, ensure components are imported first

5. **"Duplicate detected"**: Use `--force` flag to update existing records, or modify your data to avoid conflicts

### Debug Tips

- Use `--dry-run` to validate without importing
- Use `--verbose` for detailed output
- Check the error summary at the end of each run
- Verify CSV format matches the documented requirements

## Performance Considerations

- **Batch Size**: The tool processes records sequentially for data integrity
- **Memory Usage**: Large CSV files are processed in chunks
- **Database Connections**: Ensure database can handle concurrent connections
- **Validation**: Pre-validation reduces database load

## Security Notes

- **Input Sanitization**: All input data is sanitized before processing
- **SQL Injection Prevention**: Uses parameterized queries
- **File Access**: Only processes CSV files in specified directories
- **Error Messages**: Sensitive information is not exposed in error messages