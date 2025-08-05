<template>
  <div class="graph-container">
    <div ref="graphElement" class="graph-canvas"></div>
    
    <div v-if="loading" class="loading-overlay">
      <el-loading />
    </div>
    
    <div class="controls-bar">
      <el-button-group class="layout-controls">
        <el-tooltip content="Hierarchical Layout" placement="bottom">
          <el-button 
            :type="currentLayout === 'dagre' ? 'primary' : 'default'"
            size="small"
            @click="changeLayout('dagre')">
            <i class="el-icon-sort"></i>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="Force Layout" placement="bottom">
          <el-button 
            :type="currentLayout === 'cose' ? 'primary' : 'default'"
            size="small"
            @click="changeLayout('cose')">
            <i class="el-icon-connection"></i>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="Circular Layout" placement="bottom">
          <el-button 
            :type="currentLayout === 'circle' ? 'primary' : 'default'"
            size="small"
            @click="changeLayout('circle')">
            <i class="el-icon-pie-chart"></i>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="Grid Layout" placement="bottom">
          <el-button 
            :type="currentLayout === 'grid' ? 'primary' : 'default'"
            size="small"
            @click="changeLayout('grid')">
            <i class="el-icon-menu"></i>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="Domain Rows Layout" placement="bottom">
          <el-button 
            :type="currentLayout === 'domainRows' ? 'primary' : 'default'"
            size="small"
            @click="changeLayout('domainRows')">
            <i class="el-icon-files"></i>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="Saved Positions" placement="bottom">
          <el-button 
            :type="currentLayout === 'preset' ? 'primary' : 'default'"
            size="small"
            @click="changeLayout('preset')">
            <i class="el-icon-position"></i>
          </el-button>
        </el-tooltip>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-tooltip content="Fit to View" placement="bottom">
        <el-button size="small" @click="fitToView">
          <i class="el-icon-full-screen"></i>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="Center Graph" placement="bottom">
        <el-button size="small" @click="centerGraph">
          <i class="el-icon-aim"></i>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="Save Current Positions" placement="bottom">
        <el-button size="small" @click="savePositions">
          <i class="el-icon-document-add"></i>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="Clear Saved Positions" placement="bottom">
        <el-button size="small" @click="clearPositions">
          <i class="el-icon-delete"></i>
        </el-button>
      </el-tooltip>
      
      <el-dropdown @command="exportGraph" trigger="click">
        <el-button size="small">
          <i class="el-icon-download"></i>
          <i class="el-icon-arrow-down el-icon--right"></i>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="png">Export as PNG</el-dropdown-item>
            <el-dropdown-item command="jpg">Export as JPG</el-dropdown-item>
            <el-dropdown-item command="svg">Export as SVG</el-dropdown-item>
            <el-dropdown-item command="json">Export Data as JSON</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { 
  createCytoscape, 
  applyLayout, 
  searchNodes,
  filterGraph,
  exportGraph as exportGraphUtil,
  getGraphStats
} from '../utils/graphUtils'
import { useComponentStore } from '../stores/components'
import { ElMessage } from 'element-plus'

const props = defineProps({
  searchTerm: {
    type: String,
    default: ''
  },
  filters: {
    type: Object,
    default: () => ({})
  },
  groupVisibility: {
    type: Object,
    default: () => ({})
  },
  componentVisibility: {
    type: Object,
    default: () => ({})
  },
  viewMode: {
    type: String,
    default: 'grouped'
  },
  selectedDomainId: {
    type: [String, Number],
    default: null
  },
  selectedGroupId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['node-selected', 'stats-updated', 'group-clicked', 'domain-clicked'])

const componentStore = useComponentStore()
const graphElement = ref(null)
const loading = ref(false)
// Use store for layout persistence instead of local ref
const currentLayout = computed(() => componentStore.currentLayout)

let cy = null

const initializeGraph = async () => {
  if (!graphElement.value) return

  try {
    loading.value = true
    
    // Create cytoscape instance
    cy = createCytoscape(graphElement.value, {
      elements: []
    })

    // Set up event listeners
    setupEventListeners()
    
    // Load initial data
    await loadGraphData()
    
  } catch (error) {
    console.error('Error initializing graph:', error)
    ElMessage.error('Failed to initialize graph visualization')
  } finally {
    loading.value = false
  }
}

const setupEventListeners = () => {
  if (!cy) return

  // Node click handler
  cy.on('tap', 'node', async (event) => {
    const node = event.target
    const nodeData = node.data()
    
    // Handle domain node clicks
    if (nodeData.type === 'domain') {
      const actualDomainId = nodeData.id.replace('domain-', '')
      emit('domain-clicked', actualDomainId)
      return
    }
    
    // Handle group node clicks
    if (nodeData.type === 'group') {
      const actualGroupId = nodeData.id.replace('group-', '')
      emit('group-clicked', actualGroupId)
      return
    }
    
    // Handle component node clicks
    try {
      const componentDetails = await componentStore.fetchComponent(nodeData.id)
      emit('node-selected', componentDetails)
      // Remove highlight functionality to prevent flickering
    } catch (error) {
      console.error('Error fetching component details:', error)
      ElMessage.error('Failed to load component details')
    }
  })

  // Background click handler - clear selection
  cy.on('tap', (event) => {
    if (event.target === cy) {
      emit('node-selected', null)
      // Remove clearHighlight to prevent flickering
    }
  })

  // Edge click handler
  cy.on('tap', 'edge', (event) => {
    const edge = event.target
    const edgeData = edge.data()
    console.log('Edge clicked:', edgeData)
  })

  // Remove double click focus functionality to prevent flickering

  // Mouse over effects
  cy.on('mouseover', 'node', (event) => {
    const node = event.target
    node.style('border-width', '3px')
  })

  cy.on('mouseout', 'node', (event) => {
    const node = event.target
    if (!node.hasClass('highlighted')) {
      node.style('border-width', '2px')
    }
  })

  // Auto-save positions when nodes are moved
  let positionSaveTimeout = null
  cy.on('position', 'node', () => {
    // Debounce position saving to avoid too frequent saves
    if (positionSaveTimeout) {
      clearTimeout(positionSaveTimeout)
    }
    
    positionSaveTimeout = setTimeout(() => {
      if (currentLayout.value === 'preset') {
        componentStore.saveNodePositions(cy)
      }
    }, 1000) // Save 1 second after last position change
  })
}

const loadGraphData = async () => {
  try {
    loading.value = true
    const filterParams = componentStore.getFilterParams()
    
    // Add viewMode parameter for domain-only view (only when not drilling down)
    if (props.viewMode === 'domains' && !props.selectedDomainId && !props.selectedGroupId) {
      filterParams.viewMode = 'domains'
    }
    
    const graphData = await componentStore.fetchGraphData(filterParams)
    
    if (cy) {
      // Clear existing elements
      cy.elements().remove()
      
      // Filter nodes and edges based on view mode and visibility
      let filteredNodes = graphData.nodes || []
      let filteredEdges = graphData.edges || []
      
      // Apply filtering based on drill-down state
      
      // Handle pure domain view mode (no drill-down, just show all domains)
      if (props.viewMode === 'domains' && !props.selectedDomainId && !props.selectedGroupId) {
        // When using domain-only backend endpoint, minimal filtering needed
        // The backend already returns only domains and domain-to-domain connections
        filteredNodes = filteredNodes.filter(node => {
          const nodeData = node.data
          return nodeData.type === 'domain'
        })
        
        // Filter edges to only show domain-to-domain connections
        filteredEdges = filteredEdges.filter(edge => {
          return edge.data.connectionType === 'domain-to-domain'
        })
        
      } else if (props.selectedDomainId && !props.selectedGroupId) {
        // Domain selected but no group - show domain + its groups
        filteredNodes = filteredNodes.filter(node => {
          const nodeData = node.data
          
          // Always show the selected domain
          if (nodeData.type === 'domain') {
            return nodeData.id === `domain-${props.selectedDomainId}`
          }
          
          // Show groups that belong to the selected domain
          if (nodeData.type === 'group') {
            return nodeData.metadata && nodeData.metadata.domainId == props.selectedDomainId
          }
          
          // Hide components and other domains when drilling down to domain level
          return false
        })
        
        // Filter edges to only show connections between visible nodes
        const visibleNodeIds = new Set(filteredNodes.map(n => n.data.id))
        filteredEdges = filteredEdges.filter(edge => {
          return visibleNodeIds.has(edge.data.source) && visibleNodeIds.has(edge.data.target)
        })
        
      } else if (props.selectedGroupId) {
        // Group selected - show components within the group
        const componentTypes = ['DB', 'APP', 'API', 'STORAGE', 'PIPES']
        filteredNodes = filteredNodes.filter(node => {
          const nodeData = node.data
          
          // Show components based on visibility and group membership
          if (componentTypes.includes(nodeData.type)) {
            // Check if component is visible and belongs to selected group
            return props.componentVisibility[nodeData.id] === true
          }
          
          // Hide domains and groups when showing components
          return false
        })
        
        // Filter edges to only show connections between visible components
        const visibleNodeIds = new Set(filteredNodes.map(n => n.data.id))
        filteredEdges = filteredEdges.filter(edge => {
          return visibleNodeIds.has(edge.data.source) && visibleNodeIds.has(edge.data.target)
        })
      } else if (props.viewMode === 'grouped' && !props.selectedDomainId && !props.selectedGroupId) {
        // In grouped mode, show group nodes and individual PIPES components
        // Hide other component types (DB, API, APP, STORAGE) as they belong to groups
        filteredNodes = filteredNodes.filter(node => {
          const nodeData = node.data
          
          // If it's a group node, show it if:
          // 1. Group checkbox is explicitly checked, OR
          // 2. Any of its member components are visible
          if (nodeData.type === 'group') {
            // Extract actual group ID from "group-X" format
            const actualGroupId = nodeData.id.replace('group-', '')
            
            // Check if group is explicitly enabled
            if (props.groupVisibility[actualGroupId] === true) {
              return true
            }
            
            // Check if any member components are visible
            if (nodeData.metadata && nodeData.metadata.componentIds && nodeData.metadata.componentIds.length > 0) {
              const hasVisibleComponents = nodeData.metadata.componentIds.some(componentId => {
                return props.componentVisibility[componentId] === true
              })
              
              if (hasVisibleComponents) {
                return true
              }
            }
            
            return false
          }
          
          // If it's a PIPES component, show it individually (PIPES don't belong to groups)
          // Check component visibility (must be explicitly true)
          if (nodeData.type === 'PIPES') {
            return props.componentVisibility[nodeData.id] === true
          }
          
          // Hide other component types (DB, API, APP, STORAGE) in grouped view
          // They should be represented by their groups instead
          return false
        })
        
        // Filter edges to only show connections between visible nodes
        const visibleNodeIds = new Set(filteredNodes.map(n => n.data.id))
        filteredEdges = filteredEdges.filter(edge => {
          return visibleNodeIds.has(edge.data.source) && visibleNodeIds.has(edge.data.target)
        })
      } else if (props.viewMode === 'components' && !props.selectedDomainId && !props.selectedGroupId) {
        // In detailed component mode, show individual components based on component visibility
        filteredNodes = filteredNodes.filter(node => {
          const nodeData = node.data
          
          // Hide group nodes and domain nodes in detailed component mode
          if (nodeData.type === 'group' || nodeData.type === 'domain') {
            return false
          }
          
          // Show components based on visibility (must be explicitly true)
          return props.componentVisibility[nodeData.id] === true
        })
        
        // Filter edges for visible components
        const visibleNodeIds = new Set(filteredNodes.map(n => n.data.id))
        filteredEdges = filteredEdges.filter(edge => {
          return visibleNodeIds.has(edge.data.source) && visibleNodeIds.has(edge.data.target)
        })
      }
      // Note: If none of the conditions match, we keep all nodes (fallback behavior)
      
      // Add filtered elements
      if (filteredNodes.length > 0) {
        cy.add(filteredNodes)
      }
      
      if (filteredEdges.length > 0) {
        cy.add(filteredEdges)
      }
      
      // Apply current layout
      await nextTick()
      const savedPositions = componentStore.getSavedPositions()
      applyLayout(cy, currentLayout.value, savedPositions)
      
      // Update stats
      const stats = getGraphStats(cy)
      emit('stats-updated', { ...stats, ...graphData.stats })
    }
    
  } catch (error) {
    console.error('Error loading graph data:', error)
    ElMessage.error('Failed to load graph data')
  } finally {
    loading.value = false
  }
}

const changeLayout = (layoutName) => {
  if (!cy || currentLayout.value === layoutName) return
  
  // Update store instead of local ref
  componentStore.setCurrentLayout(layoutName)
  const savedPositions = componentStore.getSavedPositions()
  applyLayout(cy, layoutName, savedPositions)
}

const fitToView = () => {
  if (cy) {
    cy.fit(cy.elements(), 50)
  }
}

const centerGraph = () => {
  if (cy) {
    cy.center()
  }
}

const savePositions = () => {
  if (!cy) return
  
  try {
    componentStore.saveNodePositions(cy)
    ElMessage.success('Node positions saved successfully')
  } catch (error) {
    console.error('Error saving positions:', error)
    ElMessage.error('Failed to save node positions')
  }
}

const clearPositions = () => {
  try {
    componentStore.clearSavedPositions()
    ElMessage.success('Saved positions cleared')
  } catch (error) {
    console.error('Error clearing positions:', error)
    ElMessage.error('Failed to clear saved positions')
  }
}

const exportGraph = async (format) => {
  if (!cy) return

  try {
    let result
    
    if (format === 'json') {
      result = cy.json()
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dataflow-graph-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const blob = exportGraphUtil(cy, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dataflow-graph-${Date.now()}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }
    
    ElMessage.success(`Graph exported as ${format.toUpperCase()}`)
  } catch (error) {
    console.error('Error exporting graph:', error)
    ElMessage.error(`Failed to export graph as ${format.toUpperCase()}`)
  }
}

// Watch for search term changes (without highlighting to prevent flicker)
watch(() => props.searchTerm, (newTerm) => {
  if (cy) {
    if (newTerm) {
      const matches = searchNodes(cy, newTerm)
      if (matches.length === 0) {
        ElMessage.info('No matching components found')
      }
    }
    // Remove clearHighlight to prevent flickering
  }
})

// Watch for filter changes
watch(() => props.filters, () => {
  if (cy) {
    filterGraph(cy, props.filters)
  }
}, { deep: true })

// Watch for view mode changes
watch(() => props.viewMode, () => {
  if (cy) {
    loadGraphData()
  }
})

// Watch for group visibility changes
watch(() => props.groupVisibility, () => {
  if (cy) {
    loadGraphData()
  }
}, { deep: true })

// Watch for component visibility changes
watch(() => props.componentVisibility, () => {
  if (cy) {
    loadGraphData()
  }
}, { deep: true })

// Watch for selected domain changes
watch(() => props.selectedDomainId, () => {
  if (cy) {
    loadGraphData()
  }
})

// Watch for selected group changes  
watch(() => props.selectedGroupId, () => {
  if (cy) {
    loadGraphData()
  }
})

// Removed automatic data watcher to prevent screen flickering
// Data will only reload when manually requested

onMounted(() => {
  // Initialize layout from localStorage
  componentStore.initializeLayout()
  
  nextTick(() => {
    initializeGraph()
  })
})

onUnmounted(() => {
  if (cy) {
    cy.destroy()
  }
})

// Expose methods for parent component
defineExpose({
  refreshGraph: loadGraphData,
  changeLayout,
  fitToView,
  centerGraph,
  exportGraph,
  savePositions,
  clearPositions,
  // Removed highlight functions to prevent flickering
})
</script>

<style scoped>
.graph-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.graph-canvas {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.controls-bar {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 100;
  display: flex;
  gap: 12px;
  align-items: center;
}

.layout-controls {
  display: flex;
  gap: 0;
}

@media (max-width: 768px) {
  .controls-bar {
    top: 10px;
    right: 10px;
    padding: 8px;
    flex-wrap: wrap;
  }
  
  .layout-controls {
    flex-wrap: wrap;
  }
}
</style>