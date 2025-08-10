const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ComponentGroup = sequelize.define('ComponentGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  groupType: {
    type: DataTypes.ENUM('LOGICAL', 'PHYSICAL', 'FUNCTIONAL', 'SERVICE'),
    allowNull: false,
    defaultValue: 'LOGICAL'
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
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
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i // Hex color validation
    }
  },
  position: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: { x: 0, y: 0 }
  },
  domainId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'domains',
      key: 'id'
    }
  }
}, {
  tableName: 'component_groups',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['groupType']
    },
    {
      fields: ['domain']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = ComponentGroup;