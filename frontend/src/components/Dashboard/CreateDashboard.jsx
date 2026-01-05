import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { workspaceAPI, dashboardAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function CreateDashboard({ onSuccess, onCancel }) {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    workspace_id: '',
    name: '',
  })

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll()
      const workspaceData = response.data
      setWorkspaces(workspaceData)
      if (workspaceData.length > 0) {
        setFormData({ ...formData, workspace_id: workspaceData[0].id })
      }
    } catch (error) {
      toast.error('Failed to load workspaces')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await dashboardAPI.create(formData)
      toast.success('Dashboard created successfully!')
      onSuccess(response.data)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (workspaces.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 mb-4">
          You need to create a workspace first before creating a dashboard
        </p>
        <button onClick={onCancel} className="btn-primary">
          Go Back
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create New Dashboard
        </h2>
        <p className="text-gray-600">
          Create a new dashboard to visualize your data
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Workspace <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.workspace_id}
          onChange={(e) =>
            setFormData({ ...formData, workspace_id: parseInt(e.target.value) })
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dashboard Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-field"
          placeholder="e.g., Sales Report Q1 2024"
          required
        />
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
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
  )
}