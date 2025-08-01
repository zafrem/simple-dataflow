const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ComponentGroupMembership = sequelize.define('ComponentGroupMembership', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  componentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'components',
      key: 'id'
    }
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'component_groups',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('MEMBER', 'LEADER', 'BACKUP', 'DEPENDENCY'),
    allowNull: false,
    defaultValue: 'MEMBER'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  addedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'component_group_memberships',
  timestamps: true,
  indexes: [
    {
      fields: ['componentId']
    },
    {
      fields: ['groupId']
    },
    {
      fields: ['role']
    },
    {
      fields: ['isActive']
    },
    {
      unique: true,
      fields: ['componentId', 'groupId'],
      name: 'unique_component_group_membership'
    }
  ]
});

module.exports = ComponentGroupMembership;