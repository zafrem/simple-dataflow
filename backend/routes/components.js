const express = require('express');
const { Component, Connection, Connector, AnomalyLog } = require('../models');
const { buildConnections } = require('../utils/connectionBuilder');
const { validateTag, generateUniqueTag, extractDomainFromTag } = require('../utils/tagExtractor');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const {
      type,
      domain,
      source,
      team,
      search,
      include,
      page = 1,
      limit = 100,
      includeInactive = false
    } = req.query;

    const where = {};
    if (!includeInactive) where.isActive = true;
    if (type) where.type = type;
    if (domain) where.domain = domain;
    if (source) where.source = source;
    if (team) where.team = team;
    if (search) {
      where[require('sequelize').Op.or] = [
        { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { tag: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ];
    }

    const queryOptions = {
      where,
      limit: parseInt(limit),
      offset: (page - 1) * parseInt(limit),
      order: [['updatedAt', 'DESC']]
    };

    // Add connector include if requested
    if (include === 'connector') {
      queryOptions.include = [{
        model: Connector,
        as: 'connector',
        attributes: ['name', 'type', 'status']
      }];
    }

    const components = await Component.findAndCountAll(queryOptions);

    // Return flat array for data view, paginated response for dashboard
    if (include === 'connector') {
      res.json(components.rows);
    } else {
      res.json({
        components: components.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: components.count,
          pages: Math.ceil(components.count / limit)
        }
      });
    }
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const component = await Component.findByPk(req.params.id, {
      include: [
        {
          model: Connector,
          as: 'connector',
          attributes: ['name', 'type', 'status', 'lastRun']
        },
        {
          model: Connection,
          as: 'outgoingConnections',
          include: [{ model: Component, as: 'target', attributes: ['id', 'name', 'tag', 'type'] }]
        },
        {
          model: Connection,
          as: 'incomingConnections',
          include: [{ model: Component, as: 'source', attributes: ['id', 'name', 'tag', 'type'] }]
        }
      ]
    });

    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json(component);
  } catch (error) {
    console.error('Error fetching component:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, tag, type, source = 'manual', description, metadata, team } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    if (!['DB', 'API', 'APP', 'STORAGE', 'PIPES'].includes(type)) {
      return res.status(400).json({ error: 'Type must be DB, API, APP, STORAGE, or PIPES' });
    }

    const existingTags = await Component.findAll({
      attributes: ['tag'],
      raw: true
    }).then(results => results.map(r => r.tag));

    const finalTag = tag || generateUniqueTag(name, type, existingTags);

    if (!validateTag(finalTag)) {
      return res.status(400).json({ error: 'Invalid tag format. Must end with _db, _api, _app, _storage, or _pipes' });
    }

    // Check for duplicate tag
    const existingComponentByTag = await Component.findOne({ where: { tag: finalTag } });
    if (existingComponentByTag) {
      return res.status(409).json({ 
        error: 'Component with this tag already exists',
        details: {
          field: 'tag',
          value: finalTag,
          existingComponent: {
            id: existingComponentByTag.id,
            name: existingComponentByTag.name,
            type: existingComponentByTag.type
          }
        }
      });
    }

    // Check for duplicate name within the same type and domain
    const existingComponentByName = await Component.findOne({ 
      where: { 
        name: name.trim(),
        type: type,
        domain: extractDomainFromTag(finalTag),
        isActive: true
      } 
    });
    if (existingComponentByName) {
      return res.status(409).json({ 
        error: 'Component with this name already exists in the same domain and type',
        details: {
          field: 'name',
          value: name.trim(),
          domain: extractDomainFromTag(finalTag),
          type: type,
          existingComponent: {
            id: existingComponentByName.id,
            name: existingComponentByName.name,
            tag: existingComponentByName.tag
          }
        }
      });
    }

    const domain = extractDomainFromTag(finalTag);
    
    const component = await Component.create({
      name,
      tag: finalTag,
      type,
      source,
      domain,
      description,
      metadata: metadata || {},
      team
    });

    await buildConnections(component.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('component:created', component);
    }

    // Create anomaly log for new component
    try {
      await AnomalyLog.createObjectAdditionLog(
        type,
        name,
        {
          componentId: component.id,
          tag: finalTag,
          domain: domain,
          source: source,
          createdAt: component.createdAt
        }
      );
    } catch (logError) {
      console.error('Error creating anomaly log for component creation:', logError);
      // Don't fail the component creation if logging fails
    }

    res.status(201).json(component);
  } catch (error) {
    console.error('Error creating component:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ error: 'Component with this tag already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, metadata, isActive, team, tag } = req.body;
    
    const component = await Component.findByPk(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (metadata !== undefined) updates.metadata = metadata;
    if (isActive !== undefined) updates.isActive = isActive;
    if (team !== undefined) updates.team = team;
    if (tag !== undefined) {
      // Validate tags
      const allowedTags = ['PIPS', 'SOX', 'HR', 'Proj', 'Infra', 'Other'];
      if (Array.isArray(tag)) {
        const invalidTags = tag.filter(t => !allowedTags.includes(t));
        if (invalidTags.length > 0) {
          return res.status(400).json({ 
            error: `Invalid tags: ${invalidTags.join(', ')}. Allowed tags: ${allowedTags.join(', ')}` 
          });
        }
        if (tag.length === 0) {
          return res.status(400).json({ error: 'At least one tag is required' });
        }
        updates.tag = tag;
      } else {
        return res.status(400).json({ error: 'Tag must be an array' });
      }
    }

    await component.update(updates);

    const io = req.app.get('io');
    if (io) {
      io.emit('component:updated', component);
    }

    res.json(component);
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const component = await Component.findByPk(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    await Connection.destroy({
      where: {
        [require('sequelize').Op.or]: [
          { sourceId: req.params.id },
          { targetId: req.params.id }
        ]
      }
    });

    await component.destroy();

    const io = req.app.get('io');
    if (io) {
      io.emit('component:deleted', { id: req.params.id });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting component:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/connections', async (req, res) => {
  try {
    const connections = await Connection.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { sourceId: req.params.id },
          { targetId: req.params.id }
        ],
        isActive: true
      },
      include: [
        { model: Component, as: 'source', attributes: ['id', 'name', 'tag', 'type'] },
        { model: Component, as: 'target', attributes: ['id', 'name', 'tag', 'type'] }
      ]
    });

    res.json(connections);
  } catch (error) {
    console.error('Error fetching component connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;