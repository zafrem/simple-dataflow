<template>
  <div id="app">
    <div class="main-layout">
      <header class="header">
        <div class="header-left">
          <h1 style="margin: 0; font-size: 20px; color: #ff8c00;">
            <i class="el-icon-share" style="margin-right: 8px;"></i>
            DataFlow Visualizer
          </h1>
        </div>
        
        <div class="header-center">
          <el-menu
            :default-active="$route.path"
            mode="horizontal"
            router
            style="border: none; background: transparent;">
            <el-menu-item index="/domains">
              <el-icon><Grid /></el-icon>
              Domains
            </el-menu-item>
            <el-menu-item index="/groups">
              <el-icon><Collection /></el-icon>
              Groups
            </el-menu-item>
            <el-menu-item index="/data">
              <el-icon><DataAnalysis /></el-icon>
              Data View
            </el-menu-item>
            <el-menu-item index="/dashboard">
              <el-icon><Connection /></el-icon>
              Board
            </el-menu-item>
            <el-menu-item index="/diagram">
              <el-icon><TrendCharts /></el-icon>
              Data Diagram
            </el-menu-item>
            <el-menu-item index="/anomaly-log">
              <el-icon><Warning /></el-icon>
              Anomaly Detection Log
            </el-menu-item>
            <el-menu-item index="/settings">
              <el-icon><Setting /></el-icon>
              Settings
            </el-menu-item>
          </el-menu>
        </div>
        
        <div class="header-right">
          <el-badge :value="connectionStatus.clients" class="connection-badge">
            <el-button 
              :type="connectionStatus.connected ? 'success' : 'danger'"
              :icon="connectionStatus.connected ? 'connection' : 'close'"
              size="small"
              circle
              @click="toggleConnection">
            </el-button>
          </el-badge>
          
          <el-tooltip content="System Health" placement="bottom">
            <el-button 
              :type="systemHealth.status === 'healthy' ? 'success' : 'warning'"
              :icon="systemHealth.status === 'healthy' ? 'check' : 'warning'"
              size="small"
              circle
              @click="checkHealth">
            </el-button>
          </el-tooltip>
        </div>
      </header>
      
      <div class="content">
        <router-view />
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElNotification } from 'element-plus'
import { Connection, TrendCharts, DataAnalysis, Collection, Grid, Setting, Warning } from '@element-plus/icons-vue'
import { useSocketStore } from './stores/socket'
import { useSystemStore } from './stores/system'

const router = useRouter()
const socketStore = useSocketStore()
const systemStore = useSystemStore()

const connectionStatus = ref({
  connected: false,
  clients: 0
})

const systemHealth = ref({
  status: 'unknown'
})

const showNotification = (title, message, type = 'info') => {
  ElNotification({
    title,
    message,
    type,
    duration: 4500
  })
}

const toggleConnection = async () => {
  if (connectionStatus.value.connected) {
    await socketStore.disconnect()
    showNotification('Disconnected', 'Real-time connection closed', 'warning')
  } else {
    await socketStore.connect()
    showNotification('Connected', 'Real-time connection established', 'success')
  }
}

const checkHealth = async () => {
  try {
    const health = await systemStore.checkHealth()
    systemHealth.value = health
    showNotification(
      'System Health',
      `Status: ${health.status} | Uptime: ${Math.floor(health.uptime / 3600)}h`,
      health.status === 'healthy' ? 'success' : 'warning'
    )
  } catch (error) {
    showNotification('Health Check Failed', error.message, 'error')
  }
}

onMounted(async () => {
  await socketStore.connect()
  await checkHealth()
  
  socketStore.on('connection:established', (data) => {
    connectionStatus.value.connected = true
    showNotification('Connected', 'Real-time updates enabled', 'success')
  })
  
  socketStore.on('server:stats', (data) => {
    connectionStatus.value.clients = data.connectedClients
  })
  
  socketStore.on('disconnect', () => {
    connectionStatus.value.connected = false
    connectionStatus.value.clients = 0
  })
  
  socketStore.on('component:created', (component) => {
    showNotification(
      'Component Added',
      `${component.name} (${component.type}) has been discovered`,
      'success'
    )
    // This will also automatically create an anomaly log via the backend
  })
  
  socketStore.on('sync:completed', (data) => {
    showNotification(
      'Sync Completed',
      `Connector sync finished. ${data.results.created} new, ${data.results.updated} updated`,
      'success'
    )
  })
  
  socketStore.on('sync:failed', (data) => {
    showNotification(
      'Sync Failed',
      `Connector sync failed: ${data.error}`,
      'error'
    )
  })
})

onUnmounted(() => {
  socketStore.disconnect()
})
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: linear-gradient(135deg, #e67300 0%, #cc5500 100%);
  color: white;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  color: white !important;
  font-weight: 600;
}

.header-center :deep(.el-menu) {
  background: transparent !important;
  border: none !important;
}

.header-center :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.8) !important;
  border-bottom: none !important;
}

.header-center :deep(.el-menu-item:hover),
.header-center :deep(.el-menu-item.is-active) {
  color: white !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-badge {
  margin-right: 8px;
}
</style>