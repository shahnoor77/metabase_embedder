import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Common/ProtectedRoute'

// Pages
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import CreatePage from './pages/CreatePage'
import WorkspacesPage from './pages/WorkspacesPage'
import WorkspaceDetailPage from './pages/WorkspaceDetailPage'
import DashboardsPage from './pages/DashboardsPage'
import DashboardViewPage from './pages/DashboardViewPage'
import DashboardEditPage from './pages/DashboardEditPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { isAuthenticated } = useContext(AuthContext)

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/workspaces/:id" element={<WorkspaceDetailPage />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboards" element={<DashboardsPage />} />
            <Route path="/dashboard/:dashboardId/view" element={<DashboardViewPage />} />
            <Route path="/dashboard/:dashboardId/edit" element={<DashboardEditPage />} />
            
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}