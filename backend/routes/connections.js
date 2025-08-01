const express = require('express');
const { Connection, Component, ComponentGroup, ComponentGroupMembership } = require('../models');
const { getConnectionStats } = require('../utils/connectionBuilder');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const {
      domain,
      connectionType,
      minStrength,
      maxStrength,
      include,
      page = 1,
      limit = 1000
    } = req.query;

    const where = { isActive: true };
    if (domain) where.domain = domain;
    if (connectionType) where.connectionType = connectionType;
    if (minStrength) where.strength = { [require('sequelize').Op.gte]: parseFloat(minStrength) };
    if (maxStrength) {
      where.strength = {
        ...where.strength,
        [require('sequelize').Op.lte]: parseFloat(maxStrength)
      };
    }

    const queryOptions = {
      where,
      limit: parseInt(limit),
      offset: (page - 1) * parseInt(limit),
      order: [['strength', 'DESC']]
    };

    // Add component includes if requested
    if (include === 'components') {
      queryOptions.include = [
        { model: Component, as: 'source', attributes: ['id', 'name', 'tag', 'type'] },
        { model: Component, as: 'target', attributes: ['id', 'name', 'tag', 'type'] }
      ];
    }

    const connections = await Connection.findAndCountAll(queryOptions);

    // Return flat array if no pagination needed or direct response for data view
    if (include === 'components') {
      res.json(connections.rows);
    } else {
      res.json({
        connections: connections.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: connections.count,
          pages: Math.ceil(connections.count / limit)
        }
      });
    }
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/graph', async (req, res) => {
  try {
    const { domain, includeIsolated = false } = req.query;

    const componentWhere = { isActive: true };
    const connectionWhere = { isActive: true };
    
    if (domain) {
      componentWhere.domain = domain;
      connectionWhere.domain = domain;
    }

    const [components, connections, groups] = await Promise.all([
      Component.findAll({
        where: componentWhere,
        attributes: ['id', 'name', 'tag', 'type', 'domain', 'source', 'metadata']
      }),
      Connection.findAll({
        where: connectionWhere,
        attributes: ['sourceId', 'targetId', 'domain', 'connectionType', 'strength', 'metadata']
      }),
      ComponentGroup.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'description', 'groupType', 'domain', 'color', 'position', 'metadata'],
        include: [{
          model: Component,
          as: 'components',
          through: {
            model: ComponentGroupMembership,
            as: 'membership',
            attributes: ['role']
          },
          where: { isActive: true },
          required: false,
          attributes: ['id']
        }]
      })
    ]);

    let filteredComponents = components;
    
    if (!includeIsolated) {
      const connectedComponentIds = new Set();
      connections.forEach(conn => {
        connectedComponentIds.add(conn.sourceId);
        connectedComponentIds.add(conn.targetId);
      });
      
      filteredComponents = components.filter(comp => 
        connectedComponentIds.has(comp.id)
      );
    }

    // Create component nodes
    const componentNodes = filteredComponents.map(comp => ({
      data: {
        id: comp.id.toString(),
        name: comp.name,
        tag: comp.tag,
        type: comp.type,
        domain: comp.domain,
        source: comp.source,
        metadata: comp.metadata
      }
    }));

    // Create group nodes
    const groupNodes = groups.map(group => ({
      data: {
        id: `group-${group.id}`,
        name: group.name,
        description: group.description,
        type: 'group',
        groupType: group.groupType,
        domain: group.domain,
        color: group.color,
        position: group.position,
        metadata: {
          ...group.metadata,
          componentCount: group.components ? group.components.length : 0,
          componentIds: group.components ? group.components.map(c => c.id.toString()) : []
        }
      }
    }));

    const nodes = [...componentNodes, ...groupNodes];

    // Create component edges and group-to-pipes edges
    const componentEdges = connections.map(conn => ({
      data: {
        id: `${conn.sourceId}-${conn.targetId}`,
        source: conn.sourceId.toString(),
        target: conn.targetId.toString(),
        domain: conn.domain,
        connectionType: conn.connectionType,
        strength: conn.strength,
        metadata: conn.metadata
      }
    }));

    // Create additional edges between PIPES and groups
    const groupPipeEdges = [];
    
    // Build component-to-group lookup
    const componentToGroups = new Map();
    groups.forEach(group => {
      if (group.components) {
        group.components.forEach(comp => {
          if (!componentToGroups.has(comp.id.toString())) {
            componentToGroups.set(comp.id.toString(), []);
          }
          componentToGroups.get(comp.id.toString()).push(`group-${group.id}`);
        });
      }
    });
    
    // Find all PIPES components
    const pipesComponents = filteredComponents.filter(comp => comp.type === 'PIPES');
    
    // For each PIPES component, create edges to groups that contain connected components
    pipesComponents.forEach(pipesComp => {
      const pipesId = pipesComp.id.toString();
      const connectedGroups = new Set();
      
      // Find all connections involving this PIPES component
      connections.forEach(conn => {
        let targetComponentId = null;
        
        if (conn.sourceId.toString() === pipesId) {
          // PIPES is source, find target's groups
          targetComponentId = conn.targetId.toString();
        } else if (conn.targetId.toString() === pipesId) {
          // PIPES is target, find source's groups
          targetComponentId = conn.sourceId.toString();
        }
        
        if (targetComponentId && componentToGroups.has(targetComponentId)) {
          const targetGroups = componentToGroups.get(targetComponentId);
          targetGroups.forEach(groupId => connectedGroups.add(groupId));
        }
      });
      
      // Create edges between PIPES and connected groups
      connectedGroups.forEach(groupId => {
        groupPipeEdges.push({
          data: {
            id: `pipes-${pipesId}-${groupId}`,
            source: pipesId,
            target: groupId,
            domain: pipesComp.domain,
            connectionType: 'group-pipe',
            strength: 1.0,
            metadata: {
              type: 'pipe-to-group',
              originalConnections: connections.filter(conn => 
                (conn.sourceId.toString() === pipesId || conn.targetId.toString() === pipesId)
              ).length
            }
          }
        });
      });
    });

    const edges = [...componentEdges, ...groupPipeEdges];

    res.json({
      nodes,
      edges,
      stats: {
        nodeCount: nodes.length,
        componentCount: componentNodes.length,
        groupCount: groupNodes.length,
        edgeCount: edges.length,
        domains: [...new Set(filteredComponents.map(c => c.domain).filter(Boolean))].length
      }
    });
  } catch (error) {
    console.error('Error generating graph data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await getConnectionStats();
    
    const componentStats = await Component.findAll({
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['type']
    });

    const domainStats = await Component.findAll({
      attributes: [
        'domain',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { 
        isActive: true,
        domain: { [require('sequelize').Op.not]: null }
      },
      group: ['domain'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
      limit: 10
    });

    res.json({
      connections: stats,
      components: {
        byType: componentStats,
        byDomain: domainStats
      }
    });
  } catch (error) {
    console.error('Error fetching connection stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rebuild', async (req, res) => {
  try {
    const { buildConnections } = require('../utils/connectionBuilder');
    const connectionsCreated = await buildConnections();
    
    const io = req.app.get('io');
    if (io) {
      io.emit('connections:rebuilt', { count: connectionsCreated });
    }

    res.json({ 
      message: 'Connections rebuilt successfully',
      connectionsCreated 
    });
  } catch (error) {
    console.error('Error rebuilding connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;