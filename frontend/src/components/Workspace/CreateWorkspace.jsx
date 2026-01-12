import { useState } from 'react'
import { Briefcase, Loader2 } from 'lucide-react'
import { workspaceAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function CreateWorkspace({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await workspaceAPI.create(formData)
      toast.success('Workspace created successfully!')
      onSuccess(response.data)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create New Workspace
        </h2>
        <p className="text-gray-600">
          Organize your dashboards and collaborate with your team
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            className="input-field"
            placeholder="e.g., Marketing Analytics"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-field"
            placeholder="Optional workspace description"
            rows="3"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-2">Backend Automation</h4>
        <ul className="text-xs text-blue-700 space-y-1.5">
          <li className="flex items-center">• Automatically creates Metabase Groups</li>
          <li className="flex items-center">• Provisions a new Dashboard Collection</li>
          <li className="flex items-center">• Sets up multi-tenant permissions</li>
        </ul>
      </div>

      <div className="flex space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 btn-primary py-2.5 flex items-center justify-center"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Workspace'}
        </button>
      </div>
    </form>
  )
}