import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, BarChart3, Plus } from 'lucide-react'
import { workspaceAPI, dashboardAPI } from '../services/api'
import toast from 'react-hot-toast'
import { generateSlug } from '../utils/helpers'
import { useNavigate } from 'react-router-dom'

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState('workspace')
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [workspaceForm, setWorkspaceForm] = useState({
    name: '',
    slug: '',
  })

  const [dashboardForm, setDashboardForm] = useState({
    workspace_id: '',
    name: '',
  })

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadWorkspaces()
    }
  }, [activeTab])

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll()
      setWorkspaces(response.data)
      if (response.data.length > 0) {
        setDashboardForm({ ...dashboardForm, workspace_id: response.data[0].id })
      }
    } catch (error) {
      toast.error('Failed to load workspaces')
    }
  }

  const handleCreateWorkspace = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await workspaceAPI.create(workspaceForm)
      toast.success('Workspace created successfully!')
      setWorkspaceForm({ name: '', slug: '' })
      setTimeout(() => {
        navigate('/workspaces')
      }, 1500)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDashboard = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await dashboardAPI.create(dashboardForm)
      toast.success('Dashboard created successfully!')
      setDashboardForm({ ...dashboardForm, name: '' })
      setTimeout(() => {
        navigate('/dashboards')
      }, 1500)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New</h1>
        <p className="text-gray-600">
          Create a new workspace or dashboard for your analytics
        </p>
      </div>

      {/* Tab Selector */}
      <div className="card">
        <div className="flex space-x-2 p-2 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'workspace'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Briefcase className="w-5 h-5" />
              <span>New Workspace</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>New Dashboard</span>
            </div>
          </button>
        </div>
      </div>

      {/* Forms */}
      <div className="card">
        {activeTab === 'workspace' ? (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Create Workspace
              </h2>
              <p className="text-gray-600">
                Workspaces help you organize your dashboards and collaborate with your team
              </p>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={workspaceForm.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setWorkspaceForm({
                      name,
                      slug: generateSlug(name),
                    })
                  }}
                  className="input-field"
                  placeholder="e.g., Marketing Analytics"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a descriptive name for your workspace
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={workspaceForm.slug}
                  onChange={(e) =>
                    setWorkspaceForm({ ...workspaceForm, slug: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g., marketing-analytics"
                  required
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens are allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be used in URLs. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• A new workspace will be created</li>
                  <li>• A Metabase group will be automatically set up</li>
                  <li>• A collection will be created for your dashboards</li>
                  <li>• You can start creating dashboards immediately</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/workspaces')}
                  className="flex-1 btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Create Dashboard
              </h2>
              <p className="text-gray-600">
                Create a new dashboard to visualize and analyze your data
              </p>
            </div>

            {workspaces.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-800 mb-4">
                  You need to create a workspace first before creating a dashboard
                </p>
                <button
                  onClick={() => setActiveTab('workspace')}
                  className="btn-primary"
                >
                  Create Workspace
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateDashboard} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Workspace <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dashboardForm.workspace_id}
                    onChange={(e) =>
                      setDashboardForm({
                        ...dashboardForm,
                        workspace_id: parseInt(e.target.value),
                      })
                    }
                    className="input-field"
                    required
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The dashboard will be created in this workspace
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dashboard Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dashboardForm.name}
                    onChange={(e) =>
                      setDashboardForm({ ...dashboardForm, name: e.target.value })
                    }
                    className="input-field"
                    placeholder="e.g., Sales Report Q1 2024"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Give your dashboard a clear, descriptive name
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• A new dashboard will be created in Metabase</li>
                    <li>• The dashboard will be embedded and ready to use</li>
                    <li>• You can add queries, charts, and visualizations</li>
                    <li>• Share it with your team members</li>
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboards')}
                    className="flex-1 btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Dashboard'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </div>

      {/* Help Section */}
      <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
        <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Learn more about workspaces and dashboards in our documentation
        </p>
        <button className="btn-secondary text-sm">
          View Documentation
        </button>
      </div>
    </div>
  )
}