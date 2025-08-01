const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Connection = sequelize.define('Connection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sourceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'components',
      key: 'id'
    }
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'components',
      key: 'id'
    }
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  connectionType: {
    type: DataTypes.ENUM('domain', 'direct', 'inferred'),
    defaultValue: 'domain'
  },
  strength: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
    validate: {
      min: 0.0,
      max: 1.0
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
  }
}, {
  tableName: 'connections',
  timestamps: true,
  indexes: [
    {
      fields: ['sourceId']
    },
    {
      fields: ['targetId']
    },
    {
      fields: ['domain']
    },
    {
      fields: ['connectionType']
    },
    {
      unique: true,
      fields: ['sourceId', 'targetId']
    }
  ]
});

module.exports = Connection;