<template>
  <div class="data-view">
    <div class="view-header">
      <h2>Data View</h2>
      <p>Database-style view of all system components, connectors, and connections</p>
    </div>

    <el-tabs v-model="activeTab" type="card" class="data-tabs">
      <!-- Components Tab -->
      <el-tab-pane label="Components" name="components">
        <div class="table-controls">
          <el-input
            v-model="componentSearch"
            placeholder="Search components..."
            prefix-icon="Search"
            clearable
            style="width: 300px; margin-bottom: 16px;"
          />
          <el-button @click="refreshComponents" :loading="loading.components">
            <el-icon><Refresh /></el-icon>
            Refresh
          </el-button>
        </div>
        
        <el-table
          :data="filteredComponents"
          v-loading="loading.components"
          stripe
          border
          height="500"
          :default-sort="{ prop: 'createdAt', order: 'descending' }"
          style="width: 100%">
          
          <el-table-column prop="id" label="ID" width="60" sortable />
          <el-table-column prop="name" label="Name" width="150" sortable />
          <el-table-column prop="tag" label="Tag" width="150" sortable />
          <el-table-column prop="type" label="Type" width="80" sortable>
            <template #default="{ row }">
              <el-tag :type="getTypeColor(row.type)" size="small">
                {{ row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="domain" label="Domain" width="120" sortable />
          <el-table-column prop="source" label="Source" width="120" sortable />
          <el-table-column prop="team" label="Team" width="120" sortable>
            <template #default="{ row }">
              <el-tag v-if="row.team" type="success" size="small">
                {{ row.team }}
              </el-tag>
              <span v-else class="text-placeholder">N/A</span>
            </template>
          </el-table-column>
          <el-table-column prop="isActive" label="Active" width="80" sortable>
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? 'Yes' : 'No' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="connector.name" label="Connector" width="150" />
          <el-table-column prop="lastSeen" label="Last Seen" width="160" sortable>
            <template #default="{ row }">
              {{ formatDate(row.lastSeen) }}
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="Created" width="160" sortable>
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="Metadata" width="200">
            <template #default="{ row }">
              <el-popover trigger="click" width="400">
                <pre>{{ JSON.stringify(row.metadata, null, 2) }}</pre>
                <template #reference>
                  <el-button size="small" link>View Metadata</el-button>
                </template>
              </el-popover>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Connectors Tab -->
      <el-tab-pane label="Connectors" name="connectors">
        <div class="table-controls">
          <el-input
            v-model="connectorSearch"
            placeholder="Search connectors..."
            prefix-icon="Search"
            clearable
            style="width: 300px; margin-bottom: 16px;"
          />
          <el-button @click="refreshConnectors" :loading="loading.connectors">
            <el-icon><Refresh /></el-icon>
            Refresh
          </el-button>
        </div>
        
        <el-table
          :data="filteredConnectors"
          v-loading="loading.connectors"
          stripe
          border
          height="500"
          :default-sort="{ prop: 'createdAt', order: 'descending' }"
          style="width: 100%">
          
          <el-table-column prop="id" label="ID" width="60" sortable />
          <el-table-column prop="name" label="Name" width="200" sortable />
          <el-table-column prop="type" label="Type" width="120" sortable>
            <template #default="{ row }">
              <el-tag :type="getConnectorTypeColor(row.type)" size="small">
                {{ row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="Status" width="100" sortable>
            <template #default="{ row }">
              <el-tag :type="getStatusColor(row.status)" size="small">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="isActive" label="Active" width="80" sortable>
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? 'Yes' : 'No' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="schedule" label="Schedule" width="150" />
          <el-table-column prop="lastRun" label="Last Run" width="160" sortable>
            <template #default="{ row }">
              {{ formatDate(row.lastRun) }}
            </template>
          </el-table-column>
          <el-table-column prop="successCount" label="Success" width="80" sortable />
          <el-table-column prop="errorCount" label="Errors" width="80" sortable />
          <el-table-column prop="createdAt" label="Created" width="160" sortable>
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="Config" width="150">
            <template #default="{ row }">
              <el-popover trigger="click" width="500">
                <pre>{{ JSON.stringify(row.config, null, 2) }}</pre>
                <template #reference>
                  <el-button size="small" link>View Config</el-button>
                </template>
              </el-popover>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Connections Tab -->
      <el-tab-pane label="Connections" name="connections">
        <div class="table-controls">
          <el-input
            v-model="connectionSearch"
            placeholder="Search connections..."
            prefix-icon="Search"
            clearable
            style="width: 300px; margin-bottom: 16px;"
          />
          <el-button @click="refreshConnections" :loading="loading.connections">
            <el-icon><Refresh /></el-icon>
            Refresh
          </el-button>
        </div>
        
        <el-table
          :data="filteredConnections"
          v-loading="loading.connections"
          stripe
          border
          height="500"
          :default-sort="{ prop: 'createdAt', order: 'descending' }"
          style="width: 100%">
          
          <el-table-column prop="id" label="ID" width="60" sortable />
          <el-table-column prop="source.name" label="Source" width="150" sortable />
          <el-table-column prop="source.type" label="Source Type" width="100">
            <template #default="{ row }">
              <el-tag :type="getTypeColor(row.source?.type)" size="small">
                {{ row.source?.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="target.name" label="Target" width="150" sortable />
          <el-table-column prop="target.type" label="Target Type" width="100">
            <template #default="{ row }">
              <el-tag :type="getTypeColor(row.target?.type)" size="small">
                {{ row.target?.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="domain" label="Domain" width="120" sortable />
          <el-table-column prop="connectionType" label="Connection Type" width="130" sortable>
            <template #default="{ row }">
              <el-tag :type="getConnectionTypeColor(row.connectionType)" size="small">
                {{ row.connectionType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="strength" label="Strength" width="100" sortable />
          <el-table-column prop="isActive" label="Active" width="80" sortable>
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? 'Yes' : 'No' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="Created" width="160" sortable>
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="Metadata" width="150">
            <template #default="{ row }">
              <el-popover trigger="click" width="400">
                <pre>{{ JSON.stringify(row.metadata, null, 2) }}</pre>
                <template #reference>
                  <el-button size="small" link>View Metadata</el-button>
                </template>
              </el-popover>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useComponentStore } from '../stores/components'
import { ElMessage } from 'element-plus'

const componentStore = useComponentStore()

const activeTab = ref('components')
const componentSearch = ref('')
const connectorSearch = ref('')
const connectionSearch = ref('')

const loading = ref({
  components: false,
  connectors: false,
  connections: false
})

const components = ref([])
const connectors = ref([])
const connections = ref([])

// Computed filters
const filteredComponents = computed(() => {
  if (!componentSearch.value) return components.value
  const search = componentSearch.value.toLowerCase()
  return components.value.filter(item =>
    item.name?.toLowerCase().includes(search) ||
    item.tag?.toLowerCase().includes(search) ||
    item.type?.toLowerCase().includes(search) ||
    item.domain?.toLowerCase().includes(search) ||
    item.team?.toLowerCase().includes(search)
  )
})

const filteredConnectors = computed(() => {
  if (!connectorSearch.value) return connectors.value
  const search = connectorSearch.value.toLowerCase()
  return connectors.value.filter(item =>
    item.name?.toLowerCase().includes(search) ||
    item.type?.toLowerCase().includes(search) ||
    item.status?.toLowerCase().includes(search)
  )
})

const filteredConnections = computed(() => {
  if (!connectionSearch.value) return connections.value
  const search = connectionSearch.value.toLowerCase()
  return connections.value.filter(item =>
    item.source?.name?.toLowerCase().includes(search) ||
    item.target?.name?.toLowerCase().includes(search) ||
    item.domain?.toLowerCase().includes(search) ||
    item.connectionType?.toLowerCase().includes(search)
  )
})

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleString()
}

const getTypeColor = (type) => {
  switch (type) {
    case 'DB': return 'primary'
    case 'API': return 'success'
    case 'APP': return 'warning'
    default: return 'info'
  }
}

const getConnectorTypeColor = (type) => {
  switch (type) {
    case 'database': return 'primary'
    case 'api': return 'success'
    case 'logs': return 'warning'
    case 'config': return 'info'
    case 'network': return 'danger'
    default: return 'info'
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'idle': return 'info'
    case 'running': return 'warning'
    case 'success': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
}

const getConnectionTypeColor = (type) => {
  switch (type) {
    case 'domain': return 'primary'
    case 'direct': return 'danger'
    case 'inferred': return 'warning'
    default: return 'info'
  }
}

// Data fetching functions
const refreshComponents = async () => {
  loading.value.components = true
  try {
    const response = await fetch('http://localhost:3001/api/components?include=connector')
    if (!response.ok) throw new Error('Failed to fetch components')
    components.value = await response.json()
  } catch (error) {
    ElMessage.error('Failed to load components: ' + error.message)
  } finally {
    loading.value.components = false
  }
}

const refreshConnectors = async () => {
  loading.value.connectors = true
  try {
    const response = await fetch('http://localhost:3001/api/connectors')
    if (!response.ok) throw new Error('Failed to fetch connectors')
    connectors.value = await response.json()
  } catch (error) {
    ElMessage.error('Failed to load connectors: ' + error.message)
  } finally {
    loading.value.connectors = false
  }
}

const refreshConnections = async () => {
  loading.value.connections = true
  try {
    const response = await fetch('http://localhost:3001/api/connections?include=components')
    if (!response.ok) throw new Error('Failed to fetch connections')
    connections.value = await response.json()
  } catch (error) {
    ElMessage.error('Failed to load connections: ' + error.message)
  } finally {
    loading.value.connections = false
  }
}

// Initialize data on mount
onMounted(async () => {
  await Promise.all([
    refreshComponents(),
    refreshConnectors(),
    refreshConnections()
  ])
})
</script>

<style scoped>
.data-view {
  padding: 24px;
  max-width: 100%;
  overflow-x: auto;
}

.view-header {
  margin-bottom: 24px;
}

.view-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.view-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.data-tabs {
  width: 100%;
}

.table-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-table .el-table__header th) {
  background-color: #f5f7fa;
  color: #303133;
  font-weight: 600;
}

:deep(.el-table .el-table__row:hover td) {
  background-color: #f5f7fa;
}

pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  max-height: 300px;
  overflow-y: auto;
}

.el-tag {
  font-size: 11px;
}
</style>