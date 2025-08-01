const { Component } = require('../models');
const { generateUniqueTag, inferComponentType, generateTagPattern } = require('../utils/tagExtractor');
const { buildConnections } = require('../utils/connectionBuilder');

class BaseConnector {
  constructor(config) {
    this.config = config;
    this.components = [];
  }

  async test() {
    throw new Error('Test method must be implemented by subclasses');
  }

  async sync() {
    throw new Error('Sync method must be implemented by subclasses');
  }

  async saveComponents(connectorId) {
    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const componentData of this.components) {
      try {
        const existingTags = await Component.findAll({
          attributes: ['tag'],
          raw: true
        }).then(results => results.map(r => r.tag));

        const tag = componentData.tag || generateUniqueTag(
          componentData.name, 
          componentData.type, 
          existingTags
        );

        const [component, created] = await Component.findOrCreate({
          where: { tag },
          defaults: {
            ...componentData,
            tag,
            connectorId,
            lastSeen: new Date()
          }
        });

        if (!created) {
          await component.update({
            name: componentData.name,
            metadata: { ...component.metadata, ...componentData.metadata },
            lastSeen: new Date(),
            isActive: true
          });
          results.updated++;
        } else {
          results.created++;
        }

        await buildConnections(component.id);

      } catch (error) {
        console.error(`Error saving component ${componentData.name}:`, error);
        results.errors.push({
          component: componentData.name,
          error: error.message
        });
      }
    }

    return results;
  }

  addComponent(name, type, metadata = {}) {
    const componentType = type || inferComponentType(name, this.constructor.name);
    
    this.components.push({
      name: name.trim(),
      type: componentType,
      source: this.getSourceType(),
      metadata: {
        discoveredAt: new Date().toISOString(),
        connector: this.constructor.name,
        ...metadata
      }
    });
  }

  generateTag(name, type) {
    if (this.config.tagPattern) {
      return generateTagPattern(this.config.tagPattern, {
        name: name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
        service: name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
        table: name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
        match: name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')
      });
    }
    
    const baseName = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const typeSuffix = type.toLowerCase();
    return `${baseName}_${typeSuffix}`;
  }

  getSourceType() {
    return this.constructor.name.toLowerCase().replace('connector', '');
  }

  validateConfig() {
    if (!this.config) {
      throw new Error('Configuration is required');
    }
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      connector: this.constructor.name,
      message,
      data
    };
    
    console.log(JSON.stringify(logEntry));
  }

  async cleanup() {
    this.components = [];
  }
}

module.exports = BaseConnector;