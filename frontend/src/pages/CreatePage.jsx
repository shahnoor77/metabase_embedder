import { useState } from 'react'
import { motion } from 'framer-motion'
import { Briefcase } from 'lucide-react'
import { workspaceAPI } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function CreatePage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [workspaceForm, setWorkspaceForm] = useState({
    name: '',
    description: '',
  })

  const handleCreateWorkspace = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await workspaceAPI.create(workspaceForm)
      toast.success('Workspace created successfully!')
      setWorkspaceForm({ name: '', description: '' })
      setTimeout(() => {
        navigate('/workspaces')
      }, 1500)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Workspace</h1>
        <p className="text-gray-600">
          Create a new workspace for your analytics
        </p>
      </div>

      {/* Forms */}
      <div className="card">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                  onChange={(e) =>
                    setWorkspaceForm({
                      ...workspaceForm,
                      name: e.target.value,
                    })
                  }
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
                  Description
                </label>
                <input
                  type="text"
                  value={workspaceForm.description}
                  onChange={(e) =>
                    setWorkspaceForm({
                      ...workspaceForm,
                      description: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="Optional description"
                />
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
      </div>

      {/* Help Section */}
      <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
        <h3 className="font-bold text-gray-900 mb-2">Note about Dashboards</h3>
        <p className="text-sm text-gray-600 mb-4">
          Dashboards are created directly in Metabase. Once created, they will automatically sync to your workspace. Open your workspace in Metabase to create dashboards.
        </p>
      </div>
    </div>
  )
}