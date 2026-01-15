import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      // Best-effort: load current user from backend so frontend matches backend truth
      const me = await authService.getMe()
      if (me.success) {
        setUser({ ...me.data, token })
      } else {
        // token likely invalid/expired
        localStorage.removeItem('access_token')
        setUser(null)
      }
      setLoading(false)
    }

    bootstrap()
  }, [])

  const login = async (email, password) => {
    const result = await authService.login(email, password)
    if (result.success) {
      localStorage.setItem('access_token', result.data.access_token)

      // Fetch /me so we store a consistent user object
      const me = await authService.getMe()
      if (me.success) {
        setUser({ ...me.data, token: result.data.access_token })
      } else {
        setUser({ email, token: result.data.access_token })
      }
    }
    return result
  }

  const register = async (email, password, firstName, lastName) => {
    const result = await authService.register(email, password, firstName, lastName)
    // Backend returns UserResponse (not Token) after signup
    // User needs to login separately to get access token
    return result
  }

  const logout = () => {
    localStorage.removeItem('access_token')
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