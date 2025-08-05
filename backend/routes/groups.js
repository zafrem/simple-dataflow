const express = require('express');
const { ComponentGroup, ComponentGroupMembership, Component } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Get all component groups
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      groupType, 
      domain, 
      includeComponents = false 
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { isActive: true };

    if (groupType) {
      where.groupType = groupType;
    }

    if (domain) {
      where.domain = domain;
    }

    const includeOptions = [];
    if (includeComponents === 'true') {
      includeOptions.push({
        model: Component,
        as: 'components',
        through: {
          model: ComponentGroupMembership,
          as: 'membership',
          attributes: ['role', 'metadata', 'addedAt']
        },
        where: { isActive: true },
        required: false
      });
    }

    const groups = await ComponentGroup.findAndCountAll({
      where,
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.json({
      groups: groups.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: groups.count,
        pages: Math.ceil(groups.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching component groups:', error);
    res.status(500).json({ error: 'Failed to fetch component groups' });
  }
});

// Get specific component group
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeComponents = true } = req.query;

    const includeOptions = [];
    if (includeComponents === 'true') {
      includeOptions.push({
        model: Component,
        as: 'components',
        through: {
          model: ComponentGroupMembership,
          as: 'membership',
          attributes: ['role', 'metadata', 'addedAt']
        },
        where: { isActive: true },
        required: false
      });
    }

    const group = await ComponentGroup.findByPk(id, {
      include: includeOptions
    });

    if (!group) {
      return res.status(404).json({ error: 'Component group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching component group:', error);
    res.status(500).json({ error: 'Failed to fetch component group' });
  }
});

// Create new component group
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      groupType = 'LOGICAL',
      domain,
      domainId,
      metadata = {},
      color,
      position = { x: 0, y: 0 },
      componentIds = []
    } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Check for duplicate group name within the same domain (case-insensitive)
    const whereClause = { 
      name: { [Op.iLike]: name.trim() },
      isActive: true
    };

    // If domain or domainId is specified, check within that domain
    if (domainId) {
      whereClause.domainId = domainId;
    } else if (domain) {
      whereClause.domain = domain;
    }

    const existingGroup = await ComponentGroup.findOne({ where: whereClause });
    
    if (existingGroup) {
      return res.status(409).json({ 
        error: 'Group with this name already exists in the specified domain',
        details: {
          field: 'name',
          value: name.trim(),
          domain: domain || 'domain_id_' + domainId,
          existingGroup: {
            id: existingGroup.id,
            name: existingGroup.name,
            groupType: existingGroup.groupType,
            domain: existingGroup.domain,
            domainId: existingGroup.domainId
          }
        }
      });
    }

    // Create the group
    const group = await ComponentGroup.create({
      name: name.trim(),
      description: description?.trim(),
      groupType,
      domain,
      domainId,
      metadata,
      color,
      position
    });

    // Add components to the group if specified
    if (componentIds.length > 0) {
      const memberships = componentIds.map(componentId => ({
        groupId: group.id,
        componentId,
        role: 'MEMBER'
      }));

      await ComponentGroupMembership.bulkCreate(memberships);
    }

    // Fetch the complete group with components
    const completeGroup = await ComponentGroup.findByPk(group.id, {
      include: [{
        model: Component,
        as: 'components',
        through: {
          model: ComponentGroupMembership,
          as: 'membership',
          attributes: ['role', 'metadata', 'addedAt']
        },
        where: { isActive: true },
        required: false
      }]
    });

    res.status(201).json(completeGroup);
  } catch (error) {
    console.error('Error creating component group:', error);
    res.status(500).json({ error: 'Failed to create component group' });
  }
});

// Update component group
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      groupType,
      domain,
      metadata,
      color,
      position
    } = req.body;

    const group = await ComponentGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ error: 'Component group not found' });
    }

    await group.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(groupType && { groupType }),
      ...(domain !== undefined && { domain }),
      ...(metadata && { metadata }),
      ...(color !== undefined && { color }),
      ...(position && { position })
    });

    res.json(group);
  } catch (error) {
    console.error('Error updating component group:', error);
    res.status(500).json({ error: 'Failed to update component group' });
  }
});

// Delete component group
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    const group = await ComponentGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ error: 'Component group not found' });
    }

    if (force === 'true') {
      // Hard delete - remove all memberships and the group
      await ComponentGroupMembership.destroy({ where: { groupId: id } });
      await group.destroy();
    } else {
      // Soft delete - mark as inactive
      await group.update({ isActive: false });
    }

    res.json({ message: 'Component group deleted successfully' });
  } catch (error) {
    console.error('Error deleting component group:', error);
    res.status(500).json({ error: 'Failed to delete component group' });
  }
});

// Add component to group
router.post('/:id/components/:componentId', async (req, res) => {
  try {
    const { id: groupId, componentId } = req.params;
    const { role = 'MEMBER', metadata = {} } = req.body;

    // Check if group and component exist
    const group = await ComponentGroup.findByPk(groupId);
    const component = await Component.findByPk(componentId);

    if (!group) {
      return res.status(404).json({ error: 'Component group not found' });
    }
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    // Check if membership already exists
    const existingMembership = await ComponentGroupMembership.findOne({
      where: { groupId, componentId }
    });

    if (existingMembership) {
      // Update existing membership
      await existingMembership.update({ role, metadata, isActive: true });
      return res.json(existingMembership);
    }

    // Create new membership
    const membership = await ComponentGroupMembership.create({
      groupId,
      componentId,
      role,
      metadata
    });

    res.status(201).json(membership);
  } catch (error) {
    console.error('Error adding component to group:', error);
    res.status(500).json({ error: 'Failed to add component to group' });
  }
});

// Remove component from group
router.delete('/:id/components/:componentId', async (req, res) => {
  try {
    const { id: groupId, componentId } = req.params;

    const membership = await ComponentGroupMembership.findOne({
      where: { groupId, componentId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Component membership not found' });
    }

    await membership.destroy();
    res.json({ message: 'Component removed from group successfully' });
  } catch (error) {
    console.error('Error removing component from group:', error);
    res.status(500).json({ error: 'Failed to remove component from group' });
  }
});

// Get group statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const group = await ComponentGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ error: 'Component group not found' });
    }

    const stats = await ComponentGroupMembership.findAll({
      where: { groupId: id, isActive: true },
      include: [{
        model: Component,
        as: 'component',
        attributes: ['type']
      }],
      attributes: ['role']
    });

    const componentsByType = {};
    const componentsByRole = {};

    stats.forEach(membership => {
      const type = membership.component.type;
      const role = membership.role;

      componentsByType[type] = (componentsByType[type] || 0) + 1;
      componentsByRole[role] = (componentsByRole[role] || 0) + 1;
    });

    res.json({
      totalComponents: stats.length,
      componentsByType,
      componentsByRole
    });
  } catch (error) {
    console.error('Error fetching group statistics:', error);
    res.status(500).json({ error: 'Failed to fetch group statistics' });
  }
});

// Add component to group
router.post('/:id/memberships', async (req, res) => {
  try {
    const { id } = req.params;
    const { componentId, role = 'MEMBER' } = req.body;

    // Verify group exists
    const group = await ComponentGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ error: 'Component group not found' });
    }

    // Verify component exists
    const component = await Component.findByPk(componentId);
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    // Check if membership already exists
    const existingMembership = await ComponentGroupMembership.findOne({
      where: { groupId: id, componentId }
    });

    if (existingMembership) {
      return res.status(409).json({ error: 'Component is already a member of this group' });
    }

    // Create membership
    const membership = await ComponentGroupMembership.create({
      groupId: id,
      componentId,
      role,
      metadata: {
        addedAt: new Date().toISOString(),
        addedBy: 'user'
      }
    });

    res.status(201).json(membership);
  } catch (error) {
    console.error('Error adding component to group:', error);
    res.status(500).json({ error: 'Failed to add component to group' });
  }
});

// Remove component from group
router.delete('/:id/memberships/:componentId', async (req, res) => {
  try {
    const { id, componentId } = req.params;

    const membership = await ComponentGroupMembership.findOne({
      where: { groupId: id, componentId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    await membership.destroy();
    res.status(200).json({ message: 'Component removed from group' });
  } catch (error) {
    console.error('Error removing component from group:', error);
    res.status(500).json({ error: 'Failed to remove component from group' });
  }
});

// Clear all memberships for a group
router.delete('/:id/memberships', async (req, res) => {
  try {
    const { id } = req.params;

    await ComponentGroupMembership.destroy({
      where: { groupId: id }
    });

    res.status(200).json({ message: 'All memberships cleared' });
  } catch (error) {
    console.error('Error clearing group memberships:', error);
    res.status(500).json({ error: 'Failed to clear group memberships' });
  }
});

// Get group memberships
router.get('/:id/memberships', async (req, res) => {
  try {
    const { id } = req.params;

    const memberships = await ComponentGroupMembership.findAll({
      where: { groupId: id, isActive: true },
      include: [{
        model: Component,
        as: 'component',
        attributes: ['id', 'name', 'tag', 'type', 'domain']
      }],
      attributes: ['id', 'componentId', 'role', 'metadata', 'addedAt']
    });

    res.json(memberships);
  } catch (error) {
    console.error('Error fetching group memberships:', error);
    res.status(500).json({ error: 'Failed to fetch group memberships' });
  }
});

module.exports = router;