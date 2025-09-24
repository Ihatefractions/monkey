import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'

const client = axios.create({ baseURL: API_BASE })

export const api = {
  setToken(token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  },
  async get(path) {
    const { data } = await client.get(path)
    return data
  },
  async post(path, body) {
    const { data } = await client.post(path, body)
    return data
  },
  async delete(path) {
    const { data } = await client.delete(path)
    return data
  }
}

