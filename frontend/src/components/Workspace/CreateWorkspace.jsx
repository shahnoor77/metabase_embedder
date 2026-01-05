import { useState } from 'react'
import { Briefcase } from 'lucide-react'
import { workspaceAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { generateSlug } from '../../utils/helpers'

export default function CreateWorkspace({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
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

  const handleNameChange = (e) => {
    const name = e.target.value
    setFormData({
      name,
      slug: generateSlug(name),
    })
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
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          className="input-field"
          placeholder="e.g., marketing-analytics"
          required
          pattern="[a-z0-9-]+"
          title="Only lowercase letters, numbers, and hyphens are allowed"
        />
        <p className="text-xs text-gray-500 mt-1">
          Used in URLs. Only lowercase letters, numbers, and hyphens.
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
          {loading ? 'Creating...' : 'Create Workspace'}
        </button>
      </div>
    </form>
  )
}