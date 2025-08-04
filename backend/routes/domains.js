const express = require('express');
const { Component, Connection, Domain, ComponentGroup } = require('../models');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const domains = await Component.findAll({
      attributes: [
        'domain',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'componentCount'],
        [require('sequelize').fn('COUNT', require('sequelize').fn('DISTINCT', require('sequelize').col('type'))), 'typeCount']
      ],
      where: { 
        isActive: true,
        domain: { [require('sequelize').Op.not]: null }
      },
      group: ['domain'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']]
    });

    const domainStats = await Promise.all(
      domains.map(async (domain) => {
        const [components, connections] = await Promise.all([
          Component.findAll({
            where: { domain: domain.domain, isActive: true },
            attributes: ['id', 'name', 'type', 'source']
          }),
          Connection.count({
            where: { domain: domain.domain, isActive: true }
          })
        ]);

        const typeBreakdown = components.reduce((acc, comp) => {
          acc[comp.type] = (acc[comp.type] || 0) + 1;
          return acc;
        }, {});

        const sourceBreakdown = components.reduce((acc, comp) => {
          acc[comp.source] = (acc[comp.source] || 0) + 1;
          return acc;
        }, {});

        return {
          name: domain.domain,
          componentCount: parseInt(domain.dataValues.componentCount),
          typeCount: parseInt(domain.dataValues.typeCount),
          connectionCount: connections,
          typeBreakdown,
          sourceBreakdown,
          components: components.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            source: c.source
          }))
        };
      })
    );

    res.json(domainStats);
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:domain', async (req, res) => {
  try {
    const domainName = req.params.domain;
    
    const [components, connections] = await Promise.all([
      Component.findAll({
        where: { domain: domainName, isActive: true },
        include: [{
          model: require('../models').Connector,
          as: 'connector',
          attributes: ['name', 'type', 'status']
        }]
      }),
      Connection.findAll({
        where: { domain: domainName, isActive: true },
        include: [
          { model: Component, as: 'source', attributes: ['id', 'name', 'type'] },
          { model: Component, as: 'target', attributes: ['id', 'name', 'type'] }
        ]
      })
    ]);

    if (components.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const typeBreakdown = components.reduce((acc, comp) => {
      acc[comp.type] = (acc[comp.type] || 0) + 1;
      return acc;
    }, {});

    const sourceBreakdown = components.reduce((acc, comp) => {
      acc[comp.source] = (acc[comp.source] || 0) + 1;
      return acc;
    }, {});

    const domainData = {
      name: domainName,
      componentCount: components.length,
      connectionCount: connections.length,
      typeBreakdown,
      sourceBreakdown,
      components,
      connections,
      lastUpdated: Math.max(
        ...components.map(c => new Date(c.updatedAt).getTime())
      )
    };

    res.json(domainData);
  } catch (error) {
    console.error('Error fetching domain details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:domain/graph', async (req, res) => {
  try {
    const domainName = req.params.domain;
    
    const [components, connections] = await Promise.all([
      Component.findAll({
        where: { domain: domainName, isActive: true },
        attributes: ['id', 'name', 'tag', 'type', 'domain', 'source', 'metadata']
      }),
      Connection.findAll({
        where: { domain: domainName, isActive: true },
        attributes: ['sourceId', 'targetId', 'domain', 'connectionType', 'strength', 'metadata']
      })
    ]);

    if (components.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const nodes = components.map(comp => ({
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

    const edges = connections.map(conn => ({
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

    res.json({
      domain: domainName,
      nodes,
      edges,
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    });
  } catch (error) {
    console.error('Error generating domain graph:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;