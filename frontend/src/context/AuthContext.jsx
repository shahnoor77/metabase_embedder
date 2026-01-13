import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

export const AuthContext = createContext()

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token')
    if (token) {
      verifyToken(token)
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(response.data)
      setIsAuthenticated(true)
    } catch (error) {
      localStorage.removeItem('access_token')
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const response = await axios.post(
      `${API_BASE_URL}/api/auth/login`,
      formData,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    const token = response.data.access_token
    localStorage.setItem('access_token', token)
    
    // Fetch user info
    const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    setUser(userResponse.data)
    setIsAuthenticated(true)
    
    return userResponse.data
  }

  const signup = async (email, password, firstName, lastName) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
      email,
      password,
      first_name: firstName,
      last_name: lastName
    })

    return response.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}