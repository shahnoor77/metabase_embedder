import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import Loading from '../components/Common/Loading'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function DashboardViewPage() {
  const { dashboardId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [embedUrl, setEmbedUrl] = useState(null)
  const [error, setError] = useState(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [dashboardId])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('access_token')
      
      // Get dashboard URLs
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboards/${dashboardId}/embed`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Transform internal Metabase URL to public URL
      let publicEmbedUrl = response.data.embed_url
      if (publicEmbedUrl.includes('metabase:3000')) {
        publicEmbedUrl = publicEmbedUrl.replace('metabase:3000', 'localhost:3000')
      }
      
      setEmbedUrl(publicEmbedUrl)
      setIsOwner(response.data.is_owner)
      
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError(err.response?.data?.detail || 'Failed to load dashboard')
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading fullScreen={false} />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/dashboards')}
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboards</span>
        </button>

        <div className="card bg-red-50 border-red-200 flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-red-900 mb-1">Failed to Load Dashboard</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboards')}
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboards</span>
        </button>

        {isOwner && (
          <button
            onClick={() => navigate(`/dashboard/${dashboardId}/edit`)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Dashboard</span>
          </button>
        )}
      </div>

      {/* Embedded Dashboard */}
      {embedUrl && (
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200">
          <iframe
            src={embedUrl}
            frameBorder="0"
            width="100%"
            height="600px"
            allowTransparency
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="Embedded Dashboard"
            className="w-full"
            style={{ minHeight: '600px' }}
          />
        </div>
      )}
    </div>
  )
}
