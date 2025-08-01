<template>
  <div class="group-manager">
    <div class="manager-header">
      <h3>Component Groups</h3>
      <el-button 
        type="primary" 
        :icon="Plus" 
        size="small"
        @click="showCreateDialog = true">
        Create Group
      </el-button>
    </div>

    <div class="groups-list">
      <div 
        v-for="group in groups" 
        :key="group.id"
        class="group-item"
        :style="{ borderLeftColor: group.color }">
        
        <div class="group-header">
          <div class="group-info">
            <div class="group-name">{{ group.name }}</div>
            <div class="group-stats">
              {{ getGroupMemberCount(group.id) }} components
            </div>
          </div>
          <div class="group-actions">
            <el-button 
              :icon="Edit" 
              size="small" 
              text
              @click="editGroup(group)">
            </el-button>
            <el-button 
              :icon="Delete" 
              size="small" 
              text
              type="danger"
              @click="deleteGroup(group)">
            </el-button>
          </div>
        </div>

        <div class="group-components">
          <el-tag
            v-for="component in getGroupComponents(group.id)"
            :key="component.id"
            :type="getComponentTypeColor(component.type)"
            size="small"
            class="component-tag">
            {{ component.name }}
          </el-tag>
          <el-button
            v-if="getGroupMemberCount(group.id) === 0"
            size="small"
            text
            @click="editGroup(group)">
            Add Components
          </el-button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Group Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingGroup ? 'Edit Group' : 'Create New Group'"
      width="600px"
      @closed="resetDialog">
      
      <el-form
        ref="groupFormRef"
        :model="groupForm"
        :rules="groupFormRules"
        label-width="120px">
        
        <el-form-item label="Group Name" prop="name">
          <el-input 
            v-model="groupForm.name"
            placeholder="Enter group name (e.g., Frontend Services)">
          </el-input>
        </el-form-item>

        <el-form-item label="Description" prop="description">
          <el-input
            v-model="groupForm.description"
            type="textarea"
            :rows="2"
            placeholder="Describe the purpose of this group">
          </el-input>
        </el-form-item>

        <el-form-item label="Group Type" prop="groupType">
          <el-select v-model="groupForm.groupType" placeholder="Select group type">
            <el-option label="Functional" value="FUNCTIONAL" />
            <el-option label="Logical" value="LOGICAL" />
            <el-option label="Physical" value="PHYSICAL" />
            <el-option label="Service" value="SERVICE" />
          </el-select>
        </el-form-item>

        <el-form-item label="Color" prop="color">
          <el-color-picker 
            v-model="groupForm.color"
            :predefine="predefineColors">
          </el-color-picker>
        </el-form-item>

        <el-form-item label="Components">
          <div class="component-selector">
            <div class="available-components">
              <div class="selector-header">Available Components</div>
              <div class="components-grid">
                <div
                  v-for="component in availableComponents"
                  :key="component.id"
                  class="component-item"
                  :class="{ selected: isComponentSelected(component.id) }"
                  @click="toggleComponent(component.id)">
                  
                  <el-tag
                    :type="getComponentTypeColor(component.type)"
                    size="small">
                    {{ component.type }}
                  </el-tag>
                  <div class="component-name">{{ component.name }}</div>
                  <div class="component-domain">{{ component.domain || 'No domain' }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">Cancel</el-button>
          <el-button 
            type="primary" 
            @click="saveGroup"
            :loading="saving">
            {{ editingGroup ? 'Update' : 'Create' }} Group
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const emit = defineEmits(['groups-updated'])

// State
const groups = ref([])
const components = ref([])
const groupMemberships = ref({}) // groupId -> [componentIds]
const showCreateDialog = ref(false)
const editingGroup = ref(null)
const saving = ref(false)
const groupFormRef = ref(null)

// Form data
const groupForm = reactive({
  name: '',
  description: '',
  groupType: 'FUNCTIONAL',
  color: '#3498db',
  selectedComponents: []
})

// Form validation rules
const groupFormRules = {
  name: [
    { required: true, message: 'Please enter group name', trigger: 'blur' },
    { min: 2, max: 50, message: 'Length should be 2 to 50 characters', trigger: 'blur' }
  ],
  groupType: [
    { required: true, message: 'Please select group type', trigger: 'change' }
  ],
  color: [
    { required: true, message: 'Please select a color', trigger: 'change' }
  ]
}

// Predefined colors
const predefineColors = [
  '#ff4500', '#ff8c00', '#ffd700', '#90ee90', '#00ced1', '#1e90ff', '#c71585',
  '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'
]

// Computed
const availableComponents = computed(() => {
  return components.value.filter(comp => comp.isActive)
})

// Methods
const loadGroups = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/groups?includeComponents=true`)
    const data = await response.json()
    
    groups.value = data.groups || []
    
    // Build membership lookup
    groupMemberships.value = {}
    groups.value.forEach(group => {
      groupMemberships.value[group.id] = (group.components || []).map(c => c.id)
    })
    
  } catch (error) {
    console.error('Error loading groups:', error)
    ElMessage.error('Failed to load groups')
  }
}

const loadComponents = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/components?limit=1000`)
    const data = await response.json()
    components.value = data.components || []
  } catch (error) {
    console.error('Error loading components:', error)
    ElMessage.error('Failed to load components')
  }
}

const getGroupMemberCount = (groupId) => {
  return groupMemberships.value[groupId]?.length || 0
}

const getGroupComponents = (groupId) => {
  const memberIds = groupMemberships.value[groupId] || []
  return components.value.filter(comp => memberIds.includes(comp.id))
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

const isComponentSelected = (componentId) => {
  return groupForm.selectedComponents.includes(componentId)
}

const toggleComponent = (componentId) => {
  const index = groupForm.selectedComponents.indexOf(componentId)
  if (index > -1) {
    groupForm.selectedComponents.splice(index, 1)
  } else {
    groupForm.selectedComponents.push(componentId)
  }
}

const editGroup = (group) => {
  editingGroup.value = group
  groupForm.name = group.name
  groupForm.description = group.description || ''
  groupForm.groupType = group.groupType
  groupForm.color = group.color || '#3498db'
  groupForm.selectedComponents = [...(groupMemberships.value[group.id] || [])]
  showCreateDialog.value = true
}

const resetDialog = () => {
  editingGroup.value = null
  groupForm.name = ''
  groupForm.description = ''
  groupForm.groupType = 'FUNCTIONAL'
  groupForm.color = '#3498db'
  groupForm.selectedComponents = []
  if (groupFormRef.value) {
    groupFormRef.value.clearValidate()
  }
}

const saveGroup = async () => {
  if (!groupFormRef.value) return
  
  try {
    const valid = await groupFormRef.value.validate()
    if (!valid) return
    
    saving.value = true
    
    const groupData = {
      name: groupForm.name,
      description: groupForm.description,
      groupType: groupForm.groupType,
      color: groupForm.color,
      metadata: {
        createdBy: 'user',
        componentCount: groupForm.selectedComponents.length
      }
    }
    
    let groupId
    if (editingGroup.value) {
      // Update existing group
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/groups/${editingGroup.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      })
      const result = await response.json()
      groupId = result.id
    } else {
      // Create new group
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      })
      const result = await response.json()
      groupId = result.id
    }
    
    // Update group memberships
    await updateGroupMemberships(groupId, groupForm.selectedComponents)
    
    ElMessage.success(editingGroup.value ? 'Group updated successfully' : 'Group created successfully')
    showCreateDialog.value = false
    await loadGroups()
    emit('groups-updated')
    
  } catch (error) {
    console.error('Error saving group:', error)
    ElMessage.error('Failed to save group')
  } finally {
    saving.value = false
  }
}

const updateGroupMemberships = async (groupId, componentIds) => {
  try {
    // Clear existing memberships
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/groups/${groupId}/memberships`, {
      method: 'DELETE'
    })
    
    // Add new memberships
    for (const componentId of componentIds) {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/groups/${groupId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentId,
          role: 'MEMBER'
        })
      })
    }
  } catch (error) {
    console.error('Error updating group memberships:', error)
    throw error
  }
}

const deleteGroup = async (group) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      'Confirm Delete',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/groups/${group.id}`, {
      method: 'DELETE'
    })
    
    ElMessage.success('Group deleted successfully')
    await loadGroups()
    emit('groups-updated')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error deleting group:', error)
      ElMessage.error('Failed to delete group')
    }
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([loadGroups(), loadComponents()])
})

// Expose methods
defineExpose({
  refreshGroups: loadGroups
})
</script>

<style scoped>
.group-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.manager-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.groups-list {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.group-item {
  border: 1px solid #e0e0e0;
  border-left: 4px solid;
  border-radius: 6px;
  margin-bottom: 12px;
  padding: 12px;
  background: white;
  transition: all 0.2s ease;
}

.group-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.group-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.group-stats {
  font-size: 12px;
  color: #6c757d;
  margin-top: 2px;
}

.group-actions {
  display: flex;
  gap: 4px;
}

.group-components {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.component-tag {
  font-size: 11px;
}

.component-selector {
  width: 100%;
}

.selector-header {
  font-weight: 600;
  margin-bottom: 12px;
  color: #2c3e50;
}

.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
}

.component-item {
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.component-item:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.component-item.selected {
  border-color: #3498db;
  background: #e3f2fd;
}

.component-name {
  font-weight: 500;
  font-size: 12px;
  margin: 4px 0 2px 0;
  color: #2c3e50;
}

.component-domain {
  font-size: 11px;
  color: #6c757d;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>