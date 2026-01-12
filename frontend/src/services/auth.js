import { authAPI } from './api'

export const authService = {
  login: async (email, password) => {
    try {
      const response = await authAPI.login({ email, password })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      }
    }
  },

  register: async (email, password, firstName, lastName) => {
    try {
      const response = await authAPI.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      }
    }
  },

  getMe: async () => {
    try {
      const response = await authAPI.getMe()
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: 'Failed to get user info' }
    }
  },
}