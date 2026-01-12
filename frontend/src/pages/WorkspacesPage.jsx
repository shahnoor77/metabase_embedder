import { useState, useEffect } from 'react'
import { Briefcase, Plus, Search, Grid, List } from 'lucide-react'
import { workspaceAPI } from '../services/api'
import Loading from '../components/Common/Loading'
import Modal from '../components/Common/Modal'
import WorkspaceCard from '../components/Workspace/WorkspaceCard'
import WorkspaceViewer from '../components/Workspace/WorkspaceViewer'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '' })

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
      const response = await workspaceAPI.create(newWorkspace)
      toast.success('Workspace created successfully!')
      setShowCreateModal(false)
      setNewWorkspace({ name: '', description: '' })
      loadWorkspaces()
      
      // Optionally navigate to the new workspace
      // navigate(`/workspaces/${response.data.id}`)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  const filteredWorkspaces = workspaces.filter((workspace) =>
    (workspace.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workspace.description || '').toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Grid view"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Workspaces Grid/List */}
      {filteredWorkspaces.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first workspace to get started with analytics'}
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
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }>
          {filteredWorkspaces.map((workspace, index) => (
            viewMode === 'grid' ? (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                index={index}
              />
            ) : (
              <WorkspaceListItem
                key={workspace.id}
                workspace={workspace}
              />
            )
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
              onChange={(e) =>
                setNewWorkspace({ ...newWorkspace, name: e.target.value })
              }
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
              value={newWorkspace.description}
              onChange={(e) =>
                setNewWorkspace({ ...newWorkspace, description: e.target.value })
              }
              className="input-field"
              placeholder="Optional workspace description"
              rows="3"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What's included:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Private Metabase collection</li>
              <li>• Full dashboard creation access</li>
              <li>• SQL query builder</li>
              <li>• Team collaboration tools</li>
              <li>• Automatic permission setup</li>
            </ul>
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

function WorkspaceListItem({ workspace }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [embedUrl, setEmbedUrl] = useState(null)

  const handleOpen = async () => {
    setLoading(true)
    try {
      const response = await workspaceAPI.getEmbedUrl(workspace.id)
      const url = response.data.url
      if (url) {
        setEmbedUrl(url)
        setShowViewer(true)
        toast.success('Opening Metabase workspace...')
      } else {
        toast.error('No embed URL returned')
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to open workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{workspace.name}</h3>
            {workspace.description && (
              <p className="text-sm text-gray-600">{workspace.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleOpen}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? 'Opening...' : 'Open'}
        </button>
      </div>

      {/* Workspace Viewer Modal */}
      {showViewer && embedUrl && (
        <WorkspaceViewer
          workspace={workspace}
          embedUrl={embedUrl}
          onClose={() => {
            setShowViewer(false)
            setEmbedUrl(null)
          }}
        />
      )}
    </div>
  )
}