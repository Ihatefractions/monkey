import React, { useState } from 'react'
import { api } from '../utils/api.js'

export function AuthView({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
      const { token, user } = await api.post(endpoint, { username, password })
      onAuthed(token, user)
    } catch (e) {
      setError(e?.response?.data?.error || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginBottom: 8 }}>Welcome</h2>
      <p style={{ color: '#555', marginTop: 0 }}>Sign up or log in to start chatting.</p>
      <form onSubmit={submit}>
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={32} style={{ width: '100%', padding: 8, margin: '4px 0 12px' }} />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ width: '100%', padding: 8, margin: '4px 0 12px' }} />
        {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
        <button disabled={loading} style={{ width: '100%', padding: 10 }}>{loading ? 'Please wait…' : (mode === 'login' ? 'Log in' : 'Sign up')}</button>
      </form>
      <div style={{ marginTop: 12 }}>
        {mode === 'login' ? (
          <span>New here? <button type="button" onClick={() => setMode('signup')}>Create account</button></span>
        ) : (
          <span>Have an account? <button type="button" onClick={() => setMode('login')}>Log in</button></span>
        )}
      </div>
    </div>
  )
}

