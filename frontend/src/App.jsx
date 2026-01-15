import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './components/Layout/Auth/Login'
import Register from './components/Layout/Auth/Register'
import HomePage from './pages/HomePage'
import DashboardsPage from './pages/DashboardsPage'
import SettingsPage from './pages/SettingsPage'
import Loading from './components/Common/Loading'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <Loading />
  }
  
  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <Loading />
  }
  
  return !user ? children : <Navigate to="/" />
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<HomePage />} />
          <Route path="dashboards" element={<DashboardsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Back-compat routes */}
          <Route path="workspaces" element={<Navigate to="/dashboards" replace />} />
          <Route path="create" element={<Navigate to="/dashboards" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App