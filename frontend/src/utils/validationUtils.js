/**
 * Validation utilities for data entry forms
 * Provides standardized duplicate checking and error handling
 */

import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * Handle API response errors with detailed duplicate information
 * @param {Response} response - Fetch response object
 * @param {Object} data - Response data
 * @param {string} entityType - Type of entity (domain, group, component, etc.)
 * @returns {boolean} - True if error was handled, false if should continue with normal error handling
 */
export const handleDuplicateError = (response, data, entityType = 'item') => {
  if (response.status === 409 && data.details) {
    const { field, value, existingDomain, existingGroup, existingComponent, existingConnection, existingLog, suggestion } = data.details
    
    let description = ''
    
    if (existingDomain) {
      description = `Existing domain: "${existingDomain.name}" (ID: ${existingDomain.id})`
      if (existingDomain.description) {
        description += `\nDescription: ${existingDomain.description}`
      }
    }
    
    if (existingGroup) {
      description = `Existing group: "${existingGroup.name}" (${existingGroup.groupType})`
      if (existingGroup.domain || existingGroup.domainId) {
        description += ` in ${existingGroup.domain || 'domain ID ' + existingGroup.domainId}`
      }
    }
    
    if (existingComponent) {
      description = `Existing component: "${existingComponent.name}" (${existingComponent.type})`
      if (existingComponent.tag) {
        description += `\nTag: ${existingComponent.tag}`
      }
    }
    
    if (existingConnection) {
      description = `Connection exists between components ${existingConnection.sourceId} → ${existingConnection.targetId}`
      if (existingConnection.connectionType) {
        description += `\nType: ${existingConnection.connectionType}`
      }
    }
    
    if (existingLog) {
      description = `Existing log: "${existingLog.message}" (${existingLog.importance})`
      description += `\nCreated: ${new Date(existingLog.timestamp).toLocaleString()}`
      if (suggestion) {
        description += `\n\n${suggestion}`
      }
    }
    
    ElMessage.error({
      message: data.error,
      description: description,
      duration: 8000,
      showClose: true
    })
    
    return true
  }
  
  return false
}

/**
 * Validate required fields before submission
 * @param {Object} formData - Form data object
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
export const validateRequiredFields = (formData, requiredFields) => {
  const errors = []
  
  requiredFields.forEach(field => {
    const value = formData[field]
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Show confirmation dialog for potential duplicates
 * @param {string} entityType - Type of entity
 * @param {string} entityName - Name of the entity
 * @param {Object} existingEntity - Existing entity details
 * @returns {Promise<boolean>} - True if user confirms to proceed
 */
export const confirmDuplicateAction = async (entityType, entityName, existingEntity) => {
  try {
    await ElMessageBox.confirm(
      `A ${entityType} named "${entityName}" already exists. Do you want to proceed anyway?`,
      'Potential Duplicate Detected',
      {
        confirmButtonText: 'Proceed Anyway',
        cancelButtonText: 'Cancel',
        type: 'warning',
        dangerouslyUseHTMLString: true,
        message: existingEntity ? `
          <p>Existing ${entityType} details:</p>
          <ul>
            <li><strong>Name:</strong> ${existingEntity.name || 'N/A'}</li>
            <li><strong>ID:</strong> ${existingEntity.id || 'N/A'}</li>
            ${existingEntity.type ? `<li><strong>Type:</strong> ${existingEntity.type}</li>` : ''}
            ${existingEntity.domain ? `<li><strong>Domain:</strong> ${existingEntity.domain}</li>` : ''}
            ${existingEntity.description ? `<li><strong>Description:</strong> ${existingEntity.description}</li>` : ''}
          </ul>
        ` : ''
      }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Standardized form submission with duplicate handling
 * @param {Object} options - Submission options
 * @param {string} options.url - API endpoint URL
 * @param {string} options.method - HTTP method (POST, PUT, etc.)
 * @param {Object} options.data - Form data to submit
 * @param {string} options.entityType - Type of entity for error messages
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback (optional)
 * @returns {Promise<boolean>} - True if successful
 */
export const submitFormWithDuplicateHandling = async ({
  url,
  method = 'POST',
  data,
  entityType = 'item',
  onSuccess,
  onError
}) => {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const responseData = await response.json()
    
    if (response.ok) {
      if (onSuccess) {
        await onSuccess(responseData)
      }
      return true
    } else {
      // Handle duplicate errors with detailed information
      if (handleDuplicateError(response, responseData, entityType)) {
        return false
      }
      
      // Handle other errors
      if (onError) {
        await onError(responseData)
      } else {
        ElMessage.error(responseData.error || `Failed to save ${entityType}`)
      }
      return false
    }
  } catch (error) {
    console.error(`Error saving ${entityType}:`, error)
    if (onError) {
      await onError(error)
    } else {
      ElMessage.error(`Network error: Failed to save ${entityType}`)
    }
    return false
  }
}

/**
 * Format and display validation errors
 * @param {Array} errors - Array of error messages
 * @param {string} title - Error dialog title
 */
export const displayValidationErrors = (errors, title = 'Validation Errors') => {
  if (errors.length === 0) return
  
  const errorList = errors.map(error => `• ${error}`).join('\n')
  
  ElMessage.error({
    message: title,
    description: errorList,
    duration: 6000,
    showClose: true
  })
}

/**
 * Check for potential duplicates before form submission
 * @param {string} entityType - Type of entity to check
 * @param {Object} searchCriteria - Criteria to search for duplicates
 * @param {string} apiEndpoint - API endpoint for checking duplicates
 * @returns {Promise<Object|null>} - Existing entity if found, null otherwise
 */
export const checkForDuplicates = async (entityType, searchCriteria, apiEndpoint) => {
  try {
    const params = new URLSearchParams(searchCriteria)
    const response = await fetch(`${apiEndpoint}?${params}`)
    
    if (response.ok) {
      const data = await response.json()
      
      // Handle different API response formats
      if (data.length > 0) {
        return data[0] // Array response
      } else if (data.rows && data.rows.length > 0) {
        return data.rows[0] // Paginated response
      } else if (data[entityType] && data[entityType].length > 0) {
        return data[entityType][0] // Nested response
      }
    }
    
    return null
  } catch (error) {
    console.warn('Error checking for duplicates:', error)
    return null
  }
}

/**
 * Sanitize form input data
 * @param {Object} formData - Raw form data
 * @returns {Object} - Sanitized form data
 */
export const sanitizeFormData = (formData) => {
  const sanitized = {}
  
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim()
    } else if (value !== null && value !== undefined) {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

export default {
  handleDuplicateError,
  validateRequiredFields,
  confirmDuplicateAction,
  submitFormWithDuplicateHandling,
  displayValidationErrors,
  checkForDuplicates,
  sanitizeFormData
}