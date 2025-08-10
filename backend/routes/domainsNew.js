const express = require('express');
const { Domain, ComponentGroup, Component, Connection } = require('../models');
const router = express.Router();

// Get all domains with their stats
router.get('/', async (req, res) => {
  try {
    const domains = await Domain.findAll({
      where: { isActive: true },
      include: [
        {
          model: ComponentGroup,
          as: 'groups',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: Component,
              as: 'components',
              where: { isActive: true },
              required: false
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    const domainStats = domains.map(domain => {
      const groupCount = domain.groups?.length || 0;
      // Count components through groups since we removed direct component association
      const componentCount = domain.groups?.reduce((total, group) => {
        return total + (group.components?.length || 0);
      }, 0) || 0;
      const pipelineCount = domain.pipelines?.length || 0;

      return {
        id: domain.id,
        name: domain.name,
        description: domain.description,
        color: domain.color,
        groupCount,
        componentCount,
        pipelineCount,
        pipelines: domain.pipelines || [],
        metadata: domain.metadata,
        lastUpdated: domain.updatedAt
      };
    });

    res.json(domainStats);
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single domain with full details
router.get('/:id', async (req, res) => {
  try {
    const domainId = req.params.id;
    
    const domain = await Domain.findByPk(domainId, {
      include: [
        {
          model: ComponentGroup,
          as: 'groups',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: Component,
              as: 'components',
              where: { isActive: true },
              required: false
            }
          ]
        }
      ]
    });

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json(domain);
  } catch (error) {
    console.error('Error fetching domain details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new domain
router.post('/', async (req, res) => {
  try {
    const { name, description, color, pipelines, metadata } = req.body;
    
    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Domain name is required' });
    }

    // Check for duplicate domain name (case-insensitive)
    const existingDomain = await Domain.findOne({ 
      where: { 
        name: { [require('sequelize').Op.iLike]: name.trim() },
        isActive: true
      } 
    });
    
    if (existingDomain) {
      return res.status(409).json({ 
        error: 'Domain with this name already exists',
        details: {
          field: 'name',
          value: name.trim(),
          existingDomain: {
            id: existingDomain.id,
            name: existingDomain.name,
            description: existingDomain.description
          }
        }
      });
    }

    const domain = await Domain.create({
      name: name.trim(),
      description: description?.trim(),
      color,
      pipelines: pipelines || [],
      metadata: metadata || {}
    });

    res.status(201).json(domain);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        error: 'Domain name already exists',
        details: {
          field: 'name',
          constraint: error.parent?.constraint || 'unique_constraint'
        }
      });
    }
    console.error('Error creating domain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update domain
router.put('/:id', async (req, res) => {
  try {
    const domainId = req.params.id;
    const { name, description, color, pipelines, metadata } = req.body;
    
    const domain = await Domain.findByPk(domainId);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    await domain.update({
      name,
      description,
      color,
      pipelines: pipelines || domain.pipelines,
      metadata: metadata || domain.metadata
    });

    res.json(domain);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Domain name already exists' });
    }
    console.error('Error updating domain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete domain
router.delete('/:id', async (req, res) => {
  try {
    const domainId = req.params.id;
    
    const domain = await Domain.findByPk(domainId);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    await domain.update({ isActive: false });
    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add pipeline to domain
router.post('/:id/pipelines', async (req, res) => {
  try {
    const domainId = req.params.id;
    const { name, description, steps, metadata } = req.body;
    
    const domain = await Domain.findByPk(domainId);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const pipelines = domain.pipelines || [];
    const newPipeline = {
      id: Date.now().toString(),
      name,
      description,
      steps: steps || [],
      metadata: metadata || {},
      createdAt: new Date(),
      isActive: true
    };

    pipelines.push(newPipeline);
    await domain.update({ pipelines });

    res.status(201).json(newPipeline);
  } catch (error) {
    console.error('Error adding pipeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update pipeline in domain
router.put('/:id/pipelines/:pipelineId', async (req, res) => {
  try {
    const domainId = req.params.id;
    const pipelineId = req.params.pipelineId;
    const { name, description, steps, metadata } = req.body;
    
    const domain = await Domain.findByPk(domainId);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const pipelines = domain.pipelines || [];
    const pipelineIndex = pipelines.findIndex(p => p.id === pipelineId);
    
    if (pipelineIndex === -1) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    pipelines[pipelineIndex] = {
      ...pipelines[pipelineIndex],
      name: name || pipelines[pipelineIndex].name,
      description: description || pipelines[pipelineIndex].description,
      steps: steps || pipelines[pipelineIndex].steps,
      metadata: metadata || pipelines[pipelineIndex].metadata,
      updatedAt: new Date()
    };

    await domain.update({ pipelines });
    res.json(pipelines[pipelineIndex]);
  } catch (error) {
    console.error('Error updating pipeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete pipeline from domain
router.delete('/:id/pipelines/:pipelineId', async (req, res) => {
  try {
    const domainId = req.params.id;
    const pipelineId = req.params.pipelineId;
    
    const domain = await Domain.findByPk(domainId);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const pipelines = (domain.pipelines || []).filter(p => p.id !== pipelineId);
    await domain.update({ pipelines });

    res.json({ message: 'Pipeline deleted successfully' });
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;