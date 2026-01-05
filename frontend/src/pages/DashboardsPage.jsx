import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, Search, ExternalLink, Maximize2, X } from 'lucide-react'
import { workspaceAPI, dashboardAPI } from '../services/api'
import Loading from '../components/Common/Loading'
import toast from 'react-hot-toast'

export default function DashboardsPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingDashboard, setViewingDashboard] = useState(null)

  useEffect(() => {
    loadWorkspaces()
  }, [])

  useEffect(() => {
    if (selectedWorkspace) {
      loadDashboards()
    }
  }, [selectedWorkspace])

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll()
      const workspaceData = response.data
      setWorkspaces(workspaceData)
      if (workspaceData.length > 0) {
        setSelectedWorkspace(workspaceData[0])
      }
    } catch (error) {
      toast.error('Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboards = async () => {
    if (!selectedWorkspace) return

    try {
      const response = await dashboardAPI.getAll(selectedWorkspace.id)
      setDashboards(response.data)
    } catch (error) {
      toast.error('Failed to load dashboards')
    }
  }

  const handleViewDashboard = async (dashboard) => {
    try {
      const response = await dashboardAPI.getById(dashboard.id)
      setViewingDashboard(response.data)
    } catch (error) {
      toast.error('Failed to load dashboard details')
    }
  }

  const filteredDashboards = dashboards.filter((dashboard) =>
    dashboard.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <Loading fullScreen={false} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboards</h1>
        <p className="text-gray-600 mt-1">
          View and manage all your analytics dashboards
        </p>
      </div>

      {workspaces.length > 0 && (
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Workspace
          </label>
          <select
            value={selectedWorkspace?.id || ''}
            onChange={(e) => {
              const workspace = workspaces.find(
                (w) => w.id === parseInt(e.target.value)
              )
              setSelectedWorkspace(workspace)
            }}
            className="input-field"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {dashboards.length > 0 && (
        <div className="card">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dashboards..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      )}

      {filteredDashboards.length === 0 ? (
        <div className="card text-center py-16">
          <BarChart3 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery ? 'No dashboards found' : 'No dashboards in this workspace'}
          </h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search query' : 'Create your first dashboard to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDashboards.map((dashboard, index) => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              index={index}
              onView={handleViewDashboard}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {viewingDashboard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingDashboard(null)}
              className="fixed inset-0 bg-black bg-opacity-75 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 z-50 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">
                  {viewingDashboard.name}
                </h2>
                <div className="flex items-center space-x-2">
                  <a
                    href={viewingDashboard.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-5 h-5 text-gray-600" />
                  </a>
                  <button
                    onClick={() => setViewingDashboard(null)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {viewingDashboard.embed_url ? (
                  <iframe
                    src={viewingDashboard.embed_url}
                    className="w-full h-full border-0"
                    title={viewingDashboard.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No embed URL available</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function DashboardCard({ dashboard, index, onView }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="card hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-white" />
        </div>
        <button
          onClick={() => onView(dashboard)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Maximize2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">{dashboard.name}</h3>
      <p className="text-sm text-gray-600 mb-4">
        ID: {dashboard.metabase_dashboard_id}
      </p>

      <button
        onClick={() => onView(dashboard)}
        className="w-full btn-primary"
      >
        View Dashboard
      </button>
    </motion.div>
  )
}