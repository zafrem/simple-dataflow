<template>
  <div class="group-overview">
    <div class="overview-header">
      <h2>System Architecture Overview</h2>
      <p>Click on any group to explore its components in detail</p>
    </div>

    <div v-if="loading" class="loading-container">
      <el-loading />
    </div>

    <div v-else class="groups-grid">
      <div
        v-for="group in groups"
        :key="group.id"
        class="group-card"
        :style="{ borderColor: group.color }"
        @click="onGroupClick(group)">
        
        <div class="group-header">
          <div class="group-title">
            <div 
              class="group-color-dot" 
              :style="{ backgroundColor: group.color }">
            </div>
            <h3>{{ group.name }}</h3>
          </div>
          <div class="group-type-badge">
            <el-tag :type="getGroupTypeColor(group.groupType)" size="small">
              {{ group.groupType }}
            </el-tag>
          </div>
        </div>

        <div class="group-description">
          <p>{{ group.description }}</p>
        </div>

        <div class="group-stats">
          <div class="stat-item">
            <span class="stat-label">Components:</span>
            <span class="stat-value">{{ getComponentCount(group.id) }}</span>
          </div>
          <div v-if="group.domain" class="stat-item">
            <span class="stat-label">Domain:</span>
            <span class="stat-value">{{ group.domain }}</span>
          </div>
        </div>

        <div class="component-types">
          <div class="types-label">Component Types:</div>
          <div class="type-tags">
            <el-tag
              v-for="type in getGroupComponentTypes(group.id)"
              :key="type"
              :type="getComponentTypeColor(type)"
              size="mini">
              {{ type }}
            </el-tag>
          </div>
        </div>

        <div class="group-metadata" v-if="Object.keys(group.metadata || {}).length > 0">
          <div class="metadata-items">
            <div 
              v-for="(value, key) in group.metadata" 
              :key="key"
              class="metadata-item">
              <span class="metadata-key">{{ formatMetadataKey(key) }}:</span>
              <span class="metadata-value">{{ value }}</span>
            </div>
          </div>
        </div>

        <div class="click-indicator">
          <el-icon><ArrowRight /></el-icon>
          <span>Click to explore</span>
        </div>
      </div>
    </div>

    <div v-if="!loading && groups.length === 0" class="empty-state">
      <el-empty description="No component groups found">
        <el-button type="primary" @click="$emit('create-group')">
          Create First Group
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import { useComponentStore } from '../stores/components'

const emit = defineEmits(['group-selected', 'create-group'])

const componentStore = useComponentStore()
const loading = ref(false)
const groups = ref([])
const groupMemberships = ref({}) // groupId -> array of components

const loadGroups = async () => {
  try {
    loading.value = true
    
    // Load groups with their components
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/groups?includeComponents=true`)
    const data = await response.json()
    
    groups.value = data.groups || []
    
    // Build membership lookup
    groupMemberships.value = {}
    groups.value.forEach(group => {
      groupMemberships.value[group.id] = group.components || []
    })
    
  } catch (error) {
    console.error('Error loading groups:', error)
  } finally {
    loading.value = false
  }
}

const getComponentCount = (groupId) => {
  return groupMemberships.value[groupId]?.length || 0
}

const getGroupComponentTypes = (groupId) => {
  const components = groupMemberships.value[groupId] || []
  const types = [...new Set(components.map(c => c.type))]
  return types.sort()
}

const getGroupTypeColor = (groupType) => {
  const colors = {
    'FUNCTIONAL': 'success',
    'LOGICAL': 'primary',
    'PHYSICAL': 'warning',
    'SERVICE': 'info'
  }
  return colors[groupType] || 'default'
}

const getComponentTypeColor = (type) => {
  const colors = {
    'DB': 'primary',
    'API': 'success', 
    'APP': 'warning',
    'STORAGE': 'info',
    'PIPES': 'danger'
  }
  return colors[type] || 'default'
}

const formatMetadataKey = (key) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}

const onGroupClick = (group) => {
  emit('group-selected', group)
}

onMounted(() => {
  loadGroups()
})

defineExpose({
  refreshGroups: loadGroups
})
</script>

<style scoped>
.group-overview {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.overview-header {
  text-align: center;
  margin-bottom: 30px;
}

.overview-header h2 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 28px;
  font-weight: 600;
}

.overview-header p {
  color: #7f8c8d;
  font-size: 16px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.group-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.group-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: currentColor;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.group-title h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
}

.group-description {
  margin-bottom: 20px;
}

.group-description p {
  color: #5a6c7d;
  line-height: 1.5;
  margin: 0;
}

.group-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.component-types {
  margin-bottom: 16px;
}

.types-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.group-metadata {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid currentColor;
}

.metadata-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.metadata-item {
  display: flex;
  gap: 6px;
  font-size: 13px;
}

.metadata-key {
  color: #6c757d;
  font-weight: 500;
}

.metadata-value {
  color: #2c3e50;
  font-weight: 600;
}

.click-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin: 16px -24px -24px -24px;
  background: linear-gradient(90deg, #f8f9fa, #e9ecef);
  color: #6c757d;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.group-card:hover .click-indicator {
  background: linear-gradient(90deg, currentColor, currentColor);
  color: white;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

@media (max-width: 768px) {
  .groups-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .group-card {
    padding: 20px;
    margin: 0 10px;
  }
  
  .group-stats {
    flex-direction: column;
    gap: 12px;
  }
  
  .stat-item {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>