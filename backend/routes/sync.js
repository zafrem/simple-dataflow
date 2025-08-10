const express = require('express');
const Queue = require('bull');
const { Connector } = require('../models');
const router = express.Router();

const syncQueue = new Queue('sync jobs', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

router.get('/status', async (req, res) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      syncQueue.getWaiting(),
      syncQueue.getActive(),
      syncQueue.getCompleted(),
      syncQueue.getFailed()
    ]);

    const jobCounts = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };

    const activeConnectors = await Connector.findAll({
      where: { 
        status: 'running',
        isActive: true 
      },
      attributes: ['id', 'name', 'type', 'lastRun']
    });

    const recentJobs = await Promise.all([
      ...active.slice(0, 5).map(async job => ({
        id: job.id,
        type: 'active',
        connector: job.data.connectorId,
        startedAt: new Date(job.processedOn),
        progress: job.progress()
      })),
      ...completed.slice(0, 10).map(async job => ({
        id: job.id,
        type: 'completed',
        connector: job.data.connectorId,
        completedAt: new Date(job.finishedOn),
        duration: job.finishedOn - job.processedOn
      })),
      ...failed.slice(0, 5).map(async job => ({
        id: job.id,
        type: 'failed',
        connector: job.data.connectorId,
        failedAt: new Date(job.failedReason ? job.finishedOn : Date.now()),
        error: job.failedReason
      }))
    ]);

    res.json({
      queue: jobCounts,
      activeConnectors,
      recentJobs: recentJobs.sort((a, b) => {
        const aTime = a.completedAt || a.failedAt || a.startedAt;
        const bTime = b.completedAt || b.failedAt || b.startedAt;
        return new Date(bTime) - new Date(aTime);
      })
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/trigger', async (req, res) => {
  try {
    const { connectorIds, priority = 'normal' } = req.body;
    
    let connectors;
    if (connectorIds && connectorIds.length > 0) {
      connectors = await Connector.findAll({
        where: {
          id: connectorIds,
          isActive: true
        }
      });
    } else {
      connectors = await Connector.findAll({
        where: { isActive: true }
      });
    }

    if (connectors.length === 0) {
      return res.status(400).json({ error: 'No active connectors found' });
    }

    const jobs = [];
    const priorityMap = { low: 10, normal: 0, high: -10 };
    
    for (const connector of connectors) {
      const job = await syncQueue.add('sync-connector', {
        connectorId: connector.id
      }, {
        priority: priorityMap[priority] || 0,
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

      jobs.push({
        jobId: job.id,
        connectorId: connector.id,
        connectorName: connector.name
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('sync:triggered', { jobs });
    }

    res.json({
      message: `${jobs.length} sync job(s) triggered`,
      jobs
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let jobs = [];
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    switch (status) {
      case 'waiting':
        jobs = await syncQueue.getWaiting(offsetNum, offsetNum + limitNum - 1);
        break;
      case 'active':
        jobs = await syncQueue.getActive(offsetNum, offsetNum + limitNum - 1);
        break;
      case 'completed':
        jobs = await syncQueue.getCompleted(offsetNum, offsetNum + limitNum - 1);
        break;
      case 'failed':
        jobs = await syncQueue.getFailed(offsetNum, offsetNum + limitNum - 1);
        break;
      default:
        const [waiting, active, completed, failed] = await Promise.all([
          syncQueue.getWaiting(0, Math.floor(limitNum/4) - 1),
          syncQueue.getActive(0, Math.floor(limitNum/4) - 1),
          syncQueue.getCompleted(0, Math.floor(limitNum/4) - 1),
          syncQueue.getFailed(0, Math.floor(limitNum/4) - 1)
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed];
    }

    const jobDetails = await Promise.all(
      jobs.map(async job => {
        const connector = await Connector.findByPk(job.data.connectorId, {
          attributes: ['name', 'type']
        });

        return {
          id: job.id,
          connectorId: job.data.connectorId,
          connectorName: connector?.name || 'Unknown',
          connectorType: connector?.type || 'Unknown',
          status: await job.getState(),
          progress: job.progress(),
          createdAt: new Date(job.timestamp),
          processedAt: job.processedOn ? new Date(job.processedOn) : null,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
          error: job.failedReason || null,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts
        };
      })
    );

    res.json(jobDetails);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const job = await syncQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    await job.remove();
    
    res.json({ message: 'Job removed successfully' });
  } catch (error) {
    console.error('Error removing job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/jobs/:jobId/retry', async (req, res) => {
  try {
    const job = await syncQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    await job.retry();
    
    const io = req.app.get('io');
    if (io) {
      io.emit('job:retried', { jobId: job.id });
    }
    
    res.json({ message: 'Job retried successfully' });
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const queueHealth = await syncQueue.checkHealth();
    const [waiting, active, completed, failed] = await Promise.all([
      syncQueue.getWaiting(),
      syncQueue.getActive(),
      syncQueue.getCompleted(),
      syncQueue.getFailed()
    ]);

    const activeConnectorCount = await Connector.count({
      where: { isActive: true }
    });

    const runningConnectorCount = await Connector.count({
      where: { status: 'running', isActive: true }
    });

    res.json({
      queue: {
        isHealthy: queueHealth,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      },
      connectors: {
        total: activeConnectorCount,
        running: runningConnectorCount
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking sync health:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, syncQueue };