import { io } from 'socket.io-client'

class WebSocketService {
  constructor() {
    this.sockets = new Map()
    this.listeners = new Map()
  }

  connect(sondeId, url = 'wss://echo.websocket.org  ') {
    if (this.sockets.has(sondeId)) {
      return this.sockets.get(sondeId)
    }

    const socket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      console.log(`Connecté à la sonde ${sondeId}`)
    })

    socket.on('disconnect', () => {
      console.log(`Déconnecté de la sonde ${sondeId}`)
    })


    socket.on('error', (error) => {
      console.error(`Erreur WebSocket sonde ${sondeId}:`, error)
    })

    socket.on('sensor-update', (data) => {
      this.notifyListeners(sondeId, 'sensor-update', data)
    })

    this.sockets.set(sondeId, socket)
    return socket
  }

  subscribe(sondeId, event, callback) {
    const key = `${sondeId}:${event}`
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key).add(callback)

    return () => {
      const callbacks = this.listeners.get(key)
      if (callbacks) {
        callbacks.delete(callback)
      }
    }
  }

  notifyListeners(sondeId, event, data) {
    const key = `${sondeId}:${event}`
    const callbacks = this.listeners.get(key)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  disconnect(sondeId) {
    const socket = this.sockets.get(sondeId)
    if (socket) {
      socket.disconnect()
      this.sockets.delete(sondeId)
      
      for (const key of this.listeners.keys()) {
        if (key.startsWith(`${sondeId}:`)) {
          this.listeners.delete(key)
        }
      }
    }
  }

  disconnectAll() {
    this.sockets.forEach((socket, sondeId) => {
      socket.disconnect()
    })
    this.sockets.clear()
    this.listeners.clear()
  }
}

export default new WebSocketService()