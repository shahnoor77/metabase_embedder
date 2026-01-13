import { motion } from 'framer-motion'
import { User, Lock, Bell, Database, HelpCircle } from 'lucide-react'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function SettingsPage() {
  const { user } = useContext(AuthContext)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-600">Update your personal details</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              className="input-field"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Your full name"
              className="input-field"
            />
          </div>

          <button className="btn-primary">Save Changes</button>
        </div>
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Security</h2>
            <p className="text-sm text-gray-600">Manage your password and security settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              placeholder="Enter current password"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new password"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              className="input-field"
            />
          </div>

          <button className="btn-primary">Update Password</button>
        </div>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-600">Configure your notification preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <NotificationToggle
            label="Email Notifications"
            description="Receive email updates about your dashboards"
          />
          <NotificationToggle
            label="Dashboard Updates"
            description="Get notified when dashboards are shared with you"
          />
          <NotificationToggle
            label="System Alerts"
            description="Receive important system notifications"
          />
        </div>
      </motion.div>

      {/* Data Sources Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Data Sources</h2>
            <p className="text-sm text-gray-600">Connected databases and data sources</p>
          </div>
        </div>

        <div className="space-y-3">
          <DataSourceItem
            name="SQL Server Analytics"
            type="Microsoft SQL Server"
            status="Connected"
          />
          <DataSourceItem
            name="PostgreSQL Analytics"
            type="PostgreSQL"
            status="Connected"
          />
        </div>
      </motion.div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Need Help?</h3>
            <p className="text-sm text-gray-600">
              Visit our help center or contact support
            </p>
          </div>
          <button className="btn-primary">Get Support</button>
        </div>
      </motion.div>
    </div>
  )
}

function NotificationToggle({ label, description }) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" defaultChecked />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
      </label>
    </div>
  )
}

function DataSourceItem({ name, type, status }) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Database className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-600">{type}</p>
        </div>
      </div>
      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
        {status}
      </span>
    </div>
  )
}