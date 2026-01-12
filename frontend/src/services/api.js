import axios from 'axios';

const api = axios.create({
  // Point to the root of your backend
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  // Matches OpenAPI: /auth/signup and /auth/login
  register: (data) => api.post('/auth/signup', data),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
};

export const workspaceAPI = {
  // Matches OpenAPI: /api/workspaces
  getAll: () => api.get('/api/workspaces'),
  getById: (id) => api.get(`/api/workspaces/${id}`),
  create: (data) => api.post('/api/workspaces', data),
  
  // Matches OpenAPI: /api/workspaces/{id}/embed
  getEmbedUrl: (id) => api.get(`/api/workspaces/${id}/embed`),
};

export const dashboardAPI = {
  // Matches OpenAPI: /api/workspaces/{id}/dashboards
  getAll: (workspaceId) => api.get(`/api/workspaces/${workspaceId}/dashboards`),
  
  // Matches OpenAPI: /api/workspaces/dashboards/{id}/embed
  getEmbedUrl: (id) => api.get(`/api/workspaces/dashboards/${id}/embed`),
};

export default api;