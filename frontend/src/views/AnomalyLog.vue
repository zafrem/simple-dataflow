<template>
  <div class="anomaly-log-view">
    <div class="log-header">
      <h2>Anomaly Detection Log</h2>
      <p>Monitor system events, object additions, and anomalies with customizable importance levels</p>
      
      <el-row :gutter="16" align="middle" class="actions-row">
        <el-col :span="6">
          <el-button type="primary" @click="showCreateDialog = true" :icon="Plus">
            Add Log Entry
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-select v-model="selectedImportance" placeholder="Filter by Importance" clearable @change="loadLogs">
            <el-option label="All Levels" value="" />
            <el-option label="Critical" value="critical" />
            <el-option label="High" value="high" />
            <el-option label="Medium" value="medium" />
            <el-option label="Low" value="low" />
            <el-option label="Info" value="info" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="selectedCategory" placeholder="Filter by Category" clearable @change="loadLogs">
            <el-option label="All Categories" value="" />
            <el-option label="System Status" value="system" />
            <el-option label="Object Addition" value="object_addition" />
            <el-option label="Anomaly Detection" value="anomaly" />
            <el-option label="Security" value="security" />
            <el-option label="Performance" value="performance" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <div class="stats-info">
            <el-tag type="info" size="small">{{ logs.length }} Entries</el-tag>
            <el-tag type="warning" size="small">{{ criticalCount }} Critical</el-tag>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="log-content">
      <div class="log-list">
        <el-card 
          v-for="log in filteredLogs" 
          :key="log.id" 
          class="log-entry"
          :class="`importance-${log.importance}`"
          :body-style="{ padding: '16px' }">
          
          <template #header>
            <div class="log-entry-header">
              <div class="log-title">
                <el-tag 
                  :type="getImportanceColor(log.importance)" 
                  size="small"
                  class="importance-tag">
                  {{ log.importance.toUpperCase() }}
                </el-tag>
                <el-tag 
                  :type="getCategoryColor(log.category)" 
                  size="small"
                  class="category-tag">
                  {{ formatCategory(log.category) }}
                </el-tag>
                <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
              </div>
              <el-dropdown @command="handleLogAction">
                <el-button link :icon="MoreFilled" size="small" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'edit', log }">Edit Importance</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'extend', log }">Extend Retention</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'delete', log }" divided>Delete</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>

          <div class="log-entry-content">
            <div class="log-message">{{ log.message }}</div>
            <div v-if="log.details" class="log-details">
              <el-collapse>
                <el-collapse-item title="Details" name="details">
                  <pre class="log-details-content">{{ formatDetails(log.details) }}</pre>
                </el-collapse-item>
              </el-collapse>
            </div>
            <div class="log-metadata">
              <span v-if="log.source" class="log-source">Source: {{ log.source }}</span>
              <span v-if="log.retentionDays" class="log-retention">Retention: {{ log.retentionDays }} days</span>
              <span class="log-auto-expire">Expires: {{ formatExpiryDate(log.timestamp, log.retentionDays) }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Create/Edit Log Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingLog ? 'Edit Log Entry' : 'Add Log Entry'"
      width="600px">
      
      <el-form :model="logForm" :rules="logRules" ref="logFormRef" label-width="120px">
        <el-form-item label="Message" prop="message">
          <el-input 
            v-model="logForm.message" 
            type="textarea"
            :rows="3"
            placeholder="Enter log message" />
        </el-form-item>
        
        <el-form-item label="Importance" prop="importance">
          <el-select v-model="logForm.importance" placeholder="Select importance level">
            <el-option label="Critical" value="critical" />
            <el-option label="High" value="high" />
            <el-option label="Medium" value="medium" />
            <el-option label="Low" value="low" />
            <el-option label="Info" value="info" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Category" prop="category">
          <el-select v-model="logForm.category" placeholder="Select category">
            <el-option label="System Status" value="system" />
            <el-option label="Object Addition" value="object_addition" />
            <el-option label="Anomaly Detection" value="anomaly" />
            <el-option label="Security" value="security" />
            <el-option label="Performance" value="performance" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Source">
          <el-input v-model="logForm.source" placeholder="Optional source identifier" />
        </el-form-item>
        
        <el-form-item label="Retention Days">
          <el-input-number 
            v-model="logForm.retentionDays" 
            :min="1" 
            :max="365" 
            placeholder="Days to keep this log" />
        </el-form-item>
        
        <el-form-item label="Details">
          <el-input
            v-model="logForm.details"
            type="textarea"
            :rows="4"
            placeholder="Optional additional details (JSON, logs, etc.)" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateDialog = false">Cancel</el-button>
          <el-button type="primary" @click="saveLog" :loading="saving">
            {{ editingLog ? 'Update' : 'Create' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <el-loading />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const logs = ref([])
const loading = ref(false)
const saving = ref(false)
const selectedImportance = ref('')
const selectedCategory = ref('')
const showCreateDialog = ref(false)
const editingLog = ref(null)
const logFormRef = ref(null)

const logForm = ref({
  message: '',
  importance: 'medium',
  category: 'system',
  source: '',
  retentionDays: 30,
  details: ''
})

const logRules = {
  message: [
    { required: true, message: 'Please enter a log message', trigger: 'blur' },
    { min: 1, max: 1000, message: 'Message length should be 1 to 1000 characters', trigger: 'blur' }
  ],
  importance: [
    { required: true, message: 'Please select importance level', trigger: 'change' }
  ],
  category: [
    { required: true, message: 'Please select category', trigger: 'change' }
  ]
}

const filteredLogs = computed(() => {
  let filtered = [...logs.value]
  
  if (selectedImportance.value) {
    filtered = filtered.filter(log => log.importance === selectedImportance.value)
  }
  
  if (selectedCategory.value) {
    filtered = filtered.filter(log => log.category === selectedCategory.value)
  }
  
  // Sort by timestamp (newest first)
  return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

const criticalCount = computed(() => {
  return logs.value.filter(log => log.importance === 'critical').length
})

const getImportanceColor = (importance) => {
  const colors = {
    'critical': 'danger',
    'high': 'warning',
    'medium': 'primary',
    'low': 'info',
    'info': 'success'
  }
  return colors[importance] || 'info'
}

const getCategoryColor = (category) => {
  const colors = {
    'system': 'primary',
    'object_addition': 'success',
    'anomaly': 'warning',
    'security': 'danger',
    'performance': 'info'
  }
  return colors[category] || 'info'
}

const formatCategory = (category) => {
  const labels = {
    'system': 'System Status',
    'object_addition': 'Object Addition',
    'anomaly': 'Anomaly Detection',
    'security': 'Security',
    'performance': 'Performance'
  }
  return labels[category] || category
}

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const formatExpiryDate = (timestamp, retentionDays) => {
  const expiry = new Date(timestamp)
  expiry.setDate(expiry.getDate() + (retentionDays || 30))
  return expiry.toLocaleDateString()
}

const formatDetails = (details) => {
  if (typeof details === 'string') {
    try {
      return JSON.stringify(JSON.parse(details), null, 2)
    } catch {
      return details
    }
  }
  return JSON.stringify(details, null, 2)
}

const loadLogs = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (selectedImportance.value) {
      params.append('importance', selectedImportance.value)
    }
    if (selectedCategory.value) {
      params.append('category', selectedCategory.value)
    }

    const response = await fetch(`http://localhost:3001/api/anomaly-logs?${params}`)
    const data = await response.json()
    
    if (response.ok) {
      logs.value = data.logs || []
    } else {
      throw new Error(data.error || 'Failed to load logs')
    }
  } catch (error) {
    console.error('Error loading logs:', error)
    ElMessage.error('Failed to load anomaly logs')
    // Use mock data for development
    logs.value = generateMockLogs()
  } finally {
    loading.value = false
  }
}

const generateMockLogs = () => {
  return [
    {
      id: 1,
      message: 'New component discovered: Payment API Gateway',
      importance: 'high',
      category: 'object_addition',
      source: 'auto-discovery',
      timestamp: new Date().toISOString(),
      retentionDays: 60,
      details: JSON.stringify({
        componentType: 'API',
        domain: 'Payment',
        endpoint: 'https://api.payment.internal',
        discoveredBy: 'network-scanner'
      })
    },
    {
      id: 2,
      message: 'Anomalous traffic pattern detected on Database cluster',
      importance: 'critical',
      category: 'anomaly',
      source: 'monitoring-system',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      retentionDays: 90,
      details: JSON.stringify({
        pattern: 'unusual_query_volume',
        threshold: '1000 queries/sec',
        actual: '15000 queries/sec',
        affected_components: ['payment-db', 'user-db']
      })
    },
    {
      id: 3,
      message: 'System health check completed successfully',
      importance: 'info',
      category: 'system',
      source: 'health-monitor',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      retentionDays: 7,
      details: JSON.stringify({
        uptime: '99.9%',
        memory_usage: '65%',
        cpu_usage: '45%',
        disk_usage: '78%'
      })
    },
    {
      id: 4,
      message: 'Unauthorized access attempt blocked',
      importance: 'high',
      category: 'security',
      source: 'security-gateway',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      retentionDays: 180,
      details: JSON.stringify({
        source_ip: '192.168.1.100',
        target_endpoint: '/admin/users',
        blocked_reason: 'invalid_credentials',
        attempts: 5
      })
    }
  ]
}

const resetForm = () => {
  logForm.value = {
    message: '',
    importance: 'medium',
    category: 'system',
    source: '',
    retentionDays: 30,
    details: ''
  }
  editingLog.value = null
}

const saveLog = async () => {
  if (!logFormRef.value) return
  
  const valid = await logFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const url = editingLog.value 
      ? `http://localhost:3001/api/anomaly-logs/${editingLog.value.id}`
      : 'http://localhost:3001/api/anomaly-logs'
    
    const method = editingLog.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...logForm.value,
        timestamp: new Date().toISOString()
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      ElMessage.success(editingLog.value ? 'Log updated successfully' : 'Log created successfully')
      showCreateDialog.value = false
      resetForm()
      await loadLogs()
    } else {
      // Handle duplicate and other specific errors
      if (response.status === 409 && data.details) {
        const existingItem = data.details.existingLog
        const suggestion = data.details.suggestion
        ElMessage.error({
          message: `${data.error}`,
          description: existingItem ? `Existing log: "${existingItem.message}" (${existingItem.importance}) at ${new Date(existingItem.timestamp).toLocaleString()}${suggestion ? '\n' + suggestion : ''}` : '',
          duration: 8000
        })
      } else {
        throw new Error(data.error || 'Failed to save log')
      }
    }
  } catch (error) {
    console.error('Error saving log:', error)
    if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('Failed to save log')
    }
  } finally {
    saving.value = false
  }
}

const handleLogAction = async ({ action, log }) => {
  switch (action) {
    case 'edit':
      editingLog.value = log
      logForm.value = {
        message: log.message,
        importance: log.importance,
        category: log.category,
        source: log.source || '',
        retentionDays: log.retentionDays || 30,
        details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)
      }
      showCreateDialog.value = true
      break
      
    case 'extend':
      try {
        const { value } = await ElMessageBox.prompt(
          'Enter additional days to extend retention:',
          'Extend Retention',
          {
            confirmButtonText: 'Extend',
            cancelButtonText: 'Cancel',
            inputPattern: /^\d+$/,
            inputErrorMessage: 'Please enter a valid number'
          }
        )
        
        const additionalDays = parseInt(value)
        const newRetentionDays = (log.retentionDays || 30) + additionalDays
        
        // TODO: API call to update retention
        ElMessage.success(`Retention extended by ${additionalDays} days`)
        await loadLogs()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('Failed to extend retention')
        }
      }
      break
      
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `This will permanently delete the log entry. Continue?`,
          'Warning',
          {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            type: 'warning',
          }
        )
        
        // TODO: API call to delete log
        ElMessage.success('Log deleted successfully')
        await loadLogs()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('Failed to delete log')
        }
      }
      break
  }
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.anomaly-log-view {
  padding: 24px;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.log-header {
  margin-bottom: 24px;
  flex-shrink: 0;
}

.log-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.log-header p {
  margin: 0 0 16px 0;
  color: #606266;
  font-size: 14px;
}

.actions-row {
  margin-bottom: 16px;
}

.stats-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.log-content {
  flex: 1;
  overflow-y: auto;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.log-entry {
  transition: all 0.3s ease;
  border-left: 4px solid #dcdfe6;
}

.log-entry.importance-critical {
  border-left-color: #f56c6c;
}

.log-entry.importance-high {
  border-left-color: #e6a23c;
}

.log-entry.importance-medium {
  border-left-color: #ff8c00;
}

.log-entry.importance-low {
  border-left-color: #909399;
}

.log-entry.importance-info {
  border-left-color: #67c23a;
}

.log-entry:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
}

.log-entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.importance-tag {
  font-weight: 600;
}

.category-tag {
  font-size: 11px;
}

.log-timestamp {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
  margin-right: 16px;
}

.log-entry-content {
  margin-top: 12px;
}

.log-message {
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
  margin-bottom: 12px;
}

.log-details {
  margin-bottom: 12px;
}

.log-details-content {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.log-metadata {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
  flex-wrap: wrap;
}

.log-source,
.log-retention,
.log-auto-expire {
  padding: 2px 6px;
  background: #f0f2f5;
  border-radius: 3px;
}

.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Custom scrollbar styling */
.anomaly-log-view::-webkit-scrollbar,
.log-content::-webkit-scrollbar {
  width: 8px;
}

.anomaly-log-view::-webkit-scrollbar-track,
.log-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.anomaly-log-view::-webkit-scrollbar-thumb,
.log-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.anomaly-log-view::-webkit-scrollbar-thumb:hover,
.log-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Responsive design */
@media (max-width: 768px) {
  .actions-row .el-col {
    margin-bottom: 12px;
  }
  
  .stats-info {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  
  .log-title {
    flex-wrap: wrap;
  }
  
  .log-timestamp {
    margin-left: 0;
    margin-top: 4px;
  }
}
</style>