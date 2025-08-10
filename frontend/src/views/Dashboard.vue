<template>
  <div class="content">
    <!-- Toggle Button - Always visible, positioned based on sidebar state -->
    <div 
      class="bookmark-toggle-modal" 
      @click="toggleSidebar"
      :class="{ collapsed: sidebarCollapsed }"
      :title="sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'">
      <div class="bookmark-content">
        <el-icon class="bookmark-icon" :class="{ rotated: sidebarCollapsed }">
          <component :is="sidebarCollapsed ? Menu : Close" />
        </el-icon>
        <span class="bookmark-text vertical-text">{{ sidebarCollapsed ? 'Show' : 'Hide' }}</span>
      </div>
    </div>

    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <GroupFilterSidebar
        ref="groupFilterSidebar"
        :groups="groups"
        :components="components"
        :selected-group-id="selectedGroupId"
        @group-visibility-changed="onGroupVisibilityChanged"
        @component-visibility-changed="onComponentVisibilityChanged"
        @view-mode-changed="onViewModeChanged"
        @manage-groups="showGroupManager = true" />
    </div>
    
    <div class="main-content">
      <NetworkGraph
        ref="networkGraph"
        :search-term="searchTerm"
        :filters="filters"
        :group-visibility="groupVisibility"
        :component-visibility="componentVisibility"
        :view-mode="viewMode"
        :selected-domain-id="selectedDomainId"
        :selected-group-id="selectedGroupId"
        @node-selected="onNodeSelected"
        @stats-updated="onStatsUpdated"
        @group-clicked="onGroupClicked"
        @domain-clicked="onDomainClicked" />
      
      <DetailPanel
        :component="selectedComponent"
        @close="onDetailClose"
        @edit="onEditComponent"
        @delete="onDeleteComponent"
        @refresh="onRefreshComponent" />
    </div>

    <!-- Group Manager Dialog -->
    <el-dialog
      v-model="showGroupManager"
      title="Manage Component Groups"
      width="800px"
      :close-on-click-modal="false">
      
      <GroupManager
        ref="groupManager"
        @groups-updated="onGroupsUpdated" />
      
      <template #footer>
        <el-button @click="showGroupManager = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NetworkGraph from '../components/NetworkGraph.vue'
import GroupFilterSidebar from '../components/GroupFilterSidebar.vue'
import GroupManager from '../components/GroupManager.vue'
import DetailPanel from '../components/DetailPanel.vue'
import { useComponentStore } from '../stores/components'
import { useSocketStore } from '../stores/socket'
import { ElMessage } from 'element-plus'
import { Menu, Close } from '@element-plus/icons-vue'

const componentStore = useComponentStore()
const socketStore = useSocketStore()

const networkGraph = ref(null)
const groupFilterSidebar = ref(null)
const groupManager = ref(null)

// UI state
const sidebarCollapsed = ref(false)

// Group management state
const groups = ref([])
const components = ref([])
const groupVisibility = ref({})
const componentVisibility = ref({})
const viewMode = ref('domains')
const showGroupManager = ref(false)
const selectedGroupId = ref(null) // Track selected group for filtering
const selectedDomainId = ref(null) // Track selected domain for filtering

const searchTerm = ref('')
const filters = ref({
  type: [],
  domain: [],
  source: [],
  includeIsolated: true
})

const selectedComponent = ref(null)

const onSearchChange = (term) => {
  searchTerm.value = term
}

const onFilterChange = (newFilters) => {
  filters.value = { ...newFilters }
}

const onNodeSelected = (component) => {
  selectedComponent.value = component
  componentStore.setSelectedComponent(component)
}

const onStatsUpdated = (stats) => {
  // Stats are automatically computed by GroupFilterSidebar based on props
  // No need to manually update stats as the sidebar is reactive to component changes
}

const onDetailClose = () => {
  selectedComponent.value = null
  componentStore.clearSelectedComponent()
  
  if (networkGraph.value) {
    networkGraph.value.clearHighlight()
  }
}

const onEditComponent = (component) => {
  // TODO: Implement edit component dialog
  ElMessage.info('Edit component feature coming soon')
}

const onDeleteComponent = (component) => {
  // Component is already deleted in the store by DetailPanel
  // Just refresh the graph
  if (networkGraph.value) {
    networkGraph.value.refreshGraph()
  }
}

const onRefreshComponent = (component) => {
  if (networkGraph.value) {
    networkGraph.value.refreshGraph()
  }
}

// UI interaction methods
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  // Save preference to localStorage
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value.toString())
}

// Group management methods
const loadGroups = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/groups?includeComponents=true`)
    const data = await response.json()
    groups.value = data.groups || []
  } catch (error) {
    console.error('Error loading groups:', error)
    ElMessage.error('Failed to load groups')
  }
}

const loadComponents = async () => {
  try {
    await componentStore.fetchComponents({ limit: 1000 })
    components.value = componentStore.components
  } catch (error) {
    console.error('Error loading components:', error)
    ElMessage.error('Failed to load components')
  }
}

const onGroupVisibilityChanged = (visibility) => {
  groupVisibility.value = visibility
  // The NetworkGraph will react to these changes
}

const onComponentVisibilityChanged = (visibility) => {
  componentVisibility.value = visibility
  // The NetworkGraph will react to these changes
}

const onViewModeChanged = (mode) => {
  viewMode.value = mode
  
  // Clear drill-down selections when switching view modes
  if (mode === 'domains') {
    selectedDomainId.value = null
    selectedGroupId.value = null
  } else if (mode === 'grouped') {
    selectedGroupId.value = null
  }
  
  // The NetworkGraph will react to this change
}

const onGroupClicked = (groupId) => {
  selectedGroupId.value = groupId
  
  // Switch to component view mode to show components within the group
  viewMode.value = 'components'
  
  // Trigger group selection in the sidebar
  if (groupFilterSidebar.value && groupFilterSidebar.value.selectGroupById) {
    groupFilterSidebar.value.selectGroupById(groupId)
  }
}

const onDomainClicked = (domainId) => {
  selectedDomainId.value = domainId
  selectedGroupId.value = null // Clear group selection when selecting domain
  
  // Switch to group view mode to show groups within the domain  
  viewMode.value = 'grouped'
  
  // Trigger domain selection in the sidebar
  if (groupFilterSidebar.value && groupFilterSidebar.value.selectDomainById) {
    groupFilterSidebar.value.selectDomainById(domainId)
  }
}

const onGroupsUpdated = async () => {
  // Refresh groups data when groups are created/updated/deleted
  await loadGroups()
  
  // Refresh the group filter sidebar
  if (groupFilterSidebar.value) {
    // The sidebar will automatically update via props reactivity
  }
  
  // Refresh the network graph
  if (networkGraph.value) {
    networkGraph.value.refreshGraph()
  }
}

onMounted(async () => {
  // Initialize UI state from localStorage
  const savedSidebarState = localStorage.getItem('sidebarCollapsed')
  if (savedSidebarState !== null) {
    sidebarCollapsed.value = savedSidebarState === 'true'
  }
  
  // Load initial data
  await Promise.all([
    loadGroups(),
    loadComponents()
  ])
  
  // Check for navigation state from Domains/Groups views
  const dashboardState = sessionStorage.getItem('dashboardState')
  if (dashboardState) {
    try {
      const state = JSON.parse(dashboardState)
      
      // Apply the filtering state
      if (state.selectedDomainId) {
        selectedDomainId.value = state.selectedDomainId
      }
      if (state.selectedGroupId) {
        selectedGroupId.value = state.selectedGroupId
      }
      if (state.viewMode) {
        viewMode.value = state.viewMode
      }
      
      // Clear the state after using it
      sessionStorage.removeItem('dashboardState')
      
      // Trigger filtering in the sidebar
      setTimeout(() => {
        if (state.selectedDomainId && groupFilterSidebar.value && groupFilterSidebar.value.selectDomainById) {
          groupFilterSidebar.value.selectDomainById(state.selectedDomainId)
        }
        if (state.selectedGroupId && groupFilterSidebar.value && groupFilterSidebar.value.selectGroupById) {
          groupFilterSidebar.value.selectGroupById(state.selectedGroupId)
        }
      }, 100)
      
    } catch (error) {
      console.error('Error parsing dashboard state:', error)
      sessionStorage.removeItem('dashboardState')
    }
  }
  // Set up real-time event listeners
  socketStore.on('component:created', (component) => {
    ElMessage.success(`New component discovered: ${component.name}`)
    if (networkGraph.value) {
      networkGraph.value.refreshGraph()
    }
  })
  
  socketStore.on('component:updated', (component) => {
    if (networkGraph.value) {
      networkGraph.value.refreshGraph()
    }
    
    // Update selected component if it's the same one
    if (selectedComponent.value && selectedComponent.value.id === component.id) {
      selectedComponent.value = component
    }
  })
  
  socketStore.on('component:deleted', (data) => {
    ElMessage.warning(`Component deleted: ID ${data.id}`)
    if (networkGraph.value) {
      networkGraph.value.refreshGraph()
    }
    
    // Close detail panel if the deleted component is selected
    if (selectedComponent.value && selectedComponent.value.id === data.id) {
      onDetailClose()
    }
  })
  
  socketStore.on('connections:rebuilt', (data) => {
    ElMessage.success(`Connections rebuilt: ${data.count} connections created`)
    if (networkGraph.value) {
      networkGraph.value.refreshGraph()
    }
  })
  
  socketStore.on('sync:completed', (data) => {
    if (networkGraph.value) {
      networkGraph.value.refreshGraph()
    }
  })
})
</script>

<style scoped>
.content {
  display: flex;
  height: 100%;
}

.sidebar {
  position: relative;
  width: 320px;
  background: #fff;
  border-right: 1px solid var(--border-light);
  overflow-y: auto;
  box-shadow: 2px 0 12px 0 rgba(0, 0, 0, 0.05);
  z-index: 10;
  transition: all 0.3s ease;
}

.sidebar.collapsed {
  width: 0;
  overflow: hidden;
  border-right: none;
  box-shadow: none;
}

/* Bookmark-style Toggle Button - Attached to right side of sidebar */
.bookmark-toggle-modal {
  position: fixed;
  top: 80px; /* Moved down to avoid covering menu */
  left: 320px; /* Attached to right edge of 320px sidebar */
  width: 32px;
  height: 120px;
  background: linear-gradient(135deg, #ff8c00 0%, #337ecc 100%);
  border-radius: 0 12px 12px 0; /* Rounded only on the right side */
  cursor: pointer;
  z-index: 1002;
  transition: all 0.3s ease;
  box-shadow: 2px 0 8px rgba(64, 158, 255, 0.3);
  border: 2px solid #ff8c00;
  border-left: none; /* No left border since it's attached to sidebar */
}

.bookmark-toggle-modal:hover {
  transform: translateX(5px); /* Slide out slightly on hover */
  box-shadow: 2px 0 12px rgba(64, 158, 255, 0.4);
  background: linear-gradient(135deg, #337ecc 0%, #2968a3 100%);
}

.bookmark-toggle-modal.collapsed {
  left: 0px; /* Attached to left edge when sidebar is collapsed */
  border-radius: 0 12px 12px 0; /* Keep right-side rounding */
  background: linear-gradient(135deg, #66b3ff 0%, #ff8c00 100%);
  animation: bookmarkPulse 2s infinite;
}

.bookmark-toggle-modal.collapsed:hover {
  transform: translateX(5px); /* Slide out slightly on hover */
}

.bookmark-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: white;
  font-size: 12px;
  font-weight: 600;
  gap: 8px;
}

.bookmark-icon {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.bookmark-icon.rotated {
  transform: rotate(180deg);
}

.bookmark-text {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 2px;
  line-height: 1;
}

@keyframes bookmarkPulse {
  0% { opacity: 1; transform: translateY(0px); }
  50% { opacity: 0.8; transform: translateY(1px); }
  100% { opacity: 1; transform: translateY(0px); }
}

/* Removed scrollbar toggle styles - using bookmark toggle only */

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    left: -320px;
    height: 100%;
    z-index: 1001;
    transition: left 0.3s ease;
  }
  
  .sidebar.mobile-open {
    left: 0;
  }
  
  .main-content {
    width: 100%;
  }
}
</style>