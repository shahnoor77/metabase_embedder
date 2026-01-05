import { NavLink } from 'react-router-dom'
import { Home, Briefcase, BarChart3, Plus, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/workspaces', icon: Briefcase, label: 'Workspaces' },
  { path: '/dashboards', icon: BarChart3, label: 'Dashboards' },
  { path: '/create', icon: Plus, label: 'Create New' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-1 h-8 bg-primary-600 rounded-r"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-8">
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white">
          <h3 className="font-bold mb-2">Need Help?</h3>
          <p className="text-sm text-primary-100 mb-4">
            Check our documentation and tutorials
          </p>
          <button className="w-full bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors">
            View Docs
          </button>
        </div>
      </div>
    </aside>
  )
}