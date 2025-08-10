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
        // Use name and type to identify components since tag is no longer unique
        const [component, created] = await Component.findOrCreate({
          where: { 
            name: componentData.name,
            type: componentData.type 
          },
          defaults: {
            ...componentData,
            connectorId,
            lastSeen: new Date()
          }
        });

        if (!created) {
          await component.update({
            name: componentData.name,
            tag: componentData.tag || ['Other'],
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

  addComponent(name, type, metadata = {}, tags = ['Other']) {
    const componentType = type || inferComponentType(name, this.constructor.name);
    
    // Validate tags against allowed values and ensure at least one tag
    const allowedTags = ['PIPS', 'SOX', 'HR', 'Proj', 'Infra', 'Other'];
    let validTags = Array.isArray(tags) ? 
      tags.filter(tag => allowedTags.includes(tag)) : [];
    
    // If no valid tags provided, default to 'Other'
    if (validTags.length === 0) {
      validTags = ['Other'];
    }
    
    this.components.push({
      name: name.trim(),
      type: componentType,
      source: this.getSourceType(),
      tag: validTags, // Use the existing tag field as array
      metadata: {
        discoveredAt: new Date().toISOString(),
        connector: this.constructor.name,
        ...metadata
      }
    });
  }

  // generateTag method removed since we now use predefined tags

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