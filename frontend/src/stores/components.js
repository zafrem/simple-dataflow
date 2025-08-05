import { defineStore } from 'pinia'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000
})

export const useComponentStore = defineStore('components', {
  state: () => ({
    components: [],
    connections: [],
    domains: [],
    loading: false,
    error: null,
    filters: {
      type: [],
      domain: [],
      source: [],
      team: [],
      search: '',
      includeIsolated: true
    },
    selectedComponent: null,
    graphData: {
      nodes: [],
      edges: [],
      stats: {
        nodeCount: 0,
        edgeCount: 0,
        domains: 0
      }
    },
    // Layout state persistence
    currentLayout: 'cose',
    layoutSettings: {},
    // Node position persistence
    savedPositions: {}
  }),

  getters: {
    // Getter for persisted layout
    persistedLayout: (state) => state.currentLayout
  },

  actions: {
    async fetchComponents(params = {}) {
      this.loading = true
      this.error = null

      try {
        const response = await api.get('/components', { params })
        this.components = response.data.components || response.data
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchComponent(id) {
      try {
        const response = await api.get(`/components/${id}`)
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async createComponent(componentData) {
      try {
        const response = await api.post('/components', componentData)
        this.components.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async updateComponent(id, updates) {
      try {
        const response = await api.put(`/components/${id}`, updates)
        const index = this.components.findIndex(c => c.id === id)
        if (index !== -1) {
          this.components[index] = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async deleteComponent(id) {
      try {
        await api.delete(`/components/${id}`)
        this.components = this.components.filter(c => c.id !== id)
        if (this.selectedComponent?.id === id) {
          this.selectedComponent = null
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async fetchConnections(params = {}) {
      try {
        const response = await api.get('/connections', { params })
        this.connections = response.data.connections || response.data
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async fetchGraphData(params = {}) {
      this.loading = true

      try {
        const response = await api.get('/connections/graph', { params })
        this.graphData = response.data
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchDomains() {
      try {
        const response = await api.get('/domains')
        this.domains = response.data
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async fetchDomainDetails(domain) {
      try {
        const response = await api.get(`/domains/${domain}`)
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async rebuildConnections() {
      try {
        const response = await api.post('/connections/rebuild')
        // Refresh graph data after rebuild
        await this.fetchGraphData(this.getFilterParams())
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    setFilter(key, value) {
      this.filters[key] = value
    },

    clearFilters() {
      this.filters = {
        type: [],
        domain: [],
        source: [],
        team: [],
        search: '',
        includeIsolated: true
      }
    },

    setSelectedComponent(component) {
      this.selectedComponent = component
    },

    clearSelectedComponent() {
      this.selectedComponent = null
    },

    getFilterParams() {
      const params = {}
      
      if (this.filters.type.length > 0) {
        params.type = this.filters.type.join(',')
      }
      
      if (this.filters.domain.length > 0) {
        params.domain = this.filters.domain.join(',')
      }
      
      if (this.filters.source.length > 0) {
        params.source = this.filters.source.join(',')
      }
      
      if (this.filters.team.length > 0) {
        params.team = this.filters.team.join(',')
      }
      
      if (this.filters.search) {
        params.search = this.filters.search
      }
      
      if (this.filters.includeIsolated !== undefined) {
        params.includeIsolated = this.filters.includeIsolated
      }

      return params
    },

    async applyFilters() {
      const params = this.getFilterParams()
      await this.fetchGraphData(params)
    },

    // Layout persistence actions
    setCurrentLayout(layoutName) {
      this.currentLayout = layoutName
      // Store in localStorage for persistence across sessions
      localStorage.setItem('dataflow-layout', layoutName)
    },

    initializeLayout() {
      // Load saved layout from localStorage
      const savedLayout = localStorage.getItem('dataflow-layout')
      if (savedLayout) {
        this.currentLayout = savedLayout
      }
      
      // Load saved positions from localStorage
      const savedPositions = localStorage.getItem('dataflow-positions')
      if (savedPositions) {
        try {
          this.savedPositions = JSON.parse(savedPositions)
        } catch (error) {
          console.warn('Failed to parse saved positions:', error)
          this.savedPositions = {}
        }
      }
    },

    // Position saving and loading actions
    saveNodePositions(cy) {
      if (!cy) return
      
      const positions = {}
      cy.nodes().forEach(node => {
        const nodeId = node.id()
        const position = node.position()
        positions[nodeId] = {
          x: position.x,
          y: position.y
        }
      })
      
      this.savedPositions = positions
      localStorage.setItem('dataflow-positions', JSON.stringify(positions))
    },

    getSavedPositions() {
      return this.savedPositions
    },

    clearSavedPositions() {
      this.savedPositions = {}
      localStorage.removeItem('dataflow-positions')
    }
  },

  getters: {
    componentCount: (state) => state.components.length,
    connectionCount: (state) => state.connections.length,
    domainCount: (state) => state.domains.length,
    
    componentsByType: (state) => {
      const types = { DB: 0, API: 0, APP: 0, STORAGE: 0, PIPES: 0 }
      state.components.forEach(component => {
        types[component.type] = (types[component.type] || 0) + 1
      })
      return types
    },

    filteredComponents: (state) => {
      let filtered = [...state.components]

      if (state.filters.type.length > 0) {
        filtered = filtered.filter(c => state.filters.type.includes(c.type))
      }

      if (state.filters.domain.length > 0) {
        filtered = filtered.filter(c => state.filters.domain.includes(c.domain))
      }

      if (state.filters.source.length > 0) {
        filtered = filtered.filter(c => state.filters.source.includes(c.source))
      }

      if (state.filters.team.length > 0) {
        filtered = filtered.filter(c => state.filters.team.includes(c.team))
      }

      if (state.filters.search) {
        const search = state.filters.search.toLowerCase()
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(search) || 
          c.tag.toLowerCase().includes(search)
        )
      }

      return filtered
    },

    uniqueDomains: (state) => {
      const domains = new Set()
      state.components.forEach(component => {
        if (component.domain) {
          domains.add(component.domain)
        }
      })
      return Array.from(domains).sort()
    },

    uniqueSources: (state) => {
      const sources = new Set()
      state.components.forEach(component => {
        sources.add(component.source)
      })
      return Array.from(sources).sort()
    },

    uniqueTeams: (state) => {
      const teams = new Set()
      state.components.forEach(component => {
        if (component.team) {
          teams.add(component.team)
        }
      })
      return Array.from(teams).sort()
    }
  }
})