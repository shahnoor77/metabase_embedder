import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

const API_PREFIX = '/api';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post(`${API_PREFIX}/auth/signup`, data),
  login: (credentials) => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username || credentials.email);
    formData.append('password', credentials.password);
    formData.append('grant_type', 'password');
    return api.post(`${API_PREFIX}/auth/login`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  getMe: () => api.get(`${API_PREFIX}/auth/me`),
};

export const workspaceAPI = {
  getAll: () => api.get(`${API_PREFIX}/workspaces`),
  getById: (id) => api.get(`${API_PREFIX}/workspaces/${id}`),
  create: (data) => api.post(`${API_PREFIX}/workspaces`, data),
  
  // Gets the JWT-signed URL for the entire collection (Interactive Embedding)
  getEmbedUrl: (id) => api.get(`${API_PREFIX}/workspaces/${id}/embed`),

  // NEW: Gets the SSO Magic Link to open the Metabase Creator/Designer
  getPortalUrl: (id) => api.get(`${API_PREFIX}/workspaces/${id}/creator-url`),
};

export const dashboardAPI = {
  // Triggers the Backend Auto-Sync and returns the dashboard list
  // for the user's default workspace (auto-created if missing)
  getAll: () => api.get(`${API_PREFIX}/workspaces/default/dashboards`),
  
  // Gets the JWT-signed URL for a specific dashboard
  getEmbedUrl: (id) => api.get(`${API_PREFIX}/workspaces/dashboards/${id}/embed`),

  // Opens Metabase dashboard editor in a new tab (backend returns the URL)
  getNewDashboardEditorUrl: () => api.post(`${API_PREFIX}/workspaces/default/new-dashboard-editor-url`),
};

export default api;