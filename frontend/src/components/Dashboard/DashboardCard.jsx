import { motion } from 'framer-motion'
import { BarChart3, Maximize2, Calendar, User } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

export default function DashboardCard({ dashboard, index, onView }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="card hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <BarChart3 className="w-7 h-7 text-white" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onView(dashboard)
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
          <Maximize2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
        {dashboard.name}
      </h3>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Created {formatDate(dashboard.created_at)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <User className="w-4 h-4 mr-2" />
          <span>ID: {dashboard.metabase_dashboard_id}</span>
        </div>
      </div>

      <button
        onClick={() => onView(dashboard)}
        className="w-full btn-primary"
      >
        View Dashboard
      </button>
    </motion.div>
  )
}