import { defineStore } from 'pinia'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000
})

export const useSystemStore = defineStore('system', {
  state: () => ({
    health: {
      status: 'unknown',
      timestamp: null,
      uptime: 0,
      database: 'unknown',
      redis: 'unknown',
      memory: {},
      version: 'unknown'
    },
    loading: false,
    error: null
  }),

  actions: {
    async checkHealth() {
      this.loading = true
      this.error = null

      try {
        const response = await api.get('/health')
        this.health = response.data
        return response.data
      } catch (error) {
        this.error = error.message
        this.health.status = 'unhealthy'
        throw error
      } finally {
        this.loading = false
      }
    },

    async getStats() {
      try {
        const response = await api.get('/connections/stats')
        return response.data
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        throw error
      }
    }
  },

  getters: {
    isHealthy: (state) => state.health.status === 'healthy',
    uptimeHours: (state) => Math.floor(state.health.uptime / 3600),
    memoryUsageMB: (state) => Math.round((state.health.memory?.heapUsed || 0) / 1024 / 1024)
  }
})