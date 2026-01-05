import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, BarChart3, Users, Calendar } from 'lucide-react'
import { dashboardAPI } from '../../services/api'
import { formatDate } from '../../utils/helpers'

export default function WorkspaceCard({ workspace, index }) {
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

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Created {formatDate(workspace.created_at)}</span>
        </div>
      </div>

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