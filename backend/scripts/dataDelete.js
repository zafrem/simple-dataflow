#!/usr/bin/env node

/**
 * Data Deletion Script for DataFlow Visualization System
 * 
 * This script provides comprehensive deletion capabilities for the DataFlow system,
 * including full database cleanup and targeted deletion with advanced filtering.
 * 
 * Usage:
 *   node dataDelete.js full [--dry-run] [--force]
 *   node dataDelete.js target --type <entity_type> [filters] [--dry-run] [--force]
 * 
 * Supported entity types: domains, groups, components, connections, anomaly-logs, connectors
 */

const { program } = require('commander');
const chalk = require('chalk');
const readline = require('readline');

// Import models and database connection
const { 
  initializeDatabase, 
  sequelize,
  Domain, 
  ComponentGroup, 
  Component, 
  Connection, 
  AnomalyLog,
  Connector,
  ComponentGroupMembership
} = require('../models');

class DataDeleter {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.force = options.force || false;
    this.verbose = options.verbose || false;
    this.results = {
      domains: 0,
      groups: 0,
      components: 0,
      connections: 0,
      anomalyLogs: 0,
      connectors: 0,
      memberships: 0,
      total: 0,
      errors: 0
    };
    this.errors = [];
  }

  /**
   * Prompt user for confirmation
   * @param {string} message - Confirmation message
   * @returns {Promise<boolean>} - User confirmation
   */
  async promptConfirmation(message) {
    if (this.force) return true;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(chalk.yellow(`${message} (y/N): `), (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Delete all data from the database
   * @returns {Promise<Object>} - Deletion results
   */
  async deleteAll() {
    console.log(chalk.red('\n🗑️  FULL DATABASE DELETION'));
    console.log(chalk.red('=============================='));
    console.log(chalk.yellow('⚠️  This will delete ALL data from the system!'));
    
    if (this.dryRun) {
      console.log(chalk.blue('🧪 DRY RUN MODE: No data will actually be deleted\n'));
    } else {
      console.log(chalk.red('💀 DESTRUCTIVE MODE: All data will be permanently deleted!\n'));
    }

    // Get counts first
    const counts = await this.getAllCounts();
    
    console.log(chalk.white('Current database contents:'));
    console.log(chalk.white(`  📊 Domains: ${counts.domains}`));
    console.log(chalk.white(`  📁 Groups: ${counts.groups}`));
    console.log(chalk.white(`  🔧 Components: ${counts.components}`));
    console.log(chalk.white(`  🔗 Connections: ${counts.connections}`));
    console.log(chalk.white(`  📝 Anomaly Logs: ${counts.anomalyLogs}`));
    console.log(chalk.white(`  🔌 Connectors: ${counts.connectors}`));
    console.log(chalk.white(`  🔗 Group Memberships: ${counts.memberships}`));
    console.log(chalk.white(`  📈 Total Records: ${counts.total}\n`));

    if (counts.total === 0) {
      console.log(chalk.yellow('✅ Database is already empty, nothing to delete.'));
      return this.results;
    }

    // Confirmation
    const confirmed = await this.promptConfirmation(
      `Are you sure you want to delete ALL ${counts.total} records from the database?`
    );

    if (!confirmed) {
      console.log(chalk.yellow('❌ Deletion cancelled by user.'));
      return this.results;
    }

    if (this.dryRun) {
      console.log(chalk.blue('🧪 DRY RUN: Would delete all records'));
      this.results = counts;
      return this.results;
    }

    // Perform deletion in proper order (respecting foreign key constraints)
    console.log(chalk.yellow('🗑️  Starting deletion process...\n'));

    try {
      // 1. Delete group memberships first
      console.log(chalk.yellow('Deleting group memberships...'));
      const deletedMemberships = await ComponentGroupMembership.destroy({ where: {}, force: true });
      this.results.memberships = deletedMemberships;
      console.log(chalk.green(`✅ Deleted ${deletedMemberships} group memberships`));

      // 2. Delete connections (depend on components)
      console.log(chalk.yellow('Deleting connections...'));
      const deletedConnections = await Connection.destroy({ where: {}, force: true });
      this.results.connections = deletedConnections;
      console.log(chalk.green(`✅ Deleted ${deletedConnections} connections`));

      // 3. Delete anomaly logs (independent)
      console.log(chalk.yellow('Deleting anomaly logs...'));
      const deletedLogs = await AnomalyLog.destroy({ where: {}, force: true });
      this.results.anomalyLogs = deletedLogs;
      console.log(chalk.green(`✅ Deleted ${deletedLogs} anomaly logs`));

      // 4. Delete connectors (independent)
      console.log(chalk.yellow('Deleting connectors...'));
      const deletedConnectors = await Connector.destroy({ where: {}, force: true });
      this.results.connectors = deletedConnectors;
      console.log(chalk.green(`✅ Deleted ${deletedConnectors} connectors`));

      // 5. Delete components (may reference groups and domains)
      console.log(chalk.yellow('Deleting components...'));
      const deletedComponents = await Component.destroy({ where: {}, force: true });
      this.results.components = deletedComponents;
      console.log(chalk.green(`✅ Deleted ${deletedComponents} components`));

      // 6. Delete groups (may reference domains)
      console.log(chalk.yellow('Deleting groups...'));
      const deletedGroups = await ComponentGroup.destroy({ where: {}, force: true });
      this.results.groups = deletedGroups;
      console.log(chalk.green(`✅ Deleted ${deletedGroups} groups`));

      // 7. Delete domains (should be last)
      console.log(chalk.yellow('Deleting domains...'));
      const deletedDomains = await Domain.destroy({ where: {}, force: true });
      this.results.domains = deletedDomains;
      console.log(chalk.green(`✅ Deleted ${deletedDomains} domains`));

      this.results.total = Object.values(this.results).reduce((sum, count) => 
        typeof count === 'number' ? sum + count : sum, 0);

      console.log(chalk.green(`\n🎉 Successfully deleted ${this.results.total} records from the database!`));

    } catch (error) {
      console.log(chalk.red(`❌ Error during deletion: ${error.message}`));
      this.errors.push(`Full deletion failed: ${error.message}`);
      this.results.errors++;
      throw error;
    }

    return this.results;
  }

  /**
   * Get counts of all entities
   * @returns {Promise<Object>} - Entity counts
   */
  async getAllCounts() {
    try {
      const [domains, groups, components, connections, anomalyLogs, connectors, memberships] = await Promise.all([
        Domain.count(),
        ComponentGroup.count(),
        Component.count(),
        Connection.count(),
        AnomalyLog.count(),
        Connector.count(),
        ComponentGroupMembership.count()
      ]);

      return {
        domains,
        groups,
        components,
        connections,
        anomalyLogs,
        connectors,
        memberships,
        total: domains + groups + components + connections + anomalyLogs + connectors + memberships
      };
    } catch (error) {
      console.log(chalk.red(`❌ Error getting counts: ${error.message}`));
      throw error;
    }
  }

  /**
   * Delete specific entities based on filters
   * @param {string} entityType - Type of entity to delete
   * @param {Object} filters - Filtering criteria
   * @returns {Promise<Object>} - Deletion results
   */
  async deleteTargeted(entityType, filters = {}) {
    console.log(chalk.blue(`\n🎯 TARGETED DELETION: ${entityType.toUpperCase()}`));
    console.log(chalk.blue(`=======================================`));

    if (this.dryRun) {
      console.log(chalk.blue('🧪 DRY RUN MODE: No data will actually be deleted\n'));
    }

    const whereClause = this.buildWhereClause(entityType, filters);
    console.log(chalk.white('Filters applied:'));
    console.log(chalk.white(`  ${JSON.stringify(filters, null, 2)}\n`));

    // Get records that would be deleted
    const records = await this.getRecordsToDelete(entityType, whereClause);
    
    if (records.length === 0) {
      console.log(chalk.yellow('✅ No records found matching the specified criteria.'));
      return this.results;
    }

    console.log(chalk.white(`Found ${records.length} records to delete:`));
    
    // Show preview of records to be deleted
    this.showRecordPreview(entityType, records);

    // Confirmation
    const confirmed = await this.promptConfirmation(
      `Are you sure you want to delete ${records.length} ${entityType} record(s)?`
    );

    if (!confirmed) {
      console.log(chalk.yellow('❌ Deletion cancelled by user.'));
      return this.results;
    }

    if (this.dryRun) {
      console.log(chalk.blue(`🧪 DRY RUN: Would delete ${records.length} ${entityType} records`));
      this.results[entityType] = records.length;
      this.results.total = records.length;
      return this.results;
    }

    // Perform targeted deletion
    console.log(chalk.yellow(`🗑️  Deleting ${records.length} ${entityType} records...\n`));

    try {
      const deletedCount = await this.performTargetedDeletion(entityType, whereClause);
      this.results[entityType] = deletedCount;
      this.results.total = deletedCount;

      console.log(chalk.green(`✅ Successfully deleted ${deletedCount} ${entityType} records!`));

    } catch (error) {
      console.log(chalk.red(`❌ Error during targeted deletion: ${error.message}`));
      this.errors.push(`Targeted deletion failed: ${error.message}`);
      this.results.errors++;
      throw error;
    }

    return this.results;
  }

  /**
   * Build WHERE clause based on entity type and filters
   * @param {string} entityType - Entity type
   * @param {Object} filters - Filter parameters
   * @returns {Object} - Sequelize WHERE clause
   */
  buildWhereClause(entityType, filters) {
    const { Op } = require('sequelize');
    const where = {};

    switch (entityType) {
      case 'domains':
        if (filters.name) where.name = { [Op.iLike]: `%${filters.name}%` };
        if (filters.color) where.color = filters.color;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        break;

      case 'groups':
        if (filters.name) where.name = { [Op.iLike]: `%${filters.name}%` };
        if (filters.groupType) where.groupType = filters.groupType;
        if (filters.domain) where.domain = filters.domain;
        if (filters.domainId) where.domainId = filters.domainId;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        break;

      case 'components':
        if (filters.name) where.name = { [Op.iLike]: `%${filters.name}%` };
        if (filters.type) where.type = filters.type;
        if (filters.domain) where.domain = filters.domain;
        if (filters.source) where.source = filters.source;
        if (filters.team) where.team = { [Op.iLike]: `%${filters.team}%` };
        if (filters.tag) where.tag = { [Op.iLike]: `%${filters.tag}%` };
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        break;

      case 'connections':
        if (filters.domain) where.domain = filters.domain;
        if (filters.connectionType) where.connectionType = filters.connectionType;
        if (filters.sourceId) where.sourceId = filters.sourceId;
        if (filters.targetId) where.targetId = filters.targetId;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        break;

      case 'anomaly-logs':
        if (filters.importance) where.importance = filters.importance;
        if (filters.category) where.category = filters.category;
        if (filters.source) where.source = filters.source;
        if (filters.message) where.message = { [Op.iLike]: `%${filters.message}%` };
        if (filters.olderThan) {
          const date = new Date();
          date.setDate(date.getDate() - parseInt(filters.olderThan));
          where.timestamp = { [Op.lt]: date };
        }
        break;

      case 'connectors':
        if (filters.name) where.name = { [Op.iLike]: `%${filters.name}%` };
        if (filters.type) where.type = filters.type;
        if (filters.status) where.status = filters.status;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        break;
    }

    return where;
  }

  /**
   * Get records that would be deleted
   * @param {string} entityType - Entity type
   * @param {Object} whereClause - WHERE clause
   * @returns {Promise<Array>} - Records to delete
   */
  async getRecordsToDelete(entityType, whereClause) {
    const models = {
      domains: Domain,
      groups: ComponentGroup,
      components: Component,
      connections: Connection,
      'anomaly-logs': AnomalyLog,
      connectors: Connector
    };

    const model = models[entityType];
    if (!model) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    const options = {
      where: whereClause,
      limit: 100, // Limit preview
      order: [['createdAt', 'DESC']]
    };

    // Add includes for related data preview
    if (entityType === 'components') {
      options.include = [
        { model: Connection, as: 'outgoingConnections', attributes: ['id'] },
        { model: Connection, as: 'incomingConnections', attributes: ['id'] }
      ];
    }

    return await model.findAll(options);
  }

  /**
   * Show preview of records to be deleted
   * @param {string} entityType - Entity type
   * @param {Array} records - Records to preview
   */
  showRecordPreview(entityType, records) {
    const maxPreview = 10;
    const showCount = Math.min(records.length, maxPreview);

    for (let i = 0; i < showCount; i++) {
      const record = records[i];
      let preview = '';

      switch (entityType) {
        case 'domains':
          preview = `  ${i + 1}. ${record.name} (ID: ${record.id})`;
          break;
        case 'groups':
          preview = `  ${i + 1}. ${record.name} [${record.groupType}] (ID: ${record.id})`;
          break;
        case 'components':
          const connectionInfo = record.outgoingConnections && record.incomingConnections 
            ? ` - ${record.outgoingConnections.length + record.incomingConnections.length} connections`
            : '';
          preview = `  ${i + 1}. ${record.name} [${record.type}] ${record.team ? `(${record.team})` : ''} (ID: ${record.id})${connectionInfo}`;
          break;
        case 'connections':
          preview = `  ${i + 1}. ${record.sourceId} → ${record.targetId} [${record.connectionType}] (ID: ${record.id})`;
          break;
        case 'anomaly-logs':
          preview = `  ${i + 1}. ${record.message.substring(0, 50)}... [${record.importance}] (ID: ${record.id})`;
          break;
        case 'connectors':
          preview = `  ${i + 1}. ${record.name} [${record.type}] - ${record.status} (ID: ${record.id})`;
          break;
      }

      console.log(chalk.white(preview));
    }

    if (records.length > maxPreview) {
      console.log(chalk.gray(`  ... and ${records.length - maxPreview} more records`));
    }
    console.log('');
  }

  /**
   * Perform the actual targeted deletion
   * @param {string} entityType - Entity type
   * @param {Object} whereClause - WHERE clause
   * @returns {Promise<number>} - Number of deleted records
   */
  async performTargetedDeletion(entityType, whereClause) {
    const models = {
      domains: Domain,
      groups: ComponentGroup,
      components: Component,
      connections: Connection,
      'anomaly-logs': AnomalyLog,
      connectors: Connector
    };

    const model = models[entityType];
    if (!model) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Handle cascading deletions for components
    if (entityType === 'components') {
      // Find component IDs first
      const components = await model.findAll({
        where: whereClause,
        attributes: ['id']
      });
      
      const componentIds = components.map(c => c.id);
      
      if (componentIds.length > 0) {
        // Delete related connections first
        const { Op } = require('sequelize');
        await Connection.destroy({
          where: {
            [Op.or]: [
              { sourceId: { [Op.in]: componentIds } },
              { targetId: { [Op.in]: componentIds } }
            ]
          },
          force: true
        });

        // Delete group memberships
        await ComponentGroupMembership.destroy({
          where: { componentId: { [Op.in]: componentIds } },
          force: true
        });
      }
    }

    // Perform the main deletion
    return await model.destroy({
      where: whereClause,
      force: true
    });
  }

  /**
   * Print deletion summary
   */
  printSummary() {
    console.log(chalk.blue('\n📊 Deletion Summary:'));
    console.log(chalk.blue('==================='));
    
    if (this.results.domains > 0) console.log(chalk.red(`Deleted Domains: ${this.results.domains}`));
    if (this.results.groups > 0) console.log(chalk.red(`Deleted Groups: ${this.results.groups}`));
    if (this.results.components > 0) console.log(chalk.red(`Deleted Components: ${this.results.components}`));
    if (this.results.connections > 0) console.log(chalk.red(`Deleted Connections: ${this.results.connections}`));
    if (this.results.anomalyLogs > 0) console.log(chalk.red(`Deleted Anomaly Logs: ${this.results.anomalyLogs}`));
    if (this.results.connectors > 0) console.log(chalk.red(`Deleted Connectors: ${this.results.connectors}`));
    if (this.results.memberships > 0) console.log(chalk.red(`Deleted Group Memberships: ${this.results.memberships}`));
    
    console.log(chalk.white(`Total Records Deleted: ${this.results.total}`));
    console.log(chalk.red(`Errors: ${this.results.errors}`));

    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      this.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }

    console.log('');
  }
}

// CLI setup
program
  .version('1.0.0')
  .description('DataFlow Data Deletion Tool');

program
  .command('full')
  .description('Delete ALL data from the database (DESTRUCTIVE)')
  .option('-d, --dry-run', 'Show what would be deleted without actually deleting')
  .option('-F, --force', 'Skip confirmation prompts')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      await initializeDatabase();
      
      const deleter = new DataDeleter({
        dryRun: options.dryRun,
        force: options.force,
        verbose: options.verbose
      });

      await deleter.deleteAll();
      deleter.printSummary();

      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`Fatal error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('target')
  .description('Delete specific records based on criteria')
  .requiredOption('-t, --type <type>', 'Entity type (domains, groups, components, connections, anomaly-logs, connectors)')
  .option('--name <name>', 'Filter by name (partial match)')
  .option('--domain <domain>', 'Filter by domain')
  .option('--type-filter <type>', 'Filter by type (for components/connectors)')
  .option('--source <source>', 'Filter by source')
  .option('--team <team>', 'Filter by team (components only)')
  .option('--tag <tag>', 'Filter by tag (partial match)')
  .option('--importance <importance>', 'Filter by importance (anomaly-logs only)')
  .option('--category <category>', 'Filter by category (anomaly-logs only)')
  .option('--older-than <days>', 'Delete records older than N days (anomaly-logs only)')
  .option('--status <status>', 'Filter by status (connectors only)')
  .option('--inactive', 'Only delete inactive records')
  .option('--active', 'Only delete active records')
  .option('-d, --dry-run', 'Show what would be deleted without actually deleting')
  .option('-F, --force', 'Skip confirmation prompts')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      await initializeDatabase();
      
      const deleter = new DataDeleter({
        dryRun: options.dryRun,
        force: options.force,
        verbose: options.verbose
      });

      // Build filters object
      const filters = {};
      if (options.name) filters.name = options.name;
      if (options.domain) filters.domain = options.domain;
      if (options.typeFilter) filters.type = options.typeFilter;
      if (options.source) filters.source = options.source;
      if (options.team) filters.team = options.team;
      if (options.tag) filters.tag = options.tag;
      if (options.importance) filters.importance = options.importance;
      if (options.category) filters.category = options.category;
      if (options.olderThan) filters.olderThan = options.olderThan;
      if (options.status) filters.status = options.status;
      if (options.inactive) filters.isActive = false;
      if (options.active) filters.isActive = true;

      await deleter.deleteTargeted(options.type, filters);
      deleter.printSummary();

      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`Fatal error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();

module.exports = DataDeleter;