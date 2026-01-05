import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Search, Users, BarChart3 } from 'lucide-react'
import { workspaceAPI, dashboardAPI } from '../services/api'
import Loading from '../components/Common/Loading'
import Modal from '../components/Common/Modal'
import toast from 'react-hot-toast'
import { generateSlug } from '../utils/helpers'

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newWorkspace, setNewWorkspace] = useState({ name: '', slug: '' })

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll()
      setWorkspaces(response.data)
    } catch (error) {
      toast.error('Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkspace = async (e) => {
    e.preventDefault()
    setCreating(true)

    try {
      await workspaceAPI.create(newWorkspace)
      toast.success('Workspace created successfully!')
      setShowCreateModal(false)
      setNewWorkspace({ name: '', slug: '' })
      loadWorkspaces()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  const filteredWorkspaces = workspaces.filter((workspace) =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workspace.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <Loading fullScreen={false} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-gray-600 mt-1">
            Manage and organize your analytics workspaces
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Workspaces Grid */}
      {filteredWorkspaces.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first workspace to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Workspace</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkspaces.map((workspace, index) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Workspace"
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              value={newWorkspace.name}
              onChange={(e) => {
                const name = e.target.value
                setNewWorkspace({
                  name,
                  slug: generateSlug(name),
                })
              }}
              className="input-field"
              placeholder="e.g., Marketing Analytics"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Slug
            </label>
            <input
              type="text"
              value={newWorkspace.slug}
              onChange={(e) =>
                setNewWorkspace({ ...newWorkspace, slug: e.target.value })
              }
              className="input-field"
              placeholder="e.g., marketing-analytics"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used in URLs and must be unique
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 btn-secondary"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function WorkspaceCard({ workspace, index }) {
  const [dashboardCount, setDashboardCount] = useState(0)

  useEffect(() => {
    loadDashboardCount()
  }, [])

  const loadDashboardCount = async () => {
    try {
      const response = await dashboardAPI.getAll(workspace.id)
      setDashboardCount(response.data.length)
    } catch (error) {
      console.error('Error loading dashboard count:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="card hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
          <Briefcase className="w-7 h-7 text-white" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">{workspace.name}</h3>
      <p className="text-sm text-gray-600 mb-4">/{workspace.slug}</p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <BarChart3 className="w-4 h-4" />
            <span>{dashboardCount} dashboards</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>1 member</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}