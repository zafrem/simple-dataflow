import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useSocketStore = defineStore('socket', {
  state: () => ({
    socket: null,
    connected: false,
    listeners: new Map()
  }),

  actions: {
    async connect() {
      if (this.socket?.connected) {
        return
      }

      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      this.socket.on('connect', () => {
        this.connected = true
        console.log('Socket connected:', this.socket.id)
      })

      this.socket.on('disconnect', (reason) => {
        this.connected = false
        console.log('Socket disconnected:', reason)
      })

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        this.connected = false
      })

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts')
        this.connected = true
      })

      this.socket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error)
      })

      // Subscribe to common channels
      this.subscribe('components')
      this.subscribe('connections')
      this.subscribe('connectors')
      this.subscribe('sync')
    },

    async disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.connected = false
        this.listeners.clear()
      }
    },

    subscribe(channel) {
      if (this.socket) {
        this.socket.emit(`subscribe:${channel}`)
      }
    },

    unsubscribe(channel) {
      if (this.socket) {
        this.socket.emit('unsubscribe', channel)
      }
    },

    on(event, callback) {
      if (!this.socket) {
        console.warn('Socket not connected, queuing listener for:', event)
        return
      }

      // Store the callback for cleanup later
      if (!this.listeners.has(event)) {
        this.listeners.set(event, [])
      }
      this.listeners.get(event).push(callback)

      this.socket.on(event, callback)
    },

    off(event, callback) {
      if (this.socket) {
        this.socket.off(event, callback)
      }

      // Remove from listeners map
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event)
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    },

    emit(event, data) {
      if (this.socket?.connected) {
        this.socket.emit(event, data)
      } else {
        console.warn('Cannot emit event, socket not connected:', event)
      }
    },

    heartbeat() {
      if (this.socket?.connected) {
        this.socket.emit('client:heartbeat')
      }
    }
  },

  getters: {
    isConnected: (state) => state.connected,
    socketId: (state) => state.socket?.id || null
  }
})