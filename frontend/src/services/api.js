import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  signup: (email, password, firstName, lastName) =>
    api.post('/api/auth/signup', {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),

  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  getMe: () => api.get('/api/auth/me'),

  refresh: () => api.post('/api/auth/refresh'),
};

// Workspace endpoints
export const workspaceAPI = {
  getAll: () => api.get('/api/workspaces'),
  create: (name, description) =>
    api.post('/api/workspaces', { name, description }),
  getOne: (id) => api.get(`/api/workspaces/${id}`),
  getDashboards: (workspaceId) =>
    api.get(`/api/workspaces/${workspaceId}/dashboards`),
  getEmbedUrl: (workspaceId) =>
    api.get(`/api/workspaces/${workspaceId}/embed`),
};

// Dashboard endpoints
export const dashboardAPI = {
  create: (dashboardData) => api.post('/api/dashboards', dashboardData),
  getMyDashboards: () => api.get('/api/dashboards/my-dashboards'),
  getEmbedUrl: (dashboardId) => api.get(`/api/dashboards/${dashboardId}/embed`),
  publish: (dashboardId) => api.post(`/api/dashboards/${dashboardId}/publish`),
  delete: (dashboardId) => api.delete(`/api/dashboards/${dashboardId}`),
};

export default api;