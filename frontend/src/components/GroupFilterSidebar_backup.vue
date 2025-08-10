<template>
  <div class="group-filter-sidebar">
    <div class="sidebar-header">
      <h3>{{ headerTitle }}</h3>
    </div>

    <!-- View Mode Toggle - Now three levels -->
    <div class="filter-section">
      <div class="section-title">View Mode</div>
      
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
        <div class="section-title">Component Groups</div>
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
            class="group-checkbox-item">
          
          <el-checkbox
            v-model="groupVisibility[group.id]"
            @change="onGroupVisibilityChange"
            class="group-checkbox">
            <div class="group-checkbox-content">
              <div class="group-indicator">
                <div 
                  class="group-color-dot"
                  :style="{ backgroundColor: group.color }">
                </div>
                <span class="group-name">{{ group.name }}</span>
              </div>
              <div class="group-meta">
                <el-tag 
                  :type="getGroupTypeColor(group.groupType)" 
                  size="mini">
                  {{ group.groupType }}
                </el-tag>
                <span class="component-count">
                  ({{ getGroupComponentCount(group.id) }})
                </span>
              </div>
            </div>
          </el-checkbox>

          <!-- Expand/Collapse button for group components -->
          <el-button
            v-if="getGroupComponentCount(group.id) > 0"
            :icon="groupExpanded[group.id] ? ArrowDown : ArrowRight"
            size="small"
            text
            class="expand-button"
            @click="toggleGroupExpansion(group.id)">
          </el-button>
          </div>

          <!-- Show group components when expanded -->
          <div 
            v-for="group in filteredGroups" 
            :key="`${group.id}-components`"
          v-show="groupExpanded[group.id]"
          class="group-components-list">
          
          <div 
            v-for="component in getGroupComponents(group.id)"
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
    </div>

    <!-- Component View Content -->
    <div class="content-section" v-else>
      <div class="content-header">
        <div class="section-title">Components</div>
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
      <div class="stats-item">
        <span class="stats-label">Visible Groups:</span>
        <span class="stats-value">{{ visibleGroupsCount }}</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">Visible Components:</span>
        <span class="stats-value">{{ visibleComponentsCount }}</span>
      </div>
    </div>
    
    <!-- Bottom padding for better scrolling -->
    <div class="sidebar-bottom-padding"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ArrowDown, ArrowRight, Collection, Grid, Search } from '@element-plus/icons-vue'

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
const viewMode = ref('grouped')
const groupMemberships = reactive({}) // groupId -> [componentIds]
const searchTerm = ref('')

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

const headerTitle = computed(() => {
  if (viewMode.value === 'grouped') {
    return 'Group View'
  } else if (props.selectedGroupId) {
    const group = props.groups.find(g => g.id == props.selectedGroupId)
    return group ? `${group.name} Components` : 'Component View'
  } else {
    return 'Component View'
  }
})

// Filtered lists based on search term
const filteredGroups = computed(() => {
  if (!searchTerm.value) return props.groups
  
  const term = searchTerm.value.toLowerCase()
  return props.groups.filter(group => 
    group.name.toLowerCase().includes(term) ||
    group.description?.toLowerCase().includes(term) ||
    group.groupType.toLowerCase().includes(term) ||
    group.domain?.toLowerCase().includes(term)
  )
})

const filteredComponents = computed(() => {
  let components = props.components
  
  // Filter by selected group if one is specified
  if (props.selectedGroupId) {
    const memberIds = groupMemberships[props.selectedGroupId] || []
    components = components.filter(component => memberIds.includes(component.id))
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
  viewMode.value = viewMode.value === 'grouped' ? 'detailed' : 'grouped'
  onViewModeChange()
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
  // Reset all visibility to true
  props.groups.forEach(group => {
    groupVisibility[group.id] = true
    groupExpanded[group.id] = false
  })

  props.components.forEach(component => {
    componentVisibility[component.id] = true
  })

  viewMode.value = 'grouped'
  
  onGroupVisibilityChange()
  onViewModeChange()
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
onMounted(() => {
  initializeVisibility()
})

// Expose methods
defineExpose({
  getGroupVisibility: () => ({ ...groupVisibility }),
  getComponentVisibility: () => ({ ...componentVisibility }),
  getViewMode: () => viewMode.value,
  resetFilters
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
  padding: 10px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  border: 1px solid #e8f4ff;
  width: 100%;
  box-sizing: border-box;
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
}

.component-name {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
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

/* Removed scrollbar toggle styles - now in Dashboard */
</style>