const sequelize = require('../config/database');
const Component = require('./Component');
const Connector = require('./Connector');
const Connection = require('./Connection');
const ComponentGroup = require('./ComponentGroup');
const ComponentGroupMembership = require('./ComponentGroupMembership');

// Component-Connector relationships
Component.belongsTo(Connector, { foreignKey: 'connectorId', as: 'connector' });
Connector.hasMany(Component, { foreignKey: 'connectorId', as: 'components' });

// Connection relationships
Connection.belongsTo(Component, { foreignKey: 'sourceId', as: 'source' });
Connection.belongsTo(Component, { foreignKey: 'targetId', as: 'target' });

Component.hasMany(Connection, { foreignKey: 'sourceId', as: 'outgoingConnections' });
Component.hasMany(Connection, { foreignKey: 'targetId', as: 'incomingConnections' });

// Component Group relationships (Many-to-Many through ComponentGroupMembership)
Component.belongsToMany(ComponentGroup, { 
  through: ComponentGroupMembership, 
  foreignKey: 'componentId',
  otherKey: 'groupId',
  as: 'groups'
});

ComponentGroup.belongsToMany(Component, { 
  through: ComponentGroupMembership, 
  foreignKey: 'groupId',
  otherKey: 'componentId',
  as: 'components'
});

// Direct relationships for easier querying
ComponentGroupMembership.belongsTo(Component, { foreignKey: 'componentId', as: 'component' });
ComponentGroupMembership.belongsTo(ComponentGroup, { foreignKey: 'groupId', as: 'group' });

Component.hasMany(ComponentGroupMembership, { foreignKey: 'componentId', as: 'memberships' });
ComponentGroup.hasMany(ComponentGroupMembership, { foreignKey: 'groupId', as: 'memberships' });

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Component,
  Connector,
  Connection,
  ComponentGroup,
  ComponentGroupMembership,
  initializeDatabase
};