const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const AnomalyLog = sequelize.define('AnomalyLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 1000]
    }
  },
  importance: {
    type: DataTypes.ENUM('critical', 'high', 'medium', 'low', 'info'),
    allowNull: false,
    defaultValue: 'medium'
  },
  category: {
    type: DataTypes.ENUM('system', 'object_addition', 'anomaly', 'security', 'performance'),
    allowNull: false,
    defaultValue: 'system'
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Source system or component that generated this log'
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional structured data related to the log entry'
  },
  retentionDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 1,
      max: 365
    }
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of tags for categorization and searching'
  }
}, {
  tableName: 'anomaly_logs',
  timestamps: true,
  indexes: [
    {
      fields: ['importance']
    },
    {
      fields: ['category']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['expiresAt']
    },
    {
      fields: ['source']
    },
    {
      fields: ['isRead']
    }
  ],
  hooks: {
    beforeCreate: (log) => {
      // Set timestamp if not provided
      if (!log.timestamp) {
        log.timestamp = new Date()
      }
      // Calculate expiration date based on retention days
      const expiryDate = new Date(log.timestamp)
      expiryDate.setDate(expiryDate.getDate() + (log.retentionDays || 30))
      log.expiresAt = expiryDate
    },
    beforeUpdate: (log) => {
      // Recalculate expiration date if retention days changed
      if (log.changed('retentionDays') || log.changed('timestamp')) {
        const expiryDate = new Date(log.timestamp || log.createdAt)
        expiryDate.setDate(expiryDate.getDate() + (log.retentionDays || 30))
        log.expiresAt = expiryDate
      }
    }
  }
})

// Class methods
AnomalyLog.findActive = function(options = {}) {
  return this.findAll({
    where: {
      expiresAt: {
        [sequelize.Sequelize.Op.gt]: new Date()
      },
      ...options.where
    },
    order: [['timestamp', 'DESC']],
    ...options
  })
}

AnomalyLog.findExpired = function(options = {}) {
  return this.findAll({
    where: {
      expiresAt: {
        [sequelize.Sequelize.Op.lte]: new Date()
      },
      ...options.where
    },
    order: [['timestamp', 'DESC']],
    ...options
  })
}

AnomalyLog.cleanupExpired = async function() {
  const expiredLogs = await this.findExpired()
  const count = expiredLogs.length
  
  if (count > 0) {
    await this.destroy({
      where: {
        expiresAt: {
          [sequelize.Sequelize.Op.lte]: new Date()
        }
      }
    })
  }
  
  return count
}

AnomalyLog.createSystemLog = function(message, details = null, importance = 'info') {
  return this.create({
    message,
    importance,
    category: 'system',
    source: 'system',
    details,
    retentionDays: importance === 'critical' ? 90 : importance === 'high' ? 60 : 30
  })
}

AnomalyLog.createObjectAdditionLog = function(objectType, objectName, details = null) {
  return this.create({
    message: `New ${objectType} added: ${objectName}`,
    importance: 'medium',
    category: 'object_addition',
    source: 'auto-discovery',
    details,
    retentionDays: 60
  })
}

AnomalyLog.createAnomalyLog = function(message, details = null, importance = 'high') {
  return this.create({
    message,
    importance,
    category: 'anomaly',
    source: 'anomaly-detector',
    details,
    retentionDays: importance === 'critical' ? 180 : 90
  })
}

// Instance methods
AnomalyLog.prototype.extendRetention = function(additionalDays) {
  this.retentionDays = (this.retentionDays || 30) + additionalDays
  const newExpiryDate = new Date(this.timestamp)
  newExpiryDate.setDate(newExpiryDate.getDate() + this.retentionDays)
  this.expiresAt = newExpiryDate
  return this.save()
}

AnomalyLog.prototype.markAsRead = function() {
  this.isRead = true
  return this.save()
}

AnomalyLog.prototype.addTag = function(tag) {
  const tags = this.tags || []
  if (!tags.includes(tag)) {
    tags.push(tag)
    this.tags = tags
    return this.save()
  }
  return Promise.resolve(this)
}

AnomalyLog.prototype.removeTag = function(tag) {
  const tags = this.tags || []
  const index = tags.indexOf(tag)
  if (index > -1) {
    tags.splice(index, 1)
    this.tags = tags
    return this.save()
  }
  return Promise.resolve(this)
}

module.exports = AnomalyLog