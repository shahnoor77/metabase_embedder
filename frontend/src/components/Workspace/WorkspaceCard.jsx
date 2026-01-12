import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, BarChart3, Users, Calendar, ExternalLink, Loader2 } from 'lucide-react'
import { dashboardAPI, workspaceAPI } from '../../services/api'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function WorkspaceCard({ workspace, index }) {
  const [dashboardCount, setDashboardCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDashboardCount()
  }, [])

  const loadDashboardCount = async () => {
    try {
      const response = await dashboardAPI.getAll(workspace.id)
      setDashboardCount(response.data.length)
    } catch (error) {
      console.error('Count error:', error)
    }
  }

  const handleOpenMetabase = async (e) => {
    e.stopPropagation()
    setLoading(true)

    try {
      const response = await workspaceAPI.getEmbedUrl(workspace.id)
      const url = response.data.url || response.data.external_link

      if (url) {
        toast.success('Redirecting to Metabase...')
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('Metabase is not yet configured for this workspace')
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to retrieve Metabase session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card hover:shadow-xl transition-all group border border-gray-100"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
          <Briefcase className="w-7 h-7" />
        </div>
        <button
          onClick={handleOpenMetabase}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
        </button>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-1">{workspace.name}</h3>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
        {workspace.description || 'Standard analytics workspace for team collaboration.'}
      </p>

      <div className="flex items-center space-x-4 py-3 border-y border-gray-50 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <BarChart3 className="w-4 h-4 mr-1.5 text-primary-500" />
          <span className="font-semibold">{dashboardCount}</span>
          <span className="ml-1 text-gray-400 font-normal">Dashboards</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-1.5 text-blue-500" />
          <span className="font-semibold">1</span>
          <span className="ml-1 text-gray-400 font-normal">Member</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-400">
          <Calendar className="w-3.5 h-3.5 mr-1" />
          {formatDate(workspace.created_at)}
        </div>
        <button
          onClick={handleOpenMetabase}
          className="text-sm font-bold text-primary-600 hover:text-primary-700"
        >
          Enter Workspace →
        </button>
      </div>
    </motion.div>
  )
}