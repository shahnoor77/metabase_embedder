import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, BarChart3, Edit2, Eye, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import Loading from '../components/Common/Loading'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function DashboardsPage() {
  const navigate = useNavigate()
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    workspace_id: null
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      
      // Fetch workspaces
      const wsRes = await axios.get(`${API_BASE_URL}/api/workspaces`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setWorkspaces(wsRes.data)
      
      // Fetch user's dashboards
      const dashRes = await axios.get(`${API_BASE_URL}/api/dashboards/my-dashboards`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDashboards(dashRes.data)
    } catch (error) {
      toast.error('Failed to load dashboards')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDashboard = async (e) => {
    e.preventDefault()
    
    if (!createForm.name.trim()) {
      toast.error('Dashboard name is required')
      return
    }
    
    if (!createForm.workspace_id) {
      toast.error('Please select a workspace')
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      
      const response = await axios.post(
        `${API_BASE_URL}/api/dashboards`,
        {
          name: createForm.name,
          description: createForm.description,
          workspace_id: createForm.workspace_id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      toast.success('Dashboard created successfully!')
      setDashboards([...dashboards, response.data])
      setCreateForm({ name: '', description: '', workspace_id: null })
      setShowCreateModal(false)
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create dashboard')
    }
  }

  const handleDeleteDashboard = async (dashboardId) => {
    if (!window.confirm('Are you sure you want to delete this dashboard?')) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      await axios.delete(
        `${API_BASE_URL}/api/dashboards/${dashboardId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      toast.success('Dashboard deleted')
      setDashboards(dashboards.filter(d => d.id !== dashboardId))
    } catch (error) {
      toast.error('Failed to delete dashboard')
    }
  }

  const handleViewDashboard = (dashboardId) => {
    navigate(`/dashboard/${dashboardId}/view`)
  }

  const handleEditDashboard = (dashboardId) => {
    navigate(`/dashboard/${dashboardId}/edit`)
  }

  if (loading) {
    return <Loading fullScreen={false} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Dashboards</h1>
          <p className="text-gray-600 mt-1">Create and manage your analytics dashboards</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary inline-flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create Dashboard</span>
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Dashboard</h2>
            
            <form onSubmit={handleCreateDashboard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.workspace_id || ''}
                  onChange={(e) => setCreateForm({
                    ...createForm,
                    workspace_id: parseInt(e.target.value)
                  })}
                  className="input-field"
                  required
                >
                  <option value="">Select a workspace...</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dashboard Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  className="input-field"
                  placeholder="e.g., Sales Dashboard"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  className="input-field"
                  placeholder="Optional description"
                  rows="3"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Create Dashboard
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Dashboards Grid */}
      {dashboards.length === 0 ? (
        <div className="card text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards yet</h3>
          <p className="text-gray-600 mb-6">Create your first dashboard to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Dashboard</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((dashboard, index) => (
            <motion.div
              key={dashboard.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary-600" />
                </div>
                {dashboard.is_owner && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                    Owner
                  </span>
                )}
              </div>

              <h3 className="font-bold text-gray-900 mb-1">{dashboard.metabase_dashboard_name}</h3>
              
              {dashboard.description && (
                <p className="text-sm text-gray-600 mb-4">{dashboard.description}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  {dashboard.is_published ? (
                    <span className="text-xs text-green-600">✓ Published</span>
                  ) : (
                    <span className="text-xs text-gray-500">Draft</span>
                  )}
                </div>

                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleViewDashboard(dashboard.id)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-primary-600"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {dashboard.is_owner && (
                    <>
                      <button
                        onClick={() => handleEditDashboard(dashboard.id)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-primary-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteDashboard(dashboard.id)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}