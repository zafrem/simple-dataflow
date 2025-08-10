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
                <el-tag type="success" size="small">{{ group.groupType }}</el-tag>
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
                  size="small">
                  {{ component.type }}
                </el-tag>
                <span class="component-name">{{ component.name }}</span>
                <span class="component-tag">{{ component.tag }}</span>
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
        <span class="stats-label">Visible {{ viewMode === 'domains' ? 'Domains' : viewMode === 'grouped' ? 'Groups' : 'Components' }}:</span>
        <span class="stats-value">{{ getCurrentViewCount() }}</span>
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
const domains = ref([])
const groupVisibility = reactive({})
const componentVisibility = reactive({})
const domainVisibility = reactive({})
const viewMode = ref('domains') // 'domains', 'grouped', 'components'
const selectedDomain = ref(null)
const selectedGroup = ref(null)
const searchTerm = ref('')

// Computed
const headerTitle = computed(() => {
  if (viewMode.value === 'domains') {
    return 'Domain View'
  } else if (viewMode.value === 'grouped') {
    return selectedDomain.value ? `Groups in ${selectedDomain.value.name}` : 'Group View'
  } else {
    return selectedGroup.value ? `Components in ${selectedGroup.value.name}` : 'Component View'
  }
})

const getViewModeButtonType = () => {
  return viewMode.value === 'domains' ? 'primary' : 'default'
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

const filteredDomains = computed(() => {
  if (!searchTerm.value) return domains.value
  
  return domains.value.filter(domain => 
    domain.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    domain.description?.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

const filteredGroups = computed(() => {
  let groups = props.groups
  
  // Filter by selected domain
  if (selectedDomain.value) {
    groups = groups.filter(group => group.domainId === selectedDomain.value.id)
  }
  
  // Filter by search term
  if (searchTerm.value) {
    groups = groups.filter(group => 
      group.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.value.toLowerCase())
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
    components = components.filter(component => 
      component.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      component.tag?.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      component.description?.toLowerCase().includes(searchTerm.value.toLowerCase())
    )
  }
  
  return components
})

const allDomainsVisible = computed(() => {
  return Object.values(domainVisibility).every(visible => visible)
})

const allGroupsVisible = computed(() => {
  return Object.values(groupVisibility).every(visible => visible)
})

const allComponentsVisible = computed(() => {
  return Object.values(componentVisibility).every(visible => visible)
})

const getCurrentViewCount = () => {
  switch (viewMode.value) {
    case 'domains': return Object.values(domainVisibility).filter(visible => visible).length
    case 'grouped': return Object.values(groupVisibility).filter(visible => visible).length
    case 'components': return Object.values(componentVisibility).filter(visible => visible).length
    default: return 0
  }
}

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

const getGroupComponentCount = (groupId) => {
  const group = props.groups.find(g => g.id === groupId)
  return group?.components?.length || 0
}

const getComponentTypeColor = (type) => {
  const colors = {
    'DB': 'primary',
    'APP': 'warning', 
    'API': 'success',
    'STORAGE': 'info',
    'PIPES': 'danger'
  }
  return colors[type] || 'default'
}

// View mode methods
const toggleViewMode = () => {
  // Cycle through: domains -> grouped -> components -> domains
  if (viewMode.value === 'domains') {
    // Don't allow direct jump to grouped without selecting domain
    return
  } else if (viewMode.value === 'grouped') {
    // Don't allow direct jump to components without selecting group  
    return
  } else {
    goToDomainView()
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
    viewMode.value = 'components'
    emit('view-mode-changed', 'components')
  } catch (error) {
    console.error('Error loading group details:', error)
    selectedGroup.value = group
    viewMode.value = 'components'
    emit('view-mode-changed', 'components')
  }
}

// Toggle methods
const toggleAllDomains = () => {
  const newVisibility = !allDomainsVisible.value
  domains.value.forEach(domain => {
    domainVisibility[domain.id] = newVisibility
  })
}

const toggleAllGroups = () => {
  const newVisibility = !allGroupsVisible.value
  filteredGroups.value.forEach(group => {
    groupVisibility[group.id] = newVisibility
  })
  emit('group-visibility-changed', groupVisibility)
}

const toggleAllComponents = () => {
  const newVisibility = !allComponentsVisible.value
  filteredComponents.value.forEach(component => {
    componentVisibility[component.id] = newVisibility
  })
  emit('component-visibility-changed', componentVisibility)
}

const onComponentVisibilityChange = () => {
  emit('component-visibility-changed', componentVisibility)
}

const resetFilters = () => {
  searchTerm.value = ''
  
  // Reset all visibility to true
  domains.value.forEach(domain => {
    domainVisibility[domain.id] = true
  })
  
  props.groups.forEach(group => {
    groupVisibility[group.id] = true
  })
  
  props.components.forEach(component => {
    componentVisibility[component.id] = true
  })
  
  emit('group-visibility-changed', groupVisibility)
  emit('component-visibility-changed', componentVisibility)
}

// Initialize data
onMounted(async () => {
  await loadDomains()
  
  // Initialize group visibility
  props.groups.forEach(group => {
    groupVisibility[group.id] = true
  })
  
  // Initialize component visibility
  props.components.forEach(component => {
    componentVisibility[component.id] = true
  })
  
  emit('group-visibility-changed', groupVisibility)
  emit('component-visibility-changed', componentVisibility)
})

// Watch for prop changes
watch(() => props.groups, (newGroups) => {
  newGroups.forEach(group => {
    if (!(group.id in groupVisibility)) {
      groupVisibility[group.id] = true
    }
  })
}, { deep: true })

watch(() => props.components, (newComponents) => {
  newComponents.forEach(component => {
    if (!(component.id in componentVisibility)) {
      componentVisibility[component.id] = true
    }
  })
}, { deep: true })
</script>

<style scoped>
.group-filter-sidebar {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}

.sidebar-header {
  margin-bottom: 20px;
}

.sidebar-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.filter-section {
  margin-bottom: 20px;
}

.section-title {
  color: #606266;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.view-mode-toggle {
  width: 100%;
  justify-content: space-between;
  height: 40px;
}

.toggle-icon {
  font-size: 16px;
}

.arrow-icon {
  font-size: 12px;
  opacity: 0.6;
}

.breadcrumb-nav {
  margin-top: 12px;
  padding: 8px;
  background: #f0f2f5;
  border-radius: 6px;
  font-size: 12px;
}

.search-input {
  width: 100%;
}

.content-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  margin: -8px;
  padding: 8px;
}

.scrollable-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.component-item {
  padding: 8px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: white;
  transition: all 0.2s ease;
}

.component-item:hover {
  border-color: #ff8c00;
}

.component-item.component-visible {
  border-color: #67c23a;
  background: #f0f9ff;
}

.component-item.component-hidden {
  opacity: 0.5;
}

.component-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.component-name {
  font-weight: 500;
  font-size: 13px;
  color: #303133;
}

.component-tag {
  font-size: 11px;
  color: #909399;
  font-family: monospace;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-buttons .el-button {
  width: 100%;
}

.filter-stats {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-top: 12px;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.stats-item:last-child {
  margin-bottom: 0;
}

.stats-label {
  font-size: 12px;
  color: #606266;
}

.stats-value {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.sidebar-bottom-padding {
  height: 20px;
  flex-shrink: 0;
}
</style>