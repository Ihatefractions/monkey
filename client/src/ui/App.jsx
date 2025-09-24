import React, { useMemo, useState } from 'react'
import { AuthView } from './AuthView.jsx'
import { ChatView } from './ChatView.jsx'
import { api } from '../utils/api.js'
import { socketFactory } from '../utils/socket.js'

export function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    return token && user ? { token, user: JSON.parse(user) } : null
  })

  const socket = useMemo(() => auth ? socketFactory(auth.token) : null, [auth])

  if (!auth) {
    return <AuthView onAuthed={(token, user) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      api.setToken(token)
      setAuth({ token, user })
    }} />
  }

  api.setToken(auth.token)
  return <ChatView user={auth.user} socket={socket} onLogout={() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuth(null)
  }} />
}

