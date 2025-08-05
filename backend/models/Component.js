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
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 100]
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
      fields: ['tag']
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
      if (component.tag) {
        const match = component.tag.match(/^(.+)_(db|api|app|storage|pipes)$/);
        if (match) {
          component.domain = match[1];
        }
      }
    }
  }
});

module.exports = Component;