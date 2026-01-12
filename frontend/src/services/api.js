import axios from 'axios';

const api = axios.create({
  // Point to the root of your backend (no /api suffix here)
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

const API_PREFIX = '/api';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  // Matches OpenAPI: /api/auth/*
  register: (data) => api.post(`${API_PREFIX}/auth/signup`, data),
  // Login uses form-urlencoded format with username and password
  login: (credentials) => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username || credentials.email); // Support both
    formData.append('password', credentials.password);
    formData.append('grant_type', 'password');
    return api.post(`${API_PREFIX}/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
  refresh: () => api.post(`${API_PREFIX}/auth/refresh`),
  getMe: () => api.get(`${API_PREFIX}/auth/me`),
};

export const workspaceAPI = {
  // Matches OpenAPI: /api/workspaces
  getAll: () => api.get(`${API_PREFIX}/workspaces`),
  getById: (id) => api.get(`${API_PREFIX}/workspaces/${id}`),
  create: (data) => api.post(`${API_PREFIX}/workspaces`, data),
  
  // Matches OpenAPI: /api/workspaces/{id}/embed
  getEmbedUrl: (id) => api.get(`${API_PREFIX}/workspaces/${id}/embed`),
};

export const dashboardAPI = {
  // Matches OpenAPI: /api/workspaces/{id}/dashboards
  getAll: (workspaceId) => api.get(`${API_PREFIX}/workspaces/${workspaceId}/dashboards`),
  create: (data) => api.post(`${API_PREFIX}/dashboard`, data),
  
  // Matches OpenAPI: /api/workspaces/dashboards/{id}/embed
  getEmbedUrl: (id) => api.get(`${API_PREFIX}/workspaces/dashboards/${id}/embed`),
};

export default api;