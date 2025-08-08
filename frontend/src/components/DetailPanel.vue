<template>
  <div class="detail-panel" :class="{ open: isOpen }">
    <div class="detail-header">
      <div class="header-content">
        <div class="component-title">
          <el-tag :type="getTypeTagType(component?.type)" size="small">
            {{ component?.type }}
          </el-tag>
          <h3>{{ component?.name }}</h3>
        </div>
        <el-button
          link
          :icon="Close"
          @click="closePanel"
          style="color: white;" />
      </div>
    </div>

    <div class="detail-content" v-if="component">
      <div class="info-section">
        <h4>Basic Information</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Tags:</span>
            <div class="tags-container">
              <el-tag 
                v-for="tag in (Array.isArray(component.tag) ? component.tag : [component.tag])" 
                :key="tag"
                :type="getTagType(tag)"
                size="small"
                class="tag-item">
                {{ tag }}
              </el-tag>
            </div>
          </div>
          
          <div class="info-item">
            <span class="label">Domain:</span>
            <span class="value">{{ component.domain || 'N/A' }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Source:</span>
            <el-tag size="small">{{ formatSourceName(component.source) }}</el-tag>
          </div>
          
          <div class="info-item" v-if="component.team">
            <span class="label">Team:</span>
            <el-tag size="small" type="success">{{ component.team }}</el-tag>
          </div>
          
          <div class="info-item">
            <span class="label">Status:</span>
            <el-tag 
              :type="component.isActive ? 'success' : 'danger'" 
              size="small">
              {{ component.isActive ? 'Active' : 'Inactive' }}
            </el-tag>
          </div>
          
          <div class="info-item">
            <span class="label">Last Seen:</span>
            <span class="value">{{ formatDate(component.lastSeen) }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Created:</span>
            <span class="value">{{ formatDate(component.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="info-section" v-if="component.description">
        <h4>Description</h4>
        <p class="description">{{ component.description }}</p>
      </div>

      <div class="info-section" v-if="component.connector">
        <h4>Data Connector</h4>
        <div class="connector-info">
          <el-tag :type="getConnectorStatusType(component.connector.status)" size="small">
            {{ component.connector.name }}
          </el-tag>
          <span class="connector-type">{{ formatSourceName(component.connector.type) }}</span>
          <span class="connector-status" v-if="component.connector.lastRun">
            Last run: {{ formatDate(component.connector.lastRun) }}
          </span>
        </div>
      </div>

      <div class="info-section">
        <h4>Connections</h4>
        <el-tabs v-model="activeConnectionTab" type="card" size="small">
          <el-tab-pane label="Outgoing" name="outgoing">
            <div class="connections-list">
              <div 
                v-for="connection in component.outgoingConnections" 
                :key="connection.id"
                class="connection-item">
                <div class="connection-info">
                  <el-tag :type="getTypeTagType(connection.target.type)" size="mini">
                    {{ connection.target.type }}
                  </el-tag>
                  <span class="connection-name">{{ connection.target.name }}</span>
                </div>
                <div class="connection-meta">
                  <span class="connection-badge" :class="connection.connectionType">
                    {{ connection.connectionType }}
                  </span>
                  <span class="connection-strength">
                    {{ (connection.strength * 100).toFixed(0) }}%
                  </span>
                </div>
              </div>
              <div v-if="component.outgoingConnections.length === 0" class="no-connections">
                No outgoing connections
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="Incoming" name="incoming">
            <div class="connections-list">
              <div 
                v-for="connection in component.incomingConnections" 
                :key="connection.id"
                class="connection-item">
                <div class="connection-info">
                  <el-tag :type="getTypeTagType(connection.source.type)" size="mini">
                    {{ connection.source.type }}
                  </el-tag>
                  <span class="connection-name">{{ connection.source.name }}</span>
                </div>
                <div class="connection-meta">
                  <span class="connection-badge" :class="connection.connectionType">
                    {{ connection.connectionType }}
                  </span>
                  <span class="connection-strength">
                    {{ (connection.strength * 100).toFixed(0) }}%
                  </span>
                </div>
              </div>
              <div v-if="component.incomingConnections.length === 0" class="no-connections">
                No incoming connections
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="info-section" v-if="hasMetadata">
        <h4>Metadata</h4>
        <el-collapse v-model="activeMetadataSection" accordion>
          <el-collapse-item 
            v-for="(value, key) in component.metadata" 
            :key="key"
            :title="formatMetadataKey(key)"
            :name="key">
            <div class="metadata-content">
              <pre v-if="isObject(value)">{{ JSON.stringify(value, null, 2) }}</pre>
              <span v-else>{{ value }}</span>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <div class="info-section">
        <h4>Actions</h4>
        <div class="actions-grid">
          <el-button size="small" @click="editComponent">
            <el-icon><Edit /></el-icon>
            Edit
          </el-button>
          
          <el-button size="small" @click="viewConnections">
            <el-icon><Connection /></el-icon>
            View Connections
          </el-button>
          
          <el-button size="small" type="warning" @click="refreshComponent">
            <el-icon><Refresh /></el-icon>
            Refresh
          </el-button>
          
          <el-button size="small" type="danger" @click="deleteComponent">
            <el-icon><Delete /></el-icon>
            Delete
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Close, Edit, Connection, Refresh, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useComponentStore } from '../stores/components'

const props = defineProps({
  component: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'edit', 'delete', 'refresh'])

const componentStore = useComponentStore()

const activeConnectionTab = ref('outgoing')
const activeMetadataSection = ref('')

const isOpen = computed(() => props.component !== null)

const hasMetadata = computed(() => {
  return props.component?.metadata && 
         Object.keys(props.component.metadata).length > 0
})

const closePanel = () => {
  emit('close')
}

const getTypeTagType = (type) => {
  const typeMap = {
    'DB': 'primary',
    'API': 'success',  
    'APP': 'warning'
  }
  return typeMap[type] || 'info'
}

const getTagType = (tag) => {
  const tagTypeMap = {
    'PIPS': 'danger',
    'SOX': 'warning', 
    'HR': 'success',
    'Proj': 'primary',
    'Infra': 'info',
    'Other': ''
  }
  return tagTypeMap[tag] || ''
}

const getConnectorStatusType = (status) => {
  const statusMap = {
    'success': 'success',
    'running': 'primary',
    'error': 'danger',
    'idle': 'info'
  }
  return statusMap[status] || 'info'
}

const formatSourceName = (source) => {
  if (!source) return 'Unknown'
  return source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' ')
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

const formatMetadataKey = (key) => {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
}

const isObject = (value) => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const editComponent = () => {
  emit('edit', props.component)
}

const viewConnections = () => {
  // Focus on the component's connections in the graph
  // This would be handled by the parent component
  emit('view-connections', props.component)
}

const refreshComponent = async () => {
  if (!props.component) return
  
  try {
    await componentStore.fetchComponent(props.component.id)
    ElMessage.success('Component data refreshed')
    emit('refresh', props.component)
  } catch (error) {
    ElMessage.error('Failed to refresh component data')
  }
}

const deleteComponent = async () => {
  if (!props.component) return
  
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete "${props.component.name}"? This action cannot be undone.`,
      'Confirm Deletion',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    await componentStore.deleteComponent(props.component.id)
    ElMessage.success('Component deleted successfully')
    emit('delete', props.component)
    closePanel()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Failed to delete component')
    }
  }
}

watch(() => props.component, (newComponent) => {
  if (newComponent) {
    // Reset tabs when component changes
    activeConnectionTab.value = 'outgoing'
    activeMetadataSection.value = ''
  }
})
</script>

<style scoped>
.detail-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 380px;
  max-height: calc(100vh - 40px);
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(20px);
  z-index: 200;
  overflow: hidden;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-light);
}

.detail-panel.open {
  transform: translateX(0);
}

.detail-header {
  padding: 20px;
  background: linear-gradient(135deg, var(--primary-color), #66b3ff);
  color: white;
}

.header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.component-title h3 {
  margin: 8px 0 0 0;
  font-size: 18px;
  font-weight: 600;
  word-break: break-word;
}

.detail-content {
  padding: 20px;
  overflow-y: auto;
  max-height: calc(100vh - 140px);
}

.info-section {
  margin-bottom: 24px;
}

.info-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-lighter);
  padding-bottom: 6px;
}

.info-grid {
  display: grid;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.info-item .label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 80px;
}

.info-item .value {
  font-size: 13px;
  color: var(--text-primary);
  text-align: right;
  word-break: break-word;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.tag-item {
  margin: 0;
}

.description {
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.5;
  margin: 0;
  padding: 12px;
  background: var(--background-light);
  border-radius: 6px;
  border-left: 3px solid var(--primary-color);
}

.connector-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--background-light);
  border-radius: 6px;
}

.connector-type {
  font-size: 12px;
  color: var(--text-secondary);
}

.connector-status {
  font-size: 11px;
  color: var(--text-placeholder);
}

.connections-list {
  max-height: 200px;
  overflow-y: auto;
}

.connection-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: var(--background-light);
  border-radius: 6px;
  border: 1px solid var(--border-lighter);
}

.connection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.connection-name {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
}

.connection-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.connection-badge.domain {
  background-color: var(--primary-color);
  color: white;
}

.connection-badge.direct {
  background-color: var(--danger-color);
  color: white;
}

.connection-badge.inferred {
  background-color: var(--warning-color);
  color: white;
}

.connection-strength {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.no-connections {
  text-align: center;
  padding: 20px;
  color: var(--text-placeholder);
  font-size: 12px;
}

.metadata-content {
  padding: 8px;
  background: var(--background-base);
  border-radius: 4px;
  font-size: 12px;
}

.metadata-content pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.actions-grid .el-button {
  font-size: 12px;
}

/* Scrollbar styling */
.detail-content::-webkit-scrollbar,
.connections-list::-webkit-scrollbar {
  width: 6px;
}

.detail-content::-webkit-scrollbar-track,
.connections-list::-webkit-scrollbar-track {
  background: var(--border-extra-light);
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb,
.connections-list::-webkit-scrollbar-thumb {
  background: var(--border-base);
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb:hover,
.connections-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-placeholder);
}

@media (max-width: 768px) {
  .detail-panel {
    width: calc(100vw - 20px);
    left: 10px;
    right: 10px;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>