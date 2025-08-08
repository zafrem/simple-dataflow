<template>
  <div class="filter-panel">
    <div class="filter-section">
      <div class="filter-title">Search</div>
      <el-input
        v-model="searchTerm"
        placeholder="Search components..."
        :prefix-icon="Search"
        clearable
        @input="onSearchChange"
      />
    </div>

    <div class="filter-section">
      <div class="filter-title">Component Types</div>
      <div class="component-type-filter">
        <el-checkbox-group v-model="filters.type" @change="onFilterChange">
          <el-checkbox value="DB">
            <el-tag type="primary" size="small">DB</el-tag>
            <span class="type-count">({{ typeStats.DB || 0 }})</span>
          </el-checkbox>
          
          <el-checkbox value="API">
            <el-tag type="success" size="small">API</el-tag>
            <span class="type-count">({{ typeStats.API || 0 }})</span>
          </el-checkbox>
          
          <el-checkbox value="APP">
            <el-tag type="warning" size="small">APP</el-tag>
            <span class="type-count">({{ typeStats.APP || 0 }})</span>
          </el-checkbox>
          
          <el-checkbox value="STORAGE">
            <el-tag type="info" size="small">STORAGE</el-tag>
            <span class="type-count">({{ typeStats.STORAGE || 0 }})</span>
          </el-checkbox>
          
          <el-checkbox value="PIPES">
            <el-tag type="danger" size="small">PIPES</el-tag>
            <span class="type-count">({{ typeStats.PIPES || 0 }})</span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title">
        Domains
        <el-button
          link
          size="small"
          @click="toggleAllDomains"
          style="float: right;">
          {{ allDomainsSelected ? 'Deselect All' : 'Select All' }}
        </el-button>
      </div>
      <div class="domain-list">
        <div
          v-for="domain in availableDomains"
          :key="domain.name"
          class="domain-item"
          :class="{ active: filters.domain.includes(domain.name) }"
          @click="toggleDomain(domain.name)">
          <div class="domain-info">
            <span class="domain-name">{{ domain.name }}</span>
            <span class="domain-count">{{ domain.count }}</span>
          </div>
          <div class="domain-types">
            <el-tag
              v-for="type in domain.types"
              :key="type"
              :type="getTypeTagType(type)"
              size="mini">
              {{ type }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title">Data Sources</div>
      <el-checkbox-group v-model="filters.source" @change="onFilterChange">
        <div class="source-list">
          <el-checkbox
            v-for="source in availableSources"
            :key="source"
            :value="source"
            class="source-item">
            <span class="source-name">{{ formatSourceName(source) }}</span>
            <span class="source-count">({{ getSourceCount(source) }})</span>
          </el-checkbox>
        </div>
      </el-checkbox-group>
    </div>

    <div class="filter-section">
      <div class="filter-title">Display Options</div>
      <el-checkbox
        v-model="filters.includeIsolated"
        @change="onFilterChange">
        Show isolated components
      </el-checkbox>
    </div>

    <div class="filter-section">
      <div class="filter-actions">
        <el-button type="primary" @click="applyFilters" :loading="loading">
          Apply Filters
        </el-button>
        <el-button @click="clearAllFilters">
          Clear All
        </el-button>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title">Statistics</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.nodeCount || 0 }}</div>
          <div class="stat-label">Components</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.edgeCount || 0 }}</div>
          <div class="stat-label">Connections</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.domains || 0 }}</div>
          <div class="stat-label">Domains</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ averageDegree }}</div>
          <div class="stat-label">Avg Degree</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useComponentStore } from '../stores/components'
import { debounce } from 'lodash-es'

const emit = defineEmits(['search-change', 'filter-change'])

const componentStore = useComponentStore()

const searchTerm = ref('')
const loading = ref(false)

const filters = ref({
  type: [],
  domain: [],
  source: [],
  includeIsolated: true
})

const stats = ref({
  nodeCount: 0,
  edgeCount: 0,
  domains: 0,
  avgDegree: 0
})

const typeStats = computed(() => {
  return componentStore.componentsByType
})

const availableDomains = computed(() => {
  const domainMap = new Map()
  
  componentStore.components.forEach(component => {
    if (component.domain) {
      if (!domainMap.has(component.domain)) {
        domainMap.set(component.domain, {
          name: component.domain,
          count: 0,
          types: new Set()
        })
      }
      
      const domain = domainMap.get(component.domain)
      domain.count++
      domain.types.add(component.type)
    }
  })
  
  return Array.from(domainMap.values())
    .map(domain => ({
      ...domain,
      types: Array.from(domain.types)
    }))
    .sort((a, b) => b.count - a.count)
})

const availableSources = computed(() => {
  return componentStore.uniqueSources
})

const allDomainsSelected = computed(() => {
  return availableDomains.value.length > 0 && 
         filters.value.domain.length === availableDomains.value.length
})

const averageDegree = computed(() => {
  return stats.value.avgDegree ? stats.value.avgDegree.toFixed(1) : '0.0'
})

const onSearchChange = debounce((value) => {
  emit('search-change', value)
}, 300)

const onFilterChange = () => {
  componentStore.setFilter('type', filters.value.type)
  componentStore.setFilter('domain', filters.value.domain)
  componentStore.setFilter('source', filters.value.source)
  componentStore.setFilter('includeIsolated', filters.value.includeIsolated)
  
  emit('filter-change', { ...filters.value })
}

const toggleDomain = (domainName) => {
  const index = filters.value.domain.indexOf(domainName)
  if (index > -1) {
    filters.value.domain.splice(index, 1)
  } else {
    filters.value.domain.push(domainName)
  }
  onFilterChange()
}

const toggleAllDomains = () => {
  if (allDomainsSelected.value) {
    filters.value.domain = []
  } else {
    filters.value.domain = availableDomains.value.map(d => d.name)
  }
  onFilterChange()
}

const applyFilters = async () => {
  loading.value = true
  try {
    await componentStore.applyFilters()
  } catch (error) {
    console.error('Error applying filters:', error)
  } finally {
    loading.value = false
  }
}

const clearAllFilters = () => {
  searchTerm.value = ''
  filters.value = {
    type: [],
    domain: [],
    source: [],
    includeIsolated: true
  }
  
  componentStore.clearFilters()
  emit('search-change', '')
  emit('filter-change', { ...filters.value })
}

const getTypeTagType = (type) => {
  const typeMap = {
    'DB': 'primary',
    'API': 'success',
    'APP': 'warning'
  }
  return typeMap[type] || 'info'
}

const formatSourceName = (source) => {
  return source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' ')
}

const getSourceCount = (source) => {
  return componentStore.components.filter(c => c.source === source).length
}

const updateStats = (newStats) => {
  stats.value = { ...stats.value, ...newStats }
}

watch(() => componentStore.filters, (newFilters) => {
  filters.value = { ...newFilters }
}, { deep: true })

onMounted(async () => {
  await componentStore.fetchComponents()
  await componentStore.fetchDomains()
})

defineExpose({
  updateStats,
  clearAllFilters
})
</script>

<style scoped>
.filter-panel {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.filter-section {
  margin-bottom: 24px;
}

.filter-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.component-type-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.component-type-filter .el-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-count {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.domain-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-light);
  border-radius: 4px;
}

.domain-item {
  padding: 12px;
  border-bottom: 1px solid var(--border-lighter);
  cursor: pointer;
  transition: background-color 0.2s;
}

.domain-item:last-child {
  border-bottom: none;
}

.domain-item:hover {
  background-color: var(--background-light);
}

.domain-item.active {
  background-color: var(--primary-color);
  color: white;
}

.domain-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.domain-name {
  font-weight: 500;
  font-size: 13px;
}

.domain-count {
  font-size: 12px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
}

.domain-item:not(.active) .domain-count {
  background: var(--background-base);
  color: var(--text-secondary);
}

.domain-types {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.source-name {
  flex: 1;
}

.source-count {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-actions .el-button {
  flex: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  background: var(--background-light);
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid var(--border-lighter);
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.el-checkbox) {
  width: 100%;
  margin-right: 0;
}

:deep(.el-checkbox__label) {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

/* Scrollbar styling */
.domain-list::-webkit-scrollbar,
.filter-panel::-webkit-scrollbar {
  width: 6px;
}

.domain-list::-webkit-scrollbar-track,
.filter-panel::-webkit-scrollbar-track {
  background: var(--border-extra-light);
  border-radius: 3px;
}

.domain-list::-webkit-scrollbar-thumb,
.filter-panel::-webkit-scrollbar-thumb {
  background: var(--border-base);
  border-radius: 3px;
}

.domain-list::-webkit-scrollbar-thumb:hover,
.filter-panel::-webkit-scrollbar-thumb:hover {
  background: var(--text-placeholder);
}
</style>