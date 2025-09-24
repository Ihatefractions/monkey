import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api.js'

export function ChatView({ user, socket, onLogout }) {
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const activeRoom = useMemo(() => rooms.find(r => r.id === activeRoomId) || null, [rooms, activeRoomId])

  useEffect(() => {
    loadRooms()
  }, [])

  useEffect(() => {
    if (!socket) return
    function onMessage(msg) {
      if (msg.roomId === activeRoomId) {
        setMessages(prev => [...prev, msg])
      }
    }
    socket.on('message', onMessage)
    return () => {
      socket.off('message', onMessage)
    }
  }, [socket, activeRoomId])

  async function loadRooms() {
    const { rooms } = await api.get('/rooms')
    setRooms(rooms)
    if (!activeRoomId && rooms[0]) {
      selectRoom(rooms[0].id)
    }
  }

  async function selectRoom(roomId) {
    setActiveRoomId(roomId)
    const { messages } = await api.get(`/rooms/${roomId}/messages`)
    setMessages(messages)
    socket?.emit('joinRoom', { roomId })
  }

  async function createRoom() {
    const name = prompt('Room name?')
    if (!name) return
    const room = await api.post('/rooms', { name })
    await loadRooms()
    setActiveRoomId(room.id)
  }

  async function addMember() {
    if (!activeRoomId) return
    const username = prompt('Username to add?')
    if (!username) return
    try {
      await api.post(`/rooms/${activeRoomId}/members`, { username })
      alert('Added')
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed')
    }
  }

  async function removeMember() {
    if (!activeRoomId) return
    const userId = prompt('User ID to remove?')
    if (!userId) return
    try {
      await api.delete(`/rooms/${activeRoomId}/members/${userId}`)
      alert('Removed')
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed')
    }
  }

  function sendMessage(e) {
    e.preventDefault()
    if (!text.trim() || !activeRoomId) return
    socket?.emit('message', { roomId: activeRoomId, content: text }, (ack) => {
      if (ack?.error) return
      setText('')
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{ borderRight: '1px solid #eee', padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{user.username}</strong>
          <button onClick={onLogout}>Logout</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={createRoom}>+ New Room</button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
          {rooms.map(r => (
            <li key={r.id}>
              <button style={{ width: '100%', textAlign: 'left', padding: 8, background: r.id === activeRoomId ? '#eef' : undefined }} onClick={() => selectRoom(r.id)}>
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main style={{ display: 'flex', flexDirection: 'column' }}>
        <header style={{ borderBottom: '1px solid #eee', padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>{activeRoom?.name || 'Select a room'}</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={addMember} disabled={!activeRoomId}>Add member</button>
            <button onClick={removeMember} disabled={!activeRoomId}>Remove member</button>
          </div>
        </header>
        <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
          {messages.map(m => (
            <div key={m.id} style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#777', marginRight: 6 }}>{m.senderId === user.id ? 'You' : `User ${m.senderId}`}</span>
              <span>{m.content}</span>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #eee' }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message" style={{ flex: 1, padding: 8 }} />
          <button type="submit">Send</button>
        </form>
      </main>
    </div>
  )
}

