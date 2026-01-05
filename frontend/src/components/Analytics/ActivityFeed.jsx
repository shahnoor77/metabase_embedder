import { BarChart3, Briefcase, Plus } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

export default function ActivityFeed({ activities = [] }) {
  const getIcon = (type) => {
    switch (type) {
      case 'workspace':
        return Briefcase
      case 'dashboard':
        return BarChart3
      default:
        return Plus
    }
  }

  const defaultActivities = [
    {
      id: 1,
      type: 'workspace',
      action: 'Workspace created',
      item: 'Marketing Analytics',
      time: new Date().toISOString(),
    },
    {
      id: 2,
      type: 'dashboard',
      action: 'Dashboard created',
      item: 'Sales Report Q1',
      time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ]

  const displayActivities = activities.length > 0 ? activities : defaultActivities

  return (
    <div className="space-y-4">
      {displayActivities.map((activity) => {
        const Icon = getIcon(activity.type)
        return (
          <div
            key={activity.id}
            className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.action}</span> - {activity.item}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(activity.time)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}