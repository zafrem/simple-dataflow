<template>
  <div class="settings-view">
    <div class="settings-header">
      <h2>Settings & Configuration</h2>
      <p>Manage connectors, data sources, and system configuration</p>
    </div>
    
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="Data Connectors" name="connectors">
        <div class="connectors-section">
          <div class="section-header">
            <h3>Data Connectors</h3>
            <el-button type="primary" @click="showAddConnectorDialog = true">
              <el-icon><Plus /></el-icon>
              Add Connector
            </el-button>
          </div>
          
          <div class="connectors-grid">
            <div
              v-for="connector in connectors"
              :key="connector.id"
              class="connector-card">
              <div class="connector-header">
                <div class="connector-info">
                  <h4>{{ connector.name }}</h4>
                  <el-tag :type="getConnectorTypeTag(connector.type)" size="small">
                    {{ formatConnectorType(connector.type) }}
                  </el-tag>
                </div>
                <div class="connector-actions">
                  <el-dropdown @command="handleConnectorAction">
                    <el-button link>
                      <el-icon><More /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :command="`test:${connector.id}`">
                          Test Connection
                        </el-dropdown-item>
                        <el-dropdown-item :command="`sync:${connector.id}`">
                          Trigger Sync
                        </el-dropdown-item>
                        <el-dropdown-item :command="`edit:${connector.id}`">
                          Edit
                        </el-dropdown-item>
                        <el-dropdown-item :command="`delete:${connector.id}`" divided>
                          Delete
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
              
              <div class="connector-status">
                <el-tag :type="getStatusTagType(connector.status)" size="mini">
                  {{ connector.status }}
                </el-tag>
                <span class="status-text">
                  {{ getStatusText(connector) }}
                </span>
              </div>
              
              <div class="connector-stats">
                <div class="stat">
                  <span class="stat-label">Components:</span>
                  <span class="stat-value">{{ connector.components?.length || 0 }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Success:</span>
                  <span class="stat-value">{{ connector.successCount || 0 }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Errors:</span>
                  <span class="stat-value">{{ connector.errorCount || 0 }}</span>
                </div>
              </div>
              
              <div class="connector-schedule" v-if="connector.schedule">
                <el-icon><Clock /></el-icon>
                <span>{{ connector.schedule }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="Sync Status" name="sync">
        <div class="sync-section">
          <div class="section-header">
            <h3>Synchronization Status</h3>
            <el-button type="success" @click="triggerFullSync" :loading="syncLoading">
              <el-icon><Refresh /></el-icon>
              Trigger Full Sync
            </el-button>
          </div>
          
          <div class="sync-stats">
            <div class="stat-card">
              <div class="stat-icon waiting">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ syncStatus.queue?.waiting || 0 }}</div>
                <div class="stat-label">Waiting</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon active">
                <el-icon><Loading /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ syncStatus.queue?.active || 0 }}</div>
                <div class="stat-label">Active</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon completed">
                <el-icon><Check /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ syncStatus.queue?.completed || 0 }}</div>
                <div class="stat-label">Completed</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon failed">
                <el-icon><Close /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ syncStatus.queue?.failed || 0 }}</div>
                <div class="stat-label">Failed</div>
              </div>
            </div>
          </div>
          
          <div class="recent-jobs">
            <h4>Recent Jobs</h4>
            <el-table :data="syncStatus.recentJobs" size="small" max-height="400">
              <el-table-column prop="id" label="Job ID" width="100" />
              <el-table-column prop="connector" label="Connector" width="120" />
              <el-table-column prop="type" label="Status" width="100">
                <template #default="scope">
                  <el-tag :type="getJobStatusType(scope.row.type)" size="mini">
                    {{ scope.row.type }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="Duration" width="100">
                <template #default="scope">
                  {{ scope.row.duration ? formatDuration(scope.row.duration) : 'N/A' }}
                </template>
              </el-table-column>
              <el-table-column prop="completedAt" label="Completed" width="150">
                <template #default="scope">
                  {{ formatJobTime(scope.row) }}
                </template>
              </el-table-column>
              <el-table-column prop="error" label="Error" show-overflow-tooltip />
            </el-table>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="System Info" name="system">
        <div class="system-section">
          <div class="section-header">
            <h3>System Information</h3>
            <el-button @click="refreshSystemInfo" :loading="systemLoading">
              <el-icon><Refresh /></el-icon>
              Refresh
            </el-button>
          </div>
          
          <div class="system-cards">
            <div class="system-card">
              <h4>Application</h4>
              <div class="system-info">
                <div class="info-item">
                  <span class="label">Status:</span>
                  <el-tag :type="systemHealth.status === 'healthy' ? 'success' : 'danger'" size="small">
                    {{ systemHealth.status }}
                  </el-tag>
                </div>
                <div class="info-item">
                  <span class="label">Version:</span>
                  <span>{{ systemHealth.version }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Uptime:</span>
                  <span>{{ formatUptime(systemHealth.uptime) }}</span>
                </div>
              </div>
            </div>
            
            <div class="system-card">
              <h4>Database</h4>
              <div class="system-info">
                <div class="info-item">
                  <span class="label">Status:</span>
                  <el-tag :type="systemHealth.database === 'connected' ? 'success' : 'danger'" size="small">
                    {{ systemHealth.database }}
                  </el-tag>
                </div>
              </div>
            </div>
            
            <div class="system-card">
              <h4>Redis</h4>
              <div class="system-info">
                <div class="info-item">
                  <span class="label">Status:</span>
                  <el-tag :type="systemHealth.redis === 'connected' ? 'success' : 'danger'" size="small">
                    {{ systemHealth.redis }}
                  </el-tag>
                </div>
              </div>
            </div>
            
            <div class="system-card">
              <h4>Memory Usage</h4>
              <div class="system-info">
                <div class="info-item">
                  <span class="label">Heap Used:</span>
                  <span>{{ formatMemory(systemHealth.memory?.heapUsed) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Heap Total:</span>
                  <span>{{ formatMemory(systemHealth.memory?.heapTotal) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- Repository Link -->
    <div class="repository-link">
      <a href="https://github.com/zafrem/simple-dataflow" target="_blank" rel="noopener noreferrer">
        https://github.com/zafrem/simple-dataflow
      </a>
    </div>
    
    <!-- Add Connector Dialog -->
    <el-dialog
      v-model="showAddConnectorDialog"
      title="Add Data Connector"
      width="600px"
      @close="resetConnectorForm">
      <el-form
        ref="connectorForm"
        :model="newConnector"
        :rules="connectorRules"
        label-width="120px">
        <el-form-item label="Name" prop="name">
          <el-input v-model="newConnector.name" placeholder="Enter connector name" />
        </el-form-item>
        
        <el-form-item label="Type" prop="type">
          <el-select v-model="newConnector.type" placeholder="Select connector type" @change="onConnectorTypeChange">
            <el-option label="Database" value="database" />
            <el-option label="API/Swagger" value="api" />
            <el-option label="Log Files" value="logs" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Schedule" prop="schedule">
          <el-input v-model="newConnector.schedule" placeholder="Cron expression (optional)" />
          <div class="form-help">
            Examples: "0 */6 * * *" (every 6 hours), "*/30 * * * *" (every 30 minutes)
          </div>
        </el-form-item>
        
        <el-form-item label="Configuration">
          <el-input
            v-model="configJson"
            type="textarea"
            :rows="8"
            placeholder="Enter JSON configuration" />
          <div class="form-help">
            Enter the JSON configuration for this connector type
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddConnectorDialog = false">Cancel</el-button>
        <el-button type="primary" @click="createConnector" :loading="connectorLoading">
          Create Connector
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { Plus, More, Clock, Refresh, Loading, Check, Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSystemStore } from '../stores/system'
import { useSocketStore } from '../stores/socket'
import axios from 'axios'

const systemStore = useSystemStore()
const socketStore = useSocketStore()

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000
})

const activeTab = ref('connectors')
const connectors = ref([])
const syncStatus = ref({
  queue: { waiting: 0, active: 0, completed: 0, failed: 0 },
  recentJobs: []
})
const systemHealth = ref({
  status: 'unknown',
  version: 'unknown',
  uptime: 0,
  database: 'unknown',
  redis: 'unknown',
  memory: {}
})

const syncLoading = ref(false)
const systemLoading = ref(false)
const connectorLoading = ref(false)
const showAddConnectorDialog = ref(false)

const newConnector = reactive({
  name: '',
  type: '',
  schedule: '',
  config: {}
})

const configJson = ref('')

const connectorRules = {
  name: [{ required: true, message: 'Please enter connector name', trigger: 'blur' }],
  type: [{ required: true, message: 'Please select connector type', trigger: 'change' }]
}

const fetchConnectors = async () => {
  try {
    const response = await api.get('/connectors')
    connectors.value = response.data
  } catch (error) {
    ElMessage.error('Failed to fetch connectors')
  }
}

const fetchSyncStatus = async () => {
  try {
    const response = await api.get('/sync/status')
    syncStatus.value = response.data
  } catch (error) {
    ElMessage.error('Failed to fetch sync status')
  }
}

const refreshSystemInfo = async () => {
  systemLoading.value = true
  try {
    const health = await systemStore.checkHealth()
    systemHealth.value = health
  } catch (error) {
    ElMessage.error('Failed to fetch system info')
  } finally {
    systemLoading.value = false
  }
}

const handleConnectorAction = async (command) => {
  const [action, connectorId] = command.split(':')
  
  switch (action) {
    case 'test':
      await testConnector(connectorId)
      break
    case 'sync':
      await syncConnector(connectorId)
      break
    case 'edit':
      ElMessage.info('Edit connector feature coming soon')
      break
    case 'delete':
      await deleteConnector(connectorId)
      break
  }
}

const testConnector = async (connectorId) => {
  try {
    const response = await api.post(`/connectors/${connectorId}/test`)
    if (response.data.success) {
      ElMessage.success('Connection test successful')
    } else {
      ElMessage.error(`Connection test failed: ${response.data.message}`)
    }
  } catch (error) {
    ElMessage.error('Connection test failed')
  }
}

const syncConnector = async (connectorId) => {
  try {
    await api.post(`/connectors/${connectorId}/sync`)
    ElMessage.success('Sync job started')
    await fetchSyncStatus()
  } catch (error) {
    ElMessage.error('Failed to start sync job')
  }
}

const deleteConnector = async (connectorId) => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this connector? This action cannot be undone.',
      'Confirm Deletion',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    await api.delete(`/connectors/${connectorId}`)
    ElMessage.success('Connector deleted successfully')
    await fetchConnectors()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Failed to delete connector')
    }
  }
}

const triggerFullSync = async () => {
  syncLoading.value = true
  try {
    await api.post('/sync/trigger')
    ElMessage.success('Full sync triggered')
    await fetchSyncStatus()
  } catch (error) {
    ElMessage.error('Failed to trigger sync')
  } finally {
    syncLoading.value = false
  }
}

const onConnectorTypeChange = (type) => {
  // Provide example configurations
  const examples = {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      username: 'user',
      password: 'password',
      type: 'postgresql',
      tables: 'all'
    },
    api: {
      swaggerUrl: 'https://api.example.com/docs',
      baseUrl: 'https://api.example.com',
      authentication: {
        type: 'bearer',
        token: 'your-token'
      }
    },
    logs: {
      path: '/var/log/app/*.log',
      regex: 'service:\\s*(\\w+)',
      watchMode: true
    }
  }
  
  if (examples[type]) {
    configJson.value = JSON.stringify(examples[type], null, 2)
  }
}

const createConnector = async () => {
  connectorLoading.value = true
  try {
    // Validate JSON config
    let config = {}
    if (configJson.value.trim()) {
      config = JSON.parse(configJson.value)
    }
    
    const connectorData = {
      ...newConnector,
      config
    }
    
    await api.post('/connectors', connectorData)
    ElMessage.success('Connector created successfully')
    
    showAddConnectorDialog.value = false
    resetConnectorForm()
    await fetchConnectors()
  } catch (error) {
    if (error instanceof SyntaxError) {
      ElMessage.error('Invalid JSON configuration')
    } else {
      ElMessage.error('Failed to create connector')
    }
  } finally {
    connectorLoading.value = false
  }
}

const resetConnectorForm = () => {
  newConnector.name = ''
  newConnector.type = ''
  newConnector.schedule = ''
  newConnector.config = {}
  configJson.value = ''
}

const getConnectorTypeTag = (type) => {
  const typeMap = {
    database: 'primary',
    api: 'success',
    logs: 'warning'
  }
  return typeMap[type] || 'info'
}

const formatConnectorType = (type) => {
  const typeMap = {
    database: 'Database',
    api: 'API/Swagger',
    logs: 'Log Files'
  }
  return typeMap[type] || type
}

const getStatusTagType = (status) => {
  const statusMap = {
    success: 'success',
    running: 'primary',
    error: 'danger',
    idle: 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (connector) => {
  if (connector.lastRun) {
    return `Last run: ${new Date(connector.lastRun).toLocaleString()}`
  }
  return 'Never run'
}

const getJobStatusType = (status) => {
  const statusMap = {
    active: 'primary',
    completed: 'success',
    failed: 'danger'
  }
  return statusMap[status] || 'info'
}

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

const formatJobTime = (job) => {
  if (job.completedAt) return new Date(job.completedAt).toLocaleString()
  if (job.failedAt) return new Date(job.failedAt).toLocaleString()
  if (job.startedAt) return new Date(job.startedAt).toLocaleString()
  return 'N/A'
}

const formatUptime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const formatMemory = (bytes) => {
  if (!bytes) return 'N/A'
  const mb = Math.round(bytes / 1024 / 1024)
  return `${mb} MB`
}

onMounted(async () => {
  await Promise.all([
    fetchConnectors(),
    fetchSyncStatus(),
    refreshSystemInfo()
  ])
  
  // Set up real-time updates
  socketStore.on('connector:created', fetchConnectors)
  socketStore.on('connector:updated', fetchConnectors)
  socketStore.on('connector:deleted', fetchConnectors)
  socketStore.on('sync:started', fetchSyncStatus)
  socketStore.on('sync:completed', fetchSyncStatus)
  socketStore.on('sync:failed', fetchSyncStatus)
  
  // Refresh sync status periodically
  const interval = setInterval(fetchSyncStatus, 30000)
  
  // Cleanup on unmount
  return () => {
    clearInterval(interval)
  }
})
</script>

<style scoped>
.settings-view {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 24px;
}

.settings-header h2 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.settings-header p {
  margin: 0;
  color: var(--text-secondary);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.connectors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.connector-card {
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.connector-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.connector-info h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.connector-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.connector-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat {
  text-align: center;
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  display: block;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.connector-schedule {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.sync-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.stat-icon.waiting { background: var(--warning-color); }
.stat-icon.active { background: var(--primary-color); }
.stat-icon.completed { background: var(--success-color); }
.stat-icon.failed { background: var(--danger-color); }

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recent-jobs h4 {
  margin: 0 0 16px 0;
  color: var(--text-primary);
}

.system-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.system-card {
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 20px;
}

.system-card h4 {
  margin: 0 0 16px 0;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-lighter);
  padding-bottom: 8px;
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-item .label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-help {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.repository-link {
  text-align: center;
  margin-top: 24px;
  padding: 16px;
  border-top: 1px solid var(--border-light);
}

.repository-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 14px;
}

.repository-link a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .connectors-grid {
    grid-template-columns: 1fr;
  }
  
  .sync-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .system-cards {
    grid-template-columns: 1fr;
  }
}
</style>