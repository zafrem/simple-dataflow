const express = require('express');
const { Connection, Component, ComponentGroup, ComponentGroupMembership, Domain } = require('../models');
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

async function handleDomainOnlyView(req, res) {
  try {
    // Get all domains directly from database
    const domains = await Domain.findAll({
      attributes: ['id', 'name', 'description', 'color', 'metadata']
    });
    
    // Get all connections to determine domain relationships
    const [connections, groups] = await Promise.all([
      Connection.findAll({
        where: { isActive: true },
        attributes: ['sourceId', 'targetId', 'domain', 'connectionType', 'strength', 'metadata']
      }),
      ComponentGroup.findAll({
        where: { isActive: true },
        attributes: ['id', 'domainId'],
        include: [{
          model: Component,
          as: 'components',
          through: {
            model: ComponentGroupMembership,
            as: 'membership',
            attributes: []
          },
          where: { isActive: true },
          required: false,
          attributes: ['id']
        }]
      })
    ]);

    // Build domain nodes with group and component counts
    const domainNodes = domains.map(domain => ({
      data: {
        id: `domain-${domain.id}`,
        name: domain.name,
        description: domain.description,
        type: 'domain',
        color: domain.color || '#409eff',
        metadata: {
          ...domain.metadata,
          groupCount: groups.filter(g => g.domainId === domain.id).length,
          componentCount: groups
            .filter(g => g.domainId === domain.id)
            .reduce((count, group) => count + (group.components ? group.components.length : 0), 0)
        }
      }
    }));

    // Build component-to-domain mapping
    const componentToDomain = new Map();
    groups.forEach(group => {
      if (group.domainId && group.components) {
        group.components.forEach(comp => {
          componentToDomain.set(comp.id.toString(), group.domainId);
        });
      }
    });
    

    // Create domain-to-domain connections based on component connections
    const domainConnectionMap = new Map();
    const domainEdges = [];


    connections.forEach(conn => {
      const sourceDomainId = componentToDomain.get(conn.sourceId.toString());
      const targetDomainId = componentToDomain.get(conn.targetId.toString());

      if (sourceDomainId && targetDomainId && sourceDomainId !== targetDomainId) {
        const connectionKey = `${sourceDomainId}-${targetDomainId}`;
        const reverseKey = `${targetDomainId}-${sourceDomainId}`;

        if (!domainConnectionMap.has(connectionKey) && !domainConnectionMap.has(reverseKey)) {
          domainConnectionMap.set(connectionKey, {
            strength: conn.strength || 1.0,
            connectionType: conn.connectionType,
            count: 1
          });

          domainEdges.push({
            data: {
              id: `domain-connection-${connectionKey}`,
              source: `domain-${sourceDomainId}`,
              target: `domain-${targetDomainId}`,
              connectionType: 'domain-to-domain',
              strength: conn.strength || 1.0,
              metadata: {
                type: 'inter-domain',
                originalConnectionType: conn.connectionType,
                connectionCount: 1
              }
            }
          });
        } else {
          // Increment connection count and update strength
          const existing = domainConnectionMap.get(connectionKey) || domainConnectionMap.get(reverseKey);
          if (existing) {
            existing.count++;
            existing.strength = Math.min(existing.strength + (conn.strength || 1.0), 5.0); // Cap at 5.0
          }
        }
      }
    });

    // Update edge strengths based on connection counts
    domainEdges.forEach(edge => {
      const key = edge.data.source.replace('domain-', '') + '-' + edge.data.target.replace('domain-', '');
      const reverseKey = edge.data.target.replace('domain-', '') + '-' + edge.data.source.replace('domain-', '');
      const connectionInfo = domainConnectionMap.get(key) || domainConnectionMap.get(reverseKey);
      
      if (connectionInfo) {
        edge.data.strength = connectionInfo.strength;
        edge.data.metadata.connectionCount = connectionInfo.count;
      }
    });

    
    res.json({
      nodes: domainNodes,
      edges: domainEdges,
      stats: {
        nodeCount: domainNodes.length,
        domainCount: domainNodes.length,
        edgeCount: domainEdges.length,
        totalConnections: domainEdges.reduce((sum, edge) => sum + edge.data.metadata.connectionCount, 0)
      }
    });

  } catch (error) {
    console.error('Error generating domain-only graph data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

router.get('/graph', async (req, res) => {
  try {
    const { domain, includeIsolated = false, viewMode = 'full' } = req.query;

    // Handle domain-only view mode
    if (viewMode === 'domains') {
      return await handleDomainOnlyView(req, res);
    }

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
        attributes: ['id', 'name', 'description', 'groupType', 'domain', 'color', 'position', 'metadata', 'domainId'],
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
          domainId: group.domainId,
          componentCount: group.components ? group.components.length : 0,
          componentIds: group.components ? group.components.map(c => c.id.toString()) : []
        }
      }
    }));

    // Get domain nodes for drill-down visualization
    const domains = await Domain.findAll({
      attributes: ['id', 'name', 'description', 'color', 'metadata']
    });

    const domainNodes = domains.map(domain => ({
      data: {
        id: `domain-${domain.id}`,
        name: domain.name,
        description: domain.description,
        type: 'domain',
        color: domain.color || '#409eff',
        metadata: {
          ...domain.metadata,
          groupCount: groups.filter(g => g.domainId === domain.id).length,
          componentCount: groups
            .filter(g => g.domainId === domain.id)
            .reduce((count, group) => count + (group.components ? group.components.length : 0), 0)
        }
      }
    }));

    const nodes = [...componentNodes, ...groupNodes, ...domainNodes];

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

    // Create direct group-to-group edges based on component connections
    const groupToGroupEdges = [];
    const groupConnectionMap = new Map(); // Track connections between groups to avoid duplicates
    
    connections.forEach(conn => {
      const sourceId = conn.sourceId.toString();
      const targetId = conn.targetId.toString();
      
      // Find which groups these components belong to
      const sourceGroups = componentToGroups.get(sourceId) || [];
      const targetGroups = componentToGroups.get(targetId) || [];
      
      // Create connections between all combinations of source and target groups
      sourceGroups.forEach(sourceGroupId => {
        targetGroups.forEach(targetGroupId => {
          if (sourceGroupId !== targetGroupId) { // Don't connect group to itself
            const connectionKey = `${sourceGroupId}-${targetGroupId}`;
            const reverseKey = `${targetGroupId}-${sourceGroupId}`;
            
            // Avoid duplicate connections (bidirectional)
            if (!groupConnectionMap.has(connectionKey) && !groupConnectionMap.has(reverseKey)) {
              groupConnectionMap.set(connectionKey, true);
              
              groupToGroupEdges.push({
                data: {
                  id: `group-${connectionKey}`,
                  source: sourceGroupId,
                  target: targetGroupId,
                  domain: conn.domain,
                  connectionType: 'group-to-group',
                  strength: conn.strength || 1.0,
                  metadata: {
                    type: 'inter-group',
                    originalConnection: {
                      sourceComponentId: sourceId,
                      targetComponentId: targetId,
                      connectionType: conn.connectionType
                    }
                  }
                }
              });
            }
          }
        });
      });
    });

    const edges = [...componentEdges, ...groupPipeEdges, ...groupToGroupEdges];

    res.json({
      nodes,
      edges,
      stats: {
        nodeCount: nodes.length,
        componentCount: componentNodes.length,
        groupCount: groupNodes.length,
        domainCount: domainNodes.length,
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

router.post('/', async (req, res) => {
  try {
    const {
      sourceId,
      targetId,
      domain,
      connectionType = 'direct',
      strength = 1.0,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!sourceId || !targetId || !domain) {
      return res.status(400).json({
        error: 'Missing required fields: sourceId, targetId, and domain are required'
      });
    }

    // Validate that source and target components exist
    const [sourceComponent, targetComponent] = await Promise.all([
      Component.findByPk(sourceId),
      Component.findByPk(targetId)
    ]);

    if (!sourceComponent) {
      return res.status(404).json({
        error: `Source component with ID ${sourceId} not found`
      });
    }

    if (!targetComponent) {
      return res.status(404).json({
        error: `Target component with ID ${targetId} not found`
      });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      where: {
        sourceId,
        targetId,
        isActive: true
      }
    });

    if (existingConnection) {
      return res.status(409).json({
        error: 'Connection already exists between these components',
        details: {
          existingConnection: {
            id: existingConnection.id,
            sourceId: existingConnection.sourceId,
            targetId: existingConnection.targetId,
            connectionType: existingConnection.connectionType,
            domain: existingConnection.domain,
            createdAt: existingConnection.createdAt
          },
          sourceComponent: {
            id: sourceComponent.id,
            name: sourceComponent.name,
            type: sourceComponent.type
          },
          targetComponent: {
            id: targetComponent.id,
            name: targetComponent.name,
            type: targetComponent.type
          }
        }
      });
    }

    // Create the connection
    const connection = await Connection.create({
      sourceId,
      targetId,
      domain,
      connectionType,
      strength: Math.min(Math.max(strength, 0), 1), // Clamp between 0 and 1
      metadata,
      isActive: true
    });

    // Emit socket event if available
    const io = req.app.get('io');
    if (io) {
      io.emit('connection:created', { connectionId: connection.id });
    }

    res.status(201).json({
      message: 'Connection created successfully',
      connection
    });
  } catch (error) {
    console.error('Error creating connection:', error);
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