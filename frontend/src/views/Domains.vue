<template>
  <div class="domains-view">
    <!-- Breadcrumb Navigation -->
    <el-breadcrumb separator=">" class="breadcrumb">
      <el-breadcrumb-item v-if="currentView === 'domains'">Domains</el-breadcrumb-item>
      <el-breadcrumb-item v-if="currentView === 'groups' && selectedDomain">
        <el-button link @click="showDomains">{{ selectedDomain.name }}</el-button>
      </el-breadcrumb-item>
      <el-breadcrumb-item v-if="currentView === 'groups'">Groups</el-breadcrumb-item>
      <el-breadcrumb-item v-if="currentView === 'components' && selectedGroup">
        <el-button link @click="showDomains">{{ selectedDomain.name }}</el-button>
      </el-breadcrumb-item>
      <el-breadcrumb-item v-if="currentView === 'components' && selectedGroup">
        <el-button link @click="showGroups">{{ selectedGroup.name }}</el-button>
      </el-breadcrumb-item>
      <el-breadcrumb-item v-if="currentView === 'components'">Components</el-breadcrumb-item>
    </el-breadcrumb>

    <!-- Domain View -->
    <div v-if="currentView === 'domains'" class="view-container">
      <div class="view-header">
        <h2>Domains</h2>
        <p>Organize system components into logical domains</p>
        
        <el-row :gutter="16" align="middle" justify="space-between" class="actions-row">
          <el-col :span="8">
            <el-button type="primary" @click="showCreateDomainDialog = true" :icon="Plus">
              Create Domain
            </el-button>
          </el-col>
          <el-col :span="8">
            <div class="stats-info">
              <el-tag type="info" size="small">{{ domains.length }} Domains</el-tag>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="domains-grid">
        <el-card
          v-for="domain in domains"
          :key="domain.id"
          class="domain-card"
          :body-style="{ padding: '16px' }"
          @click="selectDomain(domain)">
          
          <template #header>
            <div class="domain-header">
              <div class="domain-title">
                <div 
                  class="domain-color-indicator" 
                  :style="{ backgroundColor: domain.color || '#ff8c00' }">
                </div>
                <span class="domain-name">{{ domain.name }}</span>
              </div>
              <el-dropdown @command="handleDomainAction" @click.stop>
                <el-button link :icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'view-board', domain }">View Board</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'edit', domain }" divided>Edit</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'delete', domain }">Delete</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>

          <div class="domain-content">
            <p v-if="domain.description" class="domain-description">{{ domain.description }}</p>
            <p v-else class="no-description">No description</p>
            
            <div class="domain-stats">
              <div class="stat-item">
                <span class="stat-label">Groups:</span>
                <span class="stat-value">{{ domain.groupCount || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Components:</span>
                <span class="stat-value">{{ domain.componentCount || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Pipelines:</span>
                <span class="stat-value">{{ domain.pipelineCount || 0 }}</span>
              </div>
            </div>

            <div v-if="domain.pipelines && domain.pipelines.length > 0" class="pipelines-preview">
              <el-tag
                v-for="pipeline in domain.pipelines.slice(0, 2)"
                :key="pipeline.id"
                type="warning"
                size="small"
                class="pipeline-tag"
                @click.stop="viewPipeline(domain, pipeline)">
                {{ pipeline.name }}
              </el-tag>
              <el-tag v-if="domain.pipelines.length > 2" size="small" type="info">
                +{{ domain.pipelines.length - 2 }} more
              </el-tag>
            </div>

            <div class="domain-actions">
              <el-button 
                link 
                size="small" 
                @click.stop="managePipelines(domain)">
                Manage Pipelines
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Groups View -->
    <div v-if="currentView === 'groups'" class="view-container">
      <div class="view-header">
        <h2>Groups in {{ selectedDomain?.name }}</h2>
        <p>Component groups within this domain</p>
        
        <el-row :gutter="16" align="middle" justify="space-between" class="actions-row">
          <el-col :span="8">
            <el-button type="primary" @click="showCreateGroupDialog = true" :icon="Plus">
              Create Group
            </el-button>
          </el-col>
          <el-col :span="8">
            <div class="stats-info">
              <el-tag type="info" size="small">{{ groups.length }} Groups</el-tag>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="groups-grid">
        <el-card
          v-for="group in groups"
          :key="group.id"
          class="group-card"
          :body-style="{ padding: '16px' }"
          @click="selectGroup(group)">
          
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
              <el-dropdown @command="handleGroupActionInDomain" @click.stop>
                <el-button link :icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'view-board', group }">View Board</el-dropdown-item>
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
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Components View -->
    <div v-if="currentView === 'components'" class="view-container">
      <div class="view-header">
        <h2>Components in {{ selectedGroup?.name }}</h2>
        <p>Individual components within this group</p>
      </div>

      <div class="components-grid">
        <el-card
          v-for="component in components"
          :key="component.id"
          class="component-card"
          :body-style="{ padding: '16px' }">
          
          <template #header>
            <div class="component-header">
              <div class="component-title">
                <span class="component-name">{{ component.name }}</span>
                <el-tag :type="getComponentTypeColor(component.type)" size="small">
                  {{ component.type }}
                </el-tag>
              </div>
            </div>
          </template>

          <div class="component-content">
            <p v-if="component.description" class="component-description">{{ component.description }}</p>
            <div class="component-info">
              <div class="info-item">
                <span class="info-label">Tag:</span>
                <span class="info-value">{{ component.tag }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Source:</span>
                <span class="info-value">{{ component.source }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Create Domain Dialog -->
    <el-dialog
      v-model="showCreateDomainDialog"
      :title="editingDomain ? 'Edit Domain' : 'Create Domain'"
      width="600px">
      
      <el-form :model="domainForm" :rules="domainRules" ref="domainFormRef" label-width="120px">
        <el-form-item label="Name" prop="name">
          <el-input v-model="domainForm.name" placeholder="Enter domain name" />
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input
            v-model="domainForm.description"
            type="textarea"
            :rows="3"
            placeholder="Optional description" />
        </el-form-item>
        
        <el-form-item label="Color">
          <el-color-picker v-model="domainForm.color" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateDomainDialog = false">Cancel</el-button>
          <el-button type="primary" @click="saveDomain" :loading="saving">
            {{ editingDomain ? 'Update' : 'Create' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Create Group Dialog -->
    <el-dialog
      v-model="showCreateGroupDialog"
      title="Create Group"
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
        
        <el-form-item label="Color">
          <el-color-picker v-model="groupForm.color" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateGroupDialog = false">Cancel</el-button>
          <el-button type="primary" @click="saveGroup" :loading="saving">
            Create
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Pipeline Management Dialog -->
    <el-dialog
      v-model="showPipelineDialog"
      :title="`Pipelines - ${selectedDomainForPipeline?.name}`"
      width="800px"
      class="pipeline-dialog">
      
      <div class="pipeline-header">
        <el-button type="primary" @click="showCreatePipelineDialog = true" :icon="Plus" size="small">
          Add Pipeline
        </el-button>
      </div>

      <div v-if="pipelines.length === 0" class="empty-pipelines">
        <p>No pipelines defined for this domain</p>
      </div>

      <div v-else class="pipelines-list">
        <el-card
          v-for="pipeline in pipelines"
          :key="pipeline.id"
          class="pipeline-card"
          :body-style="{ padding: '12px' }">
          
          <template #header>
            <div class="pipeline-header-card">
              <span class="pipeline-name">{{ pipeline.name }}</span>
              <el-dropdown @command="handlePipelineAction">
                <el-button link :icon="MoreFilled" size="small" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'edit', pipeline }">Edit</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'delete', pipeline }" divided>Delete</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>

          <div class="pipeline-content">
            <p v-if="pipeline.description" class="pipeline-description">{{ pipeline.description }}</p>
            <div class="pipeline-steps">
              <div class="steps-header">
                <strong>Steps:</strong>
              </div>
              <div v-if="pipeline.steps && pipeline.steps.length > 0" class="steps-list">
                <el-tag
                  v-for="(step, index) in pipeline.steps"
                  :key="index"
                  size="small"
                  class="step-tag">
                  {{ index + 1 }}. {{ step.name || step }}
                </el-tag>
              </div>
              <div v-else class="no-steps">
                <em>No steps defined</em>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </el-dialog>

    <!-- Create/Edit Pipeline Dialog -->
    <el-dialog
      v-model="showCreatePipelineDialog"
      :title="editingPipeline ? 'Edit Pipeline' : 'Create Pipeline'"
      width="600px">
      
      <el-form :model="pipelineForm" :rules="pipelineRules" ref="pipelineFormRef" label-width="120px">
        <el-form-item label="Name" prop="name">
          <el-input v-model="pipelineForm.name" placeholder="Enter pipeline name" />
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input
            v-model="pipelineForm.description"
            type="textarea"
            :rows="3"
            placeholder="Optional description" />
        </el-form-item>
        
        <el-form-item label="Steps">
          <div class="steps-editor">
            <div 
              v-for="(step, index) in pipelineForm.steps" 
              :key="index" 
              class="step-input">
              <el-input 
                v-model="pipelineForm.steps[index]" 
                :placeholder="`Step ${index + 1}`"
                class="step-field">
                <template #append>
                  <el-button @click="removeStep(index)" :icon="Delete" />
                </template>
              </el-input>
            </div>
            <el-button @click="addStep" type="dashed" :icon="Plus" class="add-step-btn">
              Add Step
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreatePipelineDialog = false">Cancel</el-button>
          <el-button type="primary" @click="savePipeline" :loading="saving">
            {{ editingPipeline ? 'Update' : 'Create' }}
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
import { useRouter } from 'vue-router'
import { Plus, MoreFilled, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

const currentView = ref('domains') // 'domains', 'groups', 'components'
const selectedDomain = ref(null)
const selectedGroup = ref(null)

const domains = ref([])
const groups = ref([])
const components = ref([])
const pipelines = ref([])

const loading = ref(false)
const saving = ref(false)

const showCreateDomainDialog = ref(false)
const showCreateGroupDialog = ref(false)
const showPipelineDialog = ref(false)
const showCreatePipelineDialog = ref(false)

const editingDomain = ref(null)
const editingPipeline = ref(null)
const selectedDomainForPipeline = ref(null)

const domainFormRef = ref(null)
const groupFormRef = ref(null)
const pipelineFormRef = ref(null)

const domainForm = ref({
  name: '',
  description: '',
  color: '#ff8c00'
})

const groupForm = ref({
  name: '',
  description: '',
  groupType: 'LOGICAL',
  color: '#ff8c00'
})

const pipelineForm = ref({
  name: '',
  description: '',
  steps: ['']
})

const domainRules = {
  name: [
    { required: true, message: 'Please enter domain name', trigger: 'blur' },
    { min: 1, max: 100, message: 'Name length should be 1 to 100 characters', trigger: 'blur' }
  ]
}

const groupRules = {
  name: [
    { required: true, message: 'Please enter group name', trigger: 'blur' },
    { min: 1, max: 255, message: 'Name length should be 1 to 255 characters', trigger: 'blur' }
  ],
  groupType: [
    { required: true, message: 'Please select group type', trigger: 'change' }
  ]
}

const pipelineRules = {
  name: [
    { required: true, message: 'Please enter pipeline name', trigger: 'blur' },
    { min: 1, max: 255, message: 'Name length should be 1 to 255 characters', trigger: 'blur' }
  ]
}

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

const loadDomains = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3001/api/domains')
    const data = await response.json()
    
    if (response.ok) {
      domains.value = data
    } else {
      throw new Error(data.error || 'Failed to load domains')
    }
  } catch (error) {
    console.error('Error loading domains:', error)
    ElMessage.error('Failed to load domains')
  } finally {
    loading.value = false
  }
}

const loadGroups = async (domainId) => {
  loading.value = true
  try {
    const response = await fetch(`http://localhost:3001/api/domains/${domainId}`)
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

const loadComponents = async (groupId) => {
  loading.value = true
  try {
    const response = await fetch(`http://localhost:3001/api/groups/${groupId}?includeComponents=true`)
    const data = await response.json()
    
    if (response.ok) {
      components.value = data.components || []
    } else {
      throw new Error(data.error || 'Failed to load components')
    }
  } catch (error) {
    console.error('Error loading components:', error)
    ElMessage.error('Failed to load components')
  } finally {
    loading.value = false
  }
}

const showDomains = () => {
  currentView.value = 'domains'
  selectedDomain.value = null
  selectedGroup.value = null
  loadDomains()
}

const selectDomain = (domain) => {
  selectedDomain.value = domain
  currentView.value = 'groups'
  loadGroups(domain.id)
}

const showGroups = () => {
  currentView.value = 'groups'
  selectedGroup.value = null
  loadGroups(selectedDomain.value.id)
}

const selectGroup = (group) => {
  selectedGroup.value = group
  currentView.value = 'components'
  loadComponents(group.id)
}

const resetDomainForm = () => {
  domainForm.value = {
    name: '',
    description: '',
    color: '#ff8c00'
  }
  editingDomain.value = null
}

const resetGroupForm = () => {
  groupForm.value = {
    name: '',
    description: '',
    groupType: 'LOGICAL',
    color: '#ff8c00'
  }
}

const resetPipelineForm = () => {
  pipelineForm.value = {
    name: '',
    description: '',
    steps: ['']
  }
  editingPipeline.value = null
}

const saveDomain = async () => {
  if (!domainFormRef.value) return
  
  const valid = await domainFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const url = editingDomain.value 
      ? `http://localhost:3001/api/domains/${editingDomain.value.id}`
      : 'http://localhost:3001/api/domains'
    
    const method = editingDomain.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(domainForm.value)
    })

    const data = await response.json()
    
    if (response.ok) {
      ElMessage.success(editingDomain.value ? 'Domain updated successfully' : 'Domain created successfully')
      showCreateDomainDialog.value = false
      resetDomainForm()
      await loadDomains()
    } else {
      // Handle duplicate and other specific errors
      if (response.status === 409 && data.details) {
        const existingItem = data.details.existingDomain
        ElMessage.error({
          message: `${data.error}`,
          description: existingItem ? `Existing domain: "${existingItem.name}" (ID: ${existingItem.id})` : '',
          duration: 6000
        })
      } else {
        throw new Error(data.error || 'Failed to save domain')
      }
    }
  } catch (error) {
    console.error('Error saving domain:', error)
    if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('Failed to save domain')
    }
  } finally {
    saving.value = false
  }
}

const saveGroup = async () => {
  if (!groupFormRef.value) return
  
  const valid = await groupFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const response = await fetch('http://localhost:3001/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...groupForm.value,
        domainId: selectedDomain.value.id
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      ElMessage.success('Group created successfully')
      showCreateGroupDialog.value = false
      resetGroupForm()
      await loadGroups(selectedDomain.value.id)
    } else {
      // Handle duplicate and other specific errors
      if (response.status === 409 && data.details) {
        const existingItem = data.details.existingGroup
        ElMessage.error({
          message: `${data.error}`,
          description: existingItem ? `Existing group: "${existingItem.name}" in ${existingItem.domain || 'domain ID ' + existingItem.domainId}` : '',
          duration: 6000
        })
      } else {
        throw new Error(data.error || 'Failed to save group')
      }
    }
  } catch (error) {
    console.error('Error saving group:', error)
    if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('Failed to save group')
    }
  } finally {
    saving.value = false
  }
}

const managePipelines = async (domain) => {
  selectedDomainForPipeline.value = domain
  pipelines.value = domain.pipelines || []
  showPipelineDialog.value = true
}

const viewPipeline = (domain, pipeline) => {
  selectedDomainForPipeline.value = domain
  pipelines.value = domain.pipelines || []
  showPipelineDialog.value = true
}

const addStep = () => {
  pipelineForm.value.steps.push('')
}

const removeStep = (index) => {
  if (pipelineForm.value.steps.length > 1) {
    pipelineForm.value.steps.splice(index, 1)
  }
}

const savePipeline = async () => {
  if (!pipelineFormRef.value) return
  
  const valid = await pipelineFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const filteredSteps = pipelineForm.value.steps.filter(step => step.trim() !== '')
    
    const url = editingPipeline.value
      ? `http://localhost:3001/api/domains/${selectedDomainForPipeline.value.id}/pipelines/${editingPipeline.value.id}`
      : `http://localhost:3001/api/domains/${selectedDomainForPipeline.value.id}/pipelines`
    
    const method = editingPipeline.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: pipelineForm.value.name,
        description: pipelineForm.value.description,
        steps: filteredSteps
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      ElMessage.success(editingPipeline.value ? 'Pipeline updated successfully' : 'Pipeline created successfully')
      showCreatePipelineDialog.value = false
      resetPipelineForm()
      
      // Refresh domain data
      await loadDomains()
      
      // Update pipelines list
      const updatedDomain = domains.value.find(d => d.id === selectedDomainForPipeline.value.id)
      if (updatedDomain) {
        pipelines.value = updatedDomain.pipelines || []
        selectedDomainForPipeline.value = updatedDomain
      }
    } else {
      throw new Error(data.error || 'Failed to save pipeline')
    }
  } catch (error) {
    console.error('Error saving pipeline:', error)
    ElMessage.error('Failed to save pipeline')
  } finally {
    saving.value = false
  }
}

const handlePipelineAction = async ({ action, pipeline }) => {
  switch (action) {
    case 'edit':
      editingPipeline.value = pipeline
      pipelineForm.value = {
        name: pipeline.name,
        description: pipeline.description || '',
        steps: pipeline.steps && pipeline.steps.length > 0 ? [...pipeline.steps] : ['']
      }
      showCreatePipelineDialog.value = true
      break
      
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `This will permanently delete the pipeline "${pipeline.name}". Continue?`,
          'Warning',
          {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            type: 'warning',
          }
        )
        
        const response = await fetch(`http://localhost:3001/api/domains/${selectedDomainForPipeline.value.id}/pipelines/${pipeline.id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          ElMessage.success('Pipeline deleted successfully')
          
          // Refresh domain data
          await loadDomains()
          
          // Update pipelines list
          const updatedDomain = domains.value.find(d => d.id === selectedDomainForPipeline.value.id)
          if (updatedDomain) {
            pipelines.value = updatedDomain.pipelines || []
            selectedDomainForPipeline.value = updatedDomain
          }
        } else {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete pipeline')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error deleting pipeline:', error)
          ElMessage.error('Failed to delete pipeline')
        }
      }
      break
  }
}

const handleDomainAction = async ({ action, domain }) => {
  switch (action) {
    case 'view-board':
      // Navigate to Board with domain filtering
      await navigateToDashboard({ domainId: domain.id, domainName: domain.name })
      break
      
    case 'edit':
      editingDomain.value = domain
      domainForm.value = {
        name: domain.name,
        description: domain.description || '',
        color: domain.color || '#ff8c00'
      }
      showCreateDomainDialog.value = true
      break
      
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `This will permanently delete the domain "${domain.name}". Continue?`,
          'Warning',
          {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            type: 'warning',
          }
        )
        
        const response = await fetch(`http://localhost:3001/api/domains/${domain.id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          ElMessage.success('Domain deleted successfully')
          await loadDomains()
        } else {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete domain')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error deleting domain:', error)
          ElMessage.error('Failed to delete domain')
        }
      }
      break
  }
}

const handleGroupActionInDomain = async ({ action, group }) => {
  switch (action) {
    case 'view-board':
      // Navigate to Board with group filtering to show components in this group
      // Only pass group info to focus on the group's components, not domain's groups
      await navigateToDashboard({ 
        groupId: group.id, 
        groupName: group.name
        // Note: Don't pass domainId here as we want to focus on this specific group's components
      })
      break
  }
}

onMounted(() => {
  loadDomains()
})
</script>

<style scoped>
.domains-view {
  padding: 24px;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.breadcrumb {
  margin-bottom: 24px;
  flex-shrink: 0;
}

.view-container {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-header {
  margin-bottom: 24px;
  flex-shrink: 0;
}

.view-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.view-header p {
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
  justify-content: flex-end;
}

.domains-grid,
.groups-grid,
.components-grid {
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
  .domains-grid,
  .groups-grid,
  .components-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

@media (min-width: 1400px) {
  .domains-grid,
  .groups-grid,
  .components-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
}

@media (max-width: 767px) {
  .domains-grid,
  .groups-grid,
  .components-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.domain-card,
.group-card,
.component-card {
  transition: all 0.3s ease;
  cursor: pointer;
  height: fit-content;
  max-width: 100%;
  width: 100%;
}

.domain-card:hover,
.group-card:hover,
.component-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
}

.domain-header,
.group-header,
.component-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.domain-title,
.group-title,
.component-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.domain-color-indicator,
.group-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.domain-name,
.group-name,
.component-name {
  font-weight: 600;
  color: #303133;
}

.domain-content,
.group-content,
.component-content {
  margin-top: 12px;
}

.domain-description,
.group-description,
.component-description {
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

.domain-stats,
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

.pipelines-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pipeline-tag {
  font-size: 12px;
}

.component-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  color: #909399;
  font-size: 13px;
  min-width: 60px;
}

.info-value {
  color: #303133;
  font-size: 13px;
  font-family: monospace;
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

.domain-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.pipeline-dialog :deep(.el-dialog__body) {
  padding: 16px 20px;
}

.pipeline-header {
  margin-bottom: 16px;
}

.empty-pipelines {
  text-align: center;
  color: #909399;
  padding: 40px 0;
}

.pipelines-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pipeline-card {
  border: 1px solid #dcdfe6;
}

.pipeline-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pipeline-name {
  font-weight: 600;
  color: #303133;
}

.pipeline-content {
  font-size: 14px;
}

.pipeline-description {
  margin: 0 0 12px 0;
  color: #606266;
  line-height: 1.4;
}

.pipeline-steps {
  margin-top: 8px;
}

.steps-header {
  margin-bottom: 8px;
  color: #303133;
  font-size: 13px;
}

.steps-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.step-tag {
  font-size: 12px;
  font-family: monospace;
}

.no-steps {
  color: #c0c4cc;
  font-size: 12px;
}

.steps-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-input {
  display: flex;
  align-items: center;
}

.step-field {
  flex: 1;
}

.add-step-btn {
  width: 100%;
  border-style: dashed;
}

.pipeline-tag {
  cursor: pointer;
}

.pipeline-tag:hover {
  opacity: 0.8;
}

/* Custom scrollbar styling */
.domains-view::-webkit-scrollbar,
.domains-grid::-webkit-scrollbar,
.groups-grid::-webkit-scrollbar,
.components-grid::-webkit-scrollbar {
  width: 8px;
}

.domains-view::-webkit-scrollbar-track,
.domains-grid::-webkit-scrollbar-track,
.groups-grid::-webkit-scrollbar-track,
.components-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.domains-view::-webkit-scrollbar-thumb,
.domains-grid::-webkit-scrollbar-thumb,
.groups-grid::-webkit-scrollbar-thumb,
.components-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.domains-view::-webkit-scrollbar-thumb:hover,
.domains-grid::-webkit-scrollbar-thumb:hover,
.groups-grid::-webkit-scrollbar-thumb:hover,
.components-grid::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>