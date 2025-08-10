#!/usr/bin/env node

/**
 * AddMock from Existing Data Script
 * 
 * This script extracts data from the existing addMockData.js sample data
 * and converts it to CSV format, then imports it using the dataImport system.
 * 
 * Usage:
 *   node addMockFromExisting.js [--dry-run] [--force]
 */

const fs = require('fs').promises;
const path = require('path');
const { Command } = require('commander');
const chalk = require('chalk');

// Import the existing mock data and database initialization
const { sampleComponents, sampleConnectors } = require('./addMockData');
const { initializeDatabase, Domain, ComponentGroup, Component, Connector } = require('../models');
// Don't import DataImporter class to avoid CLI conflicts - we'll spawn it as child process

class MockDataExtractor {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.force = options.force || false;
    this.verbose = options.verbose || false;
    this.outputDir = path.join(__dirname, 'extracted-data');
  }

  /**
   * Create output directory if it doesn't exist
   */
  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(chalk.green(`✅ Created output directory: ${this.outputDir}`));
    }
  }

  /**
   * Convert array of objects to CSV format
   * @param {Array} data - Array of objects to convert
   * @param {Array} headers - CSV headers
   * @returns {string} - CSV content
   */
  arrayToCSV(data, headers) {
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header] || '';
        
        // Handle objects/arrays - convert to JSON string
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value).replace(/"/g, '""');
          return `"${value}"`;
        }
        
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = value.replace(/"/g, '""');
          return `"${value}"`;
        }
        
        return value;
      });
      
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Extract domains from components data
   * @returns {Array} - Array of unique domains
   */
  extractDomains() {
    const domainsSet = new Set();
    const domains = [];
    
    sampleComponents.forEach(component => {
      if (component.domain && !domainsSet.has(component.domain)) {
        domainsSet.add(component.domain);
        
        const domainColors = {
          user: '#3498db',
          order: '#e74c3c',
          payment: '#2ecc71',
          analytics: '#f39c12'
        };
        
        domains.push({
          name: `${component.domain.charAt(0).toUpperCase() + component.domain.slice(1)} Domain`,
          description: `Domain containing ${component.domain} related components and services`,
          color: domainColors[component.domain] || '#95a5a6',
          pipelines: JSON.stringify([]),
          metadata: JSON.stringify({
            owner: `${component.domain}-team`,
            criticality: component.domain === 'payment' ? 'high' : 'medium',
            auto_generated: true
          })
        });
      }
    });
    
    return domains;
  }

  /**
   * Extract groups from existing mock data
   * @returns {Array} - Array of groups with proper CSV format
   */
  extractGroups() {
    // Sample groups from addMockData.js
    const sampleGroups = [
      {
        name: "Core Business Logic",
        description: "Complete user management and payment processing stacks",
        groupType: "FUNCTIONAL",
        domain: null,
        color: "#e74c3c",
        metadata: { criticality: "high", uptime: "99.9%", cross_domain: true }
      },
      {
        name: "Data Storage Layer", 
        description: "Persistent storage systems - databases, caches, and data warehouses",
        groupType: "PHYSICAL",
        domain: null,
        color: "#9b59b6",
        metadata: { backup_schedule: "daily", monitoring: "24/7", redundancy: "enabled" }
      },
      {
        name: "API Gateway Layer",
        description: "Public-facing APIs with supporting backend services", 
        groupType: "SERVICE",
        domain: null,
        color: "#2ecc71",
        metadata: { rate_limiting: "enabled", authentication: "required", load_balancing: "active" }
      },
      {
        name: "Order Processing Workflow",
        description: "Complete order management pipeline from request to fulfillment",
        groupType: "LOGICAL", 
        domain: "order",
        color: "#f39c12",
        metadata: { batch_schedule: "real-time", includes_analytics: true, cross_system: true }
      }
    ];

    return sampleGroups.map(group => ({
      name: group.name,
      description: group.description,
      group_type: group.groupType,
      domain: group.domain || '',
      color: group.color,
      position: JSON.stringify({ x: 0, y: 0 }),
      metadata: JSON.stringify(group.metadata)
    }));
  }

  /**
   * Extract and format components
   * @returns {Array} - Array of components with proper CSV format
   */
  extractComponents() {
    return sampleComponents.map((component, index) => ({
      name: component.name,
      type: component.type,
      tag: component.tag,
      description: component.description,
      domain: component.domain,
      source: component.source,
      team: `${component.domain} Team`,
      metadata: JSON.stringify({
        environment: index % 4 === 0 ? 'production' : index % 4 === 1 ? 'staging' : index % 4 === 2 ? 'development' : 'testing',
        version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.0`,
        lastHealthCheck: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        cpu: Math.floor(Math.random() * 80) + 10,
        memory: Math.floor(Math.random() * 80) + 10,
        uptime: Math.floor(Math.random() * 720) + 24 // 1-30 days
      })
    }));
  }

  /**
   * Extract connections based on domain relationships
   * @returns {Array} - Array of connections with proper CSV format
   */
  extractConnections() {
    const connections = [];
    
    // Define connection patterns for each domain
    const domainConnections = {
      user: [
        { from: 'user_db', to: 'user_service', type: 'direct' },
        { from: 'user_service', to: 'user_api', type: 'direct' },
        { from: 'user_service', to: 'user_cache', type: 'direct' },
        { from: 'user_api', to: 'user_pipeline', type: 'direct' }
      ],
      order: [
        { from: 'order_db', to: 'order_service', type: 'direct' },
        { from: 'order_service', to: 'order_api', type: 'direct' },
        { from: 'order_service', to: 'order_queue', type: 'direct' },
        { from: 'order_api', to: 'order_pipeline', type: 'direct' }
      ],
      payment: [
        { from: 'payment_db', to: 'payment_service', type: 'direct' },
        { from: 'payment_service', to: 'payment_api', type: 'direct' },
        { from: 'payment_service', to: 'payment_vault', type: 'direct' },
        { from: 'payment_api', to: 'payment_pipeline', type: 'direct' }
      ],
      analytics: [
        { from: 'analytics_db', to: 'analytics_service', type: 'direct' },
        { from: 'analytics_service', to: 'analytics_api', type: 'direct' },
        { from: 'analytics_service', to: 'analytics_storage', type: 'direct' },
        { from: 'analytics_api', to: 'analytics_pipeline', type: 'direct' }
      ]
    };

    // Cross-domain connections
    const crossDomainConnections = [
      { from: 'user_service', to: 'order_service', domain: 'integration', type: 'domain' },
      { from: 'order_service', to: 'payment_service', domain: 'integration', type: 'domain' },
      { from: 'user_pipeline', to: 'analytics_service', domain: 'integration', type: 'domain' },
      { from: 'order_pipeline', to: 'analytics_service', domain: 'integration', type: 'domain' },
      { from: 'payment_pipeline', to: 'analytics_service', domain: 'integration', type: 'domain' }
    ];

    // Add domain-specific connections
    Object.entries(domainConnections).forEach(([domain, domainConns]) => {
      domainConns.forEach(conn => {
        connections.push({
          source_tag: conn.from,
          target_tag: conn.to,
          domain: domain,
          connection_type: conn.type,
          strength: 1.0,
          metadata: JSON.stringify({
            auto_generated: true,
            pattern: 'domain-internal',
            created_at: new Date().toISOString()
          })
        });
      });
    });

    // Add cross-domain connections
    crossDomainConnections.forEach(conn => {
      connections.push({
        source_tag: conn.from,
        target_tag: conn.to,
        domain: conn.domain,
        connection_type: conn.type,
        strength: 0.8,
        metadata: JSON.stringify({
          auto_generated: true,
          pattern: 'cross-domain',
          created_at: new Date().toISOString()
        })
      });
    });

    return connections;
  }

  /**
   * Generate sample anomaly logs
   * @returns {Array} - Array of anomaly logs
   */
  extractAnomalyLogs() {
    const anomalyTypes = [
      { message: 'High CPU usage detected on user service', importance: 'high', category: 'performance' },
      { message: 'Database connection timeout in payment system', importance: 'critical', category: 'system' },
      { message: 'Unusual traffic pattern detected on API gateway', importance: 'medium', category: 'security' },
      { message: 'New order processing component discovered', importance: 'info', category: 'object_addition' },
      { message: 'Analytics pipeline processing delay', importance: 'low', category: 'performance' },
      { message: 'Failed authentication attempts spike', importance: 'high', category: 'security' },
      { message: 'Storage capacity reaching threshold', importance: 'medium', category: 'system' }
    ];

    return anomalyTypes.map((anomaly, index) => ({
      message: anomaly.message,
      importance: anomaly.importance,
      category: anomaly.category,
      source: 'mock-generator',
      details: JSON.stringify({
        component: sampleComponents[index % sampleComponents.length].tag,
        timestamp: new Date().toISOString(),
        auto_generated: true
      }),
      tags: JSON.stringify(['mock', 'sample', anomaly.category]),
      retention_days: 30,
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString() // Random time within last 24h
    }));
  }

  /**
   * Write CSV files for all entity types
   */
  async writeCSVFiles() {
    await this.ensureOutputDir();

    const entities = {
      domains: {
        data: this.extractDomains(),
        headers: ['name', 'description', 'color', 'pipelines', 'metadata']
      },
      groups: {
        data: this.extractGroups(),
        headers: ['name', 'description', 'group_type', 'domain', 'color', 'position', 'metadata']
      },
      components: {
        data: this.extractComponents(),
        headers: ['name', 'type', 'tag', 'description', 'domain', 'source', 'team', 'metadata']
      },
      connections: {
        data: this.extractConnections(),
        headers: ['source_tag', 'target_tag', 'domain', 'connection_type', 'strength', 'metadata']
      },
      'anomaly-logs': {
        data: this.extractAnomalyLogs(),
        headers: ['message', 'importance', 'category', 'source', 'details', 'tags', 'retention_days', 'timestamp']
      }
    };

    const filePaths = {};

    for (const [entityType, entity] of Object.entries(entities)) {
      const csvContent = this.arrayToCSV(entity.data, entity.headers);
      const fileName = `${entityType}.csv`;
      const filePath = path.join(this.outputDir, fileName);
      
      await fs.writeFile(filePath, csvContent, 'utf8');
      filePaths[entityType] = filePath;
      
      console.log(chalk.green(`✅ Created ${fileName} with ${entity.data.length} records`));
    }

    return filePaths;
  }

  /**
   * Import the generated CSV files using dataImport.js as child process
   * @param {Object} filePaths - Object containing file paths for each entity type
   */
  async importCSVFiles(filePaths) {
    console.log(chalk.blue('\n🔄 Starting import process...\n'));

    // Import order matters - domains first, then groups, components, connections, logs
    const importOrder = ['domains', 'groups', 'components', 'connections', 'anomaly-logs'];

    const { spawn } = require('child_process');

    for (const entityType of importOrder) {
      if (filePaths[entityType]) {
        console.log(chalk.blue(`\n📊 Importing ${entityType}...`));
        
        const args = ['scripts/dataImport.js', 'file', '-f', filePaths[entityType], '-t', entityType];
        
        if (this.dryRun) {
          args.push('-d');
        }
        if (this.force) {
          args.push('-F');
        }
        if (this.verbose) {
          args.push('-v');
        }

        try {
          await new Promise((resolve, reject) => {
            const child = spawn('node', args, {
              cwd: path.dirname(__dirname),
              stdio: 'inherit'
            });

            child.on('close', (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Import process exited with code ${code}`));
              }
            });

            child.on('error', (error) => {
              reject(error);
            });
          });
        } catch (error) {
          console.log(chalk.red(`❌ Failed to import ${entityType}: ${error.message}`));
          throw error;
        }
      }
    }
  }

  /**
   * Clean up generated CSV files (optional)
   */
  async cleanup() {
    if (!this.dryRun) {
      try {
        const files = await fs.readdir(this.outputDir);
        for (const file of files) {
          if (file.endsWith('.csv')) {
            await fs.unlink(path.join(this.outputDir, file));
          }
        }
        console.log(chalk.green(`✅ Cleaned up temporary CSV files`));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not clean up files: ${error.message}`));
      }
    }
  }

  /**
   * Run the complete extraction and import process
   */
  async run() {
    try {
      console.log(chalk.blue('🚀 Starting AddMock from Existing Data process...\n'));

      // Initialize database
      console.log(chalk.blue('🔧 Initializing database...'));
      await initializeDatabase();
      console.log(chalk.green('✅ Database initialized\n'));

      // Extract and write CSV files
      console.log(chalk.blue('📊 Extracting data from existing mock samples...'));
      const filePaths = await this.writeCSVFiles();
      console.log(chalk.green(`✅ Created ${Object.keys(filePaths).length} CSV files\n`));

      if (this.dryRun) {
        console.log(chalk.blue('🧪 DRY RUN: Would import the following files:'));
        Object.entries(filePaths).forEach(([type, path]) => {
          console.log(chalk.cyan(`  • ${type}: ${path}`));
        });
      } else {
        // Import the CSV files
        await this.importCSVFiles(filePaths);
        
        // Clean up temporary files
        await this.cleanup();
      }

      console.log(chalk.green('\n🎉 AddMock from existing data completed successfully!'));
      console.log(chalk.blue('\nThe system now contains:'));
      console.log(chalk.white('  • Domain structures from existing mock data'));
      console.log(chalk.white('  • Component groups with proper relationships'));
      console.log(chalk.white('  • All mock components with metadata'));
      console.log(chalk.white('  • Realistic connections between components'));
      console.log(chalk.white('  • Sample anomaly logs for testing'));

    } catch (error) {
      console.log(chalk.red(`\n❌ Error during AddMock process: ${error.message}`));
      throw error;
    }
  }
}

// CLI setup
async function main() {
  const program = new Command();
  
  program
    .version('1.0.0')
    .description('Extract and import mock data from existing samples')
    .option('-d, --dry-run', 'Perform extraction and validation without importing')
    .option('-F, --force', 'Force import, updating existing records')
    .option('-v, --verbose', 'Verbose output');

  program.parse();
  
  const options = program.opts();

  try {
    const extractor = new MockDataExtractor(options);
    await extractor.run();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = MockDataExtractor;