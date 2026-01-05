import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userEmail')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const workspaceAPI = {
  getAll: () => api.get('/api/workspaces'),
  getById: (id) => api.get(`/api/workspaces/${id}`),
  create: (data) => api.post('/api/workspaces', data),
}

export const dashboardAPI = {
  getAll: (workspaceId) => api.get('/api/dashboards', { params: { workspace_id: workspaceId } }),
  getById: (id) => api.get(`/api/dashboards/${id}`),
  create: (data) => api.post('/api/dashboards', data),
}

export default api