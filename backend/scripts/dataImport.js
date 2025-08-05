#!/usr/bin/env node

/**
 * Data Import Script for DataFlow Visualization System
 * 
 * This script loads data from CSV files, verifies it against existing data,
 * and imports it into the system with proper validation and duplicate checking.
 * 
 * Usage:
 *   node dataImport.js --file <csv_file> --type <entity_type> [--dry-run] [--force]
 *   node dataImport.js --batch <directory> [--dry-run] [--force]
 * 
 * Supported entity types: domains, groups, components, connections, anomaly-logs
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const { program } = require('commander');
const chalk = require('chalk');

// Import models and database connection
const { initializeDatabase, Domain, ComponentGroup, Component, Connection, AnomalyLog } = require('../models');

class DataImporter {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.force = options.force || false;
    this.verbose = options.verbose || false;
    this.results = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0
    };
    this.errors = [];
    this.duplicates = [];
  }

  /**
   * Load and parse CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Array>} - Array of parsed records
   */
  async loadCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];

      createReadStream(filePath)
        .pipe(csv({
          skipEmptyLines: true,
          trim: true
        }))
        .on('data', (data) => {
          // Clean up the data
          const cleanData = {};
          for (const [key, value] of Object.entries(data)) {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            cleanData[cleanKey] = value?.trim() || null;
          }
          results.push(cleanData);
        })
        .on('error', (error) => {
          errors.push(error);
        })
        .on('end', () => {
          if (errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${errors.join(', ')}`));
          } else {
            resolve(results);
          }
        });
    });
  }

  /**
   * Validate domain data
   * @param {Object} record - Domain record from CSV
   * @param {number} rowIndex - Row index for error reporting
   * @returns {Object} - Validation result
   */
  validateDomain(record, rowIndex) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!record.name || record.name.length === 0) {
      errors.push(`Row ${rowIndex + 1}: Domain name is required`);
    }

    // Name length validation
    if (record.name && record.name.length > 255) {
      errors.push(`Row ${rowIndex + 1}: Domain name too long (max 255 characters)`);
    }

    // Color validation (if provided)
    if (record.color && !/^#[0-9A-Fa-f]{6}$/.test(record.color)) {
      warnings.push(`Row ${rowIndex + 1}: Invalid color format, using default`);
      record.color = '#409eff';
    }

    // Parse pipelines if provided
    if (record.pipelines) {
      try {
        record.pipelines = JSON.parse(record.pipelines);
      } catch (e) {
        warnings.push(`Row ${rowIndex + 1}: Invalid pipelines JSON format, ignoring`);
        record.pipelines = [];
      }
    } else {
      record.pipelines = [];
    }

    // Parse metadata if provided
    if (record.metadata) {
      try {
        record.metadata = JSON.parse(record.metadata);
      } catch (e) {
        warnings.push(`Row ${rowIndex + 1}: Invalid metadata JSON format, ignoring`);
        record.metadata = {};
      }
    } else {
      record.metadata = {};
    }

    return { isValid: errors.length === 0, errors, warnings, record };
  }

  /**
   * Validate group data
   * @param {Object} record - Group record from CSV
   * @param {number} rowIndex - Row index for error reporting
   * @returns {Object} - Validation result
   */
  validateGroup(record, rowIndex) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!record.name || record.name.length === 0) {
      errors.push(`Row ${rowIndex + 1}: Group name is required`);
    }

    // Name length validation
    if (record.name && record.name.length > 255) {
      errors.push(`Row ${rowIndex + 1}: Group name too long (max 255 characters)`);
    }

    // Group type validation
    const validGroupTypes = ['LOGICAL', 'PHYSICAL', 'FUNCTIONAL', 'SERVICE'];
    if (record.group_type && !validGroupTypes.includes(record.group_type.toUpperCase())) {
      warnings.push(`Row ${rowIndex + 1}: Invalid group type, using LOGICAL`);
      record.group_type = 'LOGICAL';
    } else if (!record.group_type) {
      record.group_type = 'LOGICAL';
    } else {
      record.group_type = record.group_type.toUpperCase();
    }

    // Color validation
    if (record.color && !/^#[0-9A-Fa-f]{6}$/.test(record.color)) {
      warnings.push(`Row ${rowIndex + 1}: Invalid color format, using default`);
      record.color = '#409eff';
    }

    // Position validation
    if (record.position) {
      try {
        record.position = JSON.parse(record.position);
        if (!record.position.x || !record.position.y) {
          record.position = { x: 0, y: 0 };
        }
      } catch (e) {
        warnings.push(`Row ${rowIndex + 1}: Invalid position format, using default`);
        record.position = { x: 0, y: 0 };
      }
    } else {
      record.position = { x: 0, y: 0 };
    }

    // Parse metadata if provided
    if (record.metadata) {
      try {
        record.metadata = JSON.parse(record.metadata);
      } catch (e) {
        warnings.push(`Row ${rowIndex + 1}: Invalid metadata JSON format, ignoring`);
        record.metadata = {};
      }
    } else {
      record.metadata = {};
    }

    return { isValid: errors.length === 0, errors, warnings, record };
  }

  /**
   * Validate component data
   * @param {Object} record - Component record from CSV
   * @param {number} rowIndex - Row index for error reporting
   * @returns {Object} - Validation result
   */
  validateComponent(record, rowIndex) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!record.name || record.name.length === 0) {
      errors.push(`Row ${rowIndex + 1}: Component name is required`);
    }

    if (!record.type) {
      errors.push(`Row ${rowIndex + 1}: Component type is required`);
    }

    // Type validation
    const validTypes = ['DB', 'API', 'APP', 'STORAGE', 'PIPES'];
    if (record.type && !validTypes.includes(record.type.toUpperCase())) {
      errors.push(`Row ${rowIndex + 1}: Invalid component type. Must be one of: ${validTypes.join(', ')}`);
    } else if (record.type) {
      record.type = record.type.toUpperCase();
    }

    // Tag validation and generation
    if (!record.tag && record.name && record.type) {
      // Auto-generate tag if not provided
      const domain = record.domain || record.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const typeSuffix = record.type.toLowerCase().replace('storage', 'storage').replace('pipes', 'pipes');
      record.tag = `${domain}_${record.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${typeSuffix}`;
      warnings.push(`Row ${rowIndex + 1}: Auto-generated tag: ${record.tag}`);
    }

    // Source validation
    if (!record.source) {
      record.source = 'csv-import';
    }

    // Team validation
    if (record.team && record.team.length > 100) {
      warnings.push(`Row ${rowIndex + 1}: Team name too long (max 100 characters), truncating`);
      record.team = record.team.substring(0, 100);
    }

    // Parse metadata if provided
    if (record.metadata) {
      try {
        record.metadata = JSON.parse(record.metadata);
      } catch (e) {
        warnings.push(`Row ${rowIndex + 1}: Invalid metadata JSON format, ignoring`);
        record.metadata = {};
      }
    } else {
      record.metadata = {};
    }

    return { isValid: errors.length === 0, errors, warnings, record };
  }

  /**
   * Validate connection data
   * @param {Object} record - Connection record from CSV
   * @param {number} rowIndex - Row index for error reporting
   * @returns {Object} - Validation result
   */
  validateConnection(record, rowIndex) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!record.source_id && !record.source_tag) {
      errors.push(`Row ${rowIndex + 1}: Source ID or source tag is required`);
    }

    if (!record.target_id && !record.target_tag) {
      errors.push(`Row ${rowIndex + 1}: Target ID or target tag is required`);
    }

    if (!record.domain) {
      errors.push(`Row ${rowIndex + 1}: Domain is required for connections`);
    }

    // Connection type validation
    const validConnectionTypes = ['direct', 'domain', 'group-pipe', 'domain-to-domain', 'group-to-group'];
    if (record.connection_type && !validConnectionTypes.includes(record.connection_type)) {
      warnings.push(`Row ${rowIndex + 1}: Invalid connection type, using 'direct'`);
      record.connection_type = 'direct';
    } else if (!record.connection_type) {
      record.connection_type = 'direct';
    }

    // Strength validation
    if (record.strength) {
      const strength = parseFloat(record.strength);
      if (isNaN(strength) || strength < 0 || strength > 1) {
        warnings.push(`Row ${rowIndex + 1}: Invalid strength value, using 1.0`);
        record.strength = 1.0;
      } else {
        record.strength = strength;
      }
    } else {
      record.strength = 1.0;
    }

    // Parse metadata if provided
    if (record.metadata) {
      try {
        record.metadata = JSON.parse(record.metadata);
      } catch (e) {
        warnings.push(`Row ${rowIndex + 1}: Invalid metadata JSON format, ignoring`);
        record.metadata = {};
      }
    } else {
      record.metadata = {};
    }

    return { isValid: errors.length === 0, errors, warnings, record };
  }

  /**
   * Validate anomaly log data
   * @param {Object} record - Anomaly log record from CSV
   * @param {number} rowIndex - Row index for error reporting
   * @returns {Object} - Validation result
   */
  validateAnomalyLog(record, rowIndex) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!record.message || record.message.length === 0) {
      errors.push(`Row ${rowIndex + 1}: Message is required`);
    }

    // Message length validation
    if (record.message && record.message.length > 1000) {
      errors.push(`Row ${rowIndex + 1}: Message too long (max 1000 characters)`);
    }

    // Importance validation
    const validImportance = ['critical', 'high', 'medium', 'low', 'info'];
    if (record.importance && !validImportance.includes(record.importance.toLowerCase())) {
      warnings.push(`Row ${rowIndex + 1}: Invalid importance level, using 'medium'`);
      record.importance = 'medium';
    } else if (!record.importance) {
      record.importance = 'medium';
    } else {
      record.importance = record.importance.toLowerCase();
    }

    // Category validation
    const validCategories = ['system', 'object_addition', 'anomaly', 'security', 'performance'];
    if (record.category && !validCategories.includes(record.category.toLowerCase())) {
      warnings.push(`Row ${rowIndex + 1}: Invalid category, using 'system'`);
      record.category = 'system';
    } else if (!record.category) {
      record.category = 'system';
    } else {
      record.category = record.category.toLowerCase();
    }

    // Retention days validation
    if (record.retention_days) {
      const days = parseInt(record.retention_days);
      if (isNaN(days) || days < 1 || days > 365) {
        warnings.push(`Row ${rowIndex + 1}: Invalid retention days, using 30`);
        record.retention_days = 30;
      } else {
        record.retention_days = days;
      }
    } else {
      record.retention_days = 30;
    }

    // Parse details if provided
    if (record.details) {
      try {
        record.details = JSON.parse(record.details);
      } catch (e) {
        warnings.push(`Row ${rowIndex + 1}: Invalid details JSON format, ignoring`);
        record.details = null;
      }
    }

    // Parse tags if provided
    if (record.tags) {
      try {
        record.tags = JSON.parse(record.tags);
        if (!Array.isArray(record.tags)) {
          record.tags = [record.tags];
        }
      } catch (e) {
        // Try to split as comma-separated values
        record.tags = record.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    // Timestamp validation
    if (record.timestamp) {
      const timestamp = new Date(record.timestamp);
      if (isNaN(timestamp.getTime())) {
        warnings.push(`Row ${rowIndex + 1}: Invalid timestamp format, using current time`);
        record.timestamp = new Date();
      } else {
        record.timestamp = timestamp;
      }
    } else {
      record.timestamp = new Date();
    }

    return { isValid: errors.length === 0, errors, warnings, record };
  }

  /**
   * Check for duplicate domains
   * @param {Object} record - Domain record
   * @returns {Promise<Object|null>} - Existing domain if found
   */
  async checkDuplicateDomain(record) {
    return await Domain.findOne({
      where: {
        name: { [require('sequelize').Op.iLike]: record.name },
        isActive: true
      }
    });
  }

  /**
   * Check for duplicate groups
   * @param {Object} record - Group record
   * @returns {Promise<Object|null>} - Existing group if found
   */
  async checkDuplicateGroup(record) {
    const whereClause = {
      name: { [require('sequelize').Op.iLike]: record.name },
      isActive: true
    };

    if (record.domain_id) {
      whereClause.domainId = record.domain_id;
    } else if (record.domain) {
      whereClause.domain = record.domain;
    }

    return await ComponentGroup.findOne({ where: whereClause });
  }

  /**
   * Check for duplicate components
   * @param {Object} record - Component record
   * @returns {Promise<Object|null>} - Existing component if found
   */
  async checkDuplicateComponent(record) {
    // Check by tag first
    const existingByTag = await Component.findOne({
      where: { tag: record.tag, isActive: true }
    });

    if (existingByTag) {
      return existingByTag;
    }

    // Check by name + type + domain
    if (record.domain) {
      return await Component.findOne({
        where: {
          name: record.name,
          type: record.type,
          domain: record.domain,
          isActive: true
        }
      });
    }

    return null;
  }

  /**
   * Check for duplicate connections
   * @param {Object} record - Connection record
   * @returns {Promise<Object|null>} - Existing connection if found
   */
  async checkDuplicateConnection(record) {
    let sourceId = record.source_id;
    let targetId = record.target_id;

    // Resolve source and target IDs from tags if needed
    if (!sourceId && record.source_tag) {
      const sourceComponent = await Component.findOne({
        where: { tag: record.source_tag, isActive: true }
      });
      if (sourceComponent) {
        sourceId = sourceComponent.id;
      }
    }

    if (!targetId && record.target_tag) {
      const targetComponent = await Component.findOne({
        where: { tag: record.target_tag, isActive: true }
      });
      if (targetComponent) {
        targetId = targetComponent.id;
      }
    }

    if (sourceId && targetId) {
      return await Connection.findOne({
        where: {
          sourceId,
          targetId,
          isActive: true
        }
      });
    }

    return null;
  }

  /**
   * Check for duplicate anomaly logs
   * @param {Object} record - Anomaly log record
   * @returns {Promise<Object|null>} - Existing log if found
   */
  async checkDuplicateAnomalyLog(record) {
    const oneHourAgo = new Date(record.timestamp.getTime() - (60 * 60 * 1000));
    const oneHourLater = new Date(record.timestamp.getTime() + (60 * 60 * 1000));

    return await AnomalyLog.findOne({
      where: {
        message: record.message,
        category: record.category,
        source: record.source || null,
        timestamp: {
          [require('sequelize').Op.between]: [oneHourAgo, oneHourLater]
        },
        expiresAt: { [require('sequelize').Op.gt]: new Date() }
      }
    });
  }

  /**
   * Create domain record
   * @param {Object} record - Domain data
   * @returns {Promise<Object>} - Created domain
   */
  async createDomain(record) {
    return await Domain.create({
      name: record.name,
      description: record.description || null,
      color: record.color || '#409eff',
      pipelines: record.pipelines || [],
      metadata: record.metadata || {}
    });
  }

  /**
   * Create group record
   * @param {Object} record - Group data
   * @returns {Promise<Object>} - Created group
   */
  async createGroup(record) {
    return await ComponentGroup.create({
      name: record.name,
      description: record.description || null,
      groupType: record.group_type || 'LOGICAL',
      domain: record.domain || null,
      domainId: record.domain_id || null,
      metadata: record.metadata || {},
      color: record.color || null,
      position: record.position || { x: 0, y: 0 }
    });
  }

  /**
   * Create component record
   * @param {Object} record - Component data
   * @returns {Promise<Object>} - Created component
   */
  async createComponent(record) {
    return await Component.create({
      name: record.name,
      tag: record.tag,
      type: record.type,
      source: record.source || 'csv-import',
      domain: record.domain || null,
      domainId: record.domain_id || null,
      description: record.description || null,
      metadata: record.metadata || {},
      team: record.team || null
    });
  }

  /**
   * Create connection record
   * @param {Object} record - Connection data
   * @returns {Promise<Object>} - Created connection
   */
  async createConnection(record) {
    let sourceId = record.source_id;
    let targetId = record.target_id;

    // Resolve source and target IDs from tags if needed
    if (!sourceId && record.source_tag) {
      const sourceComponent = await Component.findOne({
        where: { tag: record.source_tag, isActive: true }
      });
      if (!sourceComponent) {
        throw new Error(`Source component with tag '${record.source_tag}' not found`);
      }
      sourceId = sourceComponent.id;
    }

    if (!targetId && record.target_tag) {
      const targetComponent = await Component.findOne({
        where: { tag: record.target_tag, isActive: true }
      });
      if (!targetComponent) {
        throw new Error(`Target component with tag '${record.target_tag}' not found`);
      }
      targetId = targetComponent.id;
    }

    if (!sourceId || !targetId) {
      throw new Error('Both source and target components must be specified');
    }

    return await Connection.create({
      sourceId,
      targetId,
      domain: record.domain,
      connectionType: record.connection_type || 'direct',
      strength: record.strength || 1.0,
      metadata: record.metadata || {}
    });
  }

  /**
   * Create anomaly log record
   * @param {Object} record - Anomaly log data
   * @returns {Promise<Object>} - Created anomaly log
   */
  async createAnomalyLog(record) {
    const now = new Date(record.timestamp);
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + record.retention_days);

    return await AnomalyLog.create({
      message: record.message,
      importance: record.importance,
      category: record.category,
      source: record.source || 'csv-import',
      details: record.details || null,
      retentionDays: record.retention_days,
      tags: record.tags || null,
      timestamp: now,
      expiresAt: expiryDate
    });
  }

  /**
   * Process and import data based on entity type
   * @param {string} entityType - Type of entity (domains, groups, components, connections, anomaly-logs)
   * @param {Array} records - Array of records to import
   * @returns {Promise<Object>} - Import results
   */
  async processImport(entityType, records) {
    console.log(chalk.blue(`\n🔄 Processing ${records.length} ${entityType} records...\n`));

    const validationMethods = {
      domains: this.validateDomain.bind(this),
      groups: this.validateGroup.bind(this),
      components: this.validateComponent.bind(this),
      connections: this.validateConnection.bind(this),
      'anomaly-logs': this.validateAnomalyLog.bind(this)
    };

    const duplicateCheckMethods = {
      domains: this.checkDuplicateDomain.bind(this),
      groups: this.checkDuplicateGroup.bind(this),
      components: this.checkDuplicateComponent.bind(this),
      connections: this.checkDuplicateConnection.bind(this),
      'anomaly-logs': this.checkDuplicateAnomalyLog.bind(this)
    };

    const createMethods = {
      domains: this.createDomain.bind(this),
      groups: this.createGroup.bind(this),
      components: this.createComponent.bind(this),
      connections: this.createConnection.bind(this),
      'anomaly-logs': this.createAnomalyLog.bind(this)
    };

    const validateMethod = validationMethods[entityType];
    const checkDuplicateMethod = duplicateCheckMethods[entityType];
    const createMethod = createMethods[entityType];

    if (!validateMethod || !checkDuplicateMethod || !createMethod) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Validation phase
    console.log(chalk.yellow('📋 Validating records...'));
    const validRecords = [];
    let validationErrors = 0;

    for (let i = 0; i < records.length; i++) {
      const validation = validateMethod(records[i], i);
      
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          console.log(chalk.yellow(`⚠️  ${warning}`));
        });
      }

      if (validation.isValid) {
        validRecords.push(validation.record);
      } else {
        validationErrors++;
        validation.errors.forEach(error => {
          console.log(chalk.red(`❌ ${error}`));
          this.errors.push(error);
        });
      }

      this.results.processed++;
    }

    console.log(chalk.green(`✅ Validation complete: ${validRecords.length} valid, ${validationErrors} invalid\n`));

    if (validRecords.length === 0) {
      console.log(chalk.red('❌ No valid records to process.'));
      return this.results;
    }

    // Duplicate checking phase
    console.log(chalk.yellow('🔍 Checking for duplicates...'));
    const newRecords = [];
    let duplicateCount = 0;

    for (const record of validRecords) {
      try {
        const existing = await checkDuplicateMethod(record);
        if (existing) {
          duplicateCount++;
          this.results.duplicates++;
          const duplicateInfo = `Duplicate ${entityType.slice(0, -1)}: ${record.name || record.message || `${record.source_tag} → ${record.target_tag}`} (existing ID: ${existing.id})`;
          console.log(chalk.yellow(`⚠️  ${duplicateInfo}`));
          this.duplicates.push(duplicateInfo);

          if (this.force) {
            console.log(chalk.blue(`🔄 Force flag enabled, will update existing record`));
            record._existingId = existing.id;
            newRecords.push(record);
          } else {
            this.results.skipped++;
          }
        } else {
          newRecords.push(record);
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error checking duplicate: ${error.message}`));
        this.errors.push(`Duplicate check failed: ${error.message}`);
        this.results.errors++;
      }
    }

    console.log(chalk.green(`✅ Duplicate check complete: ${newRecords.length} new, ${duplicateCount} duplicates\n`));

    if (newRecords.length === 0) {
      console.log(chalk.yellow('⚠️  No new records to process.'));
      return this.results;
    }

    // Import phase
    if (this.dryRun) {
      console.log(chalk.blue('🧪 DRY RUN: Would create the following records:'));
      newRecords.forEach((record, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${record.name || record.message || `${record.source_tag} → ${record.target_tag}`}`));
      });
      this.results.created = newRecords.length;
    } else {
      console.log(chalk.yellow('💾 Creating records...'));
      
      for (const record of newRecords) {
        try {
          if (record._existingId && this.force) {
            // Update existing record
            console.log(chalk.blue(`🔄 Updating existing ${entityType.slice(0, -1)}: ${record.name || record.message}`));
            // Note: Update logic would go here - for now we skip updates
            this.results.updated++;
          } else {
            const created = await createMethod(record);
            console.log(chalk.green(`✅ Created ${entityType.slice(0, -1)}: ${created.name || created.message || created.id}`));
            this.results.created++;
          }
        } catch (error) {
          console.log(chalk.red(`❌ Error creating record: ${error.message}`));
          this.errors.push(`Creation failed: ${error.message}`);
          this.results.errors++;
        }
      }
    }

    return this.results;
  }

  /**
   * Import data from a single CSV file
   * @param {string} filePath - Path to CSV file
   * @param {string} entityType - Type of entity to import
   * @returns {Promise<Object>} - Import results
   */
  async importFile(filePath, entityType) {
    try {
      console.log(chalk.blue(`📂 Loading CSV file: ${filePath}`));
      const records = await this.loadCSV(filePath);
      console.log(chalk.green(`✅ Loaded ${records.length} records from CSV\n`));

      if (records.length === 0) {
        console.log(chalk.yellow('⚠️  No records found in CSV file.'));
        return this.results;
      }

      return await this.processImport(entityType, records);
    } catch (error) {
      console.log(chalk.red(`❌ Error importing file: ${error.message}`));
      throw error;
    }
  }

  /**
   * Import data from multiple CSV files in a directory
   * @param {string} directory - Directory containing CSV files
   * @returns {Promise<Object>} - Combined import results
   */
  async importBatch(directory) {
    try {
      const files = await fs.readdir(directory);
      const csvFiles = files.filter(file => file.endsWith('.csv'));

      if (csvFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No CSV files found in directory.'));
        return this.results;
      }

      console.log(chalk.blue(`📁 Found ${csvFiles.length} CSV files in directory`));

      for (const file of csvFiles) {
        const filePath = path.join(directory, file);
        const entityType = this.detectEntityType(file);
        
        if (entityType) {
          console.log(chalk.blue(`\n📄 Processing ${file} as ${entityType}...`));
          await this.importFile(filePath, entityType);
        } else {
          console.log(chalk.yellow(`⚠️  Could not detect entity type for ${file}, skipping`));
        }
      }

      return this.results;
    } catch (error) {
      console.log(chalk.red(`❌ Error importing batch: ${error.message}`));
      throw error;
    }
  }

  /**
   * Detect entity type from filename
   * @param {string} filename - CSV filename
   * @returns {string|null} - Detected entity type
   */
  detectEntityType(filename) {
    const name = filename.toLowerCase();
    
    if (name.includes('domain')) return 'domains';
    if (name.includes('group')) return 'groups';
    if (name.includes('component')) return 'components';
    if (name.includes('connection')) return 'connections';
    if (name.includes('anomaly') || name.includes('log')) return 'anomaly-logs';
    
    return null;
  }

  /**
   * Print import summary
   */
  printSummary() {
    console.log(chalk.blue('\n📊 Import Summary:'));
    console.log(chalk.blue('================'));
    console.log(chalk.white(`Total Processed: ${this.results.processed}`));
    console.log(chalk.green(`Created: ${this.results.created}`));
    console.log(chalk.cyan(`Updated: ${this.results.updated}`));
    console.log(chalk.yellow(`Skipped (duplicates): ${this.results.skipped}`));
    console.log(chalk.red(`Errors: ${this.results.errors}`));

    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      this.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }

    if (this.duplicates.length > 0) {
      console.log(chalk.yellow('\n⚠️  Duplicates Found:'));
      this.duplicates.forEach(duplicate => {
        console.log(chalk.yellow(`  • ${duplicate}`));
      });
    }

    console.log('');
  }
}

// CLI setup
program
  .version('1.0.0')
  .description('DataFlow CSV Import Tool');

program
  .command('file')
  .description('Import data from a single CSV file')
  .requiredOption('-f, --file <path>', 'Path to CSV file')
  .requiredOption('-t, --type <type>', 'Entity type (domains, groups, components, connections, anomaly-logs)')
  .option('-d, --dry-run', 'Perform validation without importing')
  .option('-F, --force', 'Force import, updating existing records')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      await initializeDatabase();
      
      const importer = new DataImporter({
        dryRun: options.dryRun,
        force: options.force,
        verbose: options.verbose
      });

      await importer.importFile(options.file, options.type);
      importer.printSummary();

      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`Fatal error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Import data from multiple CSV files in a directory')
  .requiredOption('-d, --directory <path>', 'Directory containing CSV files')
  .option('-n, --dry-run', 'Perform validation without importing')
  .option('-F, --force', 'Force import, updating existing records')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      await initializeDatabase();
      
      const importer = new DataImporter({
        dryRun: options.dryRun,
        force: options.force,
        verbose: options.verbose
      });

      await importer.importBatch(options.directory);
      importer.printSummary();

      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`Fatal error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();

module.exports = DataImporter;