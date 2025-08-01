const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Connector = sequelize.define('Connector', {
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
  type: {
    type: DataTypes.ENUM('database', 'api', 'logs', 'config', 'network'),
    allowNull: false
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  schedule: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isCronExpression(value) {
        if (value && !/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/.test(value)) {
          throw new Error('Invalid cron expression');
        }
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastRun: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextRun: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('idle', 'running', 'success', 'error'),
    defaultValue: 'idle'
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  errorCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'connectors',
  timestamps: true,
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['status']
    },
    {
      fields: ['nextRun']
    }
  ]
});

module.exports = Connector;