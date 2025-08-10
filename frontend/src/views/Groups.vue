<template>
  <div class="groups-view">
    <div class="groups-header">
      <h2>Groups</h2>
      <p>Organize and manage logical groupings of system components</p>
      
      <el-row :gutter="16" align="middle" class="actions-row">
        <el-col :span="6">
          <el-button type="primary" @click="showCreateDialog = true" :icon="Plus">
            Create Group
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-select v-model="selectedGroupType" placeholder="Filter by Type" clearable @change="loadGroups">
            <el-option label="All Types" value="" />
            <el-option label="Logical" value="LOGICAL" />
            <el-option label="Physical" value="PHYSICAL" />
            <el-option label="Functional" value="FUNCTIONAL" />
            <el-option label="Service" value="SERVICE" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <div class="stats-info">
            <el-tag type="info" size="small">{{ groups.length }} Groups</el-tag>
            <el-tag type="success" size="small">{{ totalComponents }} Components</el-tag>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="groups-grid">
      <el-card
        v-for="group in groups"
        :key="group.id"
        class="group-card"
        :body-style="{ padding: '16px' }">
        
        <template #header>
          <div class="group-header">
            <div class="group-title">
              <div 
                class="group-color-indicator" 
                :style="{ backgroundColor: group.color || '#ff8c00' }">
              </div>
              <span class="group-name">{{ group.name }}</span>
              <el-tag :type="getGroupTypeColor(group.groupType)" size="small">
                {{ group.groupType }}
              </el-tag>
            </div>
            <el-dropdown @command="handleGroupAction">
              <el-button link :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'view-board', group }">View Board</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'edit', group }" divided>Edit</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'manage', group }">Manage Components</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'delete', group }">Delete</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <div class="group-content">
          <p v-if="group.description" class="group-description">{{ group.description }}</p>
          <p v-else class="no-description">No description</p>
          
          <div class="group-stats">
            <div class="stat-item">
              <span class="stat-label">Components:</span>
              <span class="stat-value">{{ group.components?.length || 0 }}</span>
            </div>
            <div class="stat-item" v-if="group.domain">
              <span class="stat-label">Domain:</span>
              <span class="stat-value">{{ group.domain }}</span>
            </div>
          </div>

          <div v-if="group.components && group.components.length > 0" class="component-list">
            <el-tag
              v-for="component in group.components.slice(0, 3)"
              :key="component.id"
              :type="getComponentTypeColor(component.type)"
              size="small"
              class="component-tag">
              {{ component.name }}
            </el-tag>
            <el-tag v-if="group.components.length > 3" size="small" type="info">
              +{{ group.components.length - 3 }} more
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Create/Edit Group Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingGroup ? 'Edit Group' : 'Create Group'"
      width="600px">
      
      <el-form :model="groupForm" :rules="groupRules" ref="groupFormRef" label-width="120px">
        <el-form-item label="Name" prop="name">
          <el-input v-model="groupForm.name" placeholder="Enter group name" />
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input
            v-model="groupForm.description"
            type="textarea"
            :rows="3"
            placeholder="Optional description" />
        </el-form-item>
        
        <el-form-item label="Type" prop="groupType">
          <el-select v-model="groupForm.groupType" placeholder="Select group type">
            <el-option label="Logical" value="LOGICAL" />
            <el-option label="Physical" value="PHYSICAL" />
            <el-option label="Functional" value="FUNCTIONAL" />
            <el-option label="Service" value="SERVICE" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Domain">
          <el-input v-model="groupForm.domain" placeholder="Optional domain" />
        </el-form-item>
        
        <el-form-item label="Color">
          <el-color-picker v-model="groupForm.color" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateDialog = false">Cancel</el-button>
          <el-button type="primary" @click="saveGroup" :loading="saving">
            {{ editingGroup ? 'Update' : 'Create' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Manage Components Dialog -->
    <el-dialog
      v-model="showManageDialog"
      title="Manage Group Components"
      width="800px"
      destroy-on-close>
      
      <div v-if="selectedGroup" class="manage-components-container">
        <div class="group-info">
          <h3>{{ selectedGroup.name }}</h3>
          <p v-if="selectedGroup.description">{{ selectedGroup.description }}</p>
          <el-tag :type="getGroupTypeColor(selectedGroup.groupType)" size="small">
            {{ selectedGroup.groupType }}
          </el-tag>
        </div>

        <el-tabs v-model="activeTab" class="manage-tabs">
          <!-- Current Components Tab -->
          <el-tab-pane label="Current Components" name="current">
            <div class="current-components">
              <div class="tab-header">
                <span class="component-count">
                  {{ selectedGroup.components?.length || 0 }} components in this group
                </span>
                <el-button 
                  v-if="selectedGroup.components?.length > 0"
                  type="danger" 
                  size="small" 
                  @click="removeAllComponents"
                  :loading="removing">
                  Remove All
                </el-button>
              </div>
              
              <div v-if="selectedGroup.components?.length > 0" class="components-list">
                <el-card
                  v-for="component in selectedGroup.components"
                  :key="component.id"
                  class="component-item"
                  :body-style="{ padding: '12px' }">
                  
                  <div class="component-header">
                    <div class="component-info">
                      <div class="component-title">
                        <span class="component-name">{{ component.name }}</span>
                        <el-tag :type="getComponentTypeColor(component.type)" size="small">
                          {{ component.type }}
                        </el-tag>
                      </div>
                      <div class="component-details">
                        <div class="component-tags">
                          <el-tag 
                            v-for="tag in (Array.isArray(component.tag) ? component.tag : [component.tag])" 
                            :key="tag"
                            :type="getTagType(tag)"
                            size="mini"
                            class="multi-tag">
                            {{ tag }}
                          </el-tag>
                        </div>
                        <span v-if="component.domain" class="component-domain">{{ component.domain }}</span>
                      </div>
                    </div>
                    <div class="component-actions">
                      <el-tag 
                        v-if="component.membership?.role" 
                        :type="getRoleColor(component.membership.role)" 
                        size="small">
                        {{ component.membership.role }}
                      </el-tag>
                      <el-button
                        type="danger"
                        size="small"
                        @click="removeComponent(component.id)"
                        :loading="removing"
                        text>
                        Remove
                      </el-button>
                    </div>
                  </div>
                  
                  <p v-if="component.description" class="component-description">
                    {{ component.description }}
                  </p>
                </el-card>
              </div>
              
              <el-empty v-else description="No components in this group" />
            </div>
          </el-tab-pane>

          <!-- Add Components Tab -->
          <el-tab-pane label="Add Components" name="add">
            <div class="add-components">
              <div class="search-section">
                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-input
                      v-model="componentSearch"
                      placeholder="Search components..."
                      @input="filterComponents"
                      clearable>
                      <template #prefix>
                        <el-icon><Search /></el-icon>
                      </template>
                    </el-input>
                  </el-col>
                  <el-col :span="6">
                    <el-select 
                      v-model="componentTypeFilter" 
                      placeholder="Filter by Type" 
                      clearable
                      @change="filterComponents">
                      <el-option label="All Types" value="" />
                      <el-option label="DB" value="DB" />
                      <el-option label="API" value="API" />
                      <el-option label="APP" value="APP" />
                      <el-option label="STORAGE" value="STORAGE" />
                      <el-option label="PIPES" value="PIPES" />
                    </el-select>
                  </el-col>
                  <el-col :span="6">
                    <el-select 
                      v-model="componentDomainFilter" 
                      placeholder="Filter by Domain" 
                      clearable
                      @change="filterComponents">
                      <el-option label="All Domains" value="" />
                      <el-option 
                        v-for="domain in uniqueDomains" 
                        :key="domain" 
                        :label="domain" 
                        :value="domain" />
                    </el-select>
                  </el-col>
                </el-row>
              </div>

              <div class="available-components">
                <div v-if="filteredComponents.length > 0" class="components-grid">
                  <el-card
                    v-for="component in filteredComponents"
                    :key="component.id"
                    class="available-component-item"
                    :body-style="{ padding: '12px' }"
                    :class="{ 'component-selected': selectedComponents.includes(component.id) }">
                    
                    <div class="component-header">
                      <el-checkbox
                        v-model="selectedComponents"
                        :value="component.id"
                        class="component-checkbox">
                        <div class="component-info">
                          <div class="component-title">
                            <span class="component-name">{{ component.name }}</span>
                            <el-tag :type="getComponentTypeColor(component.type)" size="small">
                              {{ component.type }}
                            </el-tag>
                          </div>
                          <div class="component-details">
                            <div class="component-tags">
                              <el-tag 
                                v-for="tag in (Array.isArray(component.tag) ? component.tag : [component.tag])" 
                                :key="tag"
                                :type="getTagType(tag)"
                                size="mini"
                                class="multi-tag">
                                {{ tag }}
                              </el-tag>
                            </div>
                            <span v-if="component.domain" class="component-domain">{{ component.domain }}</span>
                          </div>
                        </div>
                      </el-checkbox>
                    </div>
                    
                    <p v-if="component.description" class="component-description">
                      {{ component.description }}
                    </p>
                  </el-card>
                </div>
                
                <el-empty v-else-if="!loadingComponents" description="No available components found" />
                <el-loading v-else />
              </div>

              <div v-if="selectedComponents.length > 0" class="bulk-actions">
                <el-divider />
                <div class="selected-info">
                  <span>{{ selectedComponents.length }} components selected</span>
                  <div class="role-selection">
                    <span>Role:</span>
                    <el-select v-model="defaultRole" size="small">
                      <el-option label="Member" value="MEMBER" />
                      <el-option label="Leader" value="LEADER" />
                      <el-option label="Backup" value="BACKUP" />
                      <el-option label="Dependency" value="DEPENDENCY" />
                    </el-select>
                  </div>
                  <el-button 
                    type="primary" 
                    @click="addSelectedComponents"
                    :loading="adding">
                    Add Selected Components
                  </el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showManageDialog = false">Close</el-button>
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, MoreFilled, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { submitFormWithDuplicateHandling, sanitizeFormData } from '../utils/validationUtils'

const router = useRouter()

const groups = ref([])
const loading = ref(false)
const saving = ref(false)
const selectedGroupType = ref('')
const showCreateDialog = ref(false)
const editingGroup = ref(null)
const groupFormRef = ref(null)

// Component management variables
const showManageDialog = ref(false)
const selectedGroup = ref(null)
const activeTab = ref('current')
const availableComponents = ref([])
const filteredComponents = ref([])
const loadingComponents = ref(false)
const adding = ref(false)
const removing = ref(false)
const selectedComponents = ref([])
const componentSearch = ref('')
const componentTypeFilter = ref('')
const componentDomainFilter = ref('')
const defaultRole = ref('MEMBER')

const groupForm = ref({
  name: '',
  description: '',
  groupType: 'LOGICAL',
  domain: '',
  color: '#ff8c00'
})

const groupRules = {
  name: [
    { required: true, message: 'Please enter group name', trigger: 'blur' },
    { min: 1, max: 255, message: 'Name length should be 1 to 255 characters', trigger: 'blur' }
  ],
  groupType: [
    { required: true, message: 'Please select group type', trigger: 'change' }
  ]
}

const totalComponents = computed(() => {
  return groups.value.reduce((total, group) => {
    return total + (group.components?.length || 0)
  }, 0)
})

const uniqueDomains = computed(() => {
  const domains = new Set()
  availableComponents.value.forEach(component => {
    if (component.domain) {
      domains.add(component.domain)
    }
  })
  return Array.from(domains).sort()
})

const availableComponentsNotInGroup = computed(() => {
  if (!selectedGroup.value || !availableComponents.value) return []
  
  const groupComponentIds = new Set(
    selectedGroup.value.components?.map(c => c.id) || []
  )
  
  return availableComponents.value.filter(component => 
    !groupComponentIds.has(component.id)
  )
})

const getGroupTypeColor = (type) => {
  const colors = {
    'LOGICAL': 'primary',
    'PHYSICAL': 'success',
    'FUNCTIONAL': 'warning',
    'SERVICE': 'info'
  }
  return colors[type] || 'primary'
}

const getComponentTypeColor = (type) => {
  const colors = {
    'DB': 'primary',
    'APP': 'warning',
    'API': 'success',
    'STORAGE': '',
    'PIPES': ''
  }
  return colors[type] || 'info'
}

const getRoleColor = (role) => {
  const colors = {
    'LEADER': 'danger',
    'MEMBER': 'primary',
    'BACKUP': 'warning',
    'DEPENDENCY': 'info'
  }
  return colors[role] || 'primary'
}

const getTagType = (tag) => {
  const tagTypeMap = {
    'PIPS': 'danger',
    'SOX': 'warning', 
    'HR': 'success',
    'Proj': 'primary',
    'Infra': 'info',
    'Other': ''
  }
  return tagTypeMap[tag] || ''
}

// Navigation function
const navigateToDashboard = async ({ domainId, domainName, groupId, groupName }) => {
  try {
    // Store the filtering parameters in sessionStorage so Dashboard can pick them up
    const dashboardState = {
      selectedDomainId: domainId || null,
      selectedGroupId: groupId || null,
      viewMode: domainId ? (groupId ? 'components' : 'grouped') : 'domains',
      filterContext: {
        domainName: domainName || null,
        groupName: groupName || null
      }
    }
    
    sessionStorage.setItem('dashboardState', JSON.stringify(dashboardState))
    
    // Navigate to dashboard
    await router.push('/')
    
    // Show success message with context
    const context = groupName ? `group "${groupName}"` : `domain "${domainName}"`
    ElMessage.success(`Switched to Board view for ${context}`)
    
  } catch (error) {
    console.error('Error navigating to dashboard:', error)
    ElMessage.error('Failed to navigate to dashboard')
  }
}

const loadGroups = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.append('includeComponents', 'true')
    if (selectedGroupType.value) {
      params.append('groupType', selectedGroupType.value)
    }

    const response = await fetch(`http://localhost:3001/api/groups?${params}`)
    const data = await response.json()
    
    if (response.ok) {
      groups.value = data.groups || []
    } else {
      throw new Error(data.error || 'Failed to load groups')
    }
  } catch (error) {
    console.error('Error loading groups:', error)
    ElMessage.error('Failed to load groups')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  groupForm.value = {
    name: '',
    description: '',
    groupType: 'LOGICAL',
    domain: '',
    color: '#ff8c00'
  }
  editingGroup.value = null
}

const saveGroup = async () => {
  if (!groupFormRef.value) return
  
  const valid = await groupFormRef.value.validate()
  if (!valid) return

  saving.value = true
  
  const url = editingGroup.value 
    ? `http://localhost:3001/api/groups/${editingGroup.value.id}`
    : 'http://localhost:3001/api/groups'
  
  const method = editingGroup.value ? 'PUT' : 'POST'
  const sanitizedData = sanitizeFormData(groupForm.value)
  
  const success = await submitFormWithDuplicateHandling({
    url,
    method,
    data: sanitizedData,
    entityType: 'group',
    onSuccess: async () => {
      ElMessage.success(editingGroup.value ? 'Group updated successfully' : 'Group created successfully')
      showCreateDialog.value = false
      resetForm()
      await loadGroups()
    }
  })
  
  saving.value = false
}

const handleGroupAction = async ({ action, group }) => {
  switch (action) {
    case 'view-board':
      // Navigate to Board with group filtering
      await navigateToDashboard({ 
        groupId: group.id, 
        groupName: group.name,
        domainId: group.domainId,
        domainName: group.domain
      })
      break
      
    case 'edit':
      editingGroup.value = group
      groupForm.value = {
        name: group.name,
        description: group.description || '',
        groupType: group.groupType,
        domain: group.domain || '',
        color: group.color || '#ff8c00'
      }
      showCreateDialog.value = true
      break
      
    case 'manage':
      selectedGroup.value = group
      await loadAvailableComponents()
      showManageDialog.value = true
      break
      
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `This will permanently delete the group "${group.name}". Continue?`,
          'Warning',
          {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            type: 'warning',
          }
        )
        
        const response = await fetch(`http://localhost:3001/api/groups/${group.id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          ElMessage.success('Group deleted successfully')
          await loadGroups()
        } else {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete group')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error deleting group:', error)
          ElMessage.error('Failed to delete group')
        }
      }
      break
  }
}

// Component management functions
const loadAvailableComponents = async () => {
  loadingComponents.value = true
  try {
    const response = await fetch('http://localhost:3001/api/components?limit=1000')
    const data = await response.json()
    
    if (response.ok) {
      availableComponents.value = data.components || []
      filterComponents()
    } else {
      throw new Error(data.error || 'Failed to load components')
    }
  } catch (error) {
    console.error('Error loading components:', error)
    ElMessage.error('Failed to load components')
  } finally {
    loadingComponents.value = false
  }
}

const filterComponents = () => {
  let filtered = availableComponentsNotInGroup.value
  
  // Apply search filter
  if (componentSearch.value) {
    const searchTerm = componentSearch.value.toLowerCase()
    filtered = filtered.filter(component => {
      const tags = Array.isArray(component.tag) ? component.tag : [component.tag];
      return component.name.toLowerCase().includes(searchTerm) ||
        tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        component.description?.toLowerCase().includes(searchTerm);
    })
  }
  
  // Apply type filter
  if (componentTypeFilter.value) {
    filtered = filtered.filter(component => component.type === componentTypeFilter.value)
  }
  
  // Apply domain filter  
  if (componentDomainFilter.value) {
    filtered = filtered.filter(component => component.domain === componentDomainFilter.value)
  }
  
  filteredComponents.value = filtered
}

const addSelectedComponents = async () => {
  if (selectedComponents.value.length === 0) return
  
  adding.value = true
  try {
    const promises = selectedComponents.value.map(async (componentId) => {
      const response = await fetch(`http://localhost:3001/api/groups/${selectedGroup.value.id}/memberships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          componentId,
          role: defaultRole.value
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add component')
      }
      
      return response.json()
    })
    
    await Promise.all(promises)
    
    ElMessage.success(`Successfully added ${selectedComponents.value.length} components to the group`)
    selectedComponents.value = []
    
    // Refresh the selected group data
    await refreshSelectedGroup()
    await loadGroups()
    filterComponents()
    
  } catch (error) {
    console.error('Error adding components:', error)
    ElMessage.error('Failed to add some components to the group')
  } finally {
    adding.value = false
  }
}

const removeComponent = async (componentId) => {
  removing.value = true
  try {
    const response = await fetch(`http://localhost:3001/api/groups/${selectedGroup.value.id}/memberships/${componentId}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      ElMessage.success('Component removed from group')
      await refreshSelectedGroup()
      await loadGroups()
      filterComponents()
    } else {
      const data = await response.json()
      throw new Error(data.error || 'Failed to remove component')
    }
  } catch (error) {
    console.error('Error removing component:', error)
    ElMessage.error('Failed to remove component from group')
  } finally {
    removing.value = false
  }
}

const removeAllComponents = async () => {
  try {
    await ElMessageBox.confirm(
      `This will remove all ${selectedGroup.value.components?.length || 0} components from the group "${selectedGroup.value.name}". Continue?`,
      'Warning',
      {
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )
    
    removing.value = true
    
    const response = await fetch(`http://localhost:3001/api/groups/${selectedGroup.value.id}/memberships`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      ElMessage.success('All components removed from group')
      await refreshSelectedGroup()
      await loadGroups()
      filterComponents()
    } else {
      const data = await response.json()
      throw new Error(data.error || 'Failed to remove all components')
    }
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error removing all components:', error)
      ElMessage.error('Failed to remove all components from group')
    }
  } finally {
    removing.value = false
  }
}

const refreshSelectedGroup = async () => {
  if (!selectedGroup.value) return
  
  try {
    const response = await fetch(`http://localhost:3001/api/groups/${selectedGroup.value.id}?includeComponents=true`)
    const data = await response.json()
    
    if (response.ok) {
      selectedGroup.value = data
    }
  } catch (error) {
    console.error('Error refreshing selected group:', error)
  }
}

onMounted(() => {
  loadGroups()
})
</script>

<style scoped>
.groups-view {
  padding: 24px;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.groups-header {
  margin-bottom: 24px;
  flex-shrink: 0;
}

.groups-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.groups-header p {
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

.groups-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
  grid-auto-rows: max-content;
}

/* Responsive grid columns */
@media (min-width: 992px) {
  .groups-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

@media (min-width: 1400px) {
  .groups-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
}

@media (max-width: 767px) {
  .groups-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.group-card {
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  height: fit-content;
  max-width: 100%;
  width: 100%;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.group-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.group-name {
  font-weight: 600;
  color: #303133;
}

.group-content {
  margin-top: 12px;
}

.group-description {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.4;
}

.no-description {
  margin: 0 0 12px 0;
  color: #c0c4cc;
  font-size: 14px;
  font-style: italic;
}

.group-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: #909399;
  font-size: 13px;
}

.stat-value {
  color: #303133;
  font-weight: 500;
  font-size: 13px;
}

.component-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.component-tag {
  font-size: 12px;
}

.component-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.multi-tag {
  margin: 0;
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
.groups-view::-webkit-scrollbar,
.groups-grid::-webkit-scrollbar {
  width: 8px;
}

.groups-view::-webkit-scrollbar-track,
.groups-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.groups-view::-webkit-scrollbar-thumb,
.groups-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.groups-view::-webkit-scrollbar-thumb:hover,
.groups-grid::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Responsive actions row */
@media (max-width: 768px) {
  .actions-row .el-col {
    margin-bottom: 12px;
  }
  
  .stats-info {
    justify-content: flex-start;
  }
}

/* Component Management Dialog Styles */
.manage-components-container {
  max-height: 600px;
  overflow-y: auto;
}

.group-info {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.group-info h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.group-info p {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
}

.manage-tabs {
  margin-top: 16px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.component-count {
  font-weight: 500;
  color: #606266;
}

.current-components,
.add-components {
  padding: 16px 0;
}

.components-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.component-item {
  transition: all 0.3s ease;
  border: 1px solid #ebeef5;
}

.component-item:hover {
  border-color: #ff8c00;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.component-info {
  flex: 1;
}

.component-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.component-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.component-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.component-tag {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}

.component-domain {
  font-size: 12px;
  color: #67c23a;
  font-weight: 500;
}

.component-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.component-description {
  margin: 8px 0 0 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.4;
}

.search-section {
  margin-bottom: 20px;
}

.available-components {
  min-height: 200px;
}

.components-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 768px) {
  .components-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.available-component-item {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #ebeef5;
}

.available-component-item:hover {
  border-color: #ff8c00;
}

.available-component-item.component-selected {
  border-color: #ff8c00;
  background-color: #f0f9ff;
}

.component-checkbox {
  width: 100%;
}

.component-checkbox .el-checkbox__label {
  width: 100%;
  padding-left: 8px;
}

.bulk-actions {
  margin-top: 16px;
}

.selected-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #ff8c00;
}

.role-selection {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.role-selection span {
  color: #606266;
  font-weight: 500;
}

@media (max-width: 768px) {
  .selected-info {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  
  .role-selection {
    justify-content: center;
  }
}
</style>