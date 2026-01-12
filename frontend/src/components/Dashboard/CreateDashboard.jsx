import { useState, useEffect } from 'react'
import { BarChart3, Loader2, ExternalLink } from 'lucide-react'
import { workspaceAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function CreateDashboard({ onCancel }) {
  const [workspaces, setWorkspaces] = useState([])
  const [fetchingWorkspaces, setFetchingWorkspaces] = useState(true)
  const [selectedWorkspace, setSelectedWorkspace] = useState('')

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll()
      setWorkspaces(response.data)
      if (response.data.length > 0) {
        setSelectedWorkspace(response.data[0].id)
      }
    } catch (error) {
      toast.error('Failed to load workspaces')
    } finally {
      setFetchingWorkspaces(false)
    }
  }

  const handleCreateClick = async () => {
    try {
      // 1. Request the SSO Magic Link for the specific workspace
      const response = await workspaceAPI.getPortalUrl(selectedWorkspace);
      
      // 2. Open the Metabase Creator in a new tab
      window.open(response.data.url, '_blank');
      
      // 3. Notify user and close the modal/view
      toast.success('Opening Dashboard Creator...');
      onCancel();
    } catch (error) {
      toast.error('Could not open the creator. Please try again.');
    }
  };

  if (fetchingWorkspaces) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-2" />
        <p className="text-gray-500 text-sm">Loading workspaces...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Open Dashboard Creator</h2>
        <p className="text-gray-500 text-sm mt-1">
          You will be redirected to the Metabase editor to build your dashboard.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700">Select Workspace</label>
        <select
          value={selectedWorkspace}
          onChange={(e) => setSelectedWorkspace(e.target.value)}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>

        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          <strong>Tip:</strong> Once you save your dashboard in the new tab, it will appear in your dashboards list automatically.
        </div>
      </div>

      <div className="flex items-center space-x-3 pt-4">
        <button onClick={onCancel} className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl">
          Cancel
        </button>
        <button onClick={handleCreateClick} className="flex-1 btn-primary py-3 flex items-center justify-center">
          <ExternalLink className="w-4 h-4 mr-2" />
          Launch Creator
        </button>
      </div>
    </div>
  )
}