<template>
  <div class="data-diagram">
    <!-- Component View Mode - Always show components, not groups -->
    <div class="detailed-view">
      <div class="diagram-header">
        <div class="header-controls">
          <div class="header-info">
            <h2>Data Flow Diagram</h2>
            <p>Sankey diagram showing data flows between all component types: DB, STORAGE, PIPES, APP, API</p>
          </div>
        </div>
        <div class="navigation-help">
          <el-alert
            title="Navigate the diagram"
            type="info"
            :closable="false"
            show-icon>
            <template #default>
              <p>• <strong>Mouse wheel:</strong> Zoom in/out • <strong>Click & drag:</strong> Pan around • <strong>Hover:</strong> View details</p>
            </template>
          </el-alert>
        </div>
      </div>

    <div class="controls-panel">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-select
            v-model="selectedDomain"
            placeholder="Select Domain"
            clearable
            @change="updateDiagram">
            <el-option label="All Domains" value="" />
            <el-option
              v-for="domain in domains"
              :key="domain"
              :label="domain"
              :value="domain" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button @click="refreshData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            Refresh
          </el-button>
        </el-col>
        <el-col :span="14">
          <div class="stats-info">
            <el-tag type="primary" size="small">{{ stats.databases }} Databases</el-tag>
            <el-tag type="success" size="small">{{ stats.applications }} Applications</el-tag>
            <el-tag type="warning" size="small">{{ stats.apis }} APIs</el-tag>
            <el-tag color="#9b59b6" size="small">{{ stats.storage }} Storage</el-tag>
            <el-tag color="#f39c12" size="small">{{ stats.pipes }} Pipes</el-tag>
            <el-tag type="info" size="small">{{ stats.connections }} Connections</el-tag>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="diagram-container" v-loading="loading">
      <div id="sankey-chart" ref="chartContainer"></div>
    </div>

    <div class="legend-panel">
      <div class="legend-item">
        <div class="legend-color db-color"></div>
        <span>Database (DB) - Data Source Layer</span>
      </div>
      <div class="legend-item">
        <div class="legend-color app-color"></div>
        <span>Application (APP) - Processing Layer</span>
      </div>
      <div class="legend-item">
        <div class="legend-color api-color"></div>
        <span>API - Service Interface Layer</span>
      </div>
      <div class="legend-item">
        <div class="legend-color storage-color"></div>
        <span>Storage - Persistent Data Layer</span>
      </div>
      <div class="legend-item">
        <div class="legend-color pipes-color"></div>
        <span>Pipes - Data Processing Flow</span>
      </div>
      <div class="flow-indicator">
        <span>Flow: DB/STORAGE → PIPES → APP → API (across all domains)</span>
      </div>
    </div>
    </div> <!-- Close detailed-view -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useComponentStore } from '../stores/components'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const componentStore = useComponentStore()

// Component view - always show individual components

const chartContainer = ref(null)
const loading = ref(false)
const selectedDomain = ref('')
const domains = ref([])
const stats = ref({
  databases: 0,
  applications: 0,
  apis: 0,
  storage: 0,
  pipes: 0,
  connections: 0
})

let chart = null
let sankeyData = ref({
  nodes: [],
  links: []
})

// Initialize chart
const initChart = () => {
  console.log('initChart called, container:', chartContainer.value)
  if (!chartContainer.value) {
    console.error('No chart container available')
    return
  }

  try {
    chart = echarts.init(chartContainer.value)
    console.log('ECharts instance created:', chart)
  } catch (error) {
    console.error('Error creating ECharts instance:', error)
    return
  }
  
  const option = {
    title: {
      text: 'Data Flow Architecture',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: function (params) {
        if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>Strength: ${params.data.value}`
        } else {
          return `${params.data.name}<br/>Type: ${params.data.category}<br/>Domain: ${params.data.domain || 'Multiple'}`
        }
      }
    },
    toolbox: {
      show: true,
      orient: 'vertical',
      left: 'right',
      top: 'center',
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {
          title: 'Save as Image'
        }
      }
    },
    brush: {
      toolbox: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
      xAxisIndex: 0
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency'
        },
        nodeAlign: 'justify',
        nodeGap: 12,
        nodeWidth: 20,
        layoutIterations: 32,
        draggable: true,
        focusNodeAdjacency: true,
        data: [],
        links: [],
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
          opacity: 0.6
        },
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff'
        },
        label: {
          fontSize: 11,
          fontWeight: 'bold'
        }
      }
    ]
  }

  try {
    chart.setOption(option)
    console.log('Chart option set successfully')
  } catch (error) {
    console.error('Error setting chart option:', error)
    return
  }
  
  // Enable zoom and pan interactions
  let isDragging = false
  let lastMousePos = { x: 0, y: 0 }
  
  chartContainer.value.addEventListener('mousedown', (e) => {
    isDragging = true
    lastMousePos = { x: e.clientX, y: e.clientY }
    chartContainer.value.style.cursor = 'grabbing'
  })
  
  chartContainer.value.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y
      lastMousePos = { x: e.clientX, y: e.clientY }
      // ECharts will handle the internal pan logic
    }
  })
  
  chartContainer.value.addEventListener('mouseup', () => {
    isDragging = false
    chartContainer.value.style.cursor = 'grab'
  })
  
  chartContainer.value.addEventListener('mouseleave', () => {
    isDragging = false
    chartContainer.value.style.cursor = 'default'
  })
  
  // Set initial cursor
  chartContainer.value.style.cursor = 'grab'
  
  // Handle resize
  window.addEventListener('resize', () => {
    if (chart) {
      chart.resize()
    }
  })
}

// Process data for Sankey diagram with DB > APP > API flow
const processDataForSankey = (components, connections) => {
  console.log('Processing data for Sankey...')
  const nodes = []
  const links = []
  const componentMap = new Map()

  // Filter by domain if selected
  const filteredComponents = selectedDomain.value 
    ? components.filter(comp => comp.domain === selectedDomain.value)
    : components

  console.log(`Filtered to ${filteredComponents.length} components (domain: ${selectedDomain.value || 'all'})`)

  // Create component map for lookup
  filteredComponents.forEach(comp => {
    componentMap.set(comp.id, comp)
  })

  // Create nodes by type for proper Sankey flow visualization
  const nodesByType = { DB: [], APP: [], API: [], STORAGE: [], PIPES: [] }
  const nodeNameMap = new Map() // Track node names to ensure uniqueness
  
  filteredComponents.forEach(comp => {
    if (!comp.type || !['DB', 'APP', 'API', 'STORAGE', 'PIPES'].includes(comp.type)) {
      console.warn('Invalid component type:', comp.type, 'for component:', comp.name)
      return
    }

    // Ensure unique node names by appending ID if duplicate
    let nodeName = comp.name
    if (nodeNameMap.has(nodeName)) {
      nodeName = `${comp.name} (${comp.id})`
    }
    nodeNameMap.set(nodeName, comp.id)

    // Enhanced color scheme for all component types
    const getComponentColor = (type) => {
      const colors = {
        'DB': '#3498db',      // Blue - Databases
        'APP': '#e67e22',     // Orange - Applications  
        'API': '#2ecc71',     // Green - APIs
        'STORAGE': '#9b59b6', // Purple - Storage systems
        'PIPES': '#f39c12'    // Yellow/Orange - Processing pipes
      }
      return colors[type] || '#95a5a6' // Default gray
    }

    const node = {
      name: nodeName,
      category: comp.type,
      domain: comp.domain,
      itemStyle: {
        color: getComponentColor(comp.type)
      }
    }
    
    nodes.push(node)
    nodesByType[comp.type].push({ ...comp, displayName: nodeName })
  })

  console.log(`Created ${nodes.length} nodes:`, { 
    DB: nodesByType.DB.length, 
    APP: nodesByType.APP.length, 
    API: nodesByType.API.length,
    STORAGE: nodesByType.STORAGE.length,
    PIPES: nodesByType.PIPES.length
  })

  // Create a mapping of component ID to display name
  const componentIdToDisplayName = new Map()
  Object.values(nodesByType).flat().forEach(comp => {
    componentIdToDisplayName.set(comp.id, comp.displayName)
  })

  // Create DB -> APP connections (existing connections from our data)
  let dbAppConnections = 0
  connections.forEach(conn => {
    const sourceComp = componentMap.get(conn.sourceId)
    const targetComp = componentMap.get(conn.targetId)
    
    if (sourceComp && targetComp) {
      const sourceName = componentIdToDisplayName.get(sourceComp.id) || sourceComp.name
      const targetName = componentIdToDisplayName.get(targetComp.id) || targetComp.name
      
      links.push({
        source: sourceName,
        target: targetName,
        value: Math.round(conn.strength * 100)
      })
      dbAppConnections++
    }
  })

  console.log(`Created ${dbAppConnections} DB -> APP/API connections`)

  // Create APP -> API connections (simulated for Sankey flow)
  // In each domain, connect APP to API to show the processing flow
  const domainGroups = {}
  Object.values(nodesByType).flat().forEach(comp => {
    if (comp.domain) {
      if (!domainGroups[comp.domain]) {
        domainGroups[comp.domain] = { DB: [], APP: [], API: [], STORAGE: [], PIPES: [] }
      }
      domainGroups[comp.domain][comp.type].push(comp)
    }
  })

  console.log(`Grouped into ${Object.keys(domainGroups).length} domains:`, Object.keys(domainGroups))

  // For each domain, create APP -> API connections
  let appApiConnections = 0
  Object.values(domainGroups).forEach(domain => {
    domain.APP.forEach(app => {
      domain.API.forEach(api => {
        const appName = componentIdToDisplayName.get(app.id) || app.name
        const apiName = componentIdToDisplayName.get(api.id) || api.name
        
        links.push({
          source: appName,
          target: apiName,
          value: 75 // Standard processing flow strength
        })
        appApiConnections++
      })
    })
  })

  console.log(`Created ${appApiConnections} APP -> API connections`)
  console.log(`Total links: ${links.length}`)

  return { nodes, links }
}

// Update diagram with new data
const updateDiagram = async () => {
  if (!chart) {
    console.error('Chart not initialized')
    return
  }

  loading.value = true
  try {
    console.log('Fetching data for diagram...')
    
    // Fetch latest data with better error handling
    const [componentsResponse, connectionsResponse] = await Promise.all([
      fetch('http://localhost:3001/api/components?limit=1000'),
      fetch('http://localhost:3001/api/connections?include=components&limit=1000')
    ])

    if (!componentsResponse.ok) {
      throw new Error(`Components API failed: ${componentsResponse.status}`)
    }
    if (!connectionsResponse.ok) {
      throw new Error(`Connections API failed: ${connectionsResponse.status}`)
    }

    const componentsData = await componentsResponse.json()
    const connectionsData = await connectionsResponse.json()

    console.log('Components data:', componentsData)
    console.log('Connections data:', connectionsData)

    const components = componentsData.components || componentsData
    const connections = connectionsData

    if (!Array.isArray(components)) {
      throw new Error('Components data is not an array')
    }
    if (!Array.isArray(connections)) {
      throw new Error('Connections data is not an array')
    }

    console.log(`Processing ${components.length} components and ${connections.length} connections`)

    // Process data for Sankey
    sankeyData.value = processDataForSankey(components, connections)
    console.log('Sankey data:', sankeyData.value)

    // Update stats
    const filteredComponents = selectedDomain.value 
      ? components.filter(comp => comp.domain === selectedDomain.value)
      : components

    stats.value = {
      databases: filteredComponents.filter(c => c.type === 'DB').length,
      applications: filteredComponents.filter(c => c.type === 'APP').length,
      apis: filteredComponents.filter(c => c.type === 'API').length,
      storage: filteredComponents.filter(c => c.type === 'STORAGE').length,
      pipes: filteredComponents.filter(c => c.type === 'PIPES').length,
      connections: connections.length
    }

    console.log('Stats:', stats.value)

    // Update chart
    if (sankeyData.value.nodes.length > 0) {
      chart.setOption({
        series: [{
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency'
          },
          nodeAlign: 'justify',
          nodeGap: 12,
          nodeWidth: 20,
          layoutIterations: 32,
          data: sankeyData.value.nodes,
          links: sankeyData.value.links,
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
            opacity: 0.6
          },
          itemStyle: {
            borderWidth: 2,
            borderColor: '#fff'
          },
          label: {
            fontSize: 11,
            fontWeight: 'bold'
          }
        }]
      }, { notMerge: true })
      console.log('Chart updated successfully')
    } else {
      console.warn('No nodes to display')
      // Clear chart with empty data
      chart.setOption({
        series: [{
          type: 'sankey',
          data: [],
          links: []
        }]
      }, { notMerge: true })
      ElMessage.warning('No data available for the selected domain')
    }

  } catch (error) {
    console.error('Error updating diagram:', error)
    ElMessage.error(`Failed to update diagram data: ${error.message}`)
    
    // Show fallback empty state
    if (chart) {
      try {
        chart.setOption({
          series: [{
            type: 'sankey',
            data: [],
            links: []
          }]
        }, { notMerge: true })
      } catch (chartError) {
        console.error('Error clearing chart:', chartError)
      }
    }
    
    // Reset stats
    stats.value = {
      databases: 0,
      applications: 0,
      apis: 0,
      storage: 0,
      pipes: 0,
      connections: 0
    }
  } finally {
    loading.value = false
  }
}

// Load domains for filter
const loadDomains = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/components?limit=1000')
    const data = await response.json()
    const components = data.components || data
    
    const uniqueDomains = [...new Set(components.map(c => c.domain).filter(Boolean))]
    domains.value = uniqueDomains.sort()
  } catch (error) {
    console.error('Error loading domains:', error)
  }
}

// Refresh all data
const refreshData = async () => {
  await Promise.all([
    loadDomains(),
    updateDiagram()
  ])
}

// Navigation functions
// Removed group-related methods - now always showing components

// Removed onCreateGroup method - no longer needed

onMounted(async () => {
  console.log('DataDiagram mounted')
  await nextTick()
  console.log('Chart container ref:', chartContainer.value)
  
  if (!chartContainer.value) {
    console.error('Chart container not found!')
    return
  }
  
  try {
    initChart()
    console.log('Chart initialized:', chart)
    
    // Test with simple data first
    if (chart) {
      const testData = {
        nodes: [
          { name: 'User DB', itemStyle: { color: '#3498db' } },
          { name: 'User App', itemStyle: { color: '#e67e22' } },
          { name: 'User API', itemStyle: { color: '#2ecc71' } }
        ],
        links: [
          { source: 'User DB', target: 'User App', value: 80 },
          { source: 'User App', target: 'User API', value: 75 }
        ]
      }
      
      chart.setOption({
        series: [{
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency'
          },
          nodeAlign: 'justify',
          nodeGap: 12,
          nodeWidth: 20,
          layoutIterations: 32,
          data: testData.nodes,
          links: testData.links,
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
            opacity: 0.6
          },
          itemStyle: {
            borderWidth: 2,
            borderColor: '#fff'
          },
          label: {
            fontSize: 11,
            fontWeight: 'bold'
          }
        }]
      })
      console.log('Test data applied to chart')
      
      // Force resize after a brief delay
      setTimeout(() => {
        if (chart) {
          chart.resize()
          console.log('Chart resized')
        }
      }, 100)
    }
    
    // Then load real data
    await refreshData()
  } catch (error) {
    console.error('Error during mounting:', error)
  }
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  window.removeEventListener('resize', () => {})
})
</script>

<style scoped>
.data-diagram {
  padding: 24px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* Removed .groups-view styles - no longer needed */

.detailed-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-controls {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 16px;
}

.back-button {
  flex-shrink: 0;
  margin-top: 8px;
}

.header-info {
  flex: 1;
}

.header-info h2 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 24px;
  font-weight: 600;
}

.header-info p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.diagram-header {
  margin-bottom: 24px;
}

.diagram-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.diagram-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.navigation-help {
  margin-top: 12px;
}

.navigation-help :deep(.el-alert) {
  padding: 8px 12px;
}

.navigation-help :deep(.el-alert__content) {
  padding-left: 8px;
}

.navigation-help p {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}

.controls-panel {
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stats-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.diagram-container {
  flex: 1;
  min-height: 600px;
  max-height: 800px; /* Allow for larger content */
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden; /* Let ECharts handle internal scrolling */
}

#sankey-chart {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #ddd;
  background: #fafafa;
  border-radius: 6px;
  user-select: none; /* Prevent text selection during drag */
}

.legend-panel {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  gap: 24px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.db-color {
  background-color: #3498db;
}

.app-color {
  background-color: #e67e22;
}

.api-color {
  background-color: #2ecc71;
}

.storage-color {
  background-color: #9b59b6;
}

.pipes-color {
  background-color: #f39c12;
}

.flow-indicator {
  font-weight: bold;
  color: #ff8c00;
  background: white;
  padding: 8px 16px;
  border-radius: 16px;
  border: 2px solid #ff8c00;
}

:deep(.el-loading-mask) {
  border-radius: 8px;
}
</style>