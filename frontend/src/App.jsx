import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import HomePage from './pages/HomePage'
import WorkspacesPage from './pages/WorkspacesPage'
import DashboardsPage from './pages/DashboardsPage'
import CreatePage from './pages/CreatePage'
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
          <Route path="workspaces" element={<WorkspacesPage />} />
          <Route path="dashboards" element={<DashboardsPage />} />
          <Route path="create" element={<CreatePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App