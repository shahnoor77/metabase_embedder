import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userEmail = localStorage.getItem('userEmail')
    
    if (token && userEmail) {
      setUser({ email: userEmail, token })
    }
    
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const result = await authService.login(email, password)
    if (result.success) {
      localStorage.setItem('token', result.data.access_token)
      localStorage.setItem('userEmail', email)
      setUser({ email, token: result.data.access_token })
    }
    return result
  }

  const register = async (email, password, firstName, lastName) => {
    const result = await authService.register(email, password, firstName, lastName)
    // Backend returns UserResponse (not Token) after signup
    // User needs to login separately to get access token
    if (result.success) {
      // Store email for potential auto-login, but don't set token yet
      localStorage.setItem('userEmail', email)
      // Note: User will need to login after signup to get access token
    }
    return result
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
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