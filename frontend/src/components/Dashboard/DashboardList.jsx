import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import DashboardCard from './DashboardCard'

export default function DashboardList({ dashboards, onView, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (dashboards.length === 0) {
    return (
      <div className="card text-center py-16">
        <BarChart3 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          No dashboards yet
        </h3>
        <p className="text-gray-600">
          Create your first dashboard to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dashboards.map((dashboard, index) => (
        <DashboardCard
          key={dashboard.id}
          dashboard={dashboard}
          index={index}
          onView={onView}
        />
      ))}
    </div>
  )
}