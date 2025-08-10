const { Component, Connection } = require('../models');
const { extractDomainFromTag } = require('./tagExtractor');

const buildConnections = async (componentId = null) => {
  try {
    let components;
    if (componentId) {
      components = await Component.findAll({
        where: { id: componentId },
        attributes: ['id', 'tag', 'domain', 'type']
      });
    } else {
      components = await Component.findAll({
        where: { isActive: true },
        attributes: ['id', 'tag', 'domain', 'type']
      });
    }

    const connectionMap = new Map();
    
    components.forEach(component => {
      const domain = component.domain || extractDomainFromTag(component.tag);
      if (!domain) return;
      
      if (!connectionMap.has(domain)) {
        connectionMap.set(domain, []);
      }
      connectionMap.get(domain).push(component);
    });

    const connectionsToCreate = [];
    
    for (const [domain, domainComponents] of connectionMap) {
      if (domainComponents.length < 2) continue;
      
      // Find DB component as the hub center
      const dbComponent = domainComponents.find(comp => comp.type === 'DB');
      if (!dbComponent) continue; // Skip domains without DB
      
      // Connect all non-DB components to the DB (DB as hub)
      domainComponents.forEach(component => {
        if (component.type !== 'DB') {
          // DB -> Component (DB is source)
          connectionsToCreate.push({
            sourceId: dbComponent.id,
            targetId: component.id,
            domain: domain,
            connectionType: 'domain',
            strength: calculateConnectionStrength('DB', component.type)
          });
        }
      });
    }

    if (connectionsToCreate.length > 0) {
      await Connection.destroy({
        where: componentId ? {
          [require('sequelize').Op.or]: [
            { sourceId: componentId },
            { targetId: componentId }
          ]
        } : {}
      });
      
      await Connection.bulkCreate(connectionsToCreate, {
        ignoreDuplicates: true
      });
    }

    return connectionsToCreate.length;
  } catch (error) {
    console.error('Error building connections:', error);
    throw error;
  }
};

const calculateConnectionStrength = (sourceType, targetType) => {
  // Enhanced connection matrix with new component types
  const strengthMatrix = {
    'DB': { 'API': 0.9, 'APP': 0.8, 'STORAGE': 0.7, 'PIPES': 0.6 },        // DB feeds various consumers
    'STORAGE': { 'DB': 0.8, 'API': 0.7, 'APP': 0.6, 'PIPES': 0.9 },        // Storage systems
    'API': { 'APP': 0.6, 'PIPES': 0.7, 'STORAGE': 0.5, 'DB': 0.4 },        // API connections
    'APP': { 'API': 0.8, 'PIPES': 0.6, 'STORAGE': 0.5, 'DB': 0.3 },        // App connections
    'PIPES': { 'API': 0.7, 'APP': 0.5, 'STORAGE': 0.8, 'DB': 0.4 }         // Processing pipes
  };
  
  return strengthMatrix[sourceType]?.[targetType] || 0.5;
};

const getConnectionStats = async () => {
  try {
    const totalConnections = await Connection.count({
      where: { isActive: true }
    });
    
    const connectionsByDomain = await Connection.findAll({
      attributes: [
        'domain',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['domain'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']]
    });
    
    const connectionsByType = await Connection.findAll({
      attributes: [
        'connectionType',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['connectionType']
    });

    return {
      total: totalConnections,
      byDomain: connectionsByDomain,
      byType: connectionsByType
    };
  } catch (error) {
    console.error('Error getting connection stats:', error);
    throw error;
  }
};

module.exports = {
  buildConnections,
  calculateConnectionStrength,
  getConnectionStats
};