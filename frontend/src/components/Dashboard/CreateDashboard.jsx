import { useState, useEffect } from 'react'
import { BarChart3, Loader2 } from 'lucide-react'
import { workspaceAPI, dashboardAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function CreateDashboard({ onSuccess, onCancel }) {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingWorkspaces, setFetchingWorkspaces] = useState(true)
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
        setFormData((prev) => ({ ...prev, workspace_id: workspaceData[0].id }))
      }
    } catch (error) {
      toast.error('Failed to load workspaces')
    } finally {
      setFetchingWorkspaces(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Dashboard creation is not available via API
    // Dashboards must be created directly in Metabase
    toast.error('Dashboard creation is not available via API. Please create dashboards directly in Metabase by opening your workspace.')
    onCancel()
  }

  if (fetchingWorkspaces) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-2" />
        <p className="text-gray-500 text-sm">Loading workspaces...</p>
      </div>
    )
  }

  if (workspaces.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
        <p className="text-yellow-800 mb-6 font-medium">
          You need to create a workspace first before creating a dashboard.
        </p>
        <button onClick={onCancel} className="btn-primary px-8">
          Go Back
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">New Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">
          This will create a new dashboard entry in your workspace.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Target Workspace
          </label>
          <select
            value={formData.workspace_id}
            onChange={(e) =>
              setFormData({ ...formData, workspace_id: e.target.value })
            }
            className="input-field bg-gray-50 border-gray-200 focus:bg-white"
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
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Dashboard Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input-field bg-gray-50 border-gray-200 focus:bg-white"
            placeholder="e.g. Weekly Sales Performance"
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 btn-primary py-3 flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            'Create Dashboard'
          )}
        </button>
      </div>
    </form>
  )
}