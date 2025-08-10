const express = require('express');
const { Connector, Component } = require('../models');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { type, status, isActive } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const connectors = await Connector.findAll({
      where,
      include: [{
        model: Component,
        as: 'components',
        attributes: ['id', 'name', 'tag', 'type'],
        required: false
      }],
      order: [['updatedAt', 'DESC']]
    });

    res.json(connectors);
  } catch (error) {
    console.error('Error fetching connectors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const connector = await Connector.findByPk(req.params.id, {
      include: [{
        model: Component,
        as: 'components',
        attributes: ['id', 'name', 'tag', 'type', 'lastSeen']
      }]
    });

    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    res.json(connector);
  } catch (error) {
    console.error('Error fetching connector:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, config, schedule, isActive = true } = req.body;

    if (!name || !type || !config) {
      return res.status(400).json({ error: 'Name, type, and config are required' });
    }

    if (!['database', 'api', 'logs', 'config', 'network'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be one of: database, api, logs, config, network' 
      });
    }

    const connector = await Connector.create({
      name,
      type,
      config,
      schedule,
      isActive
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('connector:created', connector);
    }

    res.status(201).json(connector);
  } catch (error) {
    console.error('Error creating connector:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, config, schedule, isActive } = req.body;
    
    const connector = await Connector.findByPk(req.params.id);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (config !== undefined) updates.config = config;
    if (schedule !== undefined) updates.schedule = schedule;
    if (isActive !== undefined) updates.isActive = isActive;

    await connector.update(updates);

    const io = req.app.get('io');
    if (io) {
      io.emit('connector:updated', connector);
    }

    res.json(connector);
  } catch (error) {
    console.error('Error updating connector:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const connector = await Connector.findByPk(req.params.id);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    await Component.update(
      { connectorId: null },
      { where: { connectorId: req.params.id } }
    );

    await connector.destroy();

    const io = req.app.get('io');
    if (io) {
      io.emit('connector:deleted', { id: req.params.id });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting connector:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const connector = await Connector.findByPk(req.params.id);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    const ConnectorClass = require(`../connectors/${connector.type}Connector`);
    const connectorInstance = new ConnectorClass(connector.config);
    
    try {
      await connectorInstance.test();
      res.json({ success: true, message: 'Connection test successful' });
    } catch (testError) {
      res.status(400).json({ 
        success: false, 
        message: 'Connection test failed',
        error: testError.message 
      });
    }
  } catch (error) {
    console.error('Error testing connector:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/sync', async (req, res) => {
  try {
    const connector = await Connector.findByPk(req.params.id);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    if (!connector.isActive) {
      return res.status(400).json({ error: 'Connector is not active' });
    }

    const Queue = require('bull');
    const syncQueue = new Queue('sync jobs', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });

    const job = await syncQueue.add('sync-connector', {
      connectorId: connector.id
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    await connector.update({ 
      status: 'running',
      lastRun: new Date()
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('sync:started', { connectorId: connector.id, jobId: job.id });
    }

    res.json({ 
      message: 'Sync job started',
      jobId: job.id,
      connectorId: connector.id
    });
  } catch (error) {
    console.error('Error starting sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/stats', async (req, res) => {
  try {
    const connector = await Connector.findByPk(req.params.id);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    const componentCount = await Component.count({
      where: { connectorId: req.params.id, isActive: true }
    });

    const lastComponents = await Component.findAll({
      where: { connectorId: req.params.id },
      order: [['updatedAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'tag', 'type', 'updatedAt']
    });

    res.json({
      connector: {
        id: connector.id,
        name: connector.name,
        type: connector.type,
        status: connector.status,
        successCount: connector.successCount,
        errorCount: connector.errorCount,
        lastRun: connector.lastRun,
        nextRun: connector.nextRun
      },
      stats: {
        componentCount,
        successRate: connector.successCount + connector.errorCount > 0 
          ? (connector.successCount / (connector.successCount + connector.errorCount)) * 100 
          : 0,
        lastComponents
      }
    });
  } catch (error) {
    console.error('Error fetching connector stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;