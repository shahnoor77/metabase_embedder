import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { workspaceAPI, dashboardAPI } from '../services/api'
import Loading from '../components/Common/Loading'
import DashboardCard from '../components/Dashboard/DashboardCard'
import DashboardViewer from '../components/Dashboard/DashboardViewer'
import toast from 'react-hot-toast'

export default function DashboardsPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingDashboard, setViewingDashboard] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newDashboard, setNewDashboard] = useState({ name: '' })

  useEffect(() => {
    loadWorkspaces()
  }, [])

  useEffect(() => {
    if (selectedWorkspace) {
      loadDashboards()
    }
  }, [selectedWorkspace])

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll()
      if (response.data.length > 0) {
        setWorkspaces(response.data)
        setSelectedWorkspace(response.data[0])
      }
    } catch (error) {
      toast.error('Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboards = async () => {
    try {
      // Now using the workspace ID in the path
      const response = await dashboardAPI.getAll(selectedWorkspace.id)
      setDashboards(response.data)
    } catch (error) {
      toast.error('Failed to load dashboards')
    }
  }

  const handleViewDashboard = async (dashboard) => {
    const loadingToast = toast.loading('Securing connection...')
    try {
      // Fetch the signed JWT URL from the backend
      const response = await dashboardAPI.getEmbedUrl(dashboard.id)
      setViewingDashboard({
        ...dashboard,
        embed_url: response.data.url // The signed Metabase URL
      })
      toast.dismiss(loadingToast)
    } catch (error) {
      toast.error('Failed to generate secure embed link')
      toast.dismiss(loadingToast)
    }
  }

  const filteredDashboards = dashboards.filter((d) =>
    (d.metabase_dashboard_name || d.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <Loading fullScreen={false} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-600 mt-1">
            Create dashboards in this workspace and view them here.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
          disabled={!selectedWorkspace}
        >
          <span>New Dashboard</span>
        </button>
      </div>

      {workspaces.length > 0 && (
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">Workspace</label>
          <select
            value={selectedWorkspace?.id || ''}
            onChange={(e) => setSelectedWorkspace(workspaces.find(w => w.id === parseInt(e.target.value)))}
            className="input-field"
          >
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDashboards.map((d, i) => (
          <DashboardCard key={d.id} dashboard={d} index={i} onView={handleViewDashboard} />
        ))}
      </div>

      <AnimatePresence>
        {viewingDashboard && (
          <DashboardViewer dashboard={viewingDashboard} onClose={() => setViewingDashboard(null)} />
        )}
      </AnimatePresence>

      {showCreateModal && (
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Dashboard</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!selectedWorkspace) return
              setCreating(true)
              try {
                await dashboardAPI.create({
                  workspace_id: selectedWorkspace.id,
                  name: newDashboard.name,
                })
                toast.success('Dashboard created successfully!')
                setShowCreateModal(false)
                setNewDashboard({ name: '' })
                loadDashboards()
              } catch (error) {
                toast.error(error.response?.data?.detail || 'Failed to create dashboard')
              } finally {
                setCreating(false)
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Sales Overview"
                value={newDashboard.name}
                onChange={(e) => setNewDashboard({ name: e.target.value })}
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}