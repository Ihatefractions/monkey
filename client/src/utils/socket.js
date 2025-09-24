import { io } from 'socket.io-client'

const SOCKET_BASE = import.meta.env.VITE_SOCKET_BASE || 'http://localhost:4000'

export function socketFactory(token) {
  const socket = io(SOCKET_BASE, {
    autoConnect: true,
    transports: ['websocket'],
    auth: { token }
  })
  return socket
}

