const { Component, Connection, Connector } = require('../models');
const { Op } = require('sequelize');

const cleanupOldComponents = async (days = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const deletedCount = await Component.destroy({
      where: {
        isActive: false,
        lastSeen: {
          [Op.lt]: cutoffDate
        }
      }
    });
    
    console.log(`Cleanup: Removed ${deletedCount} inactive components older than ${days} days`);
    return deletedCount;
  } catch (error) {
    console.error('Error during component cleanup:', error);
    throw error;
  }
};

const cleanupOrphanedConnections = async () => {
  try {
    const orphanedConnections = await Connection.findAll({
      include: [
        {
          model: Component,
          as: 'source',
          required: false
        },
        {
          model: Component,
          as: 'target',
          required: false
        }
      ],
      where: {
        [Op.or]: [
          { '$source.id$': null },
          { '$target.id$': null }
        ]
      }
    });
    
    const deletedCount = await Connection.destroy({
      where: {
        id: orphanedConnections.map(conn => conn.id)
      }
    });
    
    console.log(`Cleanup: Removed ${deletedCount} orphaned connections`);
    return deletedCount;
  } catch (error) {
    console.error('Error during connection cleanup:', error);
    throw error;
  }
};

const updateConnectorStats = async () => {
  try {
    const connectors = await Connector.findAll();
    let updatedCount = 0;
    
    for (const connector of connectors) {
      const componentCount = await Component.count({
        where: { 
          connectorId: connector.id,
          isActive: true
        }
      });
      
      if (componentCount === 0 && connector.isActive) {
        await connector.update({ 
          isActive: false,
          status: 'idle'
        });
        updatedCount++;
      }
    }
    
    console.log(`Cleanup: Updated status for ${updatedCount} connectors`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating connector stats:', error);
    throw error;
  }
};

const performFullCleanup = async () => {
  console.log('Starting scheduled cleanup tasks...');
  
  try {
    const results = await Promise.all([
      cleanupOldComponents(),
      cleanupOrphanedConnections(),
      updateConnectorStats()
    ]);
    
    console.log('Cleanup completed successfully:', {
      componentsRemoved: results[0],
      connectionsRemoved: results[1],
      connectorsUpdated: results[2]
    });
    
    return {
      success: true,
      componentsRemoved: results[0],
      connectionsRemoved: results[1],
      connectorsUpdated: results[2]
    };
  } catch (error) {
    console.error('Cleanup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  cleanupOldComponents,
  cleanupOrphanedConnections,
  updateConnectorStats,
  performFullCleanup
};