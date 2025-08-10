<template>
  <div class="group-filter-sidebar">
    <div class="sidebar-header">
      <h3>{{ headerTitle }}</h3>
    </div>

    <!-- View Mode Toggle - Now three levels -->
    <div class="filter-section">
      <div class="section-title">View Mode</div>
      
      <el-tooltip content="Toggle between Domain View → Group View → Component View" placement="top">
        <el-button
          @click="toggleViewMode"
          :type="getViewModeButtonType()"
          class="view-mode-toggle">
        <el-icon class="toggle-icon">
          <component :is="getViewModeIcon()" />
        </el-icon>
        {{ getViewModeLabel() }}
        <el-icon class="arrow-icon">
          <ArrowRight />
        </el-icon>
        </el-button>
      </el-tooltip>
      
      <!-- Breadcrumb for drill-down navigation -->
      <div v-if="viewMode !== 'domains'" class="breadcrumb-nav">
        <el-breadcrumb separator=">">
          <el-breadcrumb-item>
            <el-button link @click="goToDomainView" size="small">Domains</el-button>
          </el-breadcrumb-item>
          <el-breadcrumb-item v-if="selectedDomain && viewMode === 'components'">
            <el-button link @click="goToGroupView" size="small">{{ selectedDomain.name }}</el-button>
          </el-breadcrumb-item>
          <el-breadcrumb-item v-if="viewMode === 'components' && selectedGroup">
            {{ selectedGroup.name }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>
    </div>

    <!-- Search Filter -->
    <div class="filter-section">
      <div class="section-title">Search</div>
      <el-input
        v-model="searchTerm"
        placeholder="Search..."
        size="small"
        clearable
        class="search-input">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- Domain View Content -->
    <div class="content-section" v-if="viewMode === 'domains'">
      <div class="content-header">
        <div class="section-title">Domains</div>
        <el-tooltip content="Toggle all domains">
          <el-button 
            size="small" 
            text
            @click="toggleAllDomains">
            {{ allDomainsVisible ? 'Hide All' : 'Show All' }}
          </el-button>
        </el-tooltip>
      </div>
      
      <div class="scrollable-content">
        <div class="scrollable-inner">
          <div 
            v-for="domain in filteredDomains" 
            :key="domain.id"
            class="domain-item"
            @click="selectDomain(domain)">
            
            <div class="domain-content">
              <div class="domain-header">
                <div 
                  class="domain-color-dot"
                  :style="{ backgroundColor: domain.color || '#ff8c00' }">
                </div>
                <span class="domain-name">{{ domain.name }}</span>
              </div>
              <div class="domain-stats">
                <span class="stat-item">{{ domain.groupCount || 0 }} groups</span>
                <span class="stat-item">{{ domain.componentCount || 0 }} components</span>
                <span class="stat-item">{{ (domain.pipelines || []).length }} pipelines</span>
              </div>
              <div v-if="domain.description" class="domain-description">
                {{ domain.description }}
              </div>
            </div>
            <el-icon class="domain-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Group View Content -->
    <div class="content-section" v-else-if="viewMode === 'grouped'">
      <div class="content-header">
        <div class="section-title">Groups in {{ selectedDomain?.name || 'All Domains' }}</div>
        <el-tooltip content="Toggle all groups">
          <el-button 
            size="small" 
            text
            @click="toggleAllGroups">
            {{ allGroupsVisible ? 'Hide All' : 'Show All' }}
          </el-button>
        </el-tooltip>
      </div>
      
      <div class="scrollable-content">
        <div class="scrollable-inner">
          <div 
            v-for="group in filteredGroups" 
            :key="group.id"
            class="group-item"
            @click="selectGroup(group)">
            
            <div class="group-content">
              <div class="group-header">
                <div 
                  class="group-color-dot"
                  :style="{ backgroundColor: group.color || '#ff8c00' }">
                </div>
                <span class="group-name">{{ group.name }}</span>
                <el-tag :type="getGroupTypeColor(group.groupType)" size="small">{{ group.groupType }}</el-tag>
              </div>
              <div class="group-stats">
                <span class="stat-item">{{ getGroupComponentCount(group.id) }} components</span>
              </div>
              <div v-if="group.description" class="group-description">
                {{ group.description }}
              </div>
            </div>
            <el-icon class="group-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Component View Content -->
    <div class="content-section" v-else>
      <div class="content-header">
        <div class="section-title">Components in {{ selectedGroup?.name || 'All Groups' }}</div>
        <el-tooltip content="Toggle all components">
          <el-button 
            size="small" 
            text
            @click="toggleAllComponents">
            {{ allComponentsVisible ? 'Hide All' : 'Show All' }}
          </el-button>
        </el-tooltip>
      </div>
      
      <div class="scrollable-content">
        <div class="scrollable-inner">
          <div 
            v-for="component in filteredComponents"
          :key="component.id"
          class="component-item"
          :class="{ 
            'component-visible': componentVisibility[component.id],
            'component-hidden': !componentVisibility[component.id]
          }">
          
          <el-checkbox
            v-model="componentVisibility[component.id]"
            @change="onComponentVisibilityChange"
            size="small">
            
            <div class="component-content">
              <el-tag
                :type="getComponentTypeColor(component.type)"
                size="mini">
                {{ component.type }}
              </el-tag>
              <span class="component-name">{{ component.name }}</span>
              <span class="component-domain">{{ component.domain || 'No domain' }}</span>
            </div>
          </el-checkbox>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-section">
      <div class="section-title">Quick Actions</div>
      
      <div class="action-buttons">
        <el-button 
          size="small" 
          @click="showOnlySelected"
          :disabled="!hasSelectedGroups">
          Show Selected Only
        </el-button>
        
        <el-button 
          size="small" 
          @click="resetFilters">
          Reset All Filters
        </el-button>

        <el-button 
          size="small" 
          type="primary"
          @click="$emit('manage-groups')">
          Manage Groups
        </el-button>
      </div>
    </div>

    <div class="filter-stats">
      <div class="stats-item" v-if="viewMode === 'domains'">
        <span class="stats-label">Total Domains:</span>
        <span class="stats-value">{{ domains.length }}</span>
      </div>
      <div class="stats-item" v-else-if="viewMode === 'grouped'">
        <span class="stats-label">Groups in {{ selectedDomain?.name || 'All Domains' }}:</span>
        <span class="stats-value">{{ filteredGroups.length }}</span>
      </div>
      <div class="stats-item" v-else>
        <span class="stats-label">Components in {{ selectedGroup?.name || 'Selected Group' }}:</span>
        <span class="stats-value">{{ filteredComponents.length }}</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">Visible on Graph:</span>
        <span class="stats-value">{{ visibleNodesCount }}</span>
      </div>
    </div>
    
    <!-- Bottom padding for better scrolling -->
    <div class="sidebar-bottom-padding"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ArrowDown, ArrowRight, Collection, Grid, Search, House, FolderOpened, DocumentCopy } from '@element-plus/icons-vue'

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  },
  components: {
    type: Array,
    default: () => []
  },
  selectedGroupId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits([
  'group-visibility-changed',
  'component-visibility-changed', 
  'view-mode-changed',
  'manage-groups'
])

// State
const groupVisibility = reactive({}) // groupId -> boolean
const componentVisibility = reactive({}) // componentId -> boolean
const groupExpanded = reactive({}) // groupId -> boolean
const viewMode = ref('domains')
const groupMemberships = reactive({}) // groupId -> [componentIds]
const searchTerm = ref('')
const domains = ref([])
const selectedDomain = ref(null)
const selectedGroup = ref(null)
const domainVisibility = reactive({})

// Computed
const allGroupsVisible = computed(() => {
  return Object.values(groupVisibility).every(visible => visible)
})

const allComponentsVisible = computed(() => {
  return Object.values(componentVisibility).every(visible => visible)
})

const hasSelectedGroups = computed(() => {
  return Object.values(groupVisibility).some(visible => visible)
})

const visibleGroupsCount = computed(() => {
  return Object.values(groupVisibility).filter(visible => visible).length
})

const visibleComponentsCount = computed(() => {
  return Object.values(componentVisibility).filter(visible => visible).length
})

const allDomainsVisible = computed(() => {
  return Object.values(domainVisibility).every(visible => visible)
})

const visibleNodesCount = computed(() => {
  if (viewMode.value === 'domains') {
    return filteredDomains.value.length
  } else if (viewMode.value === 'grouped') {
    return filteredGroups.value.length + (selectedDomain.value ? 1 : 0) // groups + selected domain
  } else {
    return filteredComponents.value.filter(comp => componentVisibility[comp.id] === true).length
  }
})

const filteredDomains = computed(() => {
  if (!searchTerm.value) return domains.value
  
  return domains.value.filter(domain => 
    domain.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    domain.description?.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

const headerTitle = computed(() => {
  if (viewMode.value === 'domains') {
    return 'Domain View'
  } else if (viewMode.value === 'grouped') {
    return selectedDomain.value ? `Groups in ${selectedDomain.value.name}` : 'Group View'
  } else {
    return selectedGroup.value ? `Components in ${selectedGroup.value.name}` : 'Component View'
  }
})

// Filtered lists based on search term and selected domain
const filteredGroups = computed(() => {
  let groups = props.groups
  
  // Filter by selected domain
  if (selectedDomain.value) {
    groups = groups.filter(group => group.domainId === selectedDomain.value.id)
  }
  
  // Filter by search term
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    groups = groups.filter(group => 
      group.name.toLowerCase().includes(term) ||
      group.description?.toLowerCase().includes(term) ||
      group.groupType.toLowerCase().includes(term) ||
      group.domain?.toLowerCase().includes(term)
    )
  }
  
  return groups
})

const filteredComponents = computed(() => {
  let components = props.components
  
  // Filter by selected group
  if (selectedGroup.value) {
    // Get components that are members of the selected group
    const groupComponents = selectedGroup.value.components || []
    const componentIds = groupComponents.map(c => c.id)
    components = components.filter(comp => componentIds.includes(comp.id))
  }
  
  // Filter by search term
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    components = components.filter(component =>
      component.name.toLowerCase().includes(term) ||
      component.tag?.toLowerCase().includes(term) ||
      component.type.toLowerCase().includes(term) ||
      component.domain?.toLowerCase().includes(term) ||
      component.description?.toLowerCase().includes(term)
    )
  }
  
  return components
})

// Methods
const loadDomains = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/domains')
    const data = await response.json()
    domains.value = data || []
    
    // Initialize domain visibility
    domains.value.forEach(domain => {
      domainVisibility[domain.id] = true
    })
  } catch (error) {
    console.error('Error loading domains:', error)
  }
}

const selectDomain = (domain) => {
  selectedDomain.value = domain
  viewMode.value = 'grouped'
  emit('view-mode-changed', 'grouped')
}

const selectGroup = async (group) => {
  // Load full group data with components
  try {
    const response = await fetch(`http://localhost:3001/api/groups/${group.id}?includeComponents=true`)
    const data = await response.json()
    selectedGroup.value = data
    
    // Clear existing component visibility
    Object.keys(componentVisibility).forEach(key => {
      componentVisibility[key] = false
    })
    
    // Set components in this group as visible
    if (data.components && data.components.length > 0) {
      data.components.forEach(component => {
        // Convert ID to string to match graph data format
        componentVisibility[component.id.toString()] = true
      })
    }
    
    viewMode.value = 'components'
    emit('view-mode-changed', 'components')
    emit('component-visibility-changed', { ...componentVisibility })
  } catch (error) {
    console.error('Error loading group details:', error)
    selectedGroup.value = group
    viewMode.value = 'components'
    emit('view-mode-changed', 'components')
  }
}

const goToDomainView = () => {
  viewMode.value = 'domains'
  selectedDomain.value = null
  selectedGroup.value = null
  emit('view-mode-changed', 'domains')
}

const goToGroupView = () => {
  viewMode.value = 'grouped'
  selectedGroup.value = null
  emit('view-mode-changed', 'grouped')
}

const toggleAllDomains = () => {
  const newVisibility = !allDomainsVisible.value
  domains.value.forEach(domain => {
    domainVisibility[domain.id] = newVisibility
  })
}

const getViewModeButtonType = () => {
  return 'primary' // Always primary to indicate it's an interactive toggle button
}

const getViewModeIcon = () => {
  switch (viewMode.value) {
    case 'domains': return House
    case 'grouped': return FolderOpened  
    case 'components': return DocumentCopy
    default: return House
  }
}

const getViewModeLabel = () => {
  switch (viewMode.value) {
    case 'domains': return 'Domain View'
    case 'grouped': return 'Group View'
    case 'components': return 'Component View'
    default: return 'Domain View'
  }
}

const initializeVisibility = () => {
  let groupsChanged = false
  let componentsChanged = false
  
  // Initialize group visibility (all visible by default)
  props.groups.forEach(group => {
    if (!(group.id in groupVisibility)) {
      groupVisibility[group.id] = true
      groupsChanged = true
    }
    if (!(group.id in groupExpanded)) {
      groupExpanded[group.id] = false
    }
  })

  // Initialize component visibility based on view mode
  props.components.forEach(component => {
    if (!(component.id in componentVisibility)) {
      if (viewMode.value === 'grouped' && component.type !== 'PIPES') {
        // In grouped mode, hide grouped components (DB, API, APP, STORAGE) by default
        // but show PIPES components individually
        componentVisibility[component.id] = false
      } else {
        // Show PIPES components and all components in detailed mode
        componentVisibility[component.id] = true
      }
      componentsChanged = true
    }
  })

  // Build group memberships lookup
  props.groups.forEach(group => {
    if (group.components) {
      groupMemberships[group.id] = group.components.map(c => c.id)
    }
  })
  
  // Emit initial visibility states if they were changed
  if (groupsChanged) {
    emit('group-visibility-changed', { ...groupVisibility })
  }
  if (componentsChanged) {
    emit('component-visibility-changed', { ...componentVisibility })
  }
}

const getGroupComponentCount = (groupId) => {
  return groupMemberships[groupId]?.length || 0
}

const getGroupComponents = (groupId) => {
  const memberIds = groupMemberships[groupId] || []
  return props.components.filter(comp => memberIds.includes(comp.id))
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

const toggleAllGroups = () => {
  const newVisibility = !allGroupsVisible.value
  props.groups.forEach(group => {
    groupVisibility[group.id] = newVisibility
  })
  onGroupVisibilityChange()
}

const toggleAllComponents = () => {
  const newVisibility = !allComponentsVisible.value
  props.components.forEach(component => {
    componentVisibility[component.id] = newVisibility
  })
  onComponentVisibilityChange()
}

const toggleGroupExpansion = (groupId) => {
  groupExpanded[groupId] = !groupExpanded[groupId]
}

const onGroupVisibilityChange = () => {
  // When group visibility changes, also update its components
  props.groups.forEach(group => {
    const isGroupVisible = groupVisibility[group.id]
    const memberIds = groupMemberships[group.id] || []
    
    memberIds.forEach(componentId => {
      // Find the component to check its type
      const component = props.components.find(comp => comp.id === componentId)
      
      if (isGroupVisible && viewMode.value === 'grouped') {
        // In grouped mode, hide individual components of visible groups
        // EXCEPT for PIPES components which should remain visible individually
        if (component && component.type !== 'PIPES') {
          componentVisibility[componentId] = false
        }
      } else if (!isGroupVisible) {
        // If group is hidden, show individual components
        componentVisibility[componentId] = true
      }
    })
  })

  emit('group-visibility-changed', { ...groupVisibility })
}

const onComponentVisibilityChange = () => {
  emit('component-visibility-changed', { ...componentVisibility })
}

const toggleViewMode = () => {
  // Cycle through: Domain View → Group View → Component View → Domain View
  if (viewMode.value === 'domains') {
    viewMode.value = 'grouped'
    // Keep selectedDomain when going to group view for drill-down context
    selectedGroup.value = null
    emit('view-mode-changed', 'grouped')
  } else if (viewMode.value === 'grouped') {
    viewMode.value = 'components'
    // Keep selectedDomain and selectedGroup for drill-down context
    emit('view-mode-changed', 'components')
  } else {
    viewMode.value = 'domains'
    // Clear all drill-down state when returning to domain view
    selectedDomain.value = null
    selectedGroup.value = null
    emit('view-mode-changed', 'domains')
  }
}

const onViewModeChange = () => {
  if (viewMode.value === 'grouped') {
    // In grouped mode, hide individual components of visible groups
    // EXCEPT for PIPES components which should remain visible individually
    props.groups.forEach(group => {
      if (groupVisibility[group.id]) {
        const memberIds = groupMemberships[group.id] || []
        memberIds.forEach(componentId => {
          // Find the component to check its type
          const component = props.components.find(comp => comp.id === componentId)
          if (component && component.type !== 'PIPES') {
            componentVisibility[componentId] = false
          }
        })
      }
    })
    
    // Ensure all PIPES components are visible in grouped mode
    props.components.forEach(component => {
      if (component.type === 'PIPES') {
        componentVisibility[component.id] = true
      }
    })
  } else {
    // In detailed mode, show all components
    props.components.forEach(component => {
      componentVisibility[component.id] = true
    })
  }

  emit('view-mode-changed', viewMode.value)
  onComponentVisibilityChange()
}

const showOnlySelected = () => {
  // Hide all groups first
  props.groups.forEach(group => {
    groupVisibility[group.id] = false
  })

  // Show only groups that have visible components
  props.groups.forEach(group => {
    const memberIds = groupMemberships[group.id] || []
    const hasVisibleComponents = memberIds.some(id => componentVisibility[id])
    
    if (hasVisibleComponents) {
      groupVisibility[group.id] = true
    }
  })

  onGroupVisibilityChange()
}

const resetFilters = () => {
  searchTerm.value = ''
  
  // Reset all visibility to true
  domains.value.forEach(domain => {
    domainVisibility[domain.id] = true
  })
  
  props.groups.forEach(group => {
    groupVisibility[group.id] = true
    groupExpanded[group.id] = false
  })

  props.components.forEach(component => {
    componentVisibility[component.id] = true
  })

  // Reset navigation state
  viewMode.value = 'domains'
  selectedDomain.value = null
  selectedGroup.value = null
  
  emit('group-visibility-changed', groupVisibility)
  emit('component-visibility-changed', componentVisibility)
  emit('view-mode-changed', 'domains')
}

// Watchers
watch(() => props.groups, () => {
  initializeVisibility()
}, { deep: true, immediate: true })

watch(() => props.components, () => {
  initializeVisibility()
}, { deep: true })

// Watch for selectedGroupId changes and switch to component mode
watch(() => props.selectedGroupId, (newGroupId) => {
  if (newGroupId) {
    viewMode.value = 'detailed'
    
    // Enable all components in the selected group
    const memberIds = groupMemberships[newGroupId] || []
    memberIds.forEach(componentId => {
      componentVisibility[componentId] = true
    })
    
    emit('view-mode-changed', 'detailed')
    emit('component-visibility-changed', { ...componentVisibility })
  }
})

// Lifecycle
onMounted(async () => {
  await loadDomains()
  initializeVisibility()
})

// Expose methods
defineExpose({
  getGroupVisibility: () => ({ ...groupVisibility }),
  getComponentVisibility: () => ({ ...componentVisibility }),
  getViewMode: () => viewMode.value,
  resetFilters,
  selectDomainById: (domainId) => {
    const domain = domains.value.find(d => d.id == domainId)
    if (domain) {
      selectDomain(domain)
    }
  },
  selectGroupById: (groupId) => {
    const group = props.groups.find(g => g.id == groupId)
    if (group) {
      selectGroup(group)
    }
  }
})
</script>

<style scoped>
.group-filter-sidebar {
  width: 320px;
  height: 100%;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  position: relative;
  /* Custom scrollbar for entire sidebar */
  scrollbar-width: thin;
  scrollbar-color: #ff8c00 #f3f4f6;
}

.group-filter-sidebar::-webkit-scrollbar {
  width: 8px;
}

.group-filter-sidebar::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.group-filter-sidebar::-webkit-scrollbar-thumb {
  background: #ff8c00;
  border-radius: 4px;
}

.group-filter-sidebar::-webkit-scrollbar-thumb:hover {
  background: #337ecc;
}

.sidebar-header {
  padding: 20px 16px 16px 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  background: #f8f9fa;
}

.sidebar-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 700;
}

.filter-section {
  padding: 18px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.filter-section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 14px;
  font-size: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
  flex-shrink: 0;
}


.content-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.search-input {
  margin-bottom: 10px;
  width: 100%;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  min-height: 0;
  max-height: 100%;
  /* Custom scrollbar for scrollable content */
}

.scrollable-content::-webkit-scrollbar {
  width: 6px;
}

.scrollable-content::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background: #ff8c00;
  border-radius: 3px;
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: #337ecc;
}

.scrollable-inner {
  padding: 0 20px 20px 20px;
}

/* Removed old groups-checkboxes styles - now using scrollable-content */

.group-checkbox-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid #f0f0f0;
  width: 100%;
  box-sizing: border-box;
}

.group-checkbox-item:hover {
  background: #f8f9fa;
  border-color: #ff8c00;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.group-checkbox {
  flex: 1;
}

.group-checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.group-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  line-height: 1.3;
  max-width: 180px;
}


.group-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 16px;
}

.component-count {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

.expand-button {
  margin-left: 12px;
  width: 24px;
  height: 24px;
  padding: 0;
  flex-shrink: 0;
}

.group-components-list {
  margin-left: 28px;
  margin-bottom: 16px;
  padding-left: 16px;
  border-left: 3px solid #ff8c00;
  background: #f8fbff;
  border-radius: 0 8px 8px 0;
  padding-top: 8px;
  padding-bottom: 8px;
}

.component-item {
  margin-bottom: 10px;
  padding: 20px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  border: 1px solid #e8f4ff;
  width: 100%;
  box-sizing: border-box;
  min-height: 68px;
  display: flex;
  align-items: flex-start;
}

.component-item .el-checkbox {
  margin-top: 2px;
  align-self: flex-start;
}

.component-item:hover {
  background: #f0f8ff;
  border-color: #ff8c00;
  transform: translateX(2px);
}

.component-item.component-visible {
  background: #f0f9ff;
  border-color: #10b981;
}

.component-item.component-hidden {
  background: #fef2f2;
  border-color: #ef4444;
  opacity: 0.8;
}

.component-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
  flex: 1;
}

.component-name {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  line-height: 1.3;
  max-width: 150px;
}

.component-domain {
  font-size: 11px;
  color: #6c757d;
  margin-left: auto;
  font-weight: 500;
}

.view-mode-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-radius: 10px;
  transition: all 0.3s ease;
  font-weight: 600;
  font-size: 14px;
  min-height: 48px;
}

.view-mode-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.view-mode-toggle .toggle-icon {
  margin-right: 10px;
  font-size: 18px;
}

.view-mode-toggle .arrow-icon {
  font-size: 16px;
  transition: transform 0.3s ease;
  opacity: 0.7;
}

.view-mode-toggle:hover .arrow-icon {
  transform: translateX(2px);
  opacity: 1;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-buttons .el-button {
  justify-content: flex-start;
}

.filter-stats {
  padding: 16px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
}

.stats-label {
  color: #6c757d;
}

.stats-value {
  font-weight: 600;
  color: #2c3e50;
}

.sidebar-bottom-padding {
  height: 40px; /* Extra space at bottom for comfortable scrolling */
}

.domain-item,
.group-item {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.domain-item:hover,
.group-item:hover {
  border-color: #ff8c00;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

.domain-content,
.group-content {
  flex: 1;
}

.domain-header,
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.domain-color-dot,
.group-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.domain-name,
.group-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  line-height: 1.3;
  max-width: 200px;
}

.domain-stats,
.group-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.stat-item {
  font-size: 12px;
  color: #909399;
}

.domain-description,
.group-description {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
}

.domain-arrow,
.group-arrow {
  color: #c0c4cc;
  font-size: 16px;
}

/* Removed scrollbar toggle styles - now in Dashboard */
</style>