const express = require('express');
const { AnomalyLog } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/anomaly-logs - Get all anomaly logs with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      importance, 
      category, 
      source, 
      limit = 50, 
      offset = 0, 
      includeExpired = false,
      startDate,
      endDate,
      search
    } = req.query;

    const whereClause = {};
    
    // Filter by importance
    if (importance) {
      whereClause.importance = importance;
    }
    
    // Filter by category
    if (category) {
      whereClause.category = category;
    }
    
    // Filter by source
    if (source) {
      whereClause.source = source;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.timestamp[Op.lte] = new Date(endDate);
      }
    }
    
    // Search in message
    if (search) {
      whereClause.message = {
        [Op.iLike]: `%${search}%`
      };
    }
    
    // Filter out expired logs unless explicitly requested
    if (!includeExpired) {
      whereClause.expiresAt = {
        [Op.gt]: new Date()
      };
    }

    const logs = await AnomalyLog.findAndCountAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get summary statistics
    const stats = await AnomalyLog.findAll({
      attributes: [
        'importance',
        [AnomalyLog.sequelize.fn('COUNT', AnomalyLog.sequelize.col('id')), 'count']
      ],
      where: !includeExpired ? { expiresAt: { [Op.gt]: new Date() } } : {},
      group: ['importance'],
      raw: true
    });

    const categoryStats = await AnomalyLog.findAll({
      attributes: [
        'category',
        [AnomalyLog.sequelize.fn('COUNT', AnomalyLog.sequelize.col('id')), 'count']
      ],
      where: !includeExpired ? { expiresAt: { [Op.gt]: new Date() } } : {},
      group: ['category'],
      raw: true
    });

    res.json({
      logs: logs.rows,
      total: logs.count,
      stats: {
        byImportance: stats.reduce((acc, stat) => {
          acc[stat.importance] = parseInt(stat.count);
          return acc;
        }, {}),
        byCategory: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = parseInt(stat.count);
          return acc;
        }, {})
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: logs.count > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching anomaly logs:', error);
    res.status(500).json({ error: 'Failed to fetch anomaly logs' });
  }
});

// GET /api/anomaly-logs/:id - Get specific anomaly log
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await AnomalyLog.findByPk(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Anomaly log not found' });
    }
    
    res.json(log);
  } catch (error) {
    console.error('Error fetching anomaly log:', error);
    res.status(500).json({ error: 'Failed to fetch anomaly log' });
  }
});

// POST /api/anomaly-logs - Create new anomaly log
router.post('/', async (req, res) => {
  try {
    const {
      message,
      importance = 'medium',
      category = 'system',
      source,
      details,
      retentionDays = 30,
      tags
    } = req.body;

    // Validation
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!['critical', 'high', 'medium', 'low', 'info'].includes(importance)) {
      return res.status(400).json({ error: 'Invalid importance level' });
    }

    if (!['system', 'object_addition', 'anomaly', 'security', 'performance'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Check for duplicate log entries (same message, category, and source within last hour)
    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
    const existingLog = await AnomalyLog.findOne({
      where: {
        message: message.trim(),
        category,
        source: source || null,
        timestamp: { [Op.gte]: oneHourAgo },
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (existingLog) {
      return res.status(409).json({
        error: 'Similar log entry already exists within the last hour',
        details: {
          field: 'message',
          value: message.trim(),
          existingLog: {
            id: existingLog.id,
            message: existingLog.message,
            importance: existingLog.importance,
            category: existingLog.category,
            source: existingLog.source,
            timestamp: existingLog.timestamp
          },
          suggestion: 'Consider updating the existing log entry instead of creating a duplicate'
        }
      });
    }

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + Math.max(1, Math.min(365, retentionDays)));

    const log = await AnomalyLog.create({
      message: message.trim(),
      importance,
      category,
      source,
      details,
      retentionDays: Math.max(1, Math.min(365, retentionDays)),
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : null),
      timestamp: now,
      expiresAt: expiryDate
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating anomaly log:', error);
    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message)
      });
    } else {
      res.status(500).json({ error: 'Failed to create anomaly log' });
    }
  }
});

// PUT /api/anomaly-logs/:id - Update anomaly log
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      message,
      importance,
      category,
      source,
      details,
      retentionDays,
      tags
    } = req.body;

    const log = await AnomalyLog.findByPk(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Anomaly log not found' });
    }

    // Update fields if provided
    const updateData = {};
    
    if (message !== undefined) {
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty' });
      }
      updateData.message = message.trim();
    }
    
    if (importance !== undefined) {
      if (!['critical', 'high', 'medium', 'low', 'info'].includes(importance)) {
        return res.status(400).json({ error: 'Invalid importance level' });
      }
      updateData.importance = importance;
    }
    
    if (category !== undefined) {
      if (!['system', 'object_addition', 'anomaly', 'security', 'performance'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      updateData.category = category;
    }
    
    if (source !== undefined) updateData.source = source;
    if (details !== undefined) updateData.details = details;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : (tags ? [tags] : null);
    
    if (retentionDays !== undefined) {
      updateData.retentionDays = Math.max(1, Math.min(365, retentionDays));
    }

    await log.update(updateData);
    
    res.json(log);
  } catch (error) {
    console.error('Error updating anomaly log:', error);
    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message)
      });
    } else {
      res.status(500).json({ error: 'Failed to update anomaly log' });
    }
  }
});

// PATCH /api/anomaly-logs/:id/extend-retention - Extend retention period
router.patch('/:id/extend-retention', async (req, res) => {
  try {
    const { id } = req.params;
    const { additionalDays } = req.body;

    if (!additionalDays || additionalDays <= 0) {
      return res.status(400).json({ error: 'Additional days must be a positive number' });
    }

    const log = await AnomalyLog.findByPk(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Anomaly log not found' });
    }

    await log.extendRetention(parseInt(additionalDays));
    
    res.json({
      message: 'Retention extended successfully',
      log,
      newExpiryDate: log.expiresAt
    });
  } catch (error) {
    console.error('Error extending retention:', error);
    res.status(500).json({ error: 'Failed to extend retention' });
  }
});

// PATCH /api/anomaly-logs/:id/mark-read - Mark log as read
router.patch('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AnomalyLog.findByPk(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Anomaly log not found' });
    }

    await log.markAsRead();
    
    res.json({
      message: 'Log marked as read',
      log
    });
  } catch (error) {
    console.error('Error marking log as read:', error);
    res.status(500).json({ error: 'Failed to mark log as read' });
  }
});

// PATCH /api/anomaly-logs/:id/tags - Add or remove tags
router.patch('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, tag } = req.body; // action: 'add' or 'remove'

    if (!action || !tag) {
      return res.status(400).json({ error: 'Action and tag are required' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "add" or "remove"' });
    }

    const log = await AnomalyLog.findByPk(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Anomaly log not found' });
    }

    if (action === 'add') {
      await log.addTag(tag);
    } else {
      await log.removeTag(tag);
    }
    
    res.json({
      message: `Tag ${action}ed successfully`,
      log
    });
  } catch (error) {
    console.error('Error managing tag:', error);
    res.status(500).json({ error: 'Failed to manage tag' });
  }
});

// DELETE /api/anomaly-logs/:id - Delete anomaly log
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await AnomalyLog.findByPk(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Anomaly log not found' });
    }
    
    await log.destroy();
    
    res.json({ message: 'Anomaly log deleted successfully' });
  } catch (error) {
    console.error('Error deleting anomaly log:', error);
    res.status(500).json({ error: 'Failed to delete anomaly log' });
  }
});

// POST /api/anomaly-logs/cleanup - Clean up expired logs
router.post('/cleanup', async (req, res) => {
  try {
    const deletedCount = await AnomalyLog.cleanupExpired();
    
    res.json({
      message: 'Cleanup completed',
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up expired logs:', error);
    res.status(500).json({ error: 'Failed to cleanup expired logs' });
  }
});

// GET /api/anomaly-logs/stats/summary - Get summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - (1 * 60 * 60 * 1000));
        break;
      case '24h':
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        break;
      case '7d':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      default:
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    }

    const totalCount = await AnomalyLog.count({
      where: {
        timestamp: { [Op.gte]: startDate },
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    const criticalCount = await AnomalyLog.count({
      where: {
        importance: 'critical',
        timestamp: { [Op.gte]: startDate },
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    const unreadCount = await AnomalyLog.count({
      where: {
        isRead: false,
        timestamp: { [Op.gte]: startDate },
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    const recentLogs = await AnomalyLog.findAll({
      where: {
        timestamp: { [Op.gte]: startDate },
        expiresAt: { [Op.gt]: new Date() }
      },
      order: [['timestamp', 'DESC']],
      limit: 5
    });

    res.json({
      period,
      summary: {
        total: totalCount,
        critical: criticalCount,
        unread: unreadCount
      },
      recentLogs
    });
  } catch (error) {
    console.error('Error getting summary stats:', error);
    res.status(500).json({ error: 'Failed to get summary statistics' });
  }
});

module.exports = router;