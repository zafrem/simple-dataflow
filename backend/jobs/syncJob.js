const Queue = require('bull');
const cron = require('node-cron');
const { Connector } = require('../models');

const syncQueue = new Queue('sync jobs', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

const connectorMap = {
  database: () => require('../connectors/databaseConnector'),
  api: () => require('../connectors/apiConnector'),
  logs: () => require('../connectors/logsConnector')
};

syncQueue.process('sync-connector', async (job) => {
  const { connectorId } = job.data;
  
  try {
    const connector = await Connector.findByPk(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    if (!connector.isActive) {
      throw new Error(`Connector ${connectorId} is not active`);
    }

    job.progress(10);

    const ConnectorClass = connectorMap[connector.type]();
    if (!ConnectorClass) {
      throw new Error(`Unknown connector type: ${connector.type}`);
    }

    const connectorInstance = new ConnectorClass(connector.config);
    
    job.progress(20);

    await connectorInstance.test();
    job.progress(40);

    const components = await connectorInstance.sync();
    job.progress(70);

    const results = await connectorInstance.saveComponents(connector.id);
    job.progress(90);

    await connector.update({
      status: 'success',
      lastRun: new Date(),
      successCount: connector.successCount + 1,
      lastError: null
    });

    await connectorInstance.cleanup();
    job.progress(100);

    const io = global.io || require('../server').io;
    if (io) {
      io.emit('sync:completed', {
        connectorId: connector.id,
        results,
        timestamp: new Date().toISOString()
      });
    }

    return {
      connectorId,
      componentsProcessed: components.length,
      results,
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    const connector = await Connector.findByPk(connectorId);
    if (connector) {
      await connector.update({
        status: 'error',
        lastRun: new Date(),
        errorCount: connector.errorCount + 1,
        lastError: error.message
      });
    }

    const io = global.io || require('../server').io;
    if (io) {
      io.emit('sync:failed', {
        connectorId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    throw error;
  }
});

syncQueue.on('completed', (job, result) => {
  console.log(`Sync job ${job.id} completed successfully:`, result);
});

syncQueue.on('failed', (job, err) => {
  console.error(`Sync job ${job.id} failed:`, err.message);
});

syncQueue.on('progress', (job, progress) => {
  console.log(`Sync job ${job.id} progress: ${progress}%`);
});

const scheduleConnectorSync = async (connector) => {
  if (!connector.schedule || !connector.isActive) {
    return;
  }

  const jobName = `scheduled-sync-${connector.id}`;
  
  try {
    cron.schedule(connector.schedule, async () => {
      console.log(`Triggering scheduled sync for connector ${connector.id}`);
      
      const existingJobs = await syncQueue.getJobs(['waiting', 'active'], 0, -1);
      const alreadyQueued = existingJobs.some(job => 
        job.data.connectorId === connector.id
      );
      
      if (!alreadyQueued) {
        await syncQueue.add('sync-connector', {
          connectorId: connector.id
        }, {
          priority: 1 // Lower priority for scheduled jobs
        });
      }
    }, {
      name: jobName,
      scheduled: true
    });
    
    console.log(`Scheduled sync job for connector ${connector.id} with schedule: ${connector.schedule}`);
  } catch (error) {
    console.error(`Error scheduling sync for connector ${connector.id}:`, error);
  }
};

const initializeJobs = async () => {
  try {
    console.log('Initializing job system...');
    
    await syncQueue.empty();
    console.log('Cleared existing jobs from queue');
    
    const activeConnectors = await Connector.findAll({
      where: { isActive: true }
    });
    
    for (const connector of activeConnectors) {
      if (connector.schedule) {
        await scheduleConnectorSync(connector);
      }
      
      await connector.update({ status: 'idle' });
    }
    
    console.log(`Initialized ${activeConnectors.length} active connectors`);
    
    const cleanupInterval = setInterval(async () => {
      try {
        const completedJobs = await syncQueue.getCompleted();
        const failedJobs = await syncQueue.getFailed();
        
        if (completedJobs.length > 100) {
          const jobsToRemove = completedJobs.slice(100);
          await Promise.all(jobsToRemove.map(job => job.remove()));
        }
        
        if (failedJobs.length > 50) {
          const jobsToRemove = failedJobs.slice(50);
          await Promise.all(jobsToRemove.map(job => job.remove()));
        }
      } catch (error) {
        console.error('Error during job cleanup:', error);
      }
    }, 60000 * 60); // Every hour
    
    process.on('SIGTERM', () => {
      clearInterval(cleanupInterval);
      syncQueue.close();
    });
    
    process.on('SIGINT', () => {
      clearInterval(cleanupInterval);
      syncQueue.close();
    });
    
  } catch (error) {
    console.error('Error initializing job system:', error);
    throw error;
  }
};

const addSyncJob = async (connectorId, options = {}) => {
  const job = await syncQueue.add('sync-connector', {
    connectorId
  }, {
    priority: options.priority || 0,
    delay: options.delay || 0,
    attempts: options.attempts || 3
  });
  
  return job;
};

const getSyncStats = async () => {
  const [waiting, active, completed, failed] = await Promise.all([
    syncQueue.getWaiting(),
    syncQueue.getActive(),
    syncQueue.getCompleted(),
    syncQueue.getFailed()
  ]);
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    total: waiting.length + active.length + completed.length + failed.length
  };
};

module.exports = {
  syncQueue,
  initializeJobs,
  scheduleConnectorSync,
  addSyncJob,
  getSyncStats
};