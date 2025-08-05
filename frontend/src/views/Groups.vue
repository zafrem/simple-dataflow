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
                :style="{ backgroundColor: group.color || '#409eff' }">
              </div>
              <span class="group-name">{{ group.name }}</span>
              <el-tag :type="getGroupTypeColor(group.groupType)" size="small">
                {{ group.groupType }}
              </el-tag>
            </div>
            <el-dropdown @command="handleGroupAction">
              <el-button type="text" :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', group }">Edit</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'manage', group }">Manage Components</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'delete', group }" divided>Delete</el-dropdown-item>
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

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <el-loading />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Plus, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { submitFormWithDuplicateHandling, sanitizeFormData } from '../utils/validationUtils'

const groups = ref([])
const loading = ref(false)
const saving = ref(false)
const selectedGroupType = ref('')
const showCreateDialog = ref(false)
const editingGroup = ref(null)
const groupFormRef = ref(null)

const groupForm = ref({
  name: '',
  description: '',
  groupType: 'LOGICAL',
  domain: '',
  color: '#409eff'
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
    color: '#409eff'
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
    case 'edit':
      editingGroup.value = group
      groupForm.value = {
        name: group.name,
        description: group.description || '',
        groupType: group.groupType,
        domain: group.domain || '',
        color: group.color || '#409eff'
      }
      showCreateDialog.value = true
      break
      
    case 'manage':
      ElMessage.info('Component management coming soon')
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
</style>