import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { dashboardAPI } from '../services/api'
import Loading from '../components/Common/Loading'
import DashboardCard from '../components/Dashboard/DashboardCard'
import DashboardViewer from '../components/Dashboard/DashboardViewer'
import toast from 'react-hot-toast'

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingDashboard, setViewingDashboard] = useState(null)

  useEffect(() => {
    loadDashboards()
  }, [])

  const loadDashboards = async () => {
    try {
      const response = await dashboardAPI.getAll()
      setDashboards(response.data)
    } catch (error) {
      toast.error('Failed to load dashboards')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDashboard = async (dashboard) => {
    const loadingToast = toast.loading('Securing connection...')
    try {
      // Fetch the signed JWT URL from the backend
      const response = await dashboardAPI.getEmbedUrl(dashboard.id)
      setViewingDashboard({
        ...dashboard,
        embed_url: response.data.url // The signed Metabase URL
      })
      toast.dismiss(loadingToast)
    } catch (error) {
      toast.error('Failed to generate secure embed link')
      toast.dismiss(loadingToast)
    }
  }

  const filteredDashboards = dashboards.filter((d) =>
    (d.metabase_dashboard_name || d.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <Loading fullScreen={false} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-600 mt-1">
            View and create dashboards.
          </p>
        </div>
        <button
          onClick={async () => {
            const loadingToast = toast.loading('Opening editor...')
            try {
              const res = await dashboardAPI.getNewDashboardEditorUrl()
              const url = res.data?.url
              if (!url) throw new Error('No URL returned')
              window.open(url, '_blank', 'noopener,noreferrer')
              toast.dismiss(loadingToast)
            } catch (e) {
              toast.dismiss(loadingToast)
              const message =
                e?.response?.data?.detail ||
                e?.response?.data?.error ||
                'Could not open dashboard editor'
              toast.error(message)
            }
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <span>New Dashboard</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDashboards.map((d, i) => (
          <DashboardCard key={d.id} dashboard={d} index={i} onView={handleViewDashboard} />
        ))}
      </div>

      <AnimatePresence>
        {viewingDashboard && (
          <DashboardViewer dashboard={viewingDashboard} onClose={() => setViewingDashboard(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}