const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Component = sequelize.define('Component', {
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
  tag: {
    type: DataTypes.ARRAY(DataTypes.ENUM('PIPS', 'SOX', 'HR', 'Proj', 'Infra', 'Other')),
    allowNull: false,
    defaultValue: ['Other'],
    validate: {
      notEmpty: true,
      isValidTagArray(value) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('Tag must be an array with at least one value');
        }
        const allowedTags = ['PIPS', 'SOX', 'HR', 'Proj', 'Infra', 'Other'];
        const invalidTags = value.filter(tag => !allowedTags.includes(tag));
        if (invalidTags.length > 0) {
          throw new Error(`Invalid tags: ${invalidTags.join(', ')}. Allowed tags: ${allowedTags.join(', ')}`);
        }
      }
    }
  },
  type: {
    type: DataTypes.ENUM('DB', 'API', 'APP', 'STORAGE', 'PIPES'),
    allowNull: false
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'manual',
    validate: {
      isIn: [['manual', 'database', 'swagger', 'logs', 'config_scan', 'network']]
    }
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  connectorId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  domainId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'domains',
      key: 'id'
    }
  },
  team: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  }
}, {
  tableName: 'components',
  timestamps: true,
  indexes: [
    {
      fields: ['tag'],
      using: 'gin'
    },
    {
      fields: ['type']
    },
    {
      fields: ['domain']
    },
    {
      fields: ['source']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['team']
    }
  ],
  hooks: {
    beforeSave: (component) => {
      // Since tag is now an array, we can't derive domain from it
      // Domain extraction logic can be moved to name or other fields if needed
    }
  }
});

module.exports = Component;