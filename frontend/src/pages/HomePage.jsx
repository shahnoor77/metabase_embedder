import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, Briefcase, TrendingUp, Users, Plus, ArrowRight } from 'lucide-react'
import { workspaceAPI, dashboardAPI } from '../services/api'
import Loading from '../components/Common/Loading'
import toast from 'react-hot-toast'

export default function HomePage() {
  const [stats, setStats] = useState({
    workspaces: 0,
    dashboards: 0,
    loading: true,
  })
  const [recentWorkspaces, setRecentWorkspaces] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const workspacesRes = await workspaceAPI.getAll()
      const workspaces = workspacesRes.data

      let totalDashboards = 0
      for (const workspace of workspaces.slice(0, 3)) {
        try {
          const dashRes = await dashboardAPI.getAll(workspace.id)
          totalDashboards += dashRes.data.length
        } catch (err) {
          console.error('Error loading dashboards:', err)
        }
      }

      setStats({
        workspaces: workspaces.length,
        dashboards: totalDashboards,
        loading: false,
      })
      setRecentWorkspaces(workspaces.slice(0, 4))
    } catch (error) {
      toast.error('Failed to load dashboard data')
      setStats({ ...stats, loading: false })
    }
  }

  if (stats.loading) {
    return <Loading fullScreen={false} />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Your Analytics Hub
        </h1>
        <p className="text-gray-600">
          Manage your workspaces, create dashboards, and analyze your data
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Workspaces"
          value={stats.workspaces}
          icon={Briefcase}
          color="blue"
          trend="+12%"
        />
        <StatsCard
          title="Total Dashboards"
          value={stats.dashboards}
          icon={BarChart3}
          color="green"
          trend="+8%"
        />
        <StatsCard
          title="Active Users"
          value="1"
          icon={Users}
          color="purple"
          trend="+5%"
        />
        <StatsCard
          title="Data Sources"
          value="2"
          icon={TrendingUp}
          color="orange"
          trend="+3%"
        />
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Create Workspace"
            description="Start a new workspace for your team"
            icon={Briefcase}
            to="/create"
            color="blue"
          />
          <QuickActionCard
            title="New Dashboard"
            description="Build a dashboard with your data"
            icon={BarChart3}
            to="/create"
            color="green"
          />
          <QuickActionCard
            title="View All"
            description="Browse all your workspaces"
            icon={ArrowRight}
            to="/workspaces"
            color="purple"
          />
        </div>
      </div>

      {/* Recent Workspaces */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Workspaces</h2>
          <Link
            to="/workspaces"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No workspaces yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first workspace to get started
            </p>
            <Link to="/create" className="btn-primary inline-flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Create Workspace</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentWorkspaces.map((workspace, index) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <ActivityItem
            action="Workspace created"
            item="Marketing Analytics"
            time="2 hours ago"
          />
          <ActivityItem
            action="Dashboard created"
            item="Sales Report Q1"
            time="5 hours ago"
          />
          <ActivityItem
            action="Data source connected"
            item="SQL Server Analytics"
            time="1 day ago"
          />
        </div>
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, color, trend }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-green-600 mt-2">{trend} from last month</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  )
}

function QuickActionCard({ title, description, icon: Icon, to, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
  }

  return (
    <Link to={to}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary-300 transition-all cursor-pointer"
      >
        <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </motion.div>
    </Link>
  )
}

function WorkspaceCard({ workspace, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link to={`/workspaces`}>
        <div className="p-6 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">{workspace.name}</h3>
          <p className="text-sm text-gray-600">{workspace.slug}</p>
        </div>
      </Link>
    </motion.div>
  )
}

function ActivityItem({ action, item, time }) {
  return (
    <div className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
        <BarChart3 className="w-5 h-5 text-primary-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{action}</span> - {item}
        </p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  )
}